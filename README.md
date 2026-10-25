# Morvan Hub — V1 en cours de construction (starter technique 0.1)

**Mise à jour du dossier : 20 octobre 2026 · version produit V1 en cours de construction**

> **Nomenclature :** « starter technique 0.1 » est le nom de la livraison initiale du prototype, pas une version commerciale V0.1 ni l’annonce d’une V2. Consulter `ETAT-PROJET-V1.md` et `Morvan-Hub-Backlog-2026-10-20.md` pour le périmètre officiel de la V1.

Ce dossier constitue le point de départ de **Morvan Explorer** (guide touristique indépendant, lancement sur Mhère) et de **Morvan Pro** (outils commerciaux ajoutés sous forme de modules). Il contient **deux parties complémentaires** :

1. `demo/` — **deux démonstrateurs utilisables sans npm** : Morvan Explorer public à l’ouverture et Morvan Pro séparé, avec 3 modules, activation par établissement et chargement dynamique.
2. `platform/` — **squelette React + TypeScript + Vite + Module Federation**, modèle de SDK et migration PostgreSQL/Supabase.

> Attention : cette livraison est un prototype / starter et **pas un produit en production**. Les données sont fictives, la démonstration ne possède pas d'authentification réelle et le projet React/Vite n'a pas pu être compilé dans cet environnement isolé sans accès au registre npm.

## A. Lancer immédiatement le démonstrateur

### Windows 10/11

1. Décompresser l'archive.
2. Ouvrir un terminal dans le dossier `demo`.
3. Vérifier l'installation de Python (`py --version`).
4. Exécuter :

```powershell
py -m http.server 8080
```

5. Ouvrir : **http://localhost:8080/** pour **Morvan Explorer** ; cliquer sur « Espace Pro » ou ouvrir **http://localhost:8080/pro.html** pour l’administration.

Si `py` ne fonctionne pas, essayer `python -m http.server 8080`. Ne pas ouvrir le fichier HTML directement en double-cliquant : les imports ESM et `fetch` nécessitent un serveur HTTP.

### macOS / Linux

```bash
cd demo
python3 -m http.server 8080
```

Puis ouvrir **http://localhost:8080/** (Explorer) ou **http://localhost:8080/pro.html** (Pro).

### Ce que l'on peut tester

**Morvan Explorer — interface publique (racine `/`)** : accueil illustré, huit catégories, 12 fiches *entièrement fictives*, recherche par nom/commune/mot-clé, filtres, favoris locaux, pages détaillées, agenda de présentation, carte du territoire (fond OpenStreetMap chargé par Internet, sans marqueurs fictifs) et formulaire de proposition sauvegardé localement sans publication ni envoi à un serveur.

**Morvan Pro — administration (`/pro.html`)** :

- Tableau de bord et catalogue des modules.
- Activation et désactivation d'**Accueil**, d'**Agenda** et de **Producteurs**.
- Activation **par établissement** : sélectionner successivement « Le Mhère-veille », « Auberge exemple » et « Association exemple ».
- Ouverture d'un module activé, téléchargé dynamiquement par l'application.
- L’onglet « Fiches en aperçu » de Pro reste un aperçu interne de la base fictive ; il est distinct du guide public qui s’ouvre désormais à la racine du serveur.
- Persistance locale des interrupteurs lors du rechargement du navigateur.

**IMPORTANT :** l'activation locale est une simulation UX, pas un mécanisme de facturation ou d'autorisation. Le navigateur n'envoie aucune donnée à Supabase.

## B. Test décisif : ajouter un nouveau module SANS modifier le noyau

1. Copier `demo/examples/atelier.mjs` vers `demo/modules/atelier.mjs`.
2. Ouvrir `demo/config/modules.json`.
3. Ajouter dans le tableau `modules` le contenu du fichier `demo/examples/atelier-manifest.json`.
4. Enregistrer le JSON (respecter les virgules entre objets).
5. Recharger la page et ouvrir **Modules**.
6. Activer **Morvan Ateliers** puis l'ouvrir.

**Aucun changement dans `demo/core/app.mjs` ou `demo/core/sdk.mjs`.** Ce premier exercice valide le **contrat de plugin**. Le registre est un fichier de configuration, non du code applicatif.

### Lancer les tests automatiques

Depuis le dossier racine de l'archive :

```bash
node --test demo/tests/*.test.mjs
```

Les tests contrôlent notamment les identifiants, le schéma de manifeste, les imports dynamiques et le fait qu'un nouvel outil peut s'ajouter en laissant le noyau inchangé.

## C. Lancer le socle React/Vite avec Module Federation

**Prérequis :** Node.js récent (>= 22.12), npm et accès à Internet pour installer les dépendances.

Ouvrir un terminal dans le dossier `platform` :

```bash
npm install
npm run check:registry
npm run typecheck
npm run build:accueil
```

**Terminal 1 : publier l'extension locale (build prévisualisé)**

```bash
npm run serve:accueil
```

**Terminal 2 : démarrer le noyau Morvan Pro**

