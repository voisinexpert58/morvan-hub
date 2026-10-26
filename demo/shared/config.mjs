export function readConfig(env = {}) {
  const url = (env.VITE_SUPABASE_URL || '').trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!url && !key) return { mode: env.VITE_DEMO_MODE === 'true' ? 'demo' : 'unconfigured' };
  if (!url || !key) throw new Error('Configuration Supabase incomplète.');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('URL Supabase invalide.'); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash ||
      !((parsed.protocol === 'https:') || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))) {
    throw new Error('URL Supabase : HTTPS requis (sauf en local).');
  }
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey && key.split('.').length === 3) {
    try { publicKey = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; } catch { /* Invalid legacy key. */ }
  }
  if (!publicKey) throw new Error('Seule une clé publique publishable ou anon est autorisée.');
  return { mode: 'connected', url: parsed.href.replace(/\/$/, ''), key };
}

export function validateClientEnv(env) {
  readConfig(env);
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue;
    if (/SECRET|SERVICE_ROLE|PASSWORD|PRIVATE/i.test(name) || value.startsWith('sb_secret_')) {
      throw new Error('Variable client sensible interdite : ' + name);
    }
    let claims;
    try { claims = JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { /* Not a JWT. */ }
    if (claims?.role === 'service_role') throw new Error('Clé privilégiée interdite : ' + name);
  }
}
