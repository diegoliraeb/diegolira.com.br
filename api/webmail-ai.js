import {body,gmailAccount,json,publicUrl,rateLimit,redis,safeError,sameOrigin,failure} from '../lib/webmail/core.js';
import {requireSession} from '../lib/webmail/session.js';
import {aiStatus,runAi,setConsent} from '../lib/webmail/ai.js';
export function createAiHandler(store=redis){return async(req,res)=>{try{
 const session=await requireSession(req,store);
 await rateLimit('ai-endpoint:'+session.id,120,60,store);
 if(req.method==='GET')return json(res,200,await aiStatus(store));
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw failure(405,'Método não permitido.');}
 sameOrigin(req);const input=await body(req,4096);
 if(input.action==='consent')return json(res,200,await setConsent(input.accountIds,input.version,store));
 return json(res,200,await runAi(gmailAccount(input.accountId),input,store));
 }catch(e){return safeError(res,e);}};}
export default createAiHandler();