```bash
npm run dev:shell
```

Naviguer vers **http://localhost:4100**. Le module `morvan_accueil` est fourni par le serveur **http://localhost:4201/remoteEntry.js**.

Les dépendances sont choisies à partir des publications consultées le 19 octobre 2026, mais la compatibilité pratique doit être validée lors du premier `npm install`, `typecheck`, `build` et test navigateur. **Ces étapes ne sont pas déclarées testées.**

### Ajouter une extension fédérée en production

1. Créer une nouvelle application distante avec son propre `vite.config.ts`, un nom Federation unique et un composant exposé `./App`.
2. Publier l'extension sur **une origine HTTPS approuvée**.
3. Ajouter **une ligne dans le registre**, à terme stocké côté serveur dans `module_catalog`.
4. Autoriser son domaine dans la configuration `VITE_TRUSTED_MODULE_ORIGINS`.
5. Activer le module pour les organisations qui y ont droit.

Les composants du noyau ne changent pas. Le chargement JS distant ne doit être autorisé que pour des extensions produites et validées par Morvan Hub : **ce n'est pas une sandbox**.

## D. Supabase / PostgreSQL

Migration initiale à examiner puis appliquer sur un **projet Supabase de développement** :

`platform/supabase/migrations/20261019_001_core.sql`

Elle crée :

- `organizations` — établissements/clients.
- `organization_members` — rôles d'accès par organisation.
- `module_catalog` — catalogue central des modules approuvés.
- `organization_modules` — activation par organisation.
- `module_audit` — journal des activations/désactivations.
- Fonctions `private.is_org_member` / `private.is_org_manager` et politiques **Row Level Security**.

**Non fait :** connexion React↔Supabase, authentification réelle, facturation Stripe, règles de paiement, journalisation des autres actions, tests de sécurité de base de données, interface de création d'organisations, API des fiches touristiques, import DATAtourisme/OSM et déploiement réel. Il serait dangereux de présenter ces fonctions comme existantes.

**Sécurité :** n'ajoutez jamais de clé Supabase `service_role` dans un fichier Vite, JavaScript navigateur, HTML ou un dépôt Git. Les configurations de production et le catalogue des remotes doivent être administrés côté serveur. Les permissions doivent être vérifiées par la base/API, jamais uniquement par les interrupteurs du navigateur.

## E. Architecture cible

```text
Morvan Explorer (guide public)
          │
          ▼
API et données vérifiées (Supabase / Postgres / PostGIS)
          │
          ▼
Morvan Pro Shell (React/Vite)
  ├── compte et organisation
  ├── catalogue des modules
  ├── droits et abonnements
  └── charge les modules approuvés
          ├── Morvan Accueil (remote indépendant)
          ├── Morvan Agenda (à fédérer)
          ├── Morvan Producteurs (à fédérer)
          └── prochains outils (à créer)
```

La démonstration prouve l'idée des plugins sans dépendances. Le code `platform/` prépare le système **Module Federation** pour de vrais déploiements indépendants. Le guide public Astro/React, la cartographie et les données métiers font partie des sprints suivants, pas de cette livraison fondations.

## F. Validation obtenue et limites

- [x] Fichiers du starter créés.
- [x] Script de vérification de registre React : exécuté.
- [x] Contrôle syntaxique Node pour les fichiers JavaScript principaux.
- [x] Tests unitaires du démonstrateur lancés avec Node.
- [x] Fichiers de la démonstration accessibles par serveur HTTP local.
- [ ] Scénario navigateur complet (environnement de test empêchant l'ouverture de localhost par Chromium). Les tests Node du parcours public et des données fictives réussissent.
- [ ] Installation npm, compilation du projet React et test Federation réel (registre npm inaccessible ici).
- [ ] Déploiement de la base Supabase et tests RLS réels.
- [ ] Authentification, autorisations et facturation en production.

## G. Priorités actualisées au sein de la V1

1. **Poursuivre le parcours Explorer** (MH-074, partie démo : codée) : tester manuellement les parcours en navigateur, puis intégrer un vrai catalogue éditorial, une carte de lieux vérifiés, un backend et une modération avant la production.
2. Valider une installation réelle `npm install` et la communication Module Federation (MH-012/MH-013).
3. Brancher Supabase Auth et le catalogue des modules à l'application React ; vérifier les règles RLS entre organisations.
4. Construire les données touristiques partagées et l'interface Explorer complète (MH-025 à MH-034), avec de vraies fiches vérifiées de Mhère.
5. Transformer Morvan Accueil en éditeur multi-hébergement, sans copier de données sensibles dans le prototype.

La version V1 ne sera terminée que lorsque **Morvan Explorer public et Morvan Pro connecté fonctionnent ensemble**, avec les critères de sécurité et de publication validés.

---

**Positionnement préservé** : Morvan Explorer reste un guide touristique indépendant, éditorial et participatif ; Morvan Pro peut vendre des modules professionnels sans vendre les classements ni les coups de cœur du guide.
