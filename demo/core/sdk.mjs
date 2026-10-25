/** Contrat v1 des modules dans le démonstrateur, sans dépendances externes. */
export const CORE_API_VERSION = '1';
const MODULE_ID = /^morvan\.[a-z][a-z0-9-]*$/;
const ENTRY = /^\.\/modules\/[a-z][a-z0-9-]*\.mjs$/;

export function validateManifest(item) {
  if (!item || typeof item !== 'object') throw new Error('Manifeste manquant.');
  if (!MODULE_ID.test(item.id || '')) throw new Error('Identifiant de module invalide.');
  if (typeof item.name !== 'string' || !item.name.trim()) throw new Error('Nom de module manquant.');
  if (item.coreApiVersion !== CORE_API_VERSION) throw new Error(`Version SDK incompatible : ${item.id}`);
  if (!ENTRY.test(item.entry || '')) throw new Error(`Chemin de module non autorisé : ${item.id}`);
  if (typeof item.version !== 'string') throw new Error('Version manquante.');
  return item;
}

export function validateRegistry(registry) {
  if (!registry || registry.registryVersion !== 1 || !Array.isArray(registry.modules)) {
    throw new Error('Registre de modules invalide.');
  }
  const names = new Set();
  for (const item of registry.modules) {
    validateManifest(item);
    if (names.has(item.id)) throw new Error(`Doublon : ${item.id}`);
    names.add(item.id);
  }
  return registry;
}

export function escapeHtml(raw) {
  return String(raw).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

export function loadEnabledState(moduleId, orgId, defaultValue) {
  const value = localStorage.getItem(`mh_demo:${orgId}:${moduleId}:enabled`);
  return value === null ? defaultValue : value === 'true';
}

export function saveEnabledState(moduleId, orgId, enabled) {
  localStorage.setItem(`mh_demo:${orgId}:${moduleId}:enabled`, String(Boolean(enabled)));
}
