import {getClient} from '../shared/backend.mjs';
import {escapeHtml as e} from '../core/sdk.mjs';
const root=document.querySelector('#app');
const professional=root.dataset.space!=='personal';
if(professional && new URLSearchParams(location.search).has('place'))location.replace('./particulier.html'+location.search);
const placeId=new URLSearchParams(location.search).get('place');
const labels={pending:'En attente',accepted:'Acceptée',declined:'Refusée',cancelled:'Annulée'};
let client,user,settings=[],requests=[],places=[],managed=new Set(),busy=false,generation=0;
const check=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const name=id=>places.find(p=>p.id===id)?.name||'Établissement';
const format=value=>new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});
const field=(label,name,type,extra='')=>`<label>${label}<input name="${name}" type="${type}" ${extra}></label>`;
async function refresh(){
 const stamp=++generation;
 const nextUser=(await client.auth.getUser()).data.user;
 const nextPlaces=check(await client.from('places').select('id,name').order('name'));
 const nextSettings=check(await client.from('reservation_settings').select('*'));
 const nextManaged=new Set();let nextRequests=[];
 if(nextUser){
  if(professional)for(const s of nextSettings)if(check(await client.rpc('manages_reservations',{p_id:s.place_id})))nextManaged.add(s.place_id);
  let query=client.from('reservation_requests').select('*').order('created_at',{ascending:false}).limit(200);
  if(!professional)query=query.eq('requester_id',nextUser.id);
  else if(nextManaged.size)query=query.in('place_id',[...nextManaged]);
  nextRequests=professional&&!nextManaged.size?[]:check(await query);
  nextRequests=nextRequests.filter(r=>professional?nextManaged.has(r.place_id):r.requester_id===nextUser.id);
 }
 if(stamp!==generation)return;
 user=nextUser;places=nextPlaces;settings=nextSettings;managed=nextManaged;requests=nextRequests;
 render();
}
function render(){
 const selected=settings.find(s=>s.place_id===placeId&&s.enabled&&s.entitled);
 root.innerHTML=`<main class="pro-workspace"><header><a href="./index.html#explorer">← Morvan Explorer</a> · <a href="./pro.html">Espace Pro</a><h1>${professional?"Morvan Pro — Réservations":"Mon espace particulier"}</h1><p>${professional?"Recevez et traitez les demandes de vos établissements.":"Préparez vos sorties et vos séjours, puis suivez vos demandes. Une demande reste en attente jusqu’à la réponse de l’établissement."}</p><nav class="personal-nav" aria-label="Mes espaces"><a href="./particulier.html">Mes réservations personnelles</a><a href="./index.html#favoris">Mes favoris</a><a href="./index.html#explorer">Découvrir des adresses</a></nav>${user?`<p>${e(user.email)}</p><button data-action="logout">Se déconnecter</button>`:''}</header><p role="status" aria-live="polite"></p>
 ${!user?`<section><h2>${professional?"Connexion professionnelle":"Connexion à mon espace particulier"}</h2><form id="login">${field('Adresse e-mail','email','email','required autocomplete="email"')}${field('Mot de passe','password','password','required minlength="8" autocomplete="current-password"')}<button value="login">Se connecter</button><button value="signup">Créer un compte</button></form><p>Après inscription, confirmez votre adresse e-mail puis revenez vous connecter ici.</p></section>`:''}
 ${!professional?(placeId?`<section><h2>${e(name(placeId))}</h2>${selected&&user?`<form id="request"><label>Type de demande<select name="kind">${selected.tables?'<option value="table">Table au restaurant</option>':''}${selected.stays?'<option value="stay">Séjour</option>':''}</select></label>${field('Date et heure souhaitées / arrivée','start','datetime-local','required')}${field('Départ (séjour uniquement)','end','datetime-local')}
 <p>Les heures sont exprimées dans le fuseau de votre appareil : ${e(Intl.DateTimeFormat().resolvedOptions().timeZone)}.</p>
 ${field('Nombre de personnes','guests','number','required min="1" max="30" value="2"')}${field('Votre nom','name','text','required minlength="2" maxlength="100" autocomplete="name"')}${field('Téléphone de contact','phone','tel','required minlength="6" maxlength="40" autocomplete="tel"')}<label>Précisions facultatives<textarea name="message" maxlength="1000"></textarea></label><p>Votre nom, votre téléphone et votre message sont accessibles à l’établissement. Aucun paiement n’est demandé.</p><button>Envoyer la demande</button></form>`:selected?'<p>Connectez-vous pour faire une demande.</p>':'<p>Les demandes en ligne ne sont pas ouvertes pour cet établissement.</p>'}</section>`:`<section><h2>Établissements acceptant les demandes</h2>${settings.filter(s=>s.entitled&&s.enabled).map(s=>`<p><a href="?place=${encodeURIComponent(s.place_id)}">${e(name(s.place_id))}</a></p>`).join('')||'<p>Aucun établissement ne propose encore cette extension.</p>'}</section>`):''}
 ${user?`<section><h2>${professional?"Demandes reçues":"Mes demandes et réponses"}</h2><p>Les réponses sont consultables ici. Aucun e-mail automatique n’est envoyé dans cette première version. Les 200 demandes les plus récentes sont affichées.</p><button data-action="refresh">Actualiser</button>${requests.map(r=>`<article><h3>${e(name(r.place_id))} — ${labels[r.status]}</h3><p>${r.kind==='table'?'Table':'Séjour'} · ${e(format(r.starts_at))}${r.ends_at?' → '+e(format(r.ends_at)):''} · ${r.guests} personne(s)</p><p>${e(r.contact_name)} · ${e(r.contact_phone)}</p><p>${e(r.message)}</p>${r.response?`<p>Réponse : ${e(r.response)}</p>`:''}<div class="pro-actions">${professional&&managed.has(r.place_id)&&r.status==='pending'?`<button data-action="accepted" data-id="${r.id}">Accepter</button><button data-action="declined" data-id="${r.id}">Refuser</button>`:''}${!professional&&r.requester_id===user.id&&['pending','accepted'].includes(r.status)?`<button data-action="cancelled" data-id="${r.id}">Annuler ma demande</button>`:''}</div></article>`).join('')||'<p>Aucune demande accessible.</p>'}</section>
 ${professional?`<section><h2>Mon extension Réservations</h2>${settings.filter(s=>managed.has(s.place_id)).map(s=>`<form class="reservation-config" data-place="${s.place_id}"><h3>${e(name(s.place_id))}</h3><p>${s.entitled?'Extension incluse':'Extension non incluse dans votre formule'}</p><label>Réception des demandes<select name="enabled"><option value="false">Fermée</option><option value="true" ${s.enabled?'selected':''}>Ouverte</option></select></label><label>Type de réservation<select name="mode"><option value="table" ${s.tables&&!s.stays?'selected':''}>Tables</option><option value="stay" ${s.stays&&!s.tables?'selected':''}>Séjours</option><option value="both" ${s.tables&&s.stays?'selected':''}>Tables et séjours</option></select></label><button ${s.entitled?'':'disabled'}>Enregistrer les réglages</button></form>`).join('')||'<p>Cette extension nécessite une fiche rattachée à votre organisation, une gestion vérifiée et un accès inclus dans votre formule. Aucun accès professionnel n’est attribué automatiquement.</p>'}</section>`:''}`:''}</main>`;
}
async function run(task){
 if(busy)return;busy=true;const buttons=[...root.querySelectorAll('button:not(:disabled)')];buttons.forEach(b=>b.disabled=true);
 try{const notice=await task();await refresh();root.querySelector('[role=status]').textContent=notice||'Modification enregistrée.';}
 catch(error){root.querySelector('[role=status]').textContent=error.message;}
 finally{busy=false;buttons.forEach(b=>{if(b.isConnected)b.disabled=false;});}
}
root.addEventListener('submit',event=>{
 event.preventDefault();const form=event.target;if(!form.reportValidity())return;const f=Object.fromEntries(new FormData(form));const intent=event.submitter?.value;
 void run(async()=>{
  if(form.id==='login'){check(await (intent==='signup'?client.auth.signUp({email:f.email,password:f.password}):client.auth.signInWithPassword({email:f.email,password:f.password})));return intent==='signup'?'Confirmez votre adresse e-mail avant de vous connecter.':'Connexion réussie.';}
  if(form.id==='request'){
   if(f.kind==='stay'&&(!f.end||new Date(f.end)<=new Date(f.start)))throw Error('Indiquez un départ après l’arrivée.');
   check(await client.rpc('request_reservation',{p_place:placeId,p_kind:f.kind,p_start:new Date(f.start).toISOString(),p_end:f.kind==='stay'?new Date(f.end).toISOString():null,p_guests:Number(f.guests),p_name:f.name,p_phone:f.phone,p_message:f.message}));return 'Demande envoyée. Elle reste en attente de la réponse de l’établissement.';
  }
  check(await client.rpc('configure_reservations',{p_id:form.dataset.place,p_enabled:f.enabled==='true',p_tables:f.mode!=='stay',p_stays:f.mode!=='table'}));
 });
});
root.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;
 const {action,id}=button.dataset;
 void run(async()=>{
  if(action==='refresh')return 'Liste actualisée.';
  if(action==='logout'){check(await client.auth.signOut());return 'Déconnexion effectuée.';}
  const r=requests.find(r=>r.id===id);if(!r)throw Error('Actualisez la liste.');
  if(action==='cancelled'&&!confirm('Annuler cette demande ?'))return 'Demande conservée.';
  const response=action==='cancelled'?'':prompt(action==='accepted'?'Confirmez avoir vérifié la disponibilité. Message au client :':'Message au client :','');if(response===null)return 'Réponse non envoyée.';
  check(await client.rpc('respond_reservation',{p_id:id,p_version:r.version,p_status:action,p_response:response}));
 });
});
async function start(){try{client=await getClient();client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){++generation;user=null;requests=[];settings=[];managed.clear();render();}});await refresh();}
catch(error){root.innerHTML='<main class="pro-workspace"><h1>Réservations indisponibles</h1><p role="status"></p></main>';root.querySelector('[role=status]').textContent=error.message;}

}
void start();
