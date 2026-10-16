import {body,failure,headers,json,publicUrl,rateLimit,redis,safeError,sameOrigin} from '../lib/webmail/core.js';
import {requireSession} from '../lib/webmail/session.js';
import {readDomainSettings,changeDomainSettings,domainIcon} from '../lib/webmail/domain-settings.js';
export function createDomainsHandler(store=redis){return async(req,res)=>{try{
 const session=await requireSession(req,store),params=new URL(req.url,publicUrl()).searchParams;
 if(req.method==='GET'&&params.get('action')==='logo'){
  await rateLimit('domain-icons:'+session.id,300,60,store);
  const icon=await domainIcon(params.get('domain'),store);headers(res);
  if(!icon){res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','private, max-age=86400');res.statusCode=200;res.end(icon);return;
 }
 await rateLimit('domain-settings:'+session.id,90,60,store);
 if(req.method==='GET')return json(res,200,await readDomainSettings(store));
 if(req.method!=='POST')throw failure(405,'Método não permitido.');
 sameOrigin(req);return json(res,200,await changeDomainSettings(await body(req,2100000),store));
 }catch(e){return safeError(res,e);}};}
export default createDomainsHandler();
