import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig, validateClientEnv } from '../demo/shared/config.mjs';
const env={VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const jwt=role=>`${btoa('{}')}.${btoa(JSON.stringify({role}))}.signature`;
test('unconfigured by default; demo only when explicitly requested',()=>{
  assert.equal(readConfig({}).mode,'unconfigured'); assert.equal(readConfig({VITE_DEMO_MODE:'true'}).mode,'demo');
  assert.equal(readConfig({...env,VITE_DEMO_MODE:'true'}).mode,'connected');
});
test('public keys accepted; privileged or invalid keys rejected without echoing them',()=>{
  assert.equal(readConfig(env).mode,'connected');
  assert.equal(readConfig({...env,VITE_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).mode,'connected');
  for(const key of ['sb_secret_DO_NOT_PRINT',jwt('service_role'),jwt('authenticated'),'invalid']) {
    assert.throws(()=>readConfig({...env,VITE_SUPABASE_PUBLISHABLE_KEY:key}),error=>!error.message.includes(key));
  }
});
test('reject incomplete, credential-bearing and insecure remote configuration',()=>{
  assert.throws(()=>readConfig({VITE_SUPABASE_URL:env.VITE_SUPABASE_URL}));
  for(const url of ['http://example.com','https://user:pass@example.com','https://example.com/?key=secret','file:///test','invalid'])assert.throws(()=>readConfig({...env,VITE_SUPABASE_URL:url}));
  assert.equal(readConfig({...env,VITE_SUPABASE_URL:'http://127.0.0.1:54321'}).mode,'connected');
});
test('build guard rejects privileged values under any VITE variable name',()=>{
  assert.throws(()=>validateClientEnv({...env,VITE_OTHER:jwt('service_role')}));
  assert.throws(()=>validateClientEnv({...env,VITE_OTHER:'sb_secret_not_for_browser'}));
  assert.throws(()=>validateClientEnv({...env,VITE_DATABASE_PASSWORD:'never-public'}));
  assert.doesNotThrow(()=>validateClientEnv({...env,SUPABASE_SECRET_KEY:'server-only-never-read'}));
});
