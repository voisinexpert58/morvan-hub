import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const file=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('Le point d’entrée public est Morvan Explorer, et le Pro est séparé',()=>{
  const home=file('index.html');const pro=file('pro.html');
  assert.match(home,/<title>Morvan Explorer/);
  assert.match(home,/\.\/explorer\/app\.mjs/);
  assert.match(pro,/core\/app\.mjs/);
  assert.match(file('core/app.mjs'),/Voir Morvan Explorer \(site public\)/);
  assert.ok(!home.includes('core/app.mjs'));
});

test('Catalogue de démonstration : huit catégories représentées, identités explicitement fictives',()=>{
  const places=JSON.parse(file('data/places.json'));
  assert.ok(places.length>=8);
  assert.equal(new Set(places.map(p=>p.type)).size,8);
  assert.equal(new Set(places.map(p=>p.id)).size,places.length);
  assert.ok(places.every(p=>p.status==='Fiche fictive'&&p.description&&p.town));
});

test('Le script public affiche un accueil autonome, le catalogue et les fiches',async()=>{
 const places=JSON.parse(file('data/places.json'));
 const storage=new Map();const events={};const rootElement={innerHTML:'',addEventListener(n,cb){events[n]=cb;}};
 globalThis.document={querySelector:(selector)=>selector==='#app'?rootElement:null,title:''};
 globalThis.location={hash:''};
 globalThis.localStorage={getItem:(key)=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 globalThis.window={addEventListener:(name,cb)=>{events[name]=cb;},scrollTo(){}};
 globalThis.fetch=async()=>({ok:true,json:async()=>places});
 try{
  await import('../explorer/app.mjs');
  for(let i=0;i<15&&!rootElement.innerHTML.includes('Le Morvan');i++)await new Promise(r=>setTimeout(r,10));
  assert.match(rootElement.innerHTML,/Le Morvan/);
  assert.match(rootElement.innerHTML,/href="\.\/pro\.html"/);
  assert.match(rootElement.innerHTML,/Les pépites du territoire/i);
  globalThis.location.hash='#explorer';events.hashchange();
  assert.match(rootElement.innerHTML,/12 idées de découvertes/);
  assert.match(rootElement.innerHTML,/Restaurants &amp; cafés/);
  globalThis.location.hash='#adresse/sample-1';events.hashchange();
  assert.match(rootElement.innerHTML,/Une auberge de village/);
  assert.match(rootElement.innerHTML,/aucune photo réelle/);
  globalThis.location.hash='#carte';events.hashchange();
  assert.match(rootElement.innerHTML,/OpenStreetMap/);
 }finally{
  delete globalThis.document;delete globalThis.location;delete globalThis.localStorage;delete globalThis.window;delete globalThis.fetch;
 }
});
