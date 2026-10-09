# 📅 Planify - Version PHP & MySQL pour alwaysdata

Ce dossier contient l'ensemble du projet prêt pour un déploiement direct sur **alwaysdata** avec backend **PHP 8+** et base de données **MySQL**.

---

## 📁 Structure du dossier

```text
alwaysdata-planify/
├── .htaccess          # Configuration Apache (routage /api, SPA React, compression, cache)
├── index.html         # Application frontend Planify (interface Apple Calendar)
├── assets/            # Fichiers JavaScript et CSS compilés (Vite + React + Tailwind)
├── config.php         # Configuration des identifiants MySQL alwaysdata
├── db.php             # Connexion PDO MySQL et fonctions utilitaires
├── schema.sql         # Schéma SQL avec tables relationnelles et comptes de démo
├── api/               # API REST en PHP
│   ├── index.php      # Routeur principal de l'API (/api/*)
│   ├── auth.php       # Inscription, connexion (bcrypt), sessions (tokens), déconnexion
│   ├── slots.php      # CRUD complet des créneaux horaires
│   ├── templates.php  # Gestion des modèles de semaines et activités
│   ├── users.php      # Annuaire des utilisateurs
│   └── friendships.php# Demandes d'amis et partage de planning
└── README.md          # Ce guide d'installation
```

---

## 🚀 Guide de déploiement pas à pas sur alwaysdata

### Étape 1 : Créer la base de données MySQL sur alwaysdata

1. Connectez-vous à votre espace d'administration alwaysdata : **[admin.alwaysdata.com](https://admin.alwaysdata.com/)**.
2. Dans le menu de gauche, allez dans **Bases de données** > **MySQL**.
3. Cliquez sur **Ajouter une base de données**.
4. Donnez-lui un nom (par exemple `planify_db` qui deviendra `votrecompte_planify_db`).
5. Dans l'onglet **Utilisateurs**, vérifiez que votre utilisateur a bien les droits d'accès à cette base (ou créez-en un avec un mot de passe).
6. Notez les informations suivantes :
   - **Hôte** : `mysql-votrecompte.alwaysdata.net` (affiché en haut de la page MySQL)
   - **Nom de base** : `votrecompte_nomdelabase`
   - **Utilisateur** : `votrecompte` (ou l'utilisateur créé)
   - **Mot de passe** : votre mot de passe

---

### Étape 2 : Importer le schéma SQL via phpMyAdmin

1. Toujours dans la section **Bases de données** > **MySQL**, cliquez sur le bouton **phpMyAdmin**.
2. Dans la colonne de gauche de phpMyAdmin, cliquez sur votre base de données.
3. Cliquez sur l'onglet **Importer** en haut.
4. Cliquez sur **Parcourir** et sélectionnez le fichier `schema.sql` situé dans ce dossier.
5. Cliquez sur le bouton **Exécuter** tout en bas.
   > Toutes les tables (`users`, `sessions`, `slots`, `templates`, `template_slots`, `friendships`) sont créées instantanément avec les comptes de test.

---

### Étape 3 : Configurer `config.php`

Ouvrez le fichier `config.php` et remplacez les valeurs par vos identifiants alwaysdata :

```php
// config.php
define('DB_HOST', 'mysql-votrecompte.alwaysdata.net'); // Votre hôte MySQL
define('DB_PORT', '3306');
define('DB_NAME', 'votrecompte_planify_db');           // Nom de votre base
define('DB_USER', 'votrecompte');                      // Utilisateur MySQL
define('DB_PASS', 'VotreMotDePasseSecret');             // Mot de passe
```

---

### Étape 4 : Téléverser les fichiers sur alwaysdata

Vous pouvez téléverser les fichiers de deux façons simples :

#### Option A : Via FileZilla / FTP (Recommandé)
1. Téléchargez et ouvrez **FileZilla**.
2. Renseignez vos identifiants FTP alwaysdata (disponibles dans **Accès distant** > **FTP**) :
   - **Hôte** : `ftp-votrecompte.alwaysdata.net`
   - **Identifiant** : `votrecompte`
   - **Mot de passe** : votre mot de passe
3. Ouvrez le dossier distant `/home/votrecompte/www/` (ou le dossier racine associé à votre site dans **Web** > **Sites**).
4. Glissez-déposez **l'intégralité du contenu** de `alwaysdata-planify/` dans ce dossier.

#### Option B : Via le WebFTP d'alwaysdata
1. Allez dans **Web** > **Explorateur de fichiers**.
2. Naviguez vers `www/`.
3. Compressez le contenu de `alwaysdata-planify` en un fichier `.zip`, téléversez-le puis décompressez-le directement dans `www/`.

---

### Étape 5 : Tester votre site

1. Rendez-vous sur l'URL de votre site : `https://votrecompte.alwaysdata.net/`
2. Testez l'API de santé directement : `https://votrecompte.alwaysdata.net/api/health`
   > Vous devez recevoir une réponse JSON : `{"status":"ok","database":"mysql","timestamp":...}`
3. Connectez-vous avec l'un des comptes de test ou créez un nouveau compte :
   - **Email** : `alex@apple.com`
   - **Mot de passe** : `password`
4. Ajoutez vos créneaux : ils sont sauvegardés dans votre base MySQL sur alwaysdata et synchronisés en temps réel.

---

## 🛠️ Tester localement en PHP (optionnel)

Si vous souhaitez tester ce dossier en local sur votre machine avant de le téléverser :

```bash
cd alwaysdata-planify
php -S localhost:8000
```
Puis ouvrez `http://localhost:8000` dans votre navigateur.
