# Morvan Hub V1 — intégration Supabase

## État réel

**Actualisation du 27 octobre 2026 :** la PR n°7 est fusionnée. Le projet Supabase est créé et les deux migrations sont appliquées ; les tables sont vides, RLS est activée et les requêtes anonymes vers les contributions sont refusées. Le client local est configuré avec la clé publique. La prévisualisation PageShare n'a pas été republiée et conserve sa protection.

L'historique distant a enregistré ces migrations sous `20261026100415_core` et `20261026100441_places_contributions`. Leur SQL a été comparé intégralement aux fichiers du dépôt (seuls les retours à la ligne et espaces de fin ont été normalisés) : il est identique. Les fichiers sont renommés pour reprendre ces identifiants canoniques, sans nouvelle migration et sans modification de la base ni de son historique. Les anciens noms étaient `20261019_001_core.sql` et `20261025_002_places_contributions.sql`. Les tests utilisent les noms canoniques ; ne pas conserver de copies sous les anciens noms dans le dossier des migrations.

Pour d'autres environnements ayant déjà appliqué les anciens identifiants, vérifier leur historique avant toute mise à jour : ce renommage correspond au projet Morvan Hub actuel et ne répare pas automatiquement les autres bases. Pour ce projet, les deux migrations doivent être reconnues comme déjà appliquées lors de la prochaine synchronisation.

Les sections suivantes conservent le contexte de préparation du 25 octobre et les instructions d'installation. La création du projet et l'application initiale des migrations sont désormais effectuées. La recette Auth avec deux comptes distincts et l'attribution du rôle de réviseur restent à réaliser.

Le 25 octobre 2026, aucun projet Supabase n'existe pour Morvan Hub (confirmation du propriétaire). Cette modification prépare le code, les migrations, les tests et le parcours utilisateur. Elle **ne déploie aucune base ni aucun site**. La prévisualisation PageShare existante et son mot de passe restent inchangés.

## Audit du dépôt de départ

Révision examinée : `501a80a5eb10963940bfc6621bcd2ee2d7bad497`.

| Élément | Constat | Traitement |
| --- | --- | --- |
| Explorer (`demo/explorer/app.mjs`) | Catalogue JSON fictif, contributions en localStorage, pas de backend | Lecture Supabase des seules fiches publiées. Démonstration uniquement sur activation explicite. Aucun repli fictif après erreur réseau. |
| Pro (`demo/core/app.mjs`) | Organisations et activations simulées, aucune authentification | Entrée `pro.html` remplacée par un espace connecté. Les anciens fichiers restent comme exemples techniques sans données privées. |
| Socle React (`platform/apps/pro-shell`) | Organisation codée en dur, modules activés par localStorage | Son entrée utilise le même espace Pro authentifié. La fédération des modules n'est pas intégrée au nouveau parcours métier. |
| Migration `20261019_001_core.sql` | Organisations, membres, catalogue, modules et audit. RLS activée, privilèges explicites, fonctions qualifiées avec `search_path` vide. Aucune table de lieux/contributions. | Migration conservée sans réécriture. Nouvelle migration additive pour le parcours éditorial. |
| Tests et CI | Tests Node du démonstrateur ; aucune vérification des règles de base | Tests PostgreSQL embarqué, tests de navigateur, configuration Supabase locale et tests pgTAP. |
| Configuration | Aucun client Supabase, aucune configuration réelle observée | `.env.example`, garde avant compilation et dépendance Supabase verrouillée. |

La migration du noyau conserve ses limites antérieures : administration des membres par un processus privilégié, facturation non implémentée et audit de modules limité aux bascules INSERT/UPDATE. Ces fonctions ne constituent pas un contrôle d'abonnement opérationnel. Aucun rôle n'est déduit des métadonnées utilisateur modifiables.

## Modèle et droits

`contributions` conserve l'auteur, le dernier éditeur, l'organisation éventuelle, le contenu, l'état, le numéro de version et le retour de validation. `places` est une copie de publication : seulement les champs destinés au public, jamais les identifiants des contributeurs, l'organisation ou les notes privées. Une fiche publique référence sa contribution, ce qui empêche de supprimer par erreur une source encore publiée.

