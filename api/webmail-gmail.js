import {mailSearch,senderDomain} from '../lib/webmail/search.js';
import {body,cookie,digest,failure,gmailAccount,json,key,production,publicUrl,rateLimit,redis,safeError,sameOrigin,seal,unseal} from '../lib/webmail/core.js';
import {requireSession} from '../lib/webmail/session.js';
import {accessToken,authorization,flowCookie,googleGet,parseMessage,random,ready,statuses} from '../lib/webmail/google.js';
import {sendReply,headerAddresses} from '../lib/webmail/reply.js';
export function createGmailHandler(store=redis){return async(req,res)=>{try{
 const current=await requireSession(req,store);
 await rateLimit('gmail:'+current.id,180,60,store);
 if(req.method==='GET'){
  const params=new URL(req.url,publicUrl()).searchParams,action=params.get('action')||'status';
  if(action==='status')return json(res,200,{ready:ready(),accounts:await statuses(store)});
  const account=gmailAccount(params.get('accountId'));
  if(action==='message'){
   const id=params.get('id');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id||''))throw failure(400,'Mensagem inválida.');
   const token=await accessToken(account,store),message=await googleGet(`messages/${id}?format=full`,token);
   const parsed=parseMessage(message,account.id,true);
   let conversation=[];
   if(params.get('conversation')==='true'&&/^[a-zA-Z0-9_-]{1,100}$/.test(message.threadId||'')){
    const thread=await googleGet(`threads/${message.threadId}?format=full`,token);
    conversation=(thread.messages||[]).sort((a,b)=>Number(a.internalDate)-Number(b.internalDate)).slice(-10).map(m=>parseMessage(m,account.id,true));
   }
   return json(res,200,{message:parsed,conversation,replyTo:headerAddresses(parsed.replyTo||parsed.email).join(', ')});
  }
  if(action!=='list')throw failure(400,'Ação inválida.');
  const label={inbox:'INBOX',sent:'SENT',spam:'SPAM',trash:'TRASH',starred:'STARRED',important:'IMPORTANT'}[params.get('folder')||'inbox'];
  if(!label)throw failure(400,'Pasta inválida.');
  const pageToken=params.get('pageToken')||'';if(pageToken.length>2000)throw failure(400,'Página inválida.');
  const query=new URLSearchParams({maxResults:'20',labelIds:label,includeSpamTrash:'true'});if(pageToken)query.set('pageToken',pageToken);
  let search;try{search=mailSearch(params.get('q')||'',params.get('domain')||'');}catch(e){throw failure(400,e.message);}
  if(search.q)query.set('q',search.q);
  const token=await accessToken(account,store),list=await googleGet('messages?'+query,token);
  // Small bounded batches keep API traffic predictable; never persist message content.
  const messages=[];for(let i=0;i<(list.messages||[]).length;i+=5){messages.push(...await Promise.all(list.messages.slice(i,i+5).map(async m=>parseMessage(await googleGet(`messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,token),account.id))));}
  return json(res,200,{messages:search.domain?messages.filter(m=>senderDomain(m)===search.domain):messages,nextPageToken:list.nextPageToken||null});
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw failure(405,'Método não permitido.');}
 sameOrigin(req);const input=await body(req,50000),account=gmailAccount(input.accountId);
 if(input.action==='connect'){
  await rateLimit('connect:'+current.id,10,600,store);
  const state=random(),binding=random(),verifier=random();
  const url=authorization(account,state,verifier,input.enableSending===true);
  await store('SET',key('oauth',state),seal({accountId:account.id,sessionId:current.id,binding:digest(binding),verifier},'oauth'),'EX',600);
  res.setHeader('Set-Cookie',cookie(flowCookie(production()),binding,600,'Lax'));
  return json(res,200,{url});
 }
 if(input.action==='reply'){
  await rateLimit('send:'+current.id,10,60,store);
  try{return json(res,200,await sendReply(account,input,store));}catch(error){if(error.uncertain)return json(res,error.status||503,{error:error.message,uncertain:true});throw error;}
 }
 if(input.action==='disconnect'){
  const saved=await store('GETDEL',key('google',account.id));let revoked=true;
  if(saved){try{const {refreshToken}=unseal(saved,account.id);const result=await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:refreshToken}),signal:AbortSignal.timeout(10000)});revoked=result.ok;}catch{revoked=false;}}
  return json(res,200,{disconnected:true,revoked});
 }
 throw failure(400,'Ação inválida.');
 }catch(error){return safeError(res,error);}};}
export default createGmailHandler();
