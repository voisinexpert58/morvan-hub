import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateRegistry,validateManifest,escapeHtml} from '../core/sdk.mjs';
const here = path.resolve(import.meta.dirname,'..');
const registryPath = path.join(here,'config/modules.json');
const registry = JSON.parse(fs.readFileSync(registryPath,'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('Registre valide et IDs uniques',()=>{
 const result=validateRegistry(registry);
 assert.equal(result.modules.length,3);
 assert.equal(new Set(result.modules.map(m=>m.id)).size,3);
});

test('Refuse un chemin distant arbitraire ou une version SDK incompatible',()=>{
 assert.throws(()=>validateManifest({...registry.modules[0],entry:'https://example.com/hostile.js'}),/non autorisé/);
 assert.throws(()=>validateManifest({...registry.modules[0],coreApiVersion:'2'}),/incompatible/);
});

test('Neutralise du texte fourni par un contributeur',()=>{
 assert.equal(escapeHtml('<img src="x" onerror="alert(1)">'),'&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
});

test('Import dynamique possible pour chaque module existant', async()=>{
 for(const module of registry.modules){
   const file=path.join(here,module.entry);
   assert.ok(fs.existsSync(file),file);
   const imported=await import(pathToFileURL(file).href);
   assert.equal(imported.default.id,module.id);
   assert.equal(typeof imported.default.mount,'function');
 }
});

test('Ajout d’un 4e module sans changement du fichier noyau', async()=>{
 const core=path.join(here,'core/app.mjs');
 const previousHash=hash(core);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'morvan-plugin-'));
 try{
   fs.mkdirSync(path.join(temp,'modules'));
   fs.mkdirSync(path.join(temp,'config'));
   fs.copyFileSync(path.join(here,'examples/atelier.mjs'),path.join(temp,'modules/atelier.mjs'));
   const added=JSON.parse(fs.readFileSync(path.join(here,'examples/atelier-manifest.json'),'utf8'));
   const extended={registryVersion:1,modules:[...registry.modules,added]};
   fs.writeFileSync(path.join(temp,'config/modules.json'),JSON.stringify(extended));
   assert.equal(validateRegistry(extended).modules.length,4);
   const remote=await import(pathToFileURL(path.join(temp,'modules/atelier.mjs')).href);
   assert.equal(remote.default.id,'morvan.atelier');
   assert.equal(previousHash,hash(core));
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
