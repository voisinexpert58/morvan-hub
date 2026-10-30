/** Extension autonome : le noyau n'importe jamais cette source statiquement. */
export default {
  id: 'morvan.accueil',
  mount(root, context) {
    const e=context.escapeHtml;
    const org=context.organization;
    const localPlaces=context.places;
    root.style.padding='22px';
    root.innerHTML=`<div class="module-banner"><div class="eyebrow">Bourgogne Accueil · Démonstration</div><h2>Bienvenue à ${e(org.name)}</h2><p>Un compagnon numérique pour les voyageurs, enrichi par la base locala Bourgogne Explorer.</p></div>
      <div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr))">
       <div class="stat"><div class="stat-label">Rubriques</div><div class="stat-value">6</div><div class="stat-hint">À personnaliser</div></div>
       <div class="stat"><div class="stat-label">Suggestions locales</div><div class="stat-value">${localPlaces.length}</div><div class="stat-hint">Fiches fictives</div></div>
       <div class="stat"><div class="stat-label">Accès</div><div class="stat-value">QR</div><div class="stat-hint">Prévu dans le produit</div></div>
      </div>
      <h3 class="section-heading">Les informations du séjour</h3>
      <div class="catalog" style="margin-bottom:20px">
       ${[['⌂','Arriver et repartir','Accès et horaires (sans codes sensibles)'],['⌁','La maison','Consignes et équipements'],['♡','Bonnes adresses','Découvrir la Bourgogne'],['☷','Pendant le séjour','Services et informations utiles'],['♧','Nos engagements','Patrimoine et environnement'],['☎','Contacts','Joindre le propriétaire']].map(([icon,name,desc])=>`<div class="place-card"><div class="catalog-icon" aria-hidden="true">${icon}</div><h3>${name}</h3><p>${desc}</p></div>`).join('')}
      </div><h3 class="section-heading">Découvertes locales proposées</h3>
      <div class="place-list">${localPlaces.map(p=>`<div class="place-card"><div class="place-type">${e(p.type)}</div><h3>${e(p.name)}</h3><p>${e(p.description)}</p><span class="pill off">Donnée d'exemple</span></div>`).join('')}</div>
      <div class="notice">Dans la version commerciale, le contenu sera modifiable par le propriétaire et les adresses publiques resteront gérées dans Bourgogne Explorer.</div>`;
    return () => { root.replaceChildren(); };
  }
};

