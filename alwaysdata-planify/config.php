<?php
/**
 * Configuration de la base de données MySQL et de l'API Planify
 * Modifiez ces constantes avec les identifiants fournis par alwaysdata.
 */

// 1. Identifiants MySQL alwaysdata
// (Disponibles dans votre espace client alwaysdata > Bases de données > MySQL)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost'); // Exemple: 'mysql-moncompte.alwaysdata.net' ou 'localhost'
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'planify_db'); // Exemple: 'moncompte_planify'
define('DB_USER', getenv('DB_USER') ?: 'root');       // Exemple: 'moncompte'
define('DB_PASS', getenv('DB_PASS') ?: '');           // Votre mot de passe MySQL

// 2. Options de sécurité et CORS
define('CORS_ALLOWED_ORIGIN', '*');

// 3. Durée de validité des sessions (30 jours en secondes)
define('SESSION_LIFETIME', 30 * 24 * 3600);
