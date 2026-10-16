import {createHash} from 'node:crypto';
import {failure,key} from './core.js';
import {accessToken,googleGet,parseMessage} from './google.js';

const address=/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;
export function recipients(value,required=false){
 if(typeof value!=='string'||value.length>3000||/[\r\n\x00-\x1f\x7f]/.test(value))throw failure(400,'Informe endereços válidos, separados por vírgula.');
 const result=[...new Set(value.split(/[;,]/).map(x=>x.trim()).filter(Boolean))];
 if((required&&!result.length)||result.length>25||result.some(x=>x.length>254||!address.test(x)))throw failure(400,'Confira os destinatários. Use apenas endereços de e-mail, separados por vírgula.');
 return result;
}
export function headerAddresses(value=''){
 // Only bare, validated addresses leave the provider's display-name headers.
 const matches=value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];
 return [...new Set(matches.filter(x=>address.test(x)))].slice(0,25);
}
function encodedSubject(subject){
 const chunks=[];let chunk='';for(const char of subject){if(Buffer.byteLength(chunk+char)>42){chunks.push(chunk);chunk='';}chunk+=char;}if(chunk)chunks.push(chunk);
 return chunks.map(x=>'=?UTF-8?B?'+Buffer.from(x).toString('base64')+'?=').join('\r\n ');
}
export function composeReply(account,original,input){
 const to=recipients(input.to,true),cc=recipients(input.cc||'').filter(x=>!to.some(y=>y.toLowerCase()===x.toLowerCase()));
 if(to.length+cc.length>25)throw failure(400,'Use no máximo 25 destinatários.');
 if(typeof input.text!=='string'||!input.text.trim()||Buffer.byteLength(input.text)>32000||input.text.includes('\0'))throw failure(400,'Escreva uma resposta de até 32 KB.');
 if(!address.test(account.email))throw failure(400,'Remetente inválido.');
 const subject=original.subject.replace(/[\r\n\x00-\x1f\x7f]/g,' ').slice(0,500);
 const messageId=(original.messageId||'').length<255&&/^<[^<>\s@]+@[^<>\s@]+>$/.test(original.messageId||'')?original.messageId:null;
 const references=((original.references||'').match(/<[^<>\s@]+@[^<>\s@]+>/g)||[]).filter(x=>x.length<255);
 if(messageId)references.push(messageId);
 const headers=[`From: ${account.email}`,`To: ${to.join(', ')}`,...(cc.length?[`Cc: ${cc.join(', ')}`]:[]),`Subject: ${encodedSubject(/^re:/i.test(subject)?subject:'Re: '+subject)}`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64'];
 if(messageId){headers.push(`In-Reply-To: ${messageId}`,`References: ${[...new Set(references)].slice(-12).join('\r\n ')}`);}
 const text=Buffer.from(input.text.replace(/\r?\n/g,'\r\n'),'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
 return {raw:Buffer.from(headers.join('\r\n')+'\r\n\r\n'+text+'\r\n').toString('base64url'),...(messageId&&original.threadId?{threadId:original.threadId}:{})};
}
export async function sendReply(account,input,store){
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(input.messageId||'')||!/^[a-f0-9-]{36}$/i.test(input.requestId||''))throw failure(400,'Resposta inválida.');
 // Validate before touching Google. Sender/thread headers are always sourced server-side.
 recipients(input.to,true);recipients(input.cc||'');
 if(typeof input.text!=='string'||!input.text.trim()||Buffer.byteLength(input.text)>32000)throw failure(400,'Escreva uma resposta de até 32 KB.');
 const receiptKey=key('send',account.id+':'+input.requestId);
 const fingerprint=createHash('sha256').update(JSON.stringify([input.messageId,input.to,input.cc||'',input.text])).digest('hex');
 const previous=await store('GET',receiptKey);
 if(previous){const receipt=JSON.parse(previous);if(receipt.fingerprint!==fingerprint)throw failure(409,'Este envio já foi usado. Abra uma nova resposta.');if(receipt.status==='sent')return {sent:true,id:receipt.id};throw Object.assign(failure(409,'O envio anterior pode ter sido concluído. Confira a pasta Enviados antes de escrever uma nova resposta.'),{uncertain:true});}
 const token=await accessToken(account,store,true);
 const original=parseMessage(await googleGet(`messages/${input.messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,token),account.id,true);
 const payload=composeReply(account,original,input);
 const locked=await store('SET',receiptKey,JSON.stringify({fingerprint,status:'pending'}),'NX','EX',86400);
 if(!locked)throw Object.assign(failure(409,'Esta resposta já está sendo enviada. Confira Enviados antes de tentar novamente.'),{uncertain:true});
 let response;
 try{response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(failure(503,'Não foi possível confirmar o envio. Confira Enviados antes de tentar novamente.'),{uncertain:true});}
 if(!response.ok){
  if(response.status>=500)throw Object.assign(failure(503,'O Gmail não confirmou o resultado. Confira Enviados antes de tentar novamente.'),{uncertain:true});
  await store('DEL',receiptKey);
  throw failure(response.status===403?403:502,response.status===403?'Autorize o envio para esta conta em Gerenciar contas.':'O Gmail recusou o envio. Confira os destinatários e tente novamente.');
 }
 let result;try{result=await response.json();if(!result.id)throw Error();}catch{throw Object.assign(failure(503,'O Gmail recebeu a solicitação, mas não confirmou o resultado. Confira Enviados.'),{uncertain:true});}
 try{await store('SET',receiptKey,JSON.stringify({fingerprint,status:'sent',id:result.id}),'EX',86400);}catch{/* The send succeeded; never retry it automatically if receipt storage fails. */}
 return {sent:true,id:result.id};
}
