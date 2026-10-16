import {randomUUID} from 'node:crypto';
import {failure,key,redis,seal,unseal} from './core.js';
import {priorities,categories,normalizeDomain,senderAddress} from './relevance.js';
import {accessToken,googleGet,parseMessage} from './google.js';
const preferencesKey=()=>key('ai-preferences',process.env.WEBMAIL_USERNAME);
const empty=()=>({revision:'initial',rules:[]});
function decode(raw,k){if(!raw)return empty();try{return unseal(raw,k);}catch{throw failure(503,'Não foi possível abrir suas preferências protegidas.');}}
export async function readPreferences(store=redis){const k=preferencesKey();return decode(await store('GET',k),k);}
async function updatePreferences(change,store){
 const k=preferencesKey();for(let attempt=0;attempt<3;attempt++){
  const raw=await store('GET',k),current=decode(raw,k),rules=change(current.rules);
  if(rules.length>500)throw failure(400,'Limite de 500 preferências atingido. Remova regras antigas para continuar.');
  const next={revision:randomUUID(),rules};
  const result=await store('EVAL',"local old=redis.call('GET',KEYS[1]); if (old or '')~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1",1,k,raw||'',seal(next,k));
  if(result===1)return next;
 }throw failure(409,'Suas preferências mudaram em outra janela. Tente novamente.');
}
function choice(input){if(!priorities.includes(input.priority)||!['auto',...categories].includes(input.category||'auto')||typeof(input.reason||'')!=='string'||(input.reason||'').length>300)throw failure(400,'Preferência inválida.');return {priority:input.priority,category:input.category||'auto',reason:(input.reason||'').trim()};}
async function upsert(rule,store){return updatePreferences(rules=>[...rules.filter(r=>!(r.scope===rule.scope&&r.target===rule.target&&(r.accountId||'')===(rule.accountId||''))),{...rule,id:randomUUID(),updatedAt:Date.now()}],store);}
export async function addDomain(input,store=redis){const domain=normalizeDomain(input.domain);if(!domain)throw failure(400,'Digite um domínio válido, como @empresa.com.br.');return upsert({scope:'domain',target:domain,...choice(input)},store);}
export async function removePreference(id,store=redis){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw failure(400,'Regra inválida.');return updatePreferences(rules=>rules.filter(r=>r.id!==id),store);}
export async function learnPreference(account,input,store=redis){
 if(!['message','sender','domain'].includes(input.scope)||typeof input.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(input.id))throw failure(400,'Mensagem ou alcance inválido.');
 const selected=choice(input),token=await accessToken(account,store),message=parseMessage(await googleGet(`messages/${input.id}?format=metadata&metadataHeaders=From`,token),account.id),sender=senderAddress(message.email);
 if(!sender&&input.scope!=='message')throw failure(400,'Não foi possível identificar o remetente. Salve apenas para esta mensagem.');
 const target=input.scope==='message'?input.id:input.scope==='sender'?sender:sender.split('@')[1];
 return upsert({scope:input.scope,target,...(input.scope==='message'?{accountId:account.id}:{}),...selected},store);
}
