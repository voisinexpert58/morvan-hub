import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { installStorageFixture } from './helpers/storage.mjs';
import { validatePhotoSelection,validateImageContent,MAX_PHOTO_BYTES } from '../demo/shared/photos.mjs';

test('photo limits reject unsupported types, empty/large files and a sixth photo',async()=>{
  const photo={type:'image/png',size:10};
  assert.doesNotThrow(()=>validatePhotoSelection([photo],4));
  assert.throws(()=>validatePhotoSelection([photo],5));
  for(const file of [{...photo,type:'image/svg+xml'},{...photo,size:0},{...photo,size:MAX_PHOTO_BYTES+1}])assert.throws(()=>validatePhotoSelection([file]));
  await assert.rejects(()=>validateImageContent(new Blob(['<html>fake photo</html>'],{type:'image/png'})));
  await assert.doesNotReject(()=>validateImageContent(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:'image/png'})));
});

test('photos: private upload, validation lock, immutable public snapshot and withdrawal',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await installStorageFixture(db);
  for(const file of (await readdir(new URL('../platform/supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()) {
    await db.exec((await readFile(new URL('../platform/supabase/migrations/'+file,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  }
  const author='00000000-0000-0000-0000-000000000001', reviewer='00000000-0000-0000-0000-000000000002',other='00000000-0000-0000-0000-000000000003';
  await db.exec(`insert into auth.users values('${author}'),('${reviewer}'),('${other}');insert into private.editorial_reviewers values('${reviewer}');`);
  const as=async uid=>{await db.exec(`reset role;set role ${uid?'authenticated':'anon'}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);};
  const denied=(fn,code='42501')=>assert.rejects(fn,e=>e.code===code);
  const upload=path=>db.query("insert into storage.objects(bucket_id,name) values('place-photos',$1)",[path]);
  const set=(c,paths)=>db.query('select * from public.set_contribution_photos($1,$2,$3)',[c.id,c.version,paths]).then(r=>r.rows[0]);
  const move=(c,action)=>db.query('select * from public.transition_contribution($1,$2,$3)',[c.id,c.version,action]).then(r=>r.rows[0]);
  const count=()=>db.query('select count(*)::int n from storage.objects').then(r=>r.rows[0].n);
  await as(author);
  let c=(await db.query("select * from public.save_contribution(null,null,null,'Lieu photo','Nature & randonnée','Mhère','Une description de test.','')")).rows[0];
  const path1=`${c.id}/00000000-0000-0000-0000-000000000011.png`, path2=`${c.id}/00000000-0000-0000-0000-000000000012.jpg`;
  await upload(path1);assert.equal(await count(),0,'unattached objects are not readable');
  await denied(()=>set(c,[path1,path1]),'22023');
  await denied(()=>set(c,[path2]),'22023');
  c=await set(c,[path1]);assert.equal(await count(),1);
  await denied(()=>set({...c,version:1},[]),'40001');
  await as(other);assert.equal(await count(),0);await denied(()=>upload(path2));await denied(()=>set(c,[path1]));
  await as();assert.equal(await count(),0);await denied(()=>set(c,[]));
  await as(author);c=await move(c,'submit');await denied(()=>upload(path2));await denied(()=>set(c,[]),'22023');
  await as(reviewer);assert.equal(await count(),1);c=await move(c,'validate');c=await move(c,'publish');
  await as();assert.equal(await count(),1);
  await as(author);
  assert.equal((await db.query("update storage.objects set name=name where name=$1 returning id",[path1])).rows.length,0,'no overwrite policy');
  assert.equal((await db.query('delete from storage.objects returning id')).rows.length,0,'no browser deletion policy');
  c=await move(c,'revise');await upload(path2);c=await set(c,[path2]);
  await as();assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),[path1]);
  await as(author);c=await move(c,'submit');await as(reviewer);c=await move(c,'validate');c=await move(c,'publish');
  await as();assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),[path2]);
  await as(reviewer);c=await move(c,'unpublish');await as();assert.equal(await count(),0);
  await as(author);c=await set(c,[]);assert.equal(await count(),0);
});