| Acteur | Accès |
| --- | --- |
| Visiteur sans compte | Lecture de `places` seulement ; aucune contribution privée ni écriture |
| Compte sans organisation | Création et gestion de ses propres propositions personnelles |
| Membre `viewer` | Lecture des contributions de son organisation |
| Membre `editor`, `admin`, `owner` | Création/modification des brouillons de son organisation |
| `admin`/`owner` | Validation/publication/retrait pour son organisation |
| Réviseur éditorial | Validation/publication/retrait des propositions personnelles et des organisations |

L'auteur **et le dernier éditeur** ne peuvent pas valider ou publier leur propre contenu, même s'ils sont responsables. Une seconde personne habilitée est nécessaire. Les réviseurs éditoriaux sont inscrits dans `private.editorial_reviewers` uniquement par l'administrateur de la base ; aucune interface ne permet de s'attribuer un rôle.

Toutes les tables nouvelles ont RLS activée. Les tables privées n'ont aucun droit accordé au navigateur. Les tables métier n'accordent aucun INSERT/UPDATE/DELETE direct au navigateur : les fonctions RPC vérifient l'identité, l'appartenance à l'organisation, le rôle, l'état et la version avant de modifier une ligne verrouillée. Elles ont un `search_path` vide et des droits EXECUTE limités à `authenticated`. La lecture reste protégée par les politiques RLS. Les changements sont journalisés dans une table privée.

## Parcours fonctionnel

1. Explorer est consultable sans connexion. Son lien de contribution dirige vers Pro.
2. Le contributeur crée un compte, confirme son e-mail puis se connecte (ou utilise un compte existant).
3. Il crée un brouillon personnel ou pour une organisation dont il est éditeur. Il peut le modifier ou le supprimer.
4. Il soumet le brouillon. Le contenu devient non modifiable tant qu'il n'est pas repris en brouillon.
5. Une autre personne habilitée valide, ou demande une correction avec un motif.
6. Une action distincte publie la version validée. Explorer la charge à sa prochaine ouverture/actualisation ou au retour sur son onglet.
7. Une modification ultérieure reprend la contribution en brouillon ; la dernière copie publiée reste visible jusqu'à une nouvelle publication.
8. Un responsable peut retirer la copie publique. Le brouillon peut ensuite être supprimé par un éditeur autorisé.

Les versions empêchent l'écrasement silencieux d'une modification concurrente. En cas de conflit, actualiser avant de reprendre l'action. L'interface affiche les erreurs de sauvegarde et conserve le formulaire. Un compte personnel n'a pas besoin d'abonnement professionnel pour contribuer ; l'authentification sert à attribuer et suivre les propositions. Les contributions totalement anonymes ne sont pas ouvertes dans cette étape.

## Installation et configuration publique

À la racine du dépôt, avec Node 22 et npm :

```sh
npm ci
# Copier .env.example vers .env.local puis renseigner les deux valeurs publiques.
npm run dev
```

URL locale : `http://localhost:5173/index.html` et `http://localhost:5173/pro.html`.

```dotenv
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLIQUE
VITE_DEMO_MODE=false
```

La clé publishable est destinée au navigateur. Une ancienne clé JWT de rôle `anon` est acceptée. Les clés `sb_secret_*`, les JWT `service_role` et les variables VITE portant un nom de secret sont refusés avant compilation. Aucune clé privilégiée n'est nécessaire au site. `.env.local` est ignoré par Git. Ne jamais mettre de mot de passe de base, de jeton d'administration ou de clé privilégiée dans une variable `VITE_*`.

Sans configuration, les deux entrées affichent « non configuré ». Pour examiner uniquement le catalogue fictif, vider les deux valeurs Supabase et mettre `VITE_DEMO_MODE=true`. Pro n'autorise alors aucune fausse connexion. La publication se construit avec `npm run build` dans `dist/` ; le serveur Python historique ne remplace pas cette compilation.

