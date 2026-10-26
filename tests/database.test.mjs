import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL: RLS, organization boundaries and complete publication lifecycle', async t => {
  const db = new PGlite();
  t.after(()=>db.close());
  // Supabase's auth schema is simulated; policies and RPCs run in real PostgreSQL.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  for (const name of ['20261019_001_core.sql','20261025_002_places_contributions.sql']) {
    const sql = await readFile(new URL('../platform/supabase/migrations/'+name,import.meta.url),'utf8');
    // pgcrypto extension isn't packaged in PGlite; gen_random_uuid is built into PG.
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
  }
  const author='00000000-0000-0000-0000-000000000001';
  const editor='00000000-0000-0000-0000-000000000002';
  const manager='00000000-0000-0000-0000-000000000003';
  const outsider='00000000-0000-0000-0000-000000000004';
  const viewer='00000000-0000-0000-0000-000000000005';
  const reviewer='00000000-0000-0000-0000-000000000006';
  const org='10000000-0000-0000-0000-000000000001';
  const other='10000000-0000-0000-0000-000000000002';
  await db.exec(`insert into auth.users values ('${author}'),('${editor}'),('${manager}'),('${outsider}'),('${viewer}'),('${reviewer}');
    insert into public.organizations(id,slug,name) values ('${org}','mhere','Mhère'),('${other}','autre','Autre');
    insert into public.organization_members(organization_id,user_id,role) values
      ('${org}','${author}','editor'),('${org}','${editor}','editor'),('${org}','${manager}','admin'),('${org}','${viewer}','viewer'),('${other}','${outsider}','owner');
    insert into private.editorial_reviewers values ('${reviewer}');`);
  const as = async (id=null) => { await db.exec(`reset role; set role ${id?'authenticated':'anon'};`); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']); };
  const count = async table => (await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n;
  const save = async (id=null,version=null,organization=org,name='Adresse test') => (await db.query('select * from public.save_contribution($1,$2,$3,$4,$5,$6,$7,$8)',[id,version,organization,name,'Nature & randonnée','Mhère','Une description suffisamment longue.','Informations vérifiées lors de la validation.'])).rows[0];
  const transition = async (c,action,note='') => (await db.query('select * from public.transition_contribution($1,$2,$3,$4)',[c.id,c.version,action,note])).rows[0];
  const denied = async (fn, code='42501') => assert.rejects(fn, e=>e.code===code);
  let c;
  await t.test('anon: public empty, private tables and all writes denied',async()=>{
    await as(); assert.equal(await count('places'),0);
    await denied(()=>count('contributions'));
    await denied(()=>save());
    await denied(()=>db.query('select * from private.editorial_reviewers'));
  });
  await t.test('author creates a private draft; direct writes and identity spoofing blocked',async()=>{
    await as(author); c=await save(); assert.equal(c.author_id,author); assert.equal(c.status,'draft');
    assert.equal(await count('contributions'),1); assert.equal(await count('places'),0);
    await denied(()=>db.query("update public.contributions set status='published'"));
    await denied(()=>db.query('delete from public.contributions'));
    await denied(()=>db.query("insert into public.places select id,name,category,town,description,details,now() from public.contributions"));
    await denied(()=>save(null,null,other));
    await denied(()=>save(c.id,c.version,null),'22023');
  });
  await t.test('other organization cannot read, edit, moderate or delete this draft',async()=>{
    await as(outsider); assert.equal(await count('contributions'),0); assert.equal(await count('organizations'),1);
    await denied(()=>save(c.id,c.version)); await denied(()=>transition(c,'validate'));
    await denied(()=>db.query('select public.delete_contribution($1,$2)',[c.id,c.version]));
    await denied(()=>db.query("insert into public.organization_members values ($1,$2,'admin',now())",[org,outsider]));
  });
  await t.test('viewer reads own organization but cannot write or review',async()=>{
    await as(viewer); assert.equal(await count('contributions'),1);
    await denied(()=>save()); await denied(()=>save(c.id,c.version)); await denied(()=>transition(c,'submit'));
  });
  await t.test('editing versions, validation constraints, submission and immutable submitted content',async()=>{
    await as(editor); c=await save(c.id,c.version); assert.equal(c.version,2);
    await denied(()=>save(c.id,1),'40001');
    await denied(()=>save(c.id,c.version,org,'x'),'23514');
    c=await transition(c,'submit'); assert.equal(c.status,'submitted');
    await denied(()=>save(c.id,c.version),'22023');
    await denied(()=>transition(c,'validate')); await denied(()=>transition(c,'publish'));
  });
  await t.test('manager must validate before publishing; private review never appears in snapshot',async()=>{
    await as(manager); await denied(()=>transition(c,'publish'));
    c=await transition(c,'validate','Vérifié par téléphone'); assert.equal(await count('places'),0);
    c=await transition(c,'publish'); assert.equal(c.status,'published');
    await denied(()=>transition(c,'publish'));
    await as(); const result=await db.query('select * from public.places');
    assert.equal(result.rows.length,1); assert.equal(result.rows[0].name,'Adresse test');
    assert.ok(!('author_id' in result.rows[0])); assert.ok(!('review_note' in result.rows[0]));
    await denied(()=>count('contributions'));
  });
  await t.test('revisions remain private until reviewed again; published draft cannot be deleted',async()=>{
    await as(author); c=await transition(c,'revise'); c=await save(c.id,c.version,org,'Nouvelle adresse');
    await denied(()=>db.query('select public.delete_contribution($1,$2)',[c.id,c.version]),'22023');
    await as(); assert.equal((await db.query('select name from public.places')).rows[0].name,'Adresse test');
    await as(author); c=await transition(c,'submit');
    await as(manager); await denied(()=>transition(c,'reject',''),'22023');
    c=await transition(c,'reject','Préciser les horaires'); assert.equal(c.review_note,'Préciser les horaires');
    await as(author); c=await save(c.id,c.version,org,'Nouvelle adresse'); c=await transition(c,'submit');
    await as(manager); c=await transition(c,'validate'); c=await transition(c,'publish');
    await as(); assert.equal((await db.query('select name from public.places')).rows[0].name,'Nouvelle adresse');
  });
  await t.test('membership revocation takes effect immediately; withdrawal and deletion',async()=>{
    await db.exec('reset role'); await db.query('delete from public.organization_members where user_id=$1',[author]);
    await as(author); assert.equal(await count('contributions'),0); await denied(()=>transition(c,'revise'));
    await as(manager); c=await transition(c,'unpublish');
    await as(); assert.equal(await count('places'),0);
    await as(editor); await db.query('select public.delete_contribution($1,$2)',[c.id,c.version]); assert.equal(await count('contributions'),0);
  });
  await t.test('personal contributions: own access only, editorial moderation, no self-approval',async()=>{
    await as(author); let p=await save(null,null,null); p=await transition(p,'submit');
    await as(manager); assert.equal(await count('contributions'),0); await denied(()=>transition(p,'validate'));
    await as(reviewer); assert.equal(await count('contributions'),1); p=await transition(p,'validate'); p=await transition(p,'publish');
    let self=await save(null,null,null); self=await transition(self,'submit'); await denied(()=>transition(self,'validate'));
    await as(author); assert.equal(await count('contributions'),1);
  });
  await t.test('anonymous JWT uid cannot bypass missing RPC grants; audit is private',async()=>{
    await as(); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[reviewer]);
    await denied(()=>save()); await denied(()=>db.query('select * from private.contribution_audit'));
    await db.exec('reset role'); assert.ok((await db.query('select count(*)::int n from private.contribution_audit')).rows[0].n>=10);
  });
  await t.test('manager cannot approve content they edited for another author',async()=>{
    await as(editor); let draft=await save();
    await as(manager); draft=await save(draft.id,draft.version); draft=await transition(draft,'submit');
    await denied(()=>transition(draft,'validate'));
    await as(reviewer); draft=await transition(draft,'validate'); assert.equal(draft.status,'validated');
  });
});
