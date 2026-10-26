# Morvan Hub — état du 25 octobre 2026

Le code Explorer/Pro utilise désormais un client Supabase, un parcours de contribution authentifié et des migrations de lieux/contributions avec droits en base. Voir [SUPABASE-INTEGRATION.md](SUPABASE-INTEGRATION.md) pour le périmètre, les tests et la configuration restante.

**Aucun projet Supabase n'existe encore et aucun déploiement n'est effectué.** La prévisualisation PageShare protégée reste inchangée. L'état historique ci-dessous décrit la démonstration du 20 octobre, avant cette intégration.

---

# Archive — état du 20 octobre 2026

**Date de référence : 20 octobre 2026**  
**Statut produit : V1 EN COURS DE CONSTRUCTION**

## Décision actée

Morvan Hub demeure en **V1**. Les étiquettes techniques telles que « starter 0.1 » servent uniquement au suivi des prototypes et des travaux internes. Elles ne désignent pas une V2, ni des versions commerciales successives.

## Les deux espaces qui composent la V1

### 1. Morvan Explorer — Site touristique public

- Accueil immersif sur le Morvan, consultation gratuite et sans compte.
- Huit catégories touristiques, moteur de recherche et filtres.
- Catalogue et fiches d'adresses, carte interactive et agenda.
- Contributions ouvertes avec vérification avant publication.
- Démarrage sur Mhère puis extension progressive au Parc du Morvan.
- Sélection éditoriale indépendante de tout abonnement professionnel.

**État : démonstration publique autonome intégrée au dossier `demo/`.** L’accueil, les huit catégories, le catalogue fictif, les fiches, les favoris et la contribution simulée sont visibles. La V1 de production (données vérifiées, modération serveur, carte des adresses réelles, backend et publication) reste à développer.

### 2. Morvan Pro — Espace connecté et outils professionnels

- Comptes utilisateurs, organisations/établissements, rôles et permissions.
- Catalogue d'extensions indépendantes activables par établissement.
- Modules Accueil, Agenda, Producteurs puis modules complémentaires.
- Services mutualisés (API, données touristiques vérifiées, gestion des abonnements).

**État : démonstrateur disponible, non prêt pour production.** Les trois modules fictifs et leur activation locale peuvent être testés ; authentification, Supabase, règles RLS déployées et facturation restent à réaliser.

## Correctif du démonstrateur — 20 octobre 2026

- **`demo/index.html` : accueil autonome Morvan Explorer**, affiché au démarrage du serveur local.
- **`demo/pro.html` : administration Morvan Pro** avec les trois modules inchangés dans leurs fichiers source.
- Catalogue fictif de douze adresses dans huit catégories ; recherche et filtres, pages détaillées, favoris locaux, aperçu d'agenda, proposition simulée et carte du territoire OpenStreetMap (sans marqueurs d'adresses fictives).
- Les propositions sont enregistrées exclusivement dans le navigateur, sans transmission ni véritable modération ; les données d'établissements sont fictives.
- Tests unitaires et syntaxiques exécutés. **Le test automatisé en navigateur Chromium a été bloqué par les restrictions de l'environnement** et doit encore être réalisé sur un poste utilisateur.

**MH-074 : correctif de démonstration codé et validé par tests Node ; test navigateur manuel restant.** Cela ne signifie pas que Morvan Explorer soit prêt à publier en production.

## Conditions pour déclarer la V1 terminée

- [ ] Morvan Explorer est accessible publiquement avec un parcours visiteur complet.
- [ ] Morvan Pro nécessite une authentification et applique les permissions côté serveur.
- [ ] Les deux espaces utilisent les données communes selon des accès sécurisés.
- [ ] Les modules peuvent être ajoutés sans changer le code du noyau, selon les contrats d'extension.
- [ ] Les fiches touristiques sont vérifiées, les contributions sont modérées.
- [ ] La sécurité, l'accessibilité, le RGPD, les sauvegardes et le déploiement sont validés.

## Documents de référence

- `Morvan-Hub-Backlog-2026-10-20.md` : tâches, priorités et critères de validation.
- `README.md` : installation du starter de démonstration.
- `COMMENCER-ICI.txt` : point d'entrée du dossier.

**Cette fiche décrit le correctif du démonstrateur.** Les fonctionnalités de production sont suivies séparément dans le backlog.