Le socle optionnel `platform/apps/pro-shell` partage le même écran connecté et le même `.env.local` à la racine. Installer d'abord les dépendances de la racine, puis celles de `platform`. Configurer `VITE_EXPLORER_URL` vers Explorer si le socle est hébergé sur une origine distincte. L'usage principal recommandé pour cette étape est la compilation multipage à la racine.

## Activation sur un projet Supabase à créer

1. Créer le projet depuis le tableau de bord Supabase et conserver les identifiants de base dans un gestionnaire de secrets, hors Git et hors conversation.
2. Utiliser Supabase CLI `2.122.0`. Depuis le dépôt, `supabase link --workdir platform --project-ref VOTRE_REFERENCE` puis `supabase db push --workdir platform --dry-run`. Vérifier l'historique du projet cible : si la migration du noyau a déjà été appliquée manuellement, réconcilier son historique avant toute application. Ne pas réexécuter aveuglément une migration contenant des créations de politiques/triggers.
3. Après vérification, appliquer les migrations avec `supabase db push --workdir platform`. La migration nouvelle doit être appliquée avant d'utiliser les nouveaux écrans.
4. Activer l'authentification e-mail/mot de passe avec confirmation d'e-mail. Configurer l'URL du site et la liste des redirections autorisées vers l'URL réellement retenue ; prévoir l'envoi des e-mails de confirmation. Les paramètres de `config.toml` concernent le développement local et ne prouvent pas la configuration distante.
5. Créer au moins deux comptes confirmés : contributeur et réviseur. Dans l'éditeur SQL administrateur, ajouter l'UUID Auth du réviseur à `private.editorial_reviewers`. Pour les organisations, créer l'organisation puis ses lignes `organization_members` avec les rôles explicitement choisis. Ne jamais autoriser l'auto-attribution depuis le navigateur.
6. Renseigner uniquement l'URL et la clé publique dans `.env.local`, reconstruire, puis tester le parcours complet sur le projet de test : anonyme, contributeur, réviseur et compte extérieur.
7. Vérifier les paramètres Auth, les droits et l'absence de données de test avant toute mise en ligne. Publier séparément la nouvelle compilation seulement après cette validation. Conserver la protection PageShare ; une modification de son mot de passe n'est pas nécessaire à cette intégration.

Exemple de bootstrap à adapter dans l'éditeur SQL administrateur (ne pas utiliser l'UUID d'un autre compte) :

```sql
insert into private.editorial_reviewers(user_id)
values ('UUID_AUTH_DU_REVISEUR')
on conflict do nothing;
```

Le retrait d'un réviseur se fait en supprimant cette ligne ; celui d'un membre d'organisation en supprimant son appartenance. Les requêtes suivantes appliquent immédiatement ces changements, sans attendre un renouvellement du jeton.

## Vérifications reproductibles et portée

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Les tests Node exécutent les vraies migrations, politiques et fonctions dans PostgreSQL embarqué PGlite. Ils simulent seulement le schéma `auth` et les rôles Supabase ; la création de l'extension pgcrypto est omise dans ce moteur, dont PostgreSQL fournit déjà `gen_random_uuid`. Les tests Chromium utilisent le vrai client supabase-js et ces règles PostgreSQL ; les échanges GoTrue/PostgREST sont simulés à la frontière HTTP. Ils ne prouvent donc pas qu'un service Supabase distant est opérationnel.

Pour vérifier les migrations et les tests pgTAP dans la pile Supabase locale complète, avec Docker :

```sh
supabase start --workdir platform
supabase db reset --workdir platform
supabase test db --workdir platform
supabase stop --workdir platform
```

Le test pgTAP crée ses utilisateurs et ses propositions dans une transaction annulée à la fin. Il est destiné à une base locale jetable. Aucun lieu fictif n'est chargé par les migrations ni par un seed automatique.

Une validation sur le futur projet reste requise pour la confirmation d'e-mail, les paramètres Auth et les vraies réponses PostgREST. L'absence de ce projet est un prérequis de configuration, pas un déploiement effectué.

Références de conception : [clés API Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [RLS et privilèges](https://supabase.com/docs/guides/database/postgres/row-level-security).
