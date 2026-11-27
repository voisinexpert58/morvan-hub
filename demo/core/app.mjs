import { validateRegistry, escapeHtml as e, loadEnabledState, saveEnabledState, CORE_API_VERSION } from './sdk.mjs';

const ORGS = [
  { id: 'mhere-veille', name: 'Le Mhère-veille', type: 'Hébergement' },
  { id: 'auberge-demo', name: 'Auberge exemple', type: 'Restauration' },
  { id: 'association-demo', name: 'Association exemple', type: 'Association' }
];
const state = { view: 'dashboard', org: ORGS[0], modules: [], places: [], activePluginCleanup: null, renderId: 0, search: '' };
const root = document.getElementById('app');
const ICONS = { dashboard: '◫', map: '⌖', modules: '▦', settings: '⚙', home: '⌂', calendar: '▣', store: '▤', arrow: '→', check: '✓' };
const moduleEnabled = mod => loadEnabledState(mod.id, state.org.id, mod.initiallyEnabled);
const viewTitle = () => {
  if (state.view.startsWith('module:')) return state.modules.find(m => `module:${m.id}` === state.view)?.name ?? 'Module';
  return {dashboard:'Vue d’ensemble', explorer:'Aperçu Explorer', modules:'Catalogue des modules', settings:'Paramètres'}[state.view] || 'Bourgogne Hub';
};
function icon(name) { return ICONS[name] || '◈'; }
function moduleNav(mod) {
  return `<button type="button" class="${state.view === `module:${mod.id}` ? 'active' : ''}" data-nav="module:${e(mod.id)}"><span class="nav-icon">${icon(mod.icon)}</span>${e(mod.name)}</button>`;
}
function shell() {
  const enabled = state.modules.filter(moduleEnabled);
  return `<aside class="sidebar">
    <div class="brand"><div class="brand-mark" aria-hidden="true">❧</div><div><div class="brand-title">bourgogne hub</div><div class="brand-sub">Plateforme modulaire</div></div></div>
    <a class="go-public" href="./index.html">← Voir Bourgogne Explorer (site public)</a>
    <div class="section-label">Espace professionnel</div>
    <nav class="nav" aria-label="Navigation principale">
      ${[['dashboard','dashboard','Tableau de bord'],['explorer','map','Fiches en aperçu'],['modules','modules','Modules']].map(([page, sym, label]) => `<button class="${state.view===page?'active':''}" type="button" data-nav="${page}"><span class="nav-icon">${icon(sym)}</span>${label}</button>`).join('')}
    </nav>
    <div class="section-label">Mes outils actifs</div>
    <nav class="nav" aria-label="Modules actifs">${enabled.length ? enabled.map(moduleNav).join('') : '<span style="font-size:12px;padding:9px;color:#c7d8ce">Aucun module actif</span>'}</nav>
    <div class="section-label">Compte</div>
    <nav class="nav"><button class="${state.view==='settings'?'active':''}" type="button" data-nav="settings"><span class="nav-icon">⚙</span>Paramètres</button></nav>
    <div class="sidebar-foot"><strong>Prototype V1 en construction</strong><br>Modules chargés à l’exécution<br>Données de démonstration non publiées</div>
  </aside>
  <main class="main">
    <header class="topbar"><div class="crumb"><a href="./index.html" class="crumb-return">← Guide public</a> · Bourgogne Hub <span aria-hidden="true">/</span> <strong>${e(viewTitle())}</strong></div><div class="top-actions">
      <label class="crumb" for="org-select">Établissement</label>
      <select class="org-picker" id="org-select" aria-label="Choisir un établissement">${ORGS.map(o => `<option value="${e(o.id)}" ${o.id===state.org.id?'selected':''}>${e(o.name)}</option>`).join('')}</select>
      <div class="avatar" aria-hidden="true">MH</div>
    </div></header>
    <div class="content" id="view" aria-live="polite"></div>
  </main>`;
}
function dashboard() {
  const enabled = state.modules.filter(moduleEnabled);
  return `<div class="eyebrow">Votre espace numérique</div><h1 class="page-title">Bienvenue sur Bourgogne Hub.</h1>
    <p class="lead">Un socle commun, des outils indépendants. Activez les modules nécessaires à votre activité, sans modifier l’application principale.</p>
    <div class="hero"><div><div class="hero-kicker">Une plateforme qui grandit avec vous</div><h2>Tous vos outils locaux.<br>Une seule interface.</h2><p>De l’accueil de vos visiteurs à la gestion des animations, chaque fonctionnalité se connecte à un même environnement.</p><button class="button tan" data-nav="modules">Découvrir les modules <span aria-hidden="true">→</span></button></div></div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Modules disponibles</div><div class="stat-value">${state.modules.length}</div><div class="stat-hint">Dans le catalogue</div></div>
      <div class="stat"><div class="stat-label">Modules actifs</div><div class="stat-value">${enabled.length}</div><div class="stat-hint">Pour cet établissement</div></div>
      <div class="stat"><div class="stat-label">Adresses exemples</div><div class="stat-value">${state.places.length}</div><div class="stat-hint">Jeu de données fictif</div></div>
      <div class="stat"><div class="stat-label">Version du SDK</div><div class="stat-value">v${CORE_API_VERSION}</div><div class="stat-hint">Contrat d’extension stable</div></div>
    </div>
    <div class="grid-2"><section class="card"><div class="card-header"><h2 class="card-title">Vos modules</h2><button class="muted-link" data-nav="modules">Gérer les modules →</button></div>
       <div class="module-list">${state.modules.map(m=>`<div class="module-row"><div class="module-icon" aria-hidden="true">${icon(m.icon)}</div><div class="module-text"><div class="module-name">${e(m.name)}</div><div class="module-meta">Version ${e(m.version)} · ${e(m.category || '')}</div></div><span class="pill ${moduleEnabled(m)?'':'off'}">${moduleEnabled(m)?'Actif':'Inactif'}</span></div>`).join('')}</div></section>
      <section class="card"><div class="card-header"><h2 class="card-title">Les fondations du projet</h2></div>
      ${[['Séparation du noyau et des extensions','Le code principal ne connaît pas les écrans des outils.'],['Activation par établissement','Un même module peut être activé pour un gîte et désactivé pour un autre.'],['Prêt pour les fonctions professionnelles','Un schéma SQL avec organisations, membres, modules et règles RLS est fourni.']].map(([a,b])=>`<div class="little-card"><span class="dot"></span><div><div class="module-name">${a}</div><div class="subtle">${b}</div></div></div>`).join('')}
      </section></div><div class="footer-note">Démo : aucune authentification réelle, aucune facturation et aucune donnée de voyageur.</div>`;
}
function catalog() {
  const count = state.modules.filter(moduleEnabled).length;
  return `<div class="eyebrow">Extensions · Catalogue</div><h1 class="page-title">Activez les outils dont vous avez besoin.</h1>
    <p class="lead">Chaque module possède son propre fichier et son propre contrat d’extension. Les interrupteurs sont enregistrés localement et indépendamment pour chaque établissement de démonstration.</p>
    <div class="notice" style="margin:0 0 22px">${count} module(s) actif(s) pour <strong>${e(state.org.name)}</strong>. Démo locale : les interrupteurs ne constituent pas une gestion sécurisée des abonnements.</div>
    <div class="catalog">${state.modules.map(m=>`<article class="card"><div class="form-row" style="justify-content:space-between"><div class="catalog-icon" aria-hidden="true">${icon(m.icon)}</div><label class="toggle" title="${moduleEnabled(m)?'Désactiver':'Activer'} ${e(m.name)}"><input type="checkbox" aria-label="Activer ${e(m.name)}" data-toggle="${e(m.id)}" ${moduleEnabled(m)?'checked':''}><span class="toggle-track"></span></label></div>
      <div class="cat-meta">${e(m.category||'Module')} · v${e(m.version)}</div><div class="catalog-name">${e(m.name)}</div><p class="subtle" style="flex:1">${e(m.description)}</p><div class="form-row" style="justify-content:space-between"><span class="pill ${moduleEnabled(m)?'':'off'}">${moduleEnabled(m)?'Installé':'Non activé'}</span><button class="button ${moduleEnabled(m)?'':'secondary'}" type="button" data-openmodule="${e(m.id)}" ${moduleEnabled(m)?'':'disabled'}>Ouvrir →</button></div></article>`).join('')}</div>
    <div class="notice"><strong>Ajouter un quatrième outil :</strong> créez un nouveau fichier dans <code>modules/</code> et ajoutez seulement son manifeste à <code>config/modules.json</code>. Le noyau <code>core/app.mjs</code> ne change pas.</div>`;
}
function explorer() {
  const q = state.search.toLowerCase().trim();
  const matches = state.places.filter(p => [p.name,p.description,p.town,p.type].join(' ').toLowerCase().includes(q));
  return `<div class="eyebrow">Guide public · Prévisualisation</div><h1 class="page-title">Bourgogne Explorer</h1><p class="lead">La base locale pourra alimenter automatiquement les outils professionnels. Pour l'instant, les lieux ci-dessous sont des exemples fictifs, non des recommandations vérifiées.</p>
    <div class="form-row" style="margin-bottom:18px"><input id="place-search" class="search" type="search" placeholder="Chercher une commune, un lieu, une catégorie…" value="${e(state.search)}" aria-label="Rechercher une adresse"><button class="button" id="place-search-button">Rechercher</button></div>
    <div class="place-list">${matches.map(p=>`<div class="place-card"><div class="place-type">${e(p.type)}</div><h3>${e(p.name)}</h3><div class="subtle">⌖ ${e(p.town)}</div><p>${e(p.description)}</p><span class="pill off">${e(p.status)}</span></div>`).join('')||'<div class="empty">Aucun résultat dans le jeu de données de démonstration.</div>'}</div>`;
}
function settings() {
  return `<div class="eyebrow">Configuration locale</div><h1 class="page-title">Paramètres du prototype</h1>
    <p class="lead">Cet espace simule trois organisations afin de vérifier que les modules peuvent être activés séparément. Les vraies autorisations seront contrôlées par Supabase et PostgreSQL.</p>
    <section class="card"><div class="card-header"><h2 class="card-title">Organisation sélectionnée</h2></div><p><strong>${e(state.org.name)}</strong> · ${e(state.org.type)}</p><p class="subtle">Identifiant de démonstration : ${e(state.org.id)}</p><div class="notice">Les données sont locales à votre navigateur. N'y enregistrez aucun mot de passe de logement, coordonnée client ou autre information confidentielle.</div><p><button class="button ghost" id="reset-demo">Réinitialiser les activations de cet établissement</button></p></section>`;
}
function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=message;document.body.appendChild(el);
  setTimeout(()=>el.remove(),2600);
}
async function showView() {
  const runId = ++state.renderId;
  if (typeof state.activePluginCleanup === 'function') state.activePluginCleanup();
  state.activePluginCleanup = null;
  root.innerHTML = shell();
  const region = document.getElementById('view');
  if(state.view === 'dashboard') region.innerHTML = dashboard();
  else if(state.view === 'modules') region.innerHTML = catalog();
  else if(state.view === 'explorer') region.innerHTML = explorer();
  else if(state.view === 'settings') region.innerHTML = settings();
  else if(state.view.startsWith('module:')) {
    const id = state.view.slice('module:'.length);
    const mod = state.modules.find(m=>m.id===id);
    if(!mod || !moduleEnabled(mod)) {state.view='modules';return showView();}
    region.innerHTML = `<div class="eyebrow">Module indépendant · ${e(mod.category||'')}</div><h1 class="page-title">${e(mod.name)}</h1><p class="lead">${e(mod.description)}</p><div id="plugin-outlet" class="card">Chargement de l’extension…</div>`;
    try {
      // Le contrat limite les chemins au répertoire local modules/. Une extension est du code de confiance.
      const loaded = await import(new URL('../'+mod.entry.replace(/^\.\//, ''), import.meta.url).href);
      if(runId !== state.renderId) return;
      if(!loaded.default || loaded.default.id !== mod.id || typeof loaded.default.mount !== 'function') throw new Error('Contrat du module non respecté.');
      const context = Object.freeze({
        coreApiVersion: CORE_API_VERSION,
        organization: Object.freeze({...state.org}),
        places: Object.freeze(state.places.map(p=>Object.freeze({...p}))),
        escapeHtml: e,
        notify: toast,
        storage: Object.freeze({
          get: key => localStorage.getItem(`mh_demo:data:${state.org.id}:${mod.id}:${key}`),
          set: (key,value) => localStorage.setItem(`mh_demo:data:${state.org.id}:${mod.id}:${key}`,String(value))
        })
      });
      state.activePluginCleanup = loaded.default.mount(document.getElementById('plugin-outlet'), context) || null;
    } catch(error) {
      region.querySelector('#plugin-outlet').innerHTML=`<div class="empty"><strong>Extension indisponible.</strong><p class="subtle">${e(error.message)}</p></div>`;
    }
  }
  document.querySelectorAll('[data-nav]').forEach(node=>node.addEventListener('click',()=>{state.view=node.dataset.nav;showView();}));
  document.getElementById('org-select')?.addEventListener('change',evt=>{state.org=ORGS.find(o=>o.id===evt.target.value)||ORGS[0];state.view='dashboard';showView();});
  document.querySelectorAll('[data-toggle]').forEach(node=>node.addEventListener('change',evt=>{
    saveEnabledState(node.dataset.toggle,state.org.id,evt.target.checked);
    toast(evt.target.checked?'Module activé pour cet établissement.':'Module désactivé pour cet établissement.');showView();
  }));
  document.querySelectorAll('[data-openmodule]').forEach(node=>node.addEventListener('click',()=>{state.view=`module:${node.dataset.openmodule}`;showView();}));
  const searchNode = document.getElementById('place-search');
  searchNode?.addEventListener('keydown',event=>{if(event.key==='Enter'){state.search=searchNode.value;showView();}});
  document.getElementById('place-search-button')?.addEventListener('click',()=>{state.search=searchNode.value;showView();});
  document.getElementById('reset-demo')?.addEventListener('click',()=>{for (const m of state.modules) localStorage.removeItem(`mh_demo:${state.org.id}:${m.id}:enabled`);toast('Activations réinitialisées.');showView();});
}
async function init() {
  try {
    const [registryResponse, placesResponse] = await Promise.all([fetch('./config/modules.json',{cache:'no-store'}), fetch('./data/places.json')]);
    if(!registryResponse.ok || !placesResponse.ok) throw new Error('Impossible de charger les données locales.');
    state.modules=validateRegistry(await registryResponse.json()).modules;
    state.places=await placesResponse.json();
    await showView();
  } catch(error) {
    root.innerHTML=`<div class="boot"><h1>Impossible de démarrer le prototype</h1><p>${e(error.message)}</p><p>Démarrez un serveur local avec <code>python -m http.server 8080</code> depuis le dossier <code>demo/</code>.</p></div>`;
  }
}
init();

