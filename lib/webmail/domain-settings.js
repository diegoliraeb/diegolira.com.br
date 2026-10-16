import {randomUUID} from 'node:crypto';
import {failure,key,redis,seal,unseal} from './core.js';
import {normalizeDomain} from './relevance.js';
const defaults=()=>({revision:'initial',pinned:['dcampos.com.br','mercadolivre.com.br'],logos:{}});
const settingsKey=()=>key('domain-settings',process.env.WEBMAIL_USERNAME);
function decode(raw,k){if(!raw)return defaults();try{return unseal(raw,k);}catch{throw failure(503,'Não foi possível abrir seus filtros protegidos.');}}
export async function readDomainSettings(store=redis){const k=settingsKey(),raw=await store('GET',k);return {...decode(raw,k),initialized:Boolean(raw)};}
function validDomain(value){const d=normalizeDomain(value);if(!d)throw failure(400,'Informe um domínio válido.');return d;}
function validLogo(value){if(typeof value!=='string'||value.length>80000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw failure(400,'Logo inválida. Escolha uma imagem menor.');const bytes=Buffer.from(value.split(',')[1],'base64');if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)>96||bytes.readUInt32BE(20)>96)throw failure(400,'A logo deve ser PNG de até 96 × 96 pixels.');return value;}
function validate(settings){if(settings.pinned.length>50||Object.keys(settings.logos).length>50||Buffer.byteLength(JSON.stringify(settings))>2000000)throw failure(400,'Limite de 50 atalhos ou espaço de logos atingido. Remova uma logo para continuar.');return settings;}
export async function changeDomainSettings(input,store=redis){
 const k=settingsKey();for(let attempt=0;attempt<4;attempt++){
  const raw=await store('GET',k),current=decode(raw,k);let next={...current,pinned:[...current.pinned],logos:{...current.logos}};
  if(input.action==='initialize'){
   if(raw)return {...current,initialized:true};
   if(input.settings){if(!Array.isArray(input.settings.pinned)||!input.settings.logos||typeof input.settings.logos!=='object'||Array.isArray(input.settings.logos))throw failure(400,'Filtros antigos inválidos.');next.pinned=[...new Set(input.settings.pinned.map(validDomain))];next.logos=Object.fromEntries(Object.entries(input.settings.logos).map(([d,v])=>[validDomain(d),validLogo(v)]));}
  }else{
   const domain=validDomain(input.domain);
   if(input.action==='pin')next.pinned=[...new Set([...next.pinned,domain])];
   else if(input.action==='unpin')next.pinned=next.pinned.filter(d=>d!==domain);
   else if(input.action==='logo'){next.logos[domain]=validLogo(input.logo);next.pinned=[...new Set([...next.pinned,domain])];}
   else if(input.action==='auto-logo')delete next.logos[domain];
   else throw failure(400,'Ação inválida.');
  }
  next=validate({...next,revision:randomUUID()});
  const saved=await store('EVAL',"local old=redis.call('GET',KEYS[1]); if (old or '')~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1",1,k,raw||'',seal(next,k));
  if(saved===1)return {...next,initialized:true};
 }throw failure(409,'Os filtros mudaram em outro dispositivo. Tente novamente.');
}
// Fixed provider only: never fetch arbitrary domains or follow redirects to them.
export async function domainIcon(rawDomain,store=redis){
 const domain=validDomain(rawDomain),k=key('domain-icon',domain),cached=await store('GET',k);
 if(cached)return cached==='missing'?null:Buffer.from(cached,'base64');
 let bytes=null;
 try{
  const query=new URLSearchParams({client:'SOCIAL',type:'FAVICON',fallback_opts:'TYPE,SIZE,URL',url:'https://'+domain,size:'64'});
  const response=await fetch('https://t3.gstatic.com/faviconV2?'+query,{redirect:'error',signal:AbortSignal.timeout(8000)});
  if(response.ok&&response.headers.get('content-type')?.split(';')[0]==='image/png'){
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>80000)throw Error('large');chunks.push(value);}const data=Buffer.concat(chunks);if(data.length>=24&&data.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&data.readUInt32BE(16)<=256&&data.readUInt32BE(20)<=256)bytes=data;}finally{await reader.cancel();}
  }
 }catch{/* Missing or unavailable icons leave the initials visible. */}
 await store('SET',k,bytes?bytes.toString('base64'):'missing','EX',bytes?604800:3600);
 return bytes;
}
