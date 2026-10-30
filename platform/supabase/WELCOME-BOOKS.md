# Livrets d'accueil publics

Première livraison du 30 octobre 2026. Référence fournie par l'utilisateur : [livret Le Mhère-veille](https://www.livret-accueil.lemhereveille.fr/), consulté dans Chromium. La structure et les couleurs ont inspiré un modèle réutilisable ; aucun contenu confidentiel, numéro réel, photo ou PDF du site de référence n'a été importé. Le site d'origine n'a pas été modifié.

## Parcours

Bourgogne Pro → Gérer mes livrets d'accueil → sélectionner un hébergement → renseigner les rubriques → prévisualiser → enregistrer le brouillon → publier la version enregistrée. L'éditeur refuse de publier si le formulaire contient des changements non enregistrés. Les rubriques vides sont omises du livret voyageur. Le lien public se copie depuis l'éditeur ; le voyageur peut imprimer ou enregistrer en PDF avec les fonctions du navigateur.

Rubriques : bienvenue, arrivée, départ, séjour, maison, chambres, environs, nature, activités, restaurants/produits locaux, coups de cœur, enfants, préparation du départ et contacts publics. Les textes sont échappés ; aucun HTML utilisateur n'est exécuté. Les rubriques contiennent du texte libre limité à 5 000 caractères, avec validation des clés et types côté base.

## Droits et publication

`welcome_book_drafts` conserve la version privée et l'attribution administrative `entitled`. Seuls les membres owner/admin/editor d'une organisation dont la gestion de l'hébergement est vérifiée peuvent le lire et, si l'extension est attribuée, le modifier. Un compte ne peut pas s'attribuer l'extension. Les droits ne reposent pas sur les métadonnées modifiables du compte.

`welcome_books` contient une copie publique du titre et du contenu enregistré. Les révisions privées ne modifient pas cette copie tant qu'elles ne sont pas republiées. Le retrait supprime la copie publique et conserve le brouillon. La révocation de l'extension, de la vérification ou de la publication de la fiche ferme les nouvelles lectures publiques. Les modifications et publications sont journalisées dans l'audit existant. Le contrôle de version empêche d'écraser ou de publier un contenu périmé ; le journal ne conserve pas toutes les anciennes valeurs.

Les fonctions publiques sont SECURITY INVOKER avec privilèges explicites. Les fonctions privilégiées sont dans le schéma privé, avec search_path vide et contrôle de gestion. Aucun secret serveur n'est exposé au navigateur.

## Partage et limites

L'utilisateur a choisi un lien public sans codes ni données confidentielles. Le formulaire rappelle cette règle ; il ne peut pas détecter automatiquement tous les secrets tapés dans un texte libre. Le retrait ne peut pas effacer une copie déjà imprimée ou téléchargée. Aucun cache hors ligne/PWA, import du PDF d'origine, QR code, galerie par rubrique, traduction ou accès réservé aux voyageurs n'est inclus dans cette livraison. Les coordonnées et itinéraires saisis restent à vérifier par l'hébergeur.

Le lien de prévisualisation actuel utilise `127.0.0.1` : il sert aux essais sur cet ordinateur. Le même frontend doit être hébergé sur une URL accessible pour partager le livret avec des voyageurs externes. PageShare et sa protection n'ont pas été modifiés.

## État et validation

Migration `20261030100932_welcome_books.sql` appliquée au projet Supabase configuré. L'extension a été attribuée à l'hébergement fictif « Le Gîte des Clairières » et un livret explicitement démonstratif y est publié, géré par le même compte que les réservations de cet exemple. Les autres établissements n'ont pas reçu cette extension automatiquement.

Tests PostgreSQL : accès anonyme au seul publié, refus des autres comptes, données invalides, versions périmées, révisions privées, retrait et révocation. Tests de rendu contre l'injection HTML. Test Chromium de l'édition jusqu'au retrait, avec backend HTTP/Auth simulé. Lecture publique du livret réel de démonstration et captures ordinateur/mobile vérifiées séparément. Les avertissements de sécurité Supabase préexistants restent inchangés : [anciennes RPC SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) et [protection des mots de passe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
