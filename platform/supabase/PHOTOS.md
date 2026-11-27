# Photos des lieux

Le formulaire Pro accepte au plus cinq photos JPEG, PNG ou WebP de 5 Mio chacune. Les aperçus locaux ne sont envoyés qu'à l'enregistrement du brouillon. Le texte est enregistré avant les fichiers ; si un transfert échoue, le formulaire conserve la contribution et permet de réessayer.

La migration `20261029150521_contribution_photos.sql` ajoute les associations et le bucket privé `place-photos`. Cet identifiant correspond à la migration effectivement appliquée au projet Supabase le 29 octobre 2026. Les migrations précédentes doivent également porter les identifiants réconciliés de la PR #8.

Les objets ont des noms aléatoires sous l'identifiant de leur contribution. Les politiques Storage autorisent l'import uniquement dans un brouillon accessible en modification. La RPC associe les fichiers existants, vérifie leur contribution et la version du brouillon, et invalide la validation précédente. La publication copie les associations vers le lieu public. Une révision ne modifie pas les photos déjà publiées avant une nouvelle validation/publication.

Les téléchargements passent par Storage et ses politiques RLS, sans URL publique permanente ni URL signée. Le retrait d'Explorer ferme les nouveaux téléchargements anonymes ; il ne peut pas effacer une copie déjà téléchargée par un visiteur. Les URL Blob du navigateur sont libérées quand la vue change.

Les objets sont immuables depuis le navigateur : aucune politique UPDATE ou DELETE. Retirer une photo du formulaire retire son association à la prochaine sauvegarde, sans supprimer physiquement le fichier. Les fichiers orphelins (import interrompu, photo retirée, contribution supprimée) restent stockés mais inaccessibles. Leur purge administrative doit passer par l'API Storage, après vérification qu'aucune contribution ni publication ne les référence ; aucune purge automatique n'est incluse ici. Ne jamais supprimer directement les métadonnées `storage.objects` en production.

Validation : tests PostgreSQL embarqué des politiques et du cycle de publication ; tests Chromium avec vrai SDK Supabase et PostgreSQL, mais services HTTP/Auth/Storage simulés. Le bucket distant, ses limites et les migrations ont été vérifiés. Un essai avec les comptes réels reste distinct de ces tests automatisés.
