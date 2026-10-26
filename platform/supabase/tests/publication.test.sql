begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(13);

insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003');
insert into private.editorial_reviewers values ('00000000-0000-0000-0000-000000000002');

set local role anon;
select is((select count(*)::int from public.places),0,'Anonymous catalogue starts empty');
select throws_ok('select * from public.contributions','42501','permission denied for table contributions','Anonymous cannot read drafts');
select throws_ok($$select public.save_contribution(null,null,null,'Lieu test','Nature & randonnée','Mhère','Une description de test.','')$$,'42501',null,'Anonymous cannot call write RPC');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('morvan.test_id',(public.save_contribution(null,null,null,'Lieu test','Nature & randonnée','Mhère','Une description de test.','')).id::text,true);
select is((select count(*)::int from public.contributions),1,'Author sees draft');
select is((select count(*)::int from public.places),0,'Draft is not public');
select throws_ok($$update public.contributions set status='published'$$,'42501','permission denied for table contributions','Direct publication blocked');
select public.transition_contribution(current_setting('morvan.test_id')::uuid,1,'submit','');
select throws_ok($$select public.transition_contribution(current_setting('morvan.test_id')::uuid,2,'publish','')$$,'42501','Publication forbidden','Author cannot publish');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select is((select count(*)::int from public.contributions),0,'Other account cannot read personal draft');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.transition_contribution(current_setting('morvan.test_id')::uuid,2,'validate','Reviewed');
select is((select count(*)::int from public.places),0,'Validation alone is not publication');
select public.transition_contribution(current_setting('morvan.test_id')::uuid,3,'publish','');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::int from public.places),1,'Anonymous sees published snapshot');
select throws_ok('select author_id from public.places','42703',null,'Public snapshot has no author identifier');
select throws_ok('select review_note from public.places','42703',null,'Public snapshot has no review note');
select throws_ok('delete from public.places','42501','permission denied for table places','Anonymous cannot delete publication');
select * from finish();
rollback;
