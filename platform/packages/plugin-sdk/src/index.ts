/** Contrat stable entre Morvan Pro et les modules distants : v1. */
export const CORE_API_VERSION = '1';

export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  coreApiVersion: string;
  permissions: string[];
  remote: { name: string; entry: string; expose: './App'; type: 'module' };
}

export interface ModuleRegistry {
  registryVersion: 1;
  modules: ModuleManifest[];
}

export interface PluginProps {
  organization: { id: string; name: string };
  // V1 : props non sensibles. En production les appels backend doivent vérifier droits et RLS.
  readonly coreApiVersion: '1';
}

const identifier = /^morvan\.[a-z][a-z0-9-]*$/;
const federationName = /^[a-z][a-z0-9_]*$/;
export function assertValidRegistry(value: unknown, allowedOrigins: string[]): asserts value is ModuleRegistry {
  if (!value || typeof value !== 'object') throw new Error('Registre absent.');
  const data = value as Partial<ModuleRegistry>;
  if (data.registryVersion !== 1 || !Array.isArray(data.modules)) throw new Error('Format de registre incompatible.');
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const entry of data.modules) {
    if (!entry || !identifier.test(entry.id) || !entry.name || entry.coreApiVersion !== CORE_API_VERSION) throw new Error('Métadonnées d’extension incorrectes.');
    if (!entry.remote || !federationName.test(entry.remote.name) || entry.remote.expose !== './App' || entry.remote.type !== 'module') throw new Error('Configuration Module Federation incorrecte.');
    const url = new URL(entry.remote.entry);
    if (!allowedOrigins.includes(url.origin)) throw new Error(`Origine distante non approuvée pour ${entry.id}.`);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('HTTPS obligatoire hors développement local.');
    if (ids.has(entry.id) || names.has(entry.remote.name)) throw new Error('Extension dupliquée.');
    ids.add(entry.id); names.add(entry.remote.name);
  }
}
