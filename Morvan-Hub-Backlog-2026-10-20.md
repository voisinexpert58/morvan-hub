# Morvan Hub — Backlog de développement V1

**État au 20 octobre 2026** · **Version produit : V1 en cours de construction.** Le starter technique 0.1 est un prototype inclus dans cette même V1, pas une version commerciale distincte.

> Les cases cochées désignent uniquement des éléments constatés dans le starter. Les fonctionnalités production restent à réaliser. P0 = nécessaire avant lancement de l’étape, P1 = importante, P2 = évolution.

## Statut officiel et jalons internes de la V1

**Nomenclature unique du produit : Morvan Hub — V1 (en développement).** Les numéros du starter technique 0.1 et les lots ci-dessous ne sont **pas** des versions commerciales différentes. Le passage à une éventuelle V2 n'est pas prévu à ce stade.

**Deux espaces obligatoires pour considérer la V1 terminée :**
- **Morvan Explorer**, guide touristique **public et gratuit** : accueil, huit catégories, recherche, fiches d'adresses, carte, événements, contributions et modération côté administration.
- **Morvan Pro**, espace **connecté** d'administration et d'outils professionnels : établissements, membres et rôles, registre d'extensions, activation contrôlée des modules et premier outil Morvan Accueil.

| Lot technique dans la V1 | État au 20/10/2026 | Critère de validation |
|---|---|---|
| Prototype modulaire | Réalisé partiellement | Démonstration Pro, 3 modules fictifs, tests Node ; la vue Explorer actuelle n'est qu'un aperçu dans l'administration |
| Interface publique Explorer autonome (démo) | **Codée et testée avec Node ; test navigateur à faire** | Accueil public distinct, navigation vers catalogue, catégories et fiches illustratives sans obligation de compte |
| Socle React / Supabase | À développer | Compilation React, connexion, organisations, RLS, véritables extensions indépendantes |
| Morvan Explorer complet | À développer | Lieux vérifiés, carte, recherche, contributions et modération opérationnelles |
| Morvan Accueil pilote | À développer | Éditeur multi-hébergement, QR, recommandations et validation avec hébergement pilote |
| V1 publiable | À développer | **Les deux espaces fonctionnent ensemble**, sécurité, accessibilité, RGPD, contenus fiables et support |

> **Constat utilisateur à conserver :** la démonstration démarre dans le tableau de bord d'administration ; elle propose seulement un onglet interne « Morvan Explorer / Aperçu Explorer », pas de véritable site touristique public distinct. Ne pas présenter cet aperçu comme une interface Explorer déjà livrée.

## Ordre de travail immédiat — Priorité corrigée

1. **MH-003 / MH-004** — Versionner le projet et installer les prérequis.
2. **MH-074 + MH-028 (première itération)** — Correctif de code livré pour la démo ; réaliser la recette navigateur manuelle, puis remplacer les données fictives par les données publiques vérifiées au fil de la V1.
3. **MH-012 / MH-013** — Compiler React et vérifier le chargement distant réel.
4. **MH-014 à MH-018** — Préparer Supabase dev, migrations, authentification, établissements et tests d'isolation.
5. **MH-019 à MH-024** — Compléter registre, activation et SDK ; puis connecter la V1 publique à de vraies données vérifiées (MH-025 à MH-034).

La maquette publique peut d'abord fonctionner sur des données fictives ; sa **publication** attendra les vérifications éditoriales et les contrôles de sécurité prévus au backlog.

## Backlog complet

### A — Pilotage et fondations

- [x] **MH-001 · P0 — Valider le positionnement Explorer indépendant / Pro commercial**  
  *Validation :* Guide gratuit et coups de cœur séparés des offres payantes.
- [x] **MH-002 · P0 — Choisir l’architecture cible modulaire**  
  *Validation :* React/Vite/Module Federation, Astro, PostgreSQL/Supabase et contrat de plugins documentés.
- [ ] **MH-003 · P0 — Créer le dépôt Git et la stratégie de branches**  
  *Validation :* Historique versionné, protections de branche et conventions de commits.
- [ ] **MH-004 · P0 — Installer les outils de développement**  
  *Validation :* Node compatible, pnpm/npm, environnements local, préproduction et production décrits.
- [ ] **MH-005 · P0 — Configurer qualité et automatisation CI**  
  *Validation :* Lint, formatage, vérification de types et tests automatisés à chaque modification.
- [ ] **MH-006 · P1 — Définir le nommage des produits et les noms de domaine**  
  *Validation :* Distinction publique Explorer / espace Pro / domaine des modules et URLs stables.
- [ ] **MH-007 · P1 — Finaliser la charte graphique et les composants communs**  
  *Validation :* Couleurs, typographies, boutons, cartes, formulaires accessibles et documentation.

