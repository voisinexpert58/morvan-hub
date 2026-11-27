import {getClient} from '../shared/backend.mjs';
import {bookMarkup} from './model.mjs';
const root=document.querySelector('#app');
async function start(){try{
 const id=new URLSearchParams(location.search).get('place');
 if(!/^[0-9a-f-]{36}$/i.test(id||''))throw Error('Ce lien de livret est incomplet.');
 const client=await getClient();
 const {data,error}=await client.from('welcome_books').select('place_id,title,content,published_at').eq('place_id',id).maybeSingle();
 if(error)throw error;if(!data)throw Error('Ce livret n’est pas disponible. Contactez votre hébergeur.');
 const result=await client.from('places').select('name,town').eq('id',id).maybeSingle();if(result.error)throw result.error;
 document.title=data.title+' — Livret d’accueil';
 root.innerHTML=bookMarkup(data,result.data||{});
 const toolbar=document.createElement('div');toolbar.className='welcome-toolbar';
 const print=document.createElement('button');print.textContent='Imprimer / enregistrer en PDF';print.onclick=()=>window.print();toolbar.append(print);root.querySelector('header').append(toolbar);
 if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
}catch(error){root.innerHTML='<main class="welcome-main"><h1>Livret indisponible</h1><p role="status"></p><a href="./index.html#explorer">Retour à Bourgogne Explorer</a></main>';root.querySelector('[role=status]').textContent=error.message;}}
void start();
