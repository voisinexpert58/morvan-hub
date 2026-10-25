import React from 'react';
import type { PluginProps } from '@morvan/plugin-sdk';

const cards = [
  {icon:'⌂',title:'Le logement',detail:'Informations et consignes utiles'},
  {icon:'⌖',title:'Explorer le Morvan',detail:'Adresses vérifiées et découvertes locales'},
  {icon:'▣',title:'Agenda du territoire',detail:'Marchés et événements de proximité'},
  {icon:'☎',title:'Contacts',detail:'Joindre votre hébergement'}
];

export default function Accueil({organization, coreApiVersion}: PluginProps) {
  return <div className="module-card"><div style={{background:'#e1ece2',padding:24,borderRadius:12}}><small>MODULE MORVAN ACCUEIL · SDK v{coreApiVersion}</small><h2>Bienvenue à {organization.name}</h2><p>Cette interface vient d'une extension indépendante chargée à l'exécution.</p></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginTop:20}}>
      {cards.map(card=><article key={card.title} style={{padding:16,border:'1px solid #e0e6de',borderRadius:12}}><span style={{fontSize:25}}>{card.icon}</span><h3>{card.title}</h3><p style={{color:'#657a6c',fontSize:13}}>{card.detail}</p></article>)}
    </div><p style={{fontSize:12,color:'#748679',marginTop:18}}>Données d'exemple — ne saisissez aucune information personnelle dans ce prototype.</p></div>;
}