### B — Noyau modulaire et sécurité (lot technique V1)

- [x] **MH-008 · P0 — Créer la démonstration HTML/JS de modules**  
  *Validation :* Accueil, Agenda et Producteurs présents en démonstration.
- [x] **MH-009 · P0 — Prouver un ajout par registre sans modifier le noyau de démonstration**  
  *Validation :* Exemple d’un quatrième module fourni et cinq tests Node réussis.
- [x] **MH-010 · P0 — Préparer le squelette React/Vite et le SDK des modules**  
  *Validation :* Structure du shell, premier remote et contrat SDK présents dans le ZIP.
- [x] **MH-011 · P0 — Rédiger la migration SQL initiale multi-organisation**  
  *Validation :* Tables organisations, membres, catalogue, activations, audit et règles RLS préparées, non déployées.
- [ ] **MH-012 · P0 — Installer les dépendances et valider la compilation React**  
  *Validation :* npm install, typecheck et build du shell et du premier module sans erreur.
- [ ] **MH-013 · P0 — Tester le vrai chargement Module Federation en navigateur**  
  *Validation :* Le shell importe une extension distante déployée séparément.
- [ ] **MH-014 · P0 — Créer un projet Supabase de développement**  
  *Validation :* Variables d’environnement séparées et secrets exclus du navigateur et du Git.
- [ ] **MH-015 · P0 — Appliquer et vérifier les migrations SQL**  
  *Validation :* Schéma réel créé, rollback documenté, tests de migration.
- [ ] **MH-016 · P0 — Brancher Supabase Auth sur Morvan Pro**  
  *Validation :* Connexion, déconnexion, récupération de compte et sessions sécurisées.
- [ ] **MH-017 · P0 — Créer les écrans établissements et membres**  
  *Validation :* Créer/éditer une organisation et inviter ses collaborateurs avec des rôles.
- [ ] **MH-018 · P0 — Tester l’isolation stricte des données (RLS)**  
  *Validation :* Un utilisateur de l’organisation A ne voit/modifie rien de B.
- [ ] **MH-019 · P0 — Relier le registre des plugins à la base de données**  
  *Validation :* Catalogue approuvé et manifeste versionné lus via API sécurisée.
- [ ] **MH-020 · P0 — Activer/désactiver les modules par organisation**  
  *Validation :* État persistant côté serveur, vérification réelle des habilitations.
- [ ] **MH-021 · P0 — Versionner le SDK et gérer les incompatibilités**  
  *Validation :* Module refusé si API incompatible; erreurs contrôlées.
- [ ] **MH-022 · P0 — Sécuriser les extensions distantes**  
  *Validation :* Origines HTTPS approuvées, politique d’import, révocation et contrôle de publication.
- [ ] **MH-023 · P1 — Gérer erreurs et incidents d’une extension**  
  *Validation :* Module en panne isolé visuellement et désactivable sans casser le shell.
- [ ] **MH-024 · P1 — Créer un modèle de module duplicable**  
  *Validation :* Commande/documentation pour publier un quatrième module sans changer le noyau.

### C — Données communes et Morvan Explorer public (lot V1 prioritaire)

- [ ] **MH-025 · P0 — Créer les tables communes, catégories et lieux**  
  *Validation :* Schéma évolutif, identifiants stables, géométrie PostGIS et catégories multiples.
- [ ] **MH-026 · P0 — Créer les médias, sources et droits d’utilisation**  
  *Validation :* Crédits photo, licence, consentement et date de dernière vérification conservés.
- [ ] **MH-027 · P0 — Définir le workflow éditorial d’une fiche**  
  *Validation :* Brouillon → à vérifier → publiée → à actualiser, historique et responsable.
- [ ] **MH-028 · P0 — Construire l’accueil public mobile avec Astro**  
  *Validation :* Page d’accueil éditoriale performante, catégories et appels à la découverte ; l'interface Explorer est autonome, distincte du tableau de bord Pro. Une démonstration statique peut précéder la connexion aux données réelles.
- [ ] **MH-029 · P0 — Créer les fiches d’adresses accessibles**  
  *Validation :* Photos, description, infos pratiques, source et mise à jour, liens contact/itinéraire.
- [ ] **MH-030 · P0 — Créer la recherche avec filtres par commune et catégorie**  
  *Validation :* Recherche utilisable sans compte ni géolocalisation.
- [ ] **MH-031 · P0 — Ajouter carte MapLibre + liste accessible**  
  *Validation :* Marqueurs et résultats synchronisés, attribution cartographique respectée.
