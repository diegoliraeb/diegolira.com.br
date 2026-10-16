import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';

const MAX_AGE=60*60*8;
const attempts=new Map();
export function passwordHash(password,salt=randomBytes(16).toString('hex')){return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function verifyPassword(password,stored){
  const [algorithm,salt,hash]=String(stored).split(':');
  if(algorithm!=='scrypt'||! /^[a-f0-9]{32}$/.test(salt||'')||! /^[a-f0-9]{128}$/.test(hash||''))return false;
  return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'));
}
export function createSession(username,secret,now=Date.now()){const payload=Buffer.from(JSON.stringify({sub:username,exp:now+MAX_AGE*1000,nonce:randomBytes(16).toString('hex')})).toString('base64url');return `${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`;}
export function verifySession(token,secret,username,now=Date.now()){
  try{const [payload,signature,...rest]=token.split('.');if(rest.length||!signature)return false;const expected=createHmac('sha256',secret).update(payload).digest();const actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;const decoded=JSON.parse(Buffer.from(payload,'base64url').toString());return decoded.sub===username&&Number.isFinite(decoded.exp)&&decoded.exp>now;}catch{return false;}
}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));}
function getAccounts(){try{const accounts=JSON.parse(process.env.WEBMAIL_ACCOUNTS||'[]');return Array.isArray(accounts)?accounts.filter(a=>a.id&&a.name&&a.email&&a.provider&&a.color).map(a=>({id:a.id,name:a.name,email:a.email,provider:a.provider,color:a.color,connected:false})):[];}catch{return [];}}
function cookie(token,production,clear=false){return `${production?'__Host-lira_session':'lira_session'}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${clear?0:MAX_AGE}${production?'; Secure':''}`;}
export default async function handler(req,res){
  const username=process.env.WEBMAIL_USERNAME,stored=process.env.WEBMAIL_PASSWORD_HASH,secret=process.env.WEBMAIL_SESSION_SECRET;
  const configured=Boolean(username&&/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored||'')&&secret?.length>=32);
  const production=process.env.VERCEL==='1'||process.env.NODE_ENV==='production';
  const sessionName=production?'__Host-lira_session':'lira_session';
  const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(`${sessionName}=`))?.slice(sessionName.length+1)||'';
  if(req.method==='GET'){const authenticated=configured&&verifySession(token,secret,username);return json(res,200,{configured,authenticated,...(authenticated?{username,accounts:getAccounts()}: {})});}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Método não permitido.'});}
  const origin=req.headers.origin;
  if(!origin){return json(res,403,{error:'Origem da solicitação não permitida.'});}
  try{if(new URL(origin).host!==req.headers.host)return json(res,403,{error:'Origem da solicitação não permitida.'});}catch{return json(res,403,{error:'Origem inválida.'});}
  let body=req.body;
  try{if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return json(res,413,{error:'Solicitação muito grande.'});}body=JSON.parse(raw);}else if(typeof body==='string')body=JSON.parse(body);}catch{return json(res,400,{error:'Solicitação inválida.'});}
  if(body?.action==='logout'){res.setHeader('Set-Cookie',cookie('',production,true));return json(res,200,{authenticated:false});}
  if(!configured)return json(res,503,{error:'O acesso ainda precisa ser configurado na hospedagem.'});
  if(body?.action!=='login'||typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>200||body.password.length>200)return json(res,400,{error:'Informe seu usuário e senha.'});
  // Best-effort instance-local throttling. Add a shared limiter before integrating real mail.
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const now=Date.now();for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
  const limit=attempts.get(ip);
  if(limit?.count>=5&&limit.until>now){res.setHeader('Retry-After','900');return json(res,429,{error:'Muitas tentativas. Aguarde 15 minutos e tente novamente.'});}
  const validPassword=verifyPassword(body.password,stored);
  const userEqual=createHmac('sha256',secret).update(body.username.trim()).digest();
  const expectedUser=createHmac('sha256',secret).update(username).digest();
  if(!timingSafeEqual(userEqual,expectedUser)||!validPassword){if(attempts.size<10000)attempts.set(ip,{count:(limit?.count||0)+1,until:limit?.until||now+900000});return json(res,401,{error:'Usuário ou senha incorretos.'});}
  attempts.delete(ip);
  res.setHeader('Set-Cookie',cookie(createSession(username,secret),production));
  return json(res,200,{authenticated:true,username,accounts:getAccounts()});
}
