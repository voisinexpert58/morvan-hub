# Publication de Morvan Hub V1 sur GitHub

## 1. Créer le dépôt privé

Se connecter au compte GitHub `voisinexpert58` et aller sur : https://github.com/new

- **Repository name** : `morvan-hub`
- **Visibility** : **Private**
- Ne pas initialiser avec un README, une licence ou un `.gitignore` : ils sont déjà dans ce dossier.
- Cliquer sur **Create repository**.

## 2. Envoyer le projet avec Git

Installer Git pour Windows si nécessaire. Dans un terminal PowerShell ouvert à la racine du dossier `morvan-hub` :

```powershell
git init -b main
git add .
git commit -m "Initialisation Morvan Hub V1 : Explorer, Pro et modules de démonstration"
git remote add origin https://github.com/voisinexpert58/morvan-hub.git
git push -u origin main
```

Si Git demande une identité pour le commit, configurer `git config --global user.name` et `git config --global user.email` avec ses propres données, puis relancer le commit. L'authentification GitHub se fait via le navigateur ou le gestionnaire d'identifiants Git : ne jamais coller de token dans le code.

## 3. Vérifier la publication

Ouvrir https://github.com/voisinexpert58/morvan-hub et vérifier :

- `demo/index.html` : Morvan Explorer public ; `demo/pro.html` : Morvan Pro.
- `platform/` : squelette React/Vite, module Accueil, SQL Supabase.
- `ETAT-PROJET-V1.md` et `Morvan-Hub-Backlog-2026-10-20.md`.
- L'onglet **Actions** : le workflow « Tests du démonstrateur V1 » doit réussir.

## 4. Limites de cette version

Le guide contient 12 fiches fictives. Le formulaire et l'activation des modules utilisent du stockage local, sans authentification ni base Supabase connectée. La compilation de l'application React nécessite encore l'installation de ses dépendances et une validation séparée. La V1 reste en développement.

## 5. Sécurité

Ne jamais publier de fichier `.env` contenant de vraies clés, ni des mots de passe, ni des données personnelles de clients ou voyageurs. `.env.example` sert exclusivement de modèle.
