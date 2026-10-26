import { configuration, getClient, repository } from '../shared/backend.mjs';
import { escapeHtml } from '../core/sdk.mjs';
const e = value => escapeHtml(value ?? '');

const categories = ['Restaurants & cafés','Hébergements','Producteurs locaux','Artisans & commerces','Nature & randonnée','Patrimoine & culture','Événements & sorties','Activités & loisirs'];
const labels = {draft:'Brouillon',submitted:'À valider',validated:'Validée',published:'Publiée',rejected:'À corriger'};

export async function mountPro(root, { explorerHref = './index.html#explorer' } = {}) {
  let client, repo, user = null, rows = [], organizations = [], memberships = [], reviews = new Map(), published = new Set();
  let current = null, notice = '', busy = false, generation = 0;
  const button = (action, text, id = '') => `<button type="button" data-action="${action}" data-id="${e(id)}" ${busy?'disabled':''}>${text}</button>`;
  const canEdit = c => c.organization_id ? memberships.some(m => m.organization_id === c.organization_id && ['owner','admin','editor'].includes(m.role)) : c.author_id === user.id;
  const canReview = c => reviews.get(c.organization_id) && c.author_id !== user.id && c.last_editor_id !== user.id;
  const frame = content => `<main class="pro-workspace"><header><a href="${e(explorerHref)}">← Morvan Explorer</a><h1>Morvan Pro</h1>${user?`<p>${e(user.email)}</p>${button('logout','Se déconnecter')}`:'<p>Connectez-vous pour proposer une adresse et suivre sa validation.</p>'}</header><p role="status" aria-live="polite">${e(notice)}</p>${content}</main>`;
  function render() {
    if (!user) {
      root.innerHTML = frame(`<section><h2>Connexion</h2><form id="auth-form"><label>Adresse e-mail<input name="email" type="email" autocomplete="email" required></label><label>Mot de passe<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><button name="intent" value="login" ${busy?'disabled':''}>Se connecter</button><button name="intent" value="signup" ${busy?'disabled':''}>Créer un compte</button></form><p>Un nouveau compte doit confirmer son adresse e-mail avant de se connecter. La lecture d’Explorer reste libre.</p></section>`);
      return;
    }
    const c = current;
    const orgOptions = organizations.filter(o => memberships.some(m => m.organization_id === o.id && ['owner','admin','editor'].includes(m.role)));
    root.innerHTML = frame(`<section><h2>${c?'Modifier le brouillon':'Proposer une adresse'}</h2><form id="place-form">
      <label>Organisation<select name="organization" ${c?'disabled':''}><option value="">Contribution personnelle</option>${orgOptions.map(o=>`<option value="${e(o.id)}" ${(c?.organization_id===o.id)?'selected':''}>${e(o.name)}</option>`).join('')}</select></label>
      <label>Nom du lieu<input name="name" required minlength="3" maxlength="100" value="${e(c?.name)}"></label>
      <label>Catégorie<select name="category" required>${categories.map(x=>`<option ${c?.category===x?'selected':''}>${e(x)}</option>`).join('')}</select></label>
      <label>Commune<input name="town" required maxlength="80" value="${e(c?.town)}"></label>
      <label for="place-description">Description</label><textarea id="place-description" name="description" required minlength="12" maxlength="1000">${e(c?.description)}</textarea>
      <label for="place-details">Informations complémentaires</label><textarea id="place-details" name="details" maxlength="5000">${e(c?.details)}</textarea>
      <button ${busy?'disabled':''}>Enregistrer le brouillon</button>${c?button('cancel','Annuler'):''}
      <p>Le brouillon reste privé. Soumettez-le ensuite à validation ; une personne habilitée distincte de l’auteur doit le valider puis le publier.</p>
    </form></section><section><h2>Contributions et validation</h2>${button('refresh','Actualiser')}
    ${rows.length?rows.map(row=>`<article><h3>${e(row.name)} <small>${labels[row.status]}</small></h3><p>${e(row.town)} · ${e(row.category)}</p><p>${e(row.description)}</p><p>${e(row.details)}</p>${row.review_note?`<p><strong>Retour de validation :</strong> ${e(row.review_note)}</p>`:''}
      ${published.has(row.id)?'<p>Une version publiée est visible sur Explorer.</p>':'<p>Non visible sur Explorer.</p>'}
      <div class="pro-actions">
      ${canEdit(row)&&['draft','rejected'].includes(row.status)?button('edit','Modifier',row.id)+button('submit','Soumettre à validation',row.id)+(!published.has(row.id)?button('delete','Supprimer le brouillon',row.id):''):''}
      ${canEdit(row)&&!['draft','rejected'].includes(row.status)?button('revise','Reprendre en brouillon',row.id):''}
      ${canReview(row)&&row.status==='submitted'?button('validate','Valider',row.id):''}
      ${canReview(row)&&['submitted','validated'].includes(row.status)?button('reject','Demander une correction',row.id):''}
      ${canReview(row)&&row.status==='validated'?button('publish','Publier sur Explorer',row.id):''}
      ${reviews.get(row.organization_id)&&published.has(row.id)?button('unpublish','Retirer d’Explorer',row.id):''}
      </div></article>`).join(''):'<p>Aucune contribution accessible pour ce compte.</p>'}</section>`);
  }
  async function refresh() {
    const stamp = ++generation;
    const {data, error} = await client.auth.getUser();
    if (stamp !== generation) return;
    if (error || !data.user) { user = null; rows = []; current = null; render(); return; }
    const nextUser = data.user;
    const [nextRows, nextOrgs, memberResult, places] = await Promise.all([
      repo.contributions(), repo.organizations(), client.from('organization_members').select('organization_id,role'), repo.published()
    ]);
    if (memberResult.error) throw new Error(memberResult.error.message);
    const nextReviews = new Map(await Promise.all([...new Set([null,...nextRows.map(c=>c.organization_id)])].map(async id=>[id,await repo.canReview(id)])));
    if (stamp !== generation) return;
    user = nextUser; rows = nextRows; organizations = nextOrgs; memberships = memberResult.data; reviews = nextReviews;
    published = new Set(places.map(p=>p.id)); render();
  }
  async function run(task) {
    if (busy) return;
    busy = true;
    root.querySelectorAll('button').forEach(b=>{b.disabled=true;});
    try { await task(); }
    catch (error) { notice = `Action non effectuée : ${error.message}`; }
    finally {
      busy = false;
      // Preserve unsaved form input on failures; status and buttons are updated in place.
      const status = root.querySelector('[role="status"]'); if (status) status.textContent = notice;
      root.querySelectorAll('button').forEach(b=>{b.disabled=false;});
    }
  }
  root.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form));
    const intent = event.submitter?.value;
    void run(async () => {
      if (form.id === 'auth-form') {
        const result = intent === 'signup' ? await client.auth.signUp({email:fields.email,password:fields.password}) : await client.auth.signInWithPassword({email:fields.email,password:fields.password});
        if (result.error) throw new Error(result.error.message);
        notice = intent === 'signup' ? 'Compte demandé. Consultez votre e-mail pour confirmer votre inscription.' : 'Connexion réussie.';
        form.reset(); await refresh();
      } else if (form.id === 'place-form') {
        await repo.save(fields, current, current?.organization_id ?? (fields.organization || null));
        current = null; notice = 'Brouillon enregistré dans Supabase.'; await refresh();
      }
    });
  });
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target || busy) return;
    const {action, id} = target.dataset;
    const row = rows.find(c=>c.id===id);
    if (action==='edit') {current=row; render(); root.querySelector('[name="name"]').focus(); return;}
    if (action==='cancel') {current=null; render(); return;}
    void run(async () => {
      if (action==='logout') {
        const {error} = await client.auth.signOut(); if (error) throw error;
        ++generation; user=null; rows=[]; current=null; notice='Déconnexion effectuée.'; render(); return;
      }
      if (action==='refresh') {current=null; await refresh(); return;}
      if (!row) throw new Error('Contribution introuvable. Actualisez la liste.');
      if (action==='delete') {
        if (!window.confirm('Supprimer définitivement ce brouillon ?')) return;
        await repo.remove(row);
      } else {
        let note = '';
        if (action==='reject') {note=window.prompt('Quelle correction est nécessaire ?'); if (note===null) return; if (!note.trim()) throw new Error('Indiquez la correction attendue.');}
        if (action==='unpublish' && !window.confirm('Retirer cette fiche du catalogue public ?')) return;
        await repo.transition(row,action,note);
      }
      current=null; notice='Modification enregistrée. Explorer affiche les versions publiées lors de son actualisation.'; await refresh();
    });
  });
  try {
    if (configuration().mode !== 'connected') {
      root.innerHTML = frame('<section><h2>Connexion non configurée</h2><p>Le projet Supabase doit être créé et configuré avant de pouvoir utiliser Morvan Pro.</p></section>'); return;
    }
    client=await getClient(); repo=repository(client);
    client.auth.onAuthStateChange((event, session)=>{
      if (!session) {++generation; user=null; rows=[]; current=null; render();}
      else if (event==='SIGNED_IN' && user?.id !== session.user.id) {
        ++generation; user=null; rows=[]; current=null; render();
        // Do not call Supabase from inside its synchronous auth callback.
        setTimeout(()=>{void refresh().catch(error=>{notice=error.message;render();});},0);
      }
    });
    await refresh();
  } catch (error) {notice=error.message; root.innerHTML=frame('<p>Connexion indisponible. Réessayez après vérification de la configuration.</p>');}
}
