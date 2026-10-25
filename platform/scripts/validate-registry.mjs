import fs from 'node:fs';
import assert from 'node:assert/strict';
const path = new URL('../apps/pro-shell/public/config/modules.json', import.meta.url);
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
assert.equal(config.registryVersion, 1);
assert.ok(Array.isArray(config.modules));
const ids = new Set();
for (const m of config.modules) {
 assert.match(m.id, /^morvan\.[a-z][a-z0-9-]*$/);
 assert.equal(m.coreApiVersion, '1');
 assert.equal(m.remote.expose, './App');
 assert.equal(m.remote.type, 'module');
 assert.match(new URL(m.remote.entry).hostname, /^(localhost|[a-z0-9.-]+)$/);
 assert.ok(!ids.has(m.id));
 ids.add(m.id);
}
console.log(`Registre valide : ${ids.size} extension(s).`);
