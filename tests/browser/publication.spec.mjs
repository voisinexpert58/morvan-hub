import { test, expect } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { installStorageFixture } from '../helpers/storage.mjs';

// HTTP boundary double: real supabase-js and PostgreSQL/RLS; GoTrue and PostgREST
// are simulated. No remote project and no real credentials are used by these tests.
async function backend(context) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  await installStorageFixture(db);
  for(const name of (await readdir(new URL('../../platform/supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()) {
    await db.exec((await readFile(new URL('../../platform/supabase/migrations/'+name,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  }
  const ids={author:'00000000-0000-0000-0000-000000000001',reviewer:'00000000-0000-0000-0000-000000000002'};
  await db.exec(`insert into auth.users values ('${ids.author}'),('${ids.reviewer}'); insert into private.editorial_reviewers values ('${ids.reviewer}');`);
  const user = id=>({id,aud:'authenticated',role:'authenticated',email:(id===ids.author?'author':'reviewer')+'@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()});
  const token=id=>[btoa('{}'),btoa(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})), 'test-signature'].join('.');
  let queue=Promise.resolve();
  const objects=new Map();
  await context.route('https://morvan-test.supabase.co/**',route=>{
    const work=queue.then(async()=>{
      const request=route.request(); const url=new URL(request.url());
      const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(request.method()==='OPTIONS')return json({});
      let uid=null;
      try {uid=JSON.parse(atob((request.headers().authorization||'').split('.')[1])).sub;}catch{}
      if(url.pathname==='/auth/v1/token') {
        const {email,password}=request.postDataJSON();
        const id=email==='author@example.test'?ids.author:email==='reviewer@example.test'?ids.reviewer:null;
        if(!id||password!=='test-password')return json({msg:'Identifiants invalides'},400);
        return json({access_token:token(id),token_type:'bearer',expires_in:3600,refresh_token:'test-refresh',user:user(id)});
      }
      if(url.pathname==='/auth/v1/user')return uid?json(user(uid)):json({msg:'No session'},401);
      if(url.pathname==='/auth/v1/logout')return json({});
      await db.exec(`reset role;set role ${uid?'authenticated':'anon'}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);
      try {
        if(url.pathname.startsWith('/storage/v1/object/')) {
          const path=decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/)?place-photos\//,''));
          if(request.method()==='POST') {
            const form=await new Response(request.postDataBuffer(),{headers:{'Content-Type':request.headers()['content-type']}}).formData();
            const file=[...form.values()].find(value=>typeof value!=='string');
            await db.query("insert into storage.objects(bucket_id,name) values('place-photos',$1)",[path]);
            objects.set(path,{bytes:Buffer.from(await file.arrayBuffer()),type:file.type});
            return json({Key:'place-photos/'+path});
          }
          const result=await db.query("select name from storage.objects where bucket_id='place-photos' and name=$1",[path]);
          if(!result.rows.length||!objects.has(path))return json({message:'Photo unavailable'},404);
          const file=objects.get(path);return route.fulfill({status:200,contentType:file.type,body:file.bytes});
        }
        const path=url.pathname.replace('/rest/v1/','');
        if(path.startsWith('rpc/')) {
          const name=path.slice(4);const args=request.postDataJSON();
          const names={can_review_contributions:['p_organization_id'],save_contribution:['p_id','p_expected_version','p_organization_id','p_name','p_category','p_town','p_description','p_details'],set_contribution_photos:['p_id','p_expected_version','p_paths'],transition_contribution:['p_id','p_expected_version','p_action','p_note'],delete_contribution:['p_id','p_expected_version']}[name];
          if(!names)return json({message:'Unknown RPC'},400);
          const result=await db.query(`select * from public.${name}(${names.map((_,i)=>'$'+(i+1)).join(',')})`,names.map(n=>args[n]??null));
          return json(name==='can_review_contributions'?result.rows[0].can_review_contributions:result.rows[0]);
        }
        if(!['contributions','places','organizations','organization_members'].includes(path))return json({message:'Unknown table'},400);
        return json((await db.query(`select * from public.${path}`)).rows);
      }catch(error){return json({message:error.message,code:error.code},403);}
    });
    queue=work.catch(()=>{});return work;
  });
  return db;
}

async function login(page,who) {
  await page.goto('/pro.html');
  await page.getByLabel('Adresse e-mail').fill(who+'@example.test');
  await page.getByLabel('Mot de passe').fill('test-password');
  await page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Proposer une adresse'})).toBeVisible();
}

test('draft → submission → review → publication → private revision → withdrawal → deletion',async({page,context})=>{
  const db=await backend(context);
  try{
    await page.goto('/index.html#explorer');
    await expect(page.getByText('0 idées de découvertes')).toBeVisible();
    await login(page,'author');
    await page.getByLabel('Nom du lieu').fill('La maison des chemins');
    await page.getByLabel('Commune').fill('Mhère');
    await page.getByLabel('Description',{exact:true}).fill('Une adresse de test pour découvrir les chemins.');
    await page.getByLabel('Informations complémentaires').fill('<img src=x onerror=alert(1)>');
    await page.getByLabel('Importer des photos').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
    await expect(page.getByRole('status')).toContainText('JPEG, PNG ou WebP');
    const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=60;c.getContext('2d').fillRect(0,0,80,60);return c.toDataURL('image/png').split(',')[1];}),'base64');
    await page.getByLabel('Importer des photos').setInputFiles({name:'lieu.png',mimeType:'image/png',buffer:png});
    await expect(page.locator('#photo-preview img')).toHaveCount(1);
    await expect(page.getByLabel('Nom du lieu')).toHaveValue('La maison des chemins');
    await page.getByRole('button',{name:'Enregistrer le brouillon'}).click();
    await expect(page.locator('article')).toContainText('Brouillon');
    await expect(page.locator('article img[data-photo-path]')).toHaveCount(1);
    await expect(page.locator('article img:not([data-photo-path])')).toHaveCount(0);
    await expect(page.locator('article img')).toHaveJSProperty('naturalWidth',80);
    const photoPath=await page.locator('article img').getAttribute('data-photo-path');
    const anonymousPhotoStatus=()=>page.evaluate(async path=>(await fetch('https://morvan-test.supabase.co/storage/v1/object/authenticated/place-photos/'+path,{headers:{apikey:'sb_publishable_test_only'}})).status,photoPath);
    expect(await anonymousPhotoStatus()).toBe(404);
    await expect(page.getByRole('button',{name:'Publier sur Explorer'})).toHaveCount(0);
    await page.getByRole('button',{name:'Soumettre à validation'}).click();
    await expect(page.locator('article')).toContainText('À valider');
    await page.getByRole('button',{name:'Se déconnecter'}).click();
    await expect(page.getByRole('heading',{name:'Connexion',exact:true})).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
    await page.goto('/index.html#explorer');
    await expect(page.getByText('0 idées de découvertes')).toBeVisible();
    await login(page,'reviewer');
    await page.getByRole('button',{name:'Valider',exact:true}).click();
    await expect(page.locator('article')).toContainText('Validée');
    await page.getByRole('button',{name:'Publier sur Explorer'}).click();
    await expect(page.locator('article')).toContainText('Publiée');
    await page.goto('/index.html#explorer');
    await expect(page.getByText('1 idées de découvertes')).toBeVisible();
    await expect(page.getByText('La maison des chemins')).toBeVisible();
    await expect(page.locator('.place-photo')).toHaveJSProperty('naturalWidth',80);
    expect(await anonymousPhotoStatus()).toBe(200);
    await page.goto('/pro.html');
    await page.getByRole('button',{name:'Se déconnecter'}).click();
    await login(page,'author');
    await page.getByRole('button',{name:'Reprendre en brouillon'}).click();
    await page.getByRole('button',{name:'Modifier',exact:true}).click();
    await page.getByLabel('Nom du lieu').fill('Nom encore privé');
    await page.getByLabel('Importer des photos').setInputFiles({name:'revision.png',mimeType:'image/png',buffer:png});
    await expect(page.locator('#photo-preview img')).toHaveCount(2);
    await page.getByRole('button',{name:'Enregistrer le brouillon'}).click();
    await expect(page.locator('article')).toContainText('Nom encore privé');
    await page.goto('/index.html#explorer');
    await expect(page.getByText('La maison des chemins')).toBeVisible();
    await expect(page.getByText('Nom encore privé')).toHaveCount(0);
    await expect(page.locator('.place-photo')).toHaveCount(1);
    await page.goto('/pro.html');await page.getByRole('button',{name:'Se déconnecter'}).click();
    await login(page,'reviewer');
    page.on('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'Retirer d’Explorer'}).click();
    await expect(page.locator('article')).toContainText('Non visible sur Explorer');
    expect(await anonymousPhotoStatus()).toBe(404);
    await page.getByRole('button',{name:'Se déconnecter'}).click();
    await login(page,'author');
    await page.getByRole('button',{name:'Supprimer le brouillon'}).click();
    await expect(page.getByText('Aucune contribution accessible')).toBeVisible();
    await page.goto('/index.html#explorer');await expect(page.getByText('0 idées de découvertes')).toBeVisible();
  }finally{await db.close();}
});

test('connection error never falls back to the fictional catalogue',async({page})=>{
  await page.route('https://morvan-test.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"Service indisponible"}'}));
  await page.goto('/index.html#explorer');
  await expect(page.getByRole('heading',{name:'Impossible de charger Morvan Explorer'})).toBeVisible({timeout:20000});
  await expect(page.getByText('Une auberge de village')).toHaveCount(0);
});
