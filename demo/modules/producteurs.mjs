export default {
  id: 'morvan.producteurs',
  mount(root, context) {
    const e=context.escapeHtml;
    root.style.padding='22px';
    root.innerHTML=`<div class="module-banner"><div class="eyebrow">Morvan Producteurs · Extension indépendante</div><h2>Du producteur à la rencontre locale.</h2><p>Présentez vos produits et vos rendez-vous de vente directe à partir d'un espace simple.</p></div>
      <div class="grid-2"><div class="card"><h3 class="card-title">Catalogue saisonnier · Démonstration</h3><div class="module-row"><div class="module-icon">♧</div><div class="module-text"><div class="module-name">Produits de la ferme</div><div class="module-meta">Fiche d’exemple sans commerce réel</div></div></div><div class="module-row"><div class="module-icon">▤</div><div class="module-text"><div class="module-name">Offres du marché</div><div class="module-meta">Disponible ultérieurement</div></div></div></div>
      <div class="card"><h3 class="card-title">Fonctions futures</h3><p class="subtle">Fiches produits, stocks simplifiés, précommandes et créneaux de retrait. Aucun paiement n'est intégré à ce stade.</p><button class="button" type="button" id="producteurs-sample">Tester le module</button></div></div>
      <div class="notice">Module chargé indépendamment pour ${e(context.organization.name)} : le cœur de Morvan Hub n'a pas été modifié pour le proposer.</div>`;
    const button=root.querySelector('#producteurs-sample');
    const handler=()=>context.notify('Morvan Producteurs est bien chargé comme extension.');
    button.addEventListener('click',handler);
    return () => {button.removeEventListener('click',handler);root.replaceChildren();};
  }
};