- [ ] **MH-032 · P0 — Développer formulaire de contribution publique**  
  *Validation :* Proposition sans compte, anti-spam, vérification serveur et stockage privé des coordonnées.
- [ ] **MH-033 · P0 — Développer le tableau de modération**  
  *Validation :* Valider/refuser/modifier les suggestions sans publication automatique.
- [ ] **MH-034 · P0 — Renseigner les premières fiches vérifiées de Mhère**  
  *Validation :* Adresses réellement confirmées, photos autorisées et sources identifiables.
- [ ] **MH-035 · P1 — Ajouter agenda local**  
  *Validation :* Événements à venir, dates, organisateurs et statut éditorial.
- [ ] **MH-036 · P1 — Ajouter favoris et installation PWA**  
  *Validation :* Favoris locaux, manifeste, cache prudent et navigation mobile.
- [ ] **MH-037 · P1 — Créer les pages de villages et la rubrique Pépites**  
  *Validation :* Récits originaux, éditorial indépendant et pages territoriales réutilisables.
- [ ] **MH-038 · P2 — Préparer l’import contrôlé de données publiques**  
  *Validation :* Attributions/licences, dédoublonnage et priorité aux corrections manuelles.

### D — Premier produit payant : Morvan Accueil (lot pilote V1)

- [ ] **MH-039 · P0 — Spécifier le module multi-hébergement**  
  *Validation :* Fonctions V1, personas, informations publiques/privées et limites contractuelles.
- [ ] **MH-040 · P0 — Créer un modèle de livret et son éditeur**  
  *Validation :* Pages, sections, photos, règles, équipements et contenus modifiables sans développement.
- [ ] **MH-041 · P0 — Générer une URL et un QR code par établissement**  
  *Validation :* Liens personnalisés, QR code exportable et conservation d’une URL stable.
- [ ] **MH-042 · P0 — Brancher les recommandations Explorer au livret**  
  *Validation :* Sélection manuelle d’adresses vérifiées et actualisations contrôlées.
- [ ] **MH-043 · P0 — Protéger les informations sensibles des logements**  
  *Validation :* Codes/consignes confidentiels servis après autorisation, sans exposition publique.
- [ ] **MH-044 · P1 — Ajouter thèmes et identité de chaque hébergeur**  
  *Validation :* Logo, couleurs, photos et personnalisation sans déployer un nouveau site.
- [ ] **MH-045 · P1 — Prévoir versions linguistiques accessibles**  
  *Validation :* Langues prioritaires, messages explicites et relecture des traductions.
- [ ] **MH-046 · P0 — Tester le produit avec Le Mhère-veille**  
  *Validation :* Un hébergement pilote saisi, parcours client et propriétaire testés de bout en bout.
- [ ] **MH-047 · P1 — Tester auprès de deux hébergeurs volontaires supplémentaires**  
  *Validation :* Temps de mise en place, valeur perçue, besoins et disposition à payer mesurés.

### E — Commercialisation et espace client

- [ ] **MH-048 · P0 — Tester les besoins et tarifs avec des professionnels**  
  *Validation :* Entretiens, objections et offres pilote documentés avant tarification définitive.
- [ ] **MH-049 · P0 — Définir la grille d’offres et fonctionnalités**  
  *Validation :* Gratuit, Pro, Accueil et options, avec limites d’usage et support clarifiés.
- [ ] **MH-050 · P0 — Relier les abonnements aux autorisations serveur**  
  *Validation :* Droits actifs/résiliés contrôlés côté backend, aucun simple verrouillage de menu.
- [ ] **MH-051 · P1 — Intégrer facturation et portail client**  
  *Validation :* Paiement sécurisé, factures et gestion des renouvellements via prestataire adapté.
- [ ] **MH-052 · P1 — Créer onboarding, assistance et tutoriels**  
  *Validation :* Parcours guidé, base d’aide et procédure d’intervention.
- [ ] **MH-053 · P1 — Créer statistiques sobres et fiables**  
  *Validation :* Vues, clics et QR codes agrégés, sans suivi individuel non nécessaire.
- [ ] **MH-054 · P1 — Mettre en place gestion des contacts commerciaux**  
  *Validation :* Demandes de démo, devis, suivi de prospects et consentements appropriés.

### F — Modules suivants (après validation commerciale)

- [ ] **MH-055 · P1 — Industrialiser Morvan Agenda**  
  *Validation :* Création, validation, calendrier public, supports de communication et export.
- [ ] **MH-056 · P1 — Développer Morvan Gestion**  
  *Validation :* Ménage, linge, maintenance, check-lists, notifications et rôles intervenants.
- [ ] **MH-057 · P2 — Développer Morvan Producteurs**  
  *Validation :* Catalogue, disponibilité saisonnière, précommandes, retrait local.
