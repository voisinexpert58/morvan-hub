import { readConfig } from './config.mjs';

let instance;
export function configuration() { return readConfig(import.meta.env || {}); }
export async function getClient() {
  if (instance) return instance;
  const config = configuration();
  if (config.mode !== 'connected') throw new Error('Supabase non configuré.');
  const { createClient } = await import('@supabase/supabase-js');
  instance = createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'morvan-auth-v1' }
  });
  return instance;
}

function checked(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export function repository(client) {
  return {
    async published() {
      // Fetch all pages, not just PostgREST's default first 1000 rows.
      const rows = [];
      for (let start = 0; ; start += 500) {
        const page = checked(await client.from('places').select('id,name,category,town,description,details,published_at').order('id').range(start, start + 499).abortSignal(AbortSignal.timeout(15000)));
        rows.push(...page);
        if (page.length < 500) return rows.map(p => ({ ...p, type: p.category, visual: 'nature', tags: [] }));
      }
    },
    async contributions() {
      const rows = [];
      for (let start = 0; ; start += 500) {
        const page = checked(await client.from('contributions').select('*').order('id').range(start, start + 499));
        rows.push(...page); if (page.length < 500) return rows;
      }
    },
    async organizations() { return checked(await client.from('organizations').select('id,name').order('name')); },
    async canReview(organizationId) { return checked(await client.rpc('can_review_contributions', { p_organization_id: organizationId })); },
    async save(fields, current = null, organizationId = null) {
      return checked(await client.rpc('save_contribution', {
        p_id: current?.id ?? null, p_expected_version: current?.version ?? null,
        p_organization_id: organizationId,
        p_name: fields.name.trim(), p_category: fields.category, p_town: fields.town.trim(),
        p_description: fields.description.trim(), p_details: fields.details.trim()
      }));
    },
    async transition(current, action, note = '') {
      return checked(await client.rpc('transition_contribution', {
        p_id: current.id, p_expected_version: current.version, p_action: action, p_note: note.trim()
      }));
    },
    async remove(current) { return checked(await client.rpc('delete_contribution', { p_id: current.id, p_expected_version: current.version })); }
  };
}
