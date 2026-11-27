import { configuration, getClient, repository } from '../shared/backend.mjs';
import { escapeHtml } from '../core/sdk.mjs';
import { validatePhotoSelection, validateImageContent, hydratePhotos } from '../shared/photos.mjs';
const e = value => escapeHtml(value ?? '');

const categories = ['Restaurants & cafés','Hébergements','Producteurs locaux','Artisans & commerces','Nature & randonnée','Patrimoine & culture','Événements & sorties','Activités & loisirs'];
const labels = {draft:'Brouillon',submitted:'À valider',validated:'Validée',published:'Publiée',rejected:'À corriger'};

export async function mountPro(root, { explorerHref = './index.html#explorer' } = {}) {
  const reservationsHref = new URL('./reservations.html',new URL(explorerHref,location.href)).href;
  const welcomeHref = new URL('./livrets.html',new URL(explorerHref,location.href)).href;
  let client, repo, user = null, rows = [], organizations = [], memberships = [], reviews = new Map(), published = new Set();
  let current = null, notice = '', busy = false, generation = 0;
  let directUpdates = new Map();
  let photoFiles = [], photoPaths = [], releasePhotoDownloads = ()=>{};
  function resetPhotos(paths=[]) {
    photoFiles.forEach(item=>URL.revokeObjectURL(item.url)); photoFiles=[]; photoPaths=[...paths];
  }
  const gallery = paths => paths?.length ? `<div class="photo-grid">${paths.map((path,i)=>`<figure><img data-photo-path="${e(path)}" alt="Photo ${i+1} du lieu" loading="lazy"></figure>`).join('')}</div>` : '';
  function renderPhotoSelection() {
    const panel=root.querySelector('#photo-preview');
    if (!panel) return;
    panel.innerHTML=photoPaths.map((path,i)=>`<figure><img data-photo-path="${e(path)}" alt="Photo enregistrée ${i+1}"><figcaption>${button('remove-photo','Retirer',String(i))}</figcaption></figure>`).join('')+
      photoFiles.map((item,i)=>`<figure><img src="${e(item.url)}" alt="Aperçu de ${e(item.file.name)}"><figcaption><span>${e(item.file.name)}</span>${button('remove-selected-photo','Retirer',String(i))}</figcaption></figure>`).join('');
    releasePhotoDownloads(); releasePhotoDownloads=hydratePhotos(root,()=>Promise.resolve(client));
  }
  const button = (action, text, id = '') => `<button type="button" data-action="${action}" data-id="${e(id)}" ${busy?'disabled':''}>${text}</button>`;
  const canEdit = c => c.organization_id ? memberships.some(m => m.organization_id === c.organization_id && ['owner','admin','editor'].includes(m.role)) : c.author_id === user.id;
  const canReview = c => reviews.get(c.organization_id) && c.author_id !== user.id && c.last_editor_id !== user.id;
  const frame = content => `<main class="pro-workspace"><header><a href="${e(explorerHref)}">← Bourgogne Explorer</a><h1>Bourgogne Pro</h1>${user?`<p>${e(user.email)}</p>${button('logout','Se déconnecter')}`:'<p>Connectez-vous pour proposer une adresse et suivre sa validation.</p>'}</header><p role="status" aria-live="polite">${e(notice)}</p>${content}</main>`;
  function render() {
    releasePhotoDownloads();
    if (!user) {
      root.innerHTML = frame(`<section><h2>Connexion</h2><form id="auth-form"><label>Adresse e-mail<input name="email" type="email" autocomplete="email" required></label><label>Mot de passe<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><button name="intent" value="login" ${busy?'disabled':''}>Se connecter</button><button name="intent" value="signup" ${busy?'disabled':''}>Créer un compte</button></form><p>Un nouveau compte doit confirmer son adresse e-mail avant de se connecter. La lecture d’Explorer reste libre.</p></section>`);
      return;
    }
    const c = current;
    const orgOptions = organizations.filter(o => memberships.some(m => m.organization_id === o.id && ['owner','admin','editor'].includes(m.role)));
    root.innerHTML = frame(`<section><h2>Extensions professionnelles</h2><p>Gérez les demandes de table ou de séjour et suivez leurs réponses.</p><a href="${e(reservationsHref)}">Ouvrir les réservations →</a><p>Préparez un livret public pour accueillir vos voyageurs.</p><a href="${e(welcomeHref)}">Gérer mes livrets d’accueil →</a></section><section><h2>${c?'Modifier le brouillon':'Proposer une adresse'}</h2><form id="place-form">
      <label>Organisation<select name="organization" ${c?'disabled':''}><option value="">Contribution personnelle</option>${orgOptions.map(o=>`<option value="${e(o.id)}" ${(c?.organization_id===o.id)?'selected':''}>${e(o.name)}</option>`).join('')}</select></label>
      <label>Nom du lieu<input name="name" required minlength="3" maxlength="100" value="${e(c?.name)}"></label>
      <label>Catégorie<select name="category" required>${categories.map(x=>`<option ${c?.category===x?'selected':''}>${e(x)}</option>`).join('')}</select></label>
      <label>Commune<input name="town" required maxlength="80" value="${e(c?.town)}"></label>
      <label for="place-description">Description</label><textarea id="place-description" name="description" required minlength="12" maxlength="1000">${e(c?.description)}</textarea>
      <label for="place-details">Informations complémentaires</label><textarea id="place-details" name="details" maxlength="5000">${e(c?.details)}</textarea>
      <fieldset class="photo-upload"><legend>Photos du lieu</legend>
        <label for="place-photos">Importer des photos</label>
        <input id="place-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-describedby="photo-help">
        <p id="photo-help">Facultatif · Jusqu’à 5 photos · JPEG, PNG ou WebP · 5 Mo par photo.</p>
        <p>Choisissez des photos que vous êtes autorisé à partager. Elles resteront privées jusqu’à la publication de la fiche.</p>
        <div id="photo-preview" class="photo-grid" aria-live="polite"></div>
      </fieldset>
      <button ${busy?'disabled':''}>Enregistrer le brouillon</button>${c?button('cancel','Annuler'):''}
      <p>Enregistrez vos modifications, puis choisissez leur publication. Les mises à jour courantes d’une fiche publiée dont la gestion est vérifiée peuvent être publiées directement. Les nouvelles fiches et changements d’identité passent par la validation.</p>
    </form></section><section><h2>Contributions et validation</h2>${button('refresh','Actualiser')}
    ${rows.length?rows.map(row=>`<article><h3>${e(row.name)} <small>${labels[row.status]}</small></h3><p>${e(row.town)} · ${e(row.category)}</p><p>${e(row.description)}</p><p>${e(row.details)}</p>${row.review_note?`<p><strong>Retour de validation :</strong> ${e(row.review_note)}</p>`:''}
      ${published.has(row.id)?'<p>Une version publiée est visible sur Explorer.</p>':'<p>Non visible sur Explorer.</p>'}
      ${gallery(row.photo_paths)}
      <div class="pro-actions">
      ${directUpdates.get(row.id)?'<p>Vous pouvez publier cette mise à jour sans validation préalable.</p>'+button('publish-update','Publier mes modifications',row.id):''}
      ${canEdit(row)&&['draft','rejected'].includes(row.status)?button('edit','Modifier',row.id)+button('submit','Soumettre à validation',row.id)+(!published.has(row.id)?button('delete','Supprimer le brouillon',row.id):''):''}
      ${canEdit(row)&&!['draft','rejected'].includes(row.status)?button('revise','Reprendre en brouillon',row.id):''}
      ${canReview(row)&&row.status==='submitted'?button('validate','Valider',row.id):''}
      ${canReview(row)&&['submitted','validated'].includes(row.status)?button('reject','Demander une correction',row.id):''}
      ${canReview(row)&&row.status==='validated'?button('publish','Publier sur Explorer',row.id):''}
      ${reviews.get(row.organization_id)&&published.has(row.id)?button('unpublish','Retirer d’Explorer',row.id):''}
    </div></article>`).join(''):'<p>Aucune contribution accessible pour ce compte.</p>'}</section>`);
    renderPhotoSelection();
  }
  async function refresh() {
    const stamp = ++generation;
    const {data, error} = await client.auth.getUser();
    if (stamp !== generation) return;
    if (error || !data.user) { user = null; rows = []; current = null; resetPhotos(); render(); return; }
    const nextUser = data.user;
    const [nextRows, nextOrgs, memberResult, places] = await Promise.all([
      repo.contributions(), repo.organizations(), client.from('organization_members').select('organization_id,role'), repo.published()
    ]);
    if (memberResult.error) throw new Error(memberResult.error.message);
    const nextReviews = new Map(await Promise.all([...new Set([null,...nextRows.map(c=>c.organization_id)])].map(async id=>[id,await repo.canReview(id)])));
    const nextDirectUpdates = new Map(await Promise.all(nextRows.filter(c=>c.organization_id && c.status==='draft').map(async c=>[c.id,await repo.canPublishUpdate(c.id)])));
    if (stamp !== generation) return;
    user = nextUser; rows = nextRows; organizations = nextOrgs; memberships = memberResult.data; reviews = nextReviews;
    directUpdates = nextDirectUpdates;
    published = new Set(places.map(p=>p.id)); render();
  }
  async function run(task) {
    if (busy) return;
    busy = true;
    const controls=[...root.querySelectorAll('input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')];
    controls.forEach(control=>{control.disabled=true;});
    root.querySelectorAll('button').forEach(b=>{b.disabled=true;});
    try { await task(); }
    catch (error) { notice = `Action non effectuée : ${error.message}`; }
    finally {
      busy = false;
      controls.forEach(control=>{if(control.isConnected)control.disabled=false;});
      // Preserve unsaved form input on failures; status and buttons are updated in place.
      const status = root.querySelector('[role="status"]'); if (status) status.textContent = notice;
      root.querySelectorAll('button').forEach(b=>{b.disabled=false;});
    }
  }
  root.addEventListener('change',event=>{
    if(event.target.id!=='place-photos'||busy)return;
    const input=event.target;const selected=[...input.files];input.value='';
    void run(async()=>{
      validatePhotoSelection(selected,photoPaths.length+photoFiles.length);
      for(const file of selected) {
        await validateImageContent(file);
        const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('Une photo ne peut pas être lue. Choisissez une image valide.');});
        bitmap.close();
      }
      photoFiles.push(...selected.map(file=>({file,url:URL.createObjectURL(file),uploadedPath:null})));
      notice=`${photoPaths.length+photoFiles.length} photo(s) sélectionnée(s). Enregistrez le brouillon pour les conserver.`;
      renderPhotoSelection();
    });
  });
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
        validatePhotoSelection(photoFiles.map(item=>item.file),photoPaths.length);
        current = await repo.save(fields, current, current?.organization_id ?? (fields.organization || null));
        try {
          for(const item of photoFiles) if(!item.uploadedPath)item.uploadedPath=await repo.uploadPhoto(current.id,item.file);
          const paths=[...photoPaths,...photoFiles.map(item=>item.uploadedPath)];
          if(JSON.stringify(paths)!==JSON.stringify(current.photo_paths||[]))current=await repo.setPhotos(current,paths);
        } catch(error) {throw new Error(`Le texte du brouillon est enregistré, mais pas toutes les photos : ${error.message}. Réessayez l’enregistrement.`);}
        current = null; resetPhotos(); notice = 'Brouillon et photos enregistrés dans Supabase.'; await refresh();
      }
    });
  });
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target || busy) return;
    const {action, id} = target.dataset;
    const row = rows.find(c=>c.id===id);
    if(action==='remove-photo'){photoPaths.splice(Number(id),1);renderPhotoSelection();return;}
    if(action==='remove-selected-photo'){const [item]=photoFiles.splice(Number(id),1);if(item)URL.revokeObjectURL(item.url);renderPhotoSelection();return;}
    if (action==='edit') {current=row; resetPhotos(row.photo_paths||[]); render(); root.querySelector('[name="name"]').focus(); return;}
    if (action==='cancel') {current=null; resetPhotos(); render(); return;}
    void run(async () => {
      if (action==='logout') {
        const {error} = await client.auth.signOut(); if (error) throw error;
        ++generation; user=null; rows=[]; current=null; resetPhotos(); notice='Déconnexion effectuée.'; render(); return;
      }
      if (action==='refresh') {current=null; resetPhotos(); await refresh(); return;}
      if (!row) throw new Error('Contribution introuvable. Actualisez la liste.');
      if (action==='delete') {
        if (!window.confirm('Supprimer définitivement ce brouillon ?')) return;
        await repo.remove(row);
      } else {
        let note = '';
        if (action==='reject') {note=window.prompt('Quelle correction est nécessaire ?'); if (note===null) return; if (!note.trim()) throw new Error('Indiquez la correction attendue.');}
        if (action==='unpublish' && !window.confirm('Retirer cette fiche du catalogue public ?')) return;
        if (action==='publish-update') await repo.publishUpdate(row);
        else await repo.transition(row,action,note);
      }
      current=null; resetPhotos(); notice='Modification enregistrée. Explorer affiche les versions publiées lors de son actualisation.'; await refresh();
    });
  });
  try {
    if (configuration().mode !== 'connected') {
      root.innerHTML = frame('<section><h2>Connexion non configurée</h2><p>Le projet Supabase doit être créé et configuré avant de pouvoir utiliser Bourgogne Pro.</p></section>'); return;
    }
    client=await getClient(); repo=repository(client);
    client.auth.onAuthStateChange((event, session)=>{
      if (!session) {++generation; user=null; rows=[]; current=null; resetPhotos(); render();}
      else if (event==='SIGNED_IN' && user?.id !== session.user.id) {
        ++generation; user=null; rows=[]; current=null; resetPhotos(); render();
        // Do not call Supabase from inside its synchronous auth callback.
        setTimeout(()=>{void refresh().catch(error=>{notice=error.message;render();});},0);
      }
    });
    await refresh();
  } catch (error) {notice=error.message; root.innerHTML=frame('<p>Connexion indisponible. Réessayez après vérification de la configuration.</p>');}
}
