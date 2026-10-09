<?php
require_once __DIR__ . '/config.php';

/**
 * Obtient l'instance unique de connexion PDO (MySQL sur alwaysdata, avec fallback SQLite local)
 */
function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dbType = defined('DB_TYPE') ? DB_TYPE : 'mysql';

        if ($dbType === 'mysql') {
            try {
                $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ];

                if (class_exists('Pdo\Mysql') && defined('Pdo\Mysql::ATTR_INIT_COMMAND')) {
                    $options[\Pdo\Mysql::ATTR_INIT_COMMAND] = "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci";
                } elseif (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
                    $options[@PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci";
                }

                $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                autoInitTablesMysql($pdo);
                return $pdo;
            } catch (PDOException $e) {
                // En test local si MySQL n'est pas démarré, bascule automatique sur SQLite pour faciliter le dev
                if (in_array(DB_HOST, ['localhost', '127.0.0.1', ''])) {
                    $sqlitePath = __DIR__ . '/local_planify.sqlite';
                    $pdo = new PDO('sqlite:' . $sqlitePath, null, null, [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    ]);
                    $pdo->exec('PRAGMA foreign_keys = ON;');
                    autoInitTablesSqlite($pdo);
                    return $pdo;
                }

                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'error' => 'Erreur de connexion MySQL : ' . $e->getMessage(),
                    'help'  => 'Vérifiez les identifiants dans config.php ou importez schema.sql dans phpMyAdmin.'
                ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit;
            }
        } elseif ($dbType === 'sqlite') {
            $sqlitePath = __DIR__ . '/local_planify.sqlite';
            $pdo = new PDO('sqlite:' . $sqlitePath, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec('PRAGMA foreign_keys = ON;');
            autoInitTablesSqlite($pdo);
            return $pdo;
        }
    }
    return $pdo;
}

/**
 * Création des tables pour MySQL (alwaysdata)
 */
