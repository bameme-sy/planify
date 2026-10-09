<?php
/**
 * Routeur de développement local pour le serveur interne PHP (php -S)
 * Sur alwaysdata avec Apache, c'est le fichier .htaccess qui gère automatiquement le routage.
 */

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Si la requête concerne l'API
if (str_starts_with($path, '/api')) {
    require __DIR__ . '/api/index.php';
    return true;
}

// Si le fichier statique demandé existe (CSS, JS, images)
$staticFile = __DIR__ . $path;
if ($path !== '/' && file_exists($staticFile) && !is_dir($staticFile)) {
    return false; // Laisse le serveur web intégré servir le fichier statique
}

// Sinon redirige vers la Single Page Application React
require __DIR__ . '/index.html';
return true;
