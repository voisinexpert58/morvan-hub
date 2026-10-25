export default {
  id: 'morvan.agenda',
  mount(root, context) {
    root.style.padding='22px';
    const e=context.escapeHtml;
    const org=context.organization;
    root.innerHTML=`<div class="module-banner"><div class="eyebrow">Morvan Agenda · Démonstration</div><h2>Faites vivre le territoire.</h2><p>Préparez vos manifestations, communiquez au bon moment et affichez les rendez-vous locaux.</p></div>
    <div class="grid-2"><section class="card"><h3 class="card-title">Programme type</h3>
      ${[['3e vendredi du mois','Marché mensuel — exemple'],['Selon programmation','Concert ou scène ouverte — exemple'],['À confirmer','Atelier de découverte — exemple']].map(([d,n])=>`<div class="module-row"><div class="module-icon">▣</div><div class="module-text"><div class="module-name">${n}</div><div class="module-meta">${d}</div></div><span class="pill off">Brouillon</span></div>`).join('')}
    </section><section class="card"><h3 class="card-title">Outils prévus</h3>
      ${[['Préparer l’annonce','Texte clair pour presse et réseaux sociaux'],['Créer une page publique','Programme et informations pratiques'],['Générer des supports','QR code et affiche à imprimer'],['Suivre les validations','Brouillon, validé, publié']].map(([a,b])=>`<div class="little-card"><span class="dot"></span><div><div class="module-name">${a}</div><div class="subtle">${b}</div></div></div>`).join('')}
    </section></div><div class="notice">Organisation active : ${e(org.name)}. Aucune publication réelle n'est effectuée dans ce démonstrateur.</div>`;
    return () => root.replaceChildren();
  }
};
