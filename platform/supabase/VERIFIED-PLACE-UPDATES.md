# Publication des mises à jour professionnelles

Décision produit du 29 octobre 2026 : une fiche dont la gestion professionnelle a été vérifiée n'exige pas une nouvelle validation pour chaque mise à jour courante. Les contributions personnelles et les nouvelles fiches restent modérées.

## Périmètre livré

Une contribution doit appartenir à une organisation, avoir une fiche encore publiée et disposer d'une entrée administrative dans `private.verified_place_management` pour cette même organisation. L'utilisateur doit toujours être membre owner/admin/editor. Aucun droit n'est accordé automatiquement par la migration, ni à partir des métadonnées du compte.

Après reprise en brouillon et sauvegarde, le bouton « Publier mes modifications » apparaît lorsque les conditions sont remplies. Il publie description, informations complémentaires et photos dans une transaction, avec contrôle de version. Le nom, la catégorie et la commune doivent correspondre exactement à la version publiée. Une modification de ces champs impose le circuit de validation. Un retrait par la modération empêche toute republication directe.

Les horaires, coordonnées, actualités et l'adresse physique précise n'ont pas encore de champs structurés dédiés. Cette livraison ne prétend pas vérifier le sens des textes libres ; il reste possible d'y écrire une information incorrecte. La future adresse structurée devra rejoindre les champs protégés avant sa mise en service. La modération conserve ses capacités de retrait.

## Vérification administrative

L'interface de revendication n'est pas encore construite. Un administrateur doit vérifier la légitimité du professionnel hors de l'application, contrôler l'organisation déjà associée à la contribution et les membres habilités, puis enregistrer l'identifiant de la contribution, de l'organisation et du vérificateur dans la table privée. Ne jamais utiliser le navigateur ou une clé serveur exposée pour cette opération. Aucun rattachement ni transfert d'organisation n'est réalisé automatiquement ; les fiches personnelles nécessitent un futur parcours de revendication contrôlé.

La suppression de cette entrée révoque la publication directe. La suppression d'un membre ou son passage en viewer la révoque également. La table privée n'accorde aucun accès client, même aux responsables d'organisation.

L'audit existant conserve l'acteur, la date, la version et l'action `professional_update_published`. Ce journal ne constitue pas une archive complète des anciennes valeurs. Une publication directe ne s'attribue pas de validation éditoriale : reviewed_by et reviewed_at restent vides.

## Vérifications

Tests PostgreSQL embarqué : absence de vérification, utilisateur tiers, auto-attribution interdite, version périmée, nom/commune modifiés, révocation de membre, retrait éditorial, lecture publique et audit. Test Chromium : mise à jour courante publiée puis changement de nom renvoyé vers la validation. Les services HTTP/Auth sont simulés dans ces tests ; aucun compte réel n'est créé ni promu.

La migration `20261029160247_verified_place_updates.sql` est appliquée sur le projet configuré. Aucun établissement n'y est encore vérifié. La table privée sans politiques client déclenche volontairement l'information [RLS enabled no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Les avertissements antérieurs sur les trois anciennes RPC SECURITY DEFINER et la protection des mots de passe restent distincts de cette modification : [fonctions exposées](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [protection des mots de passe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
