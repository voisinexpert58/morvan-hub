# Extension Réservations — première livraison

Priorité choisie le 30 octobre 2026 parmi les sept extensions envisagées. Livré : demande de table ou de séjour, consultation de la réponse, acceptation/refus par le professionnel, annulation par le demandeur et ouverture/fermeture du service. Aucun paiement, notification e-mail, calcul de disponibilité, inventaire de chambres ou placement de tables. L'acceptation repose sur une vérification manuelle du professionnel.

## Accès et activation

Une fiche publiée doit être rattachée à une organisation dont la gestion est vérifiée. Un administrateur attribue l'accès à l'extension en créant une ligne `reservation_settings` avec `entitled=true`. Les membres owner/admin/editor de cette organisation peuvent ensuite ouvrir le service et sélectionner tables, séjours ou les deux. L'attribution est distincte de l'activation. Il n'existe pas encore de synchronisation avec une facturation ni de catalogue de formules commerciales.

Les visiteurs doivent se connecter (avec confirmation d'e-mail lors de l'inscription) pour créer et suivre une demande. La lecture des fiches reste publique. Aucun secret serveur n'est utilisé par le client. Les coordonnées ne sont lisibles que par le demandeur et les gestionnaires vérifiés du lieu ; un réviseur éditorial sans cette gestion n'a pas accès aux demandes.

Les demandes sont privées, les écritures passent par des RPC autorisées explicitement. Contrôle de version lors des réponses, verrou de ligne, dix demandes maximum par compte sur 24 heures et interdiction d'un doublon actif pour un même lieu/type/date. Les dates sont stockées en timestamptz ; le formulaire indique le fuseau de l'appareil. Un séjour nécessite un départ ultérieur, avec une durée maximale de 90 jours. Les demandes sont limitées à 30 personnes et deux ans à l'avance. Ces limites techniques ne représentent pas les capacités réelles d'un établissement.

La fermeture, le retrait de publication ou la révocation de l'accès interdit de nouvelles demandes. Les gestionnaires peuvent encore traiter les demandes existantes tant qu'ils restent habilités. Révoquer la gestion ou l'appartenance à l'organisation supprime leur accès. Les 200 demandes les plus récentes sont affichées ; pagination, filtres et archivage restent à ajouter. Aucune suppression automatique des données personnelles n'est implémentée ; définir une durée de conservation avant un usage commercial.

## Exemples demandés par l'utilisateur

Deux fiches fictives ont été créées dans la base configurée, sous l'organisation « Démonstration — réservations fictives » : « Restaurant de démonstration — La Table des Sapins » et « Hébergement de démonstration — Le Gîte des Clairières ». Leurs noms et descriptions précisent qu'aucune réservation réelle n'est réalisée. Elles utilisent des illustrations existantes, pas des photos prétendument réelles. Les accès sont accordés uniquement à cette organisation de démonstration. Les identifiants de comptes et de fiches générés ne sont pas intégrés aux migrations.

## Vérification et état

Migration `20261030090316_reservation_requests.sql` appliquée au projet Supabase configuré. Tests PostgreSQL embarqué des droits, dates, doublons, attribution, activation et révocation ; test Chromium demande → acceptation → annulation avec services HTTP/Auth simulés. Les fiches de démonstration ont aussi été vues dans le navigateur sur le backend réel. Aucun test ne prétend avoir envoyé une réservation depuis les mots de passe réels des utilisateurs. PageShare et sa protection restent inchangés.

Les avertissements de sécurité antérieurs restent inchangés : [anciennes fonctions SECURITY DEFINER exposées](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) et [protection des mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Les nouvelles RPC publiques utilisent SECURITY INVOKER ; les fonctions privilégiées sont dans le schéma privé.

## Autres extensions

Carte de restaurant avec QR code, commande à emporter, livret d'accueil, inscriptions avec gestion des places, catalogue/devis et sélection d'adresses intégrable restent à réaliser. Leurs anciennes démonstrations ne constituent pas des services opérationnels.
