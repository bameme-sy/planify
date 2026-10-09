<?php
/**
 * Routeur principal de l'API Planify pour alwaysdata
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/slots.php';
require_once __DIR__ . '/templates.php';
require_once __DIR__ . '/users.php';
require_once __DIR__ . '/friendships.php';

// Gestion des en-têtes CORS
header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

// Répondre immédiatement aux requêtes préliminaires CORS (preflight OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Extraction du chemin après /api
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Découpage propre de la route
$apiRoute = '';
if (preg_match('#/api(/.*)?$#', $uriPath, $matches)) {
    $apiRoute = trim($matches[1] ?? '', '/');
} elseif (!empty($_GET['route'])) {
    $apiRoute = trim($_GET['route'], '/');
}

$segments = $apiRoute ? explode('/', $apiRoute) : [];
$resource = $segments[0] ?? '';
$subId = $segments[1] ?? null;

// Routage selon la ressource
switch ($resource) {
    case 'health':
        try {
            $pdo = getDb();
            $pdo->query("SELECT 1");
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            sendJson([
                'status' => 'ok',
                'database' => $driver,
                'timestamp' => (int)(microtime(true) * 1000)
            ]);
        } catch (Exception $e) {
            sendError('Base de données inaccessible : ' . $e->getMessage(), 500);
        }
        break;

    case 'auth':
        handleAuth($subId ?: '', $method);
        break;

    case 'slots':
        handleSlots($method, $subId);
        break;

    case 'templates':
        handleTemplates($method, $subId);
        break;

    case 'users':
        handleUsers($method);
        break;

    case 'friendships':
        handleFriendships($method, $subId);
        break;

    default:
        sendError("Route API non trouvée : /api/{$apiRoute}", 404);
}
