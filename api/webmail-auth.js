import {createHmac,timingSafeEqual} from 'node:crypto';
import {MAX_AGE,accounts,body,cookie,cookieValue,sessionName,json,redis,key,rateLimit,sameOrigin,safeError,storeConfigured} from '../lib/webmail/core.js';
import {passwordHash,verifyPassword,createSession,verifySession,session} from '../lib/webmail/session.js';
export {passwordHash,verifyPassword,createSession,verifySession};
export function createAuthHandler(store=redis){return async function handler(req,res){try{
 const username=process.env.WEBMAIL_USERNAME,stored=process.env.WEBMAIL_PASSWORD_HASH,secret=process.env.WEBMAIL_SESSION_SECRET;
 const configured=Boolean(username&&/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored||'')&&secret?.length>=32&&storeConfigured());
 if(req.method==='GET'){const current=configured?await session(req,store):null;return json(res,200,{configured,authenticated:Boolean(current),...(current?{username,accounts:accounts()}: {})});}
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Método não permitido.'});}
 sameOrigin(req);const input=await body(req);
 if(input.action==='logout'){const token=cookieValue(req,sessionName());if(token)await store('DEL',key('session',token));res.setHeader('Set-Cookie',cookie(sessionName(),'',0));return json(res,200,{authenticated:false});}
 if(!configured)return json(res,503,{error:'Acesso aguardando configuração do armazenamento seguro.'});
 if(input.action!=='login'||typeof input.username!=='string'||typeof input.password!=='string'||input.username.length>200||input.password.length>200)return json(res,400,{error:'Informe seu usuário e senha.'});
 // Global budget cannot be bypassed by forging a forwarded IP header.
 await rateLimit('login-global',100,900,store);
 const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 await rateLimit('login-ip:'+ip,10,900,store);
 const valid=verifyPassword(input.password,stored),a=createHmac('sha256',secret).update(input.username.trim()).digest(),b=createHmac('sha256',secret).update(username).digest();
 if(!timingSafeEqual(a,b)||!valid)return json(res,401,{error:'Usuário ou senha incorretos.'});
 const old=await session(req,store);if(old)await store('DEL',old.id);
 const token=createSession(username,secret);await store('SET',key('session',token),username,'EX',MAX_AGE);
 res.setHeader('Set-Cookie',cookie(sessionName(),token));return json(res,200,{authenticated:true,username,accounts:accounts()});
 }catch(error){return safeError(res,error);}};}
export default createAuthHandler();
