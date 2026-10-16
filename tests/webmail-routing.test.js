import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const {routes}=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));
// Model the filesystem phase too: / already resolves to the portfolio index.
function destination(host,path){
  for(const rule of routes){
    if(rule.handle==='filesystem'){
      if(path==='/')return '/index.html';
      if(path.startsWith('/api/')||path.startsWith('/webmail/')||path.startsWith('/assets/'))return undefined;
    }else if(rule.dest&&new RegExp(`^${rule.src}$`).test(path)&&(!rule.has||rule.has.every(condition=>condition.type==='host'&&condition.value===host)))return rule.dest;
  }
}
test('webmail hostname serves Lira Mail while main domain serves portfolio',()=>{
  assert.equal(destination('webmail.diegolira.com.br','/'),'/webmail/index.html');
  assert.equal(destination('webmail.diegolira.com.br','/index.html'),'/webmail/index.html');
  assert.equal(destination('webmail.diegolira.com.br','/inbox'),'/webmail/index.html');
  assert.equal(destination('diegolira.com.br','/'),'/index.html');
  assert.equal(destination('diegolira.com.br','/en'),'/index.html');
});
test('authentication endpoints and application assets bypass SPA rewrites',()=>{
  for(const host of ['webmail.diegolira.com.br','diegolira.com.br']){
    assert.equal(destination(host,'/api/webmail-auth'),undefined);
    assert.equal(destination(host,'/api/webmail-ai'),undefined);
    assert.equal(destination(host,'/webmail/assets/app.js'),undefined);
    assert.equal(destination(host,'/webmail/favicon.svg'),undefined);
  }
});
test('exported application has subpath-safe assets and a login backend',()=>{
  const html=readFileSync(new URL('../public/webmail/index.html',import.meta.url),'utf8');
  const assets=[...html.matchAll(/(?:src|href)="(\/webmail\/[^" ]+)"/g)].map(match=>match[1]);
  assert.ok(assets.length>=3);
  assets.forEach(path=>assert.ok(existsSync(new URL(`../public${path}`,import.meta.url))));
  assert.ok(existsSync(new URL('../api/webmail-auth.js',import.meta.url)));
  assert.ok(existsSync(new URL('../api/webmail-ai.js',import.meta.url)));
});
