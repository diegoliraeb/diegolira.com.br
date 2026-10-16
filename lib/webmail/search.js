import {normalizeDomain,senderAddress} from './relevance.js';
export const senderDomain = message => senderAddress(message.email||message.sender||'').split('@')[1]||'';
export function mailSearch(rawQuery='',rawDomain='') {
 const query=rawQuery.trim();
 if(query.length>500||/[\x00-\x1f]/.test(query))throw new Error('Busca inválida. Use até 500 caracteres.');
 const domain=rawDomain?normalizeDomain(rawDomain):'';
 if(rawDomain&&!domain)throw new Error('Domínio inválido.');
 return {query,domain,q:[query?`(${query})`:'',domain?`from:(@${domain})`:''].filter(Boolean).join(' ')};
}
export function domainCatalog(messages,pinned=[],rules=[]) {
 const counts=new Map();
 for(const message of messages){const domain=senderDomain(message);if(domain)counts.set(domain,(counts.get(domain)||0)+1);}
 const favorites=[...new Set([...pinned,...rules.filter(r=>r.scope==='domain').map(r=>r.target)].map(normalizeDomain).filter(Boolean))];
 return [...favorites,...[...counts.keys()].filter(d=>!favorites.includes(d)).sort((a,b)=>counts.get(b)-counts.get(a)||a.localeCompare(b))].map(domain=>({domain,count:counts.get(domain)||0}));
}
