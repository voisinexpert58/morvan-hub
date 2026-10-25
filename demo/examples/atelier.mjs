/** Exemple d'une NOUVELLE extension à copier dans ../modules/atelier.mjs */
export default {
  id: 'morvan.atelier',
  mount(root, context) {
    root.innerHTML = `<div class="module-banner"><h2>Ateliers & savoir-faire</h2><p>Une nouvelle extension pour ${context.escapeHtml(context.organization.name)}.</p></div><div class="notice">Ajoutée au registre sans modifier le noyau !</div>`;
    return () => root.replaceChildren();
  }
};
