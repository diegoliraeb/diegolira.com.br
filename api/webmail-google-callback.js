import {callbackUrl,flowCookie,googleGet,SCOPE,tokenRequest} from '../lib/webmail/google.js';
import {cookie,cookieValue,digest,gmailAccount,headers,key,production,publicUrl,redis,seal,unseal} from '../lib/webmail/core.js';
export function createCallbackHandler(store=redis){return async(req,res)=>{
 headers(res);res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
 let outcome='failed';
 try{
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end();}
  const params=new URL(req.url,publicUrl()).searchParams,state=params.get('state'),binding=cookieValue(req,flowCookie(production()));
  if(!/^[\w-]{43}$/.test(state||'')||!binding)throw new Error('Invalid state');
  // Consume atomically: authorization codes and cancelled callbacks are one-use.
  const saved=await store('GETDEL',key('oauth',state));if(!saved)throw new Error('Expired state');
  const flow=unseal(saved,'oauth');if(flow.binding!==digest(binding)||await store('GET',flow.sessionId)!==process.env.WEBMAIL_USERNAME)throw new Error('Invalid session');
  if(params.has('error')){outcome='cancelled';}else{
   const code=params.get('code');if(!code||code.length>4096)throw new Error('Invalid code');
   const account=gmailAccount(flow.accountId),tokens=await tokenRequest({code,grant_type:'authorization_code',redirect_uri:callbackUrl(),code_verifier:flow.verifier});
   if(!tokens.scope?.split(' ').includes(SCOPE)||!tokens.refresh_token)throw new Error('Missing grant');
   const profile=await googleGet('profile',tokens.access_token);
   if(profile.emailAddress?.toLowerCase()!==account.email.toLowerCase()){outcome='wrong_account';}else{
    // Logout during the external consent flow must invalidate completion too.
    const encrypted=seal({refreshToken:tokens.refresh_token,connectedAt:Date.now()},account.id);
    const committed=await store('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[2],ARGV[2]); return 1 end; return 0",2,flow.sessionId,key('google',account.id),process.env.WEBMAIL_USERNAME,encrypted);
    if(committed!==1)throw new Error('Expired session');outcome='connected';
   }
  }
 }catch{/* Never log OAuth codes, mailbox data or provider responses. */}
 res.setHeader('Set-Cookie',cookie(flowCookie(production()),'',0,'Lax'));
 res.statusCode=303;res.setHeader('Location',`${publicUrl()}/?gmail=${outcome}`);res.end();
 };}
export default createCallbackHandler();
