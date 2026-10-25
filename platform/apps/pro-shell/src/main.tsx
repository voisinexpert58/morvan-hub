import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import { assertValidRegistry, CORE_API_VERSION, type ModuleManifest, type ModuleRegistry, type PluginProps } from '@morvan/plugin-sdk';
import './styles.css';

const ORG = { id: 'demo-mhere-veille', name: 'Le Mhère-veille (démonstration)' };
const KEY = (id: string) => `morvan_pro_demo:${ORG.id}:${id}`;

function RemoteView({ manifest }: { manifest: ModuleManifest }) {
  const Remote = useMemo(() => React.lazy(async () => {
    // Le composant est chargé en temps réel depuis le remote fédéré.
    // L'origine a été contrôlée par assertValidRegistry avant enregistrement.
    const result = await loadRemote<{ default: React.ComponentType<PluginProps> }>(
      `${manifest.remote.name}/${manifest.remote.expose.slice(2)}`
    );
    if (!result?.default) throw new Error('Le module distant ne fournit pas son composant App.');
    return { default: result.default };
  }), [manifest.id, manifest.version, manifest.remote.entry]);
  return <Suspense fallback={<p className="message">Chargement du module distant…</p>}><Remote organization={ORG} coreApiVersion="1" /></Suspense>;
}

class ModuleBoundary extends React.Component<{children: React.ReactNode},{error: string | null}> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  render() {return this.state.error ? <div className="message error">Module indisponible : {this.state.error}</div> : this.props.children;}
}

function App() {
  const [registry, setRegistry] = useState<ModuleRegistry | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    async function init() {
      try {
        const response = await fetch('/config/modules.json', {cache:'no-store'});
        if (!response.ok) throw new Error('Le catalogue est indisponible.');
        const raw: unknown = await response.json();
        const origins = (import.meta.env.VITE_TRUSTED_MODULE_ORIGINS || 'http://localhost:4201').split(',').map((s:string)=>s.trim());
        assertValidRegistry(raw, origins);
        registerRemotes(raw.modules.map(m => ({name:m.remote.name, entry:m.remote.entry, type:m.remote.type})));
        if (!live) return;
        setRegistry(raw);
        setEnabled(Object.fromEntries(raw.modules.map(m => [m.id, localStorage.getItem(KEY(m.id)) !== 'false'])));
      } catch (e) { if (live) setError(e instanceof Error ? e.message : 'Erreur inconnue'); }
    }
    void init();
    return () => { live = false; };
  }, []);
  function flip(mod: ModuleManifest) {
    const next = !enabled[mod.id];
    localStorage.setItem(KEY(mod.id), String(next));
    setEnabled(prev => ({...prev,[mod.id]:next}));
    if (!next && selected===mod.id) setSelected(null);
  }
  const selectedManifest = registry?.modules.find(m => m.id === selected && enabled[m.id]);
  return <div className="layout">
    <aside className="side"><div className="logo">❧ <span>morvan hub</span></div><div className="side-caption">Socle React · Module Federation</div>
      <button className={!selected?'current':''} onClick={()=>setSelected(null)}>◫ &nbsp; Catalogue</button>
      {registry?.modules.filter(m=>enabled[m.id]).map(m=><button key={m.id} className={selected===m.id?'current':''} onClick={()=>setSelected(m.id)}>◈ &nbsp; {m.name}</button>)}
      <small className="side-foot">Démo technique locale<br/>SDK v{CORE_API_VERSION}<br/>Pas de données privées</small></aside>
    <main className="main"><header className="top"><span>Morvan Pro <b>/</b> {selectedManifest?.name || 'Catalogue'}</span><strong>{ORG.name}</strong></header>
    <section className="content">{error && <div className="message error">{error}</div>}
      {!registry && !error && <p className="message">Chargement du catalogue…</p>}
      {registry && !selectedManifest && <><span className="eyebrow">Extensions indépendantes</span><h1>Un noyau, de nouveaux outils à volonté.</h1><p className="intro">Activez ou désactivez les modules. L’interface d’un outil est hébergée séparément et chargée lorsque vous l’ouvrez.</p>
        <div className="grid">{registry.modules.map(m=><article className="card" key={m.id}><div className="box-icon">◈</div><small>VERSION {m.version}</small><h2>{m.name}</h2><p>{m.description}</p><div className="card-foot"><label><input type="checkbox" checked={!!enabled[m.id]} onChange={()=>flip(m)}/> Actif</label><button disabled={!enabled[m.id]} onClick={()=>setSelected(m.id)}>Ouvrir →</button></div></article>)}</div><div className="notice">L’activation est simulée dans ce starter. Le fichier de registre, les droits d’organisation et les abonnements seront gérés côté serveur avant toute mise en production.</div></>}
      {registry && selectedManifest && <><span className="eyebrow">Module chargé à l'exécution</span><h1>{selectedManifest.name}</h1><p className="intro">Ce module est une application distante. Son code n'est pas inclus dans le noyau.</p><ModuleBoundary key={selectedManifest.id}><RemoteView manifest={selectedManifest}/></ModuleBoundary></>}
    </section></main></div>;
}

createRoot(document.getElementById('root')!).render(<App/>);