function autoInitTablesMysql(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `users` (
          `id` VARCHAR(64) NOT NULL PRIMARY KEY,
          `name` VARCHAR(255) NOT NULL,
          `username` VARCHAR(100) NOT NULL UNIQUE,
          `email` VARCHAR(255) NOT NULL UNIQUE,
          `password_hash` VARCHAR(255) NOT NULL,
          `created_at` BIGINT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `sessions` (
          `token` VARCHAR(128) NOT NULL PRIMARY KEY,
          `user_id` VARCHAR(64) NOT NULL,
          `created_at` BIGINT NOT NULL,
          `expires_at` BIGINT NOT NULL,
          INDEX `idx_sessions_user_id` (`user_id`),
          CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `slots` (
          `id` VARCHAR(128) NOT NULL PRIMARY KEY,
          `user_id` VARCHAR(64) NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `category_id` VARCHAR(50) NOT NULL,
          `date` VARCHAR(10) NOT NULL,
          `start_time` VARCHAR(10) NOT NULL,
          `end_time` VARCHAR(10) NOT NULL,
          `notes` TEXT DEFAULT NULL,
          `location` VARCHAR(255) DEFAULT NULL,
          `status` VARCHAR(50) NOT NULL DEFAULT 'planned',
          `created_at` BIGINT NOT NULL,
          INDEX `idx_slots_user_date` (`user_id`, `date`),
          CONSTRAINT `fk_slots_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `templates` (
          `id` VARCHAR(128) NOT NULL PRIMARY KEY,
          `user_id` VARCHAR(64) NOT NULL,
          `name` VARCHAR(255) NOT NULL,
          `description` TEXT DEFAULT NULL,
          `created_at` BIGINT NOT NULL,
          INDEX `idx_templates_user` (`user_id`),
          CONSTRAINT `fk_templates_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `template_slots` (
          `id` VARCHAR(128) NOT NULL PRIMARY KEY,
          `template_id` VARCHAR(128) NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `category_id` VARCHAR(50) NOT NULL,
          `start_time` VARCHAR(10) NOT NULL,
          `end_time` VARCHAR(10) NOT NULL,
          `status` VARCHAR(50) NOT NULL DEFAULT 'planned',
          `day_of_week` INT NOT NULL,
          `notes` TEXT DEFAULT NULL,
          `location` VARCHAR(255) DEFAULT NULL,
          INDEX `idx_template_slots_tpl` (`template_id`),
          CONSTRAINT `fk_template_slots_tpl` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `friendships` (
          `id` VARCHAR(128) NOT NULL PRIMARY KEY,
          `sender_id` VARCHAR(64) NOT NULL,
          `receiver_id` VARCHAR(64) NOT NULL,
          `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
          `created_at` BIGINT NOT NULL,
          `updated_at` BIGINT NOT NULL,
          INDEX `idx_friendships_sender` (`sender_id`),
          INDEX `idx_friendships_receiver` (`receiver_id`),
          CONSTRAINT `fk_friendships_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
          CONSTRAINT `fk_friendships_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}

/**
 * Création des tables pour SQLite (test local sans serveur MySQL)
 */
function autoInitTablesSqlite(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS slots (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          category_id TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          notes TEXT,
          location TEXT,
          status TEXT NOT NULL DEFAULT 'planned',
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS template_slots (
          id TEXT PRIMARY KEY,
          template_id TEXT NOT NULL,
          title TEXT NOT NULL,
          category_id TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'planned',
          day_of_week INTEGER NOT NULL,
          notes TEXT,
          location TEXT,
          FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS friendships (
          id TEXT PRIMARY KEY,
          sender_id TEXT NOT NULL,
          receiver_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ");
}

/**
 * Envoie une réponse JSON et termine l'exécution
 */
function sendJson(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Envoie une réponse d'erreur JSON
 */
function sendError(string $message, int $statusCode = 400): void {
    sendJson(['error' => $message], $statusCode);
}

/**
 * Récupère le corps de la requête en JSON
 */
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Récupère le token Bearer depuis l'entête Authorization
 */
function getBearerToken(): ?string {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(\S+)/i', $auth, $matches)) {
        return $matches[1];
    }
    return null;
}

/**
 * Récupère l'utilisateur actuellement authentifié via session token
 */
function getAuthenticatedUser(): ?array {
    $token = getBearerToken();
    if (!$token) return null;

    $pdo = getDb();
    $now = (int)(microtime(true) * 1000);

    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.username, u.email, u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > ?
    ");
    $stmt->execute([$token, $now]);
    $user = $stmt->fetch();
    if ($user) {
        $user['created_at'] = (int)$user['created_at'];
        return $user;
    }
    return null;
}

/**
 * Résout l'ID de l'utilisateur à partir du token, du body ou du query param
 */
function resolveUserId(array $input = []): ?string {
    $authUser = getAuthenticatedUser();
    if ($authUser) {
        return $authUser['id'];
    }
    if (!empty($input['userId']) && is_string($input['userId'])) {
        return trim($input['userId']);
    }
    if (!empty($_GET['userId']) && is_string($_GET['userId'])) {
        return trim($_GET['userId']);
    }
    return null;
}

/**
 * S'assure qu'un utilisateur existe pour éviter les erreurs de contrainte de clé étrangère
 */
function ensureUserExists(string $userId, string $name = 'Utilisateur', ?string $email = null): void {
    $pdo = getDb();
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    if ($stmt->fetch()) return;

    $cleanUsername = 'user_' . substr(preg_replace('/[^a-zA-Z0-9]/', '', $userId), -6);
    $cleanEmail = $email ?: ($cleanUsername . '@planify.app');
    $hash = password_hash('password', PASSWORD_BCRYPT);
    $now = (int)(microtime(true) * 1000);

    try {
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $sql = ($driver === 'sqlite')
            ? "INSERT OR IGNORE INTO users (id, name, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
            : "INSERT IGNORE INTO users (id, name, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)";

        $insert = $pdo->prepare($sql);
        $insert->execute([$userId, $name, $cleanUsername, $cleanEmail, $hash, $now]);
    } catch (Exception $e) {
        // Ignorer si déjà existant
    }
}
