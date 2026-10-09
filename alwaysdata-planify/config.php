<?php
/**
 * Configuration de la base de données MySQL et de l'API Planify
 * Configuré pour votre compte alwaysdata 'planifyy'
 */

// 1. Identifiants MySQL alwaysdata
define('DB_HOST', getenv('DB_HOST') ?: 'mysql-planifyy.alwaysdata.net');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'planifyy_db');
define('DB_USER', getenv('DB_USER') ?: 'planifyy');
define('DB_PASS', getenv('DB_PASS') ?: 'planiFy1234');

// 2. Options de sécurité et CORS
define('CORS_ALLOWED_ORIGIN', '*');

// 3. Durée de validité des sessions (30 jours en secondes)
define('SESSION_LIFETIME', 30 * 24 * 3600);
