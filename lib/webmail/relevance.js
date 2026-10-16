// Shared pure rules: no credentials or server-only dependencies.
export const priorities=['urgent','important','normal','low'];
export const categories=['action','awaiting','information','promotion','suspected_spam'];
export function normalizeDomain(value){const domain=String(value||'').trim().toLowerCase().replace(/^@/,'');return domain.length<=253&&/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)?domain:null;}
export function senderAddress(value){const email=String(value||'').trim().toLowerCase();return /^[^\s<>@]+@[^\s<>@]+$/.test(email)&&normalizeDomain(email.split('@')[1])?email:'';}
export function matchingRule(message,preferences={rules:[]}){
 const sender=senderAddress(message.email||message.sender),domain=sender.split('@')[1];
 return (preferences.rules||[]).find(r=>r.scope==='message'&&r.accountId===message.accountId&&r.target===message.id)||(preferences.rules||[]).find(r=>r.scope==='sender'&&sender&&r.target===sender)||(preferences.rules||[]).find(r=>r.scope==='domain'&&domain&&r.target===domain)||null;
}
export function applyPreference(message,analysis,preferences){
 const rule=matchingRule(message,preferences);analysis=analysis?.baseAnalysis||analysis;if(!rule)return analysis;
 return {...analysis,baseAnalysis:analysis,id:message.id,priority:rule.priority,category:rule.category==='auto'?(analysis?.category||'unclassified'):rule.category,needsReply:analysis?.needsReply||false,needsReview:false,reviewQuestion:'',confidence:'high',source:'preference',ruleId:rule.id,ruleScope:rule.scope,reason:rule.reason||`Sua preferência: ${rule.scope==='domain'?'domínio @'+rule.target:rule.scope==='sender'?'remetente '+rule.target:'esta mensagem'}.`};
}