- [ ] **MH-058 · P2 — Créer menu numérique QR pour restaurants**  
  *Validation :* Menus, tarifs, allergènes, versions linguistiques et export.
- [ ] **MH-059 · P2 — Développer Morvan Expériences**  
  *Validation :* Créneaux et demandes de réservation; paiement dans phase ultérieure.
- [ ] **MH-060 · P2 — Ajouter intégrations externes de réservation**  
  *Validation :* Connecteurs API isolés, secrets serveur, erreurs et synchronisation vérifiée.
- [ ] **MH-061 · P2 — Créer générateur de circuits personnalisés**  
  *Validation :* Parcours basés sur lieux vérifiés, durée et moyens de transport.

### G — Qualité, légalité et mise en ligne

- [ ] **MH-062 · P0 — Déployer préproduction et automatiser la publication**  
  *Validation :* Pipeline CI/CD, variables par environnement et retour arrière testé.
- [ ] **MH-063 · P0 — Ajouter sauvegardes, restauration et supervision**  
  *Validation :* Sauvegarde testée, alertes sur erreurs et surveillance des coûts.
- [ ] **MH-064 · P0 — Réaliser audits sécurité et permissions**  
  *Validation :* RLS, stockage, injections, formulaires, sessions et secrets vérifiés.
- [ ] **MH-065 · P0 — Finaliser RGPD, CGU, contrats et mentions légales**  
  *Validation :* Finalités, conservation, droits, politique de cookies et transparence éditoriale.
- [ ] **MH-066 · P0 — Tester accessibilité et fonctionnement mobile**  
  *Validation :* Parcours clavier, contrastes, lecteurs d’écran et tests mobiles réels.
- [ ] **MH-067 · P0 — Tester vitesse, SEO et géolocalisation facultative**  
  *Validation :* Pages indexables, performances mesurées et usage sans autorisation de position.
- [ ] **MH-068 · P0 — Lancer la V1 avec contenus vérifiés**  
  *Validation :* Critères de recette signés, sauvegarde et procédure de support prêtes.

### H — Développement territorial et éditorial

- [ ] **MH-069 · P1 — Définir la politique de sélection indépendante**  
  *Validation :* Critères de vérification, coups de cœur et identification des contenus sponsorisés.
- [ ] **MH-070 · P1 — Organiser collecte et mise à jour des informations**  
  *Validation :* Calendrier de revérification, sources et signalements traités.
- [ ] **MH-071 · P1 — Étendre progressivement autour de Mhère**  
  *Validation :* Communes voisines couvertes selon qualité des fiches et capacité éditoriale.
- [ ] **MH-072 · P2 — Étendre au Parc naturel régional du Morvan**  
  *Validation :* Progression par secteur avec suivi de couverture et qualité.
- [ ] **MH-073 · P2 — Mesurer l’utilité réelle de la plateforme**  
  *Validation :* Recherche aboutie, contenu vérifié, consultations utiles, rétention Pro.

### I — Correctif de périmètre V1 (constat du 20 octobre 2026)

- [x] **MH-074 · P0 — Séparer l'interface publique Explorer du démonstrateur d'administration**  
  *Validation :* Ouvrir la démonstration affiche un accueil **Morvan Explorer** accessible sans authentification ; recherche simple, huit catégories et premières fiches **fictives identifiées** sont navigables ; l'espace **Morvan Pro** est accessible séparément ; les modules existants restent fonctionnels. Une vraie sécurisation de l'accès Pro est requise avant production (MH-016 à MH-018). Ce ticket couvre la **démonstration**, non toutes les fonctionnalités de la V1 publique.

## État et règle de suivi

- **74 tâches** décrites : **7 implémentées / préparées dans le prototype** et **67 restantes**. MH-074 requiert encore une recette navigateur manuelle avant validation complète.
- Quand une tâche démarre, indiquer `En cours` dans un outil de suivi; ne la cocher que lorsque son critère de validation est atteint.
- Ajouter pour chaque ticket : responsable, date cible si définie, lien de pull request, notes de recette et dépendances réelles.
- **Ne pas confondre prototype et production** : la migration SQL est préparée mais non appliquée, et le build React reste non validé.

## Références internes

- Cahier des charges Morvan Explorer v1.0, 16 octobre 2026.
- Archive technique historique `Morvan-Hub-Starter-V0.1.zip` (livraison 19 octobre 2026), incluse dans la construction de la **V1**.
- `ETAT-PROJET-V1.md` : nomenclature officielle, périmètre et constat d'écart.
- Tests Node du démonstrateur : 5/5 réussis lors de la vérification du 20 octobre 2026.
