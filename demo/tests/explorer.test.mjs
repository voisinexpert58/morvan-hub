import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const file=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('Le point d’entrée public est Bourgogne Explorer, et le Pro est séparé',()=>{
  const home=file('index.html');const pro=file('pro.html');
  assert.match(home,/<title>Bourgogne Explorer/);
  assert.match(home,/\.\/explorer\/app\.mjs/);
  assert.match(pro,/pro\/app\.mjs/);
  assert.match(file('core/app.mjs'),/Voir Bourgogne Explorer \(site public\)/);
  assert.ok(!home.includes('core/app.mjs'));
});

test('Catalogue de démonstration : huit catégories représentées, identités explicitement fictives',()=>{
  const places=JSON.parse(file('data/places.json'));
  assert.ok(places.length>=8);
  assert.equal(new Set(places.map(p=>p.type)).size,8);
  assert.equal(new Set(places.map(p=>p.id)).size,places.length);
  assert.ok(places.every(p=>p.status==='Fiche fictive'&&p.description&&p.town));
});

test('Sans configuration, Explorer ne charge ni exemples fictifs ni données privées',async()=>{
 const events={}; const rootElement={innerHTML:'',addEventListener(n,cb){events[n]=cb;}};
 globalThis.document={querySelector:(selector)=>selector==='#app'?rootElement:null,title:''};
 globalThis.location={hash:''};
 globalThis.localStorage={getItem:()=>null,setItem(){}};
 globalThis.window={addEventListener:(name,cb)=>{events[name]=cb;},scrollTo(){}};
 let fetched=false;
 globalThis.fetch=async()=>{fetched=true;throw Error('Unexpected request');};
 try{
  await import('../explorer/app.mjs');
  assert.match(rootElement.innerHTML,/Catalogue non connecté/);
  assert.equal(fetched,false);
 }finally{
  delete globalThis.document;delete globalThis.location;delete globalThis.localStorage;delete globalThis.window;delete globalThis.fetch;
 }
});

