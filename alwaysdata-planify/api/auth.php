<?php
require_once __DIR__ . '/../db.php';

function handleAuth(string $action, string $method): void {
    $pdo = getDb();
    $input = getJsonInput();

    // 1. Inscription (Register)
    if ($action === 'register' && $method === 'POST') {
        $name = trim($input['name'] ?? '');
        $username = strtolower(ltrim(trim($input['username'] ?? ''), '@'));
        $email = strtolower(trim($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');

        if (!$name || !$username || !$email || !$password) {
            sendError('Tous les champs (nom, pseudo, email, mot de passe) sont obligatoires.', 400);
        }

        // Vérification unicité username / email
        $check = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $check->execute([$username, $email]);
        if ($check->fetch()) {
            sendError('Ce nom d’utilisateur ou cet e-mail est déjà utilisé.', 409);
        }

        $userId = 'user-' . (int)(microtime(true) * 1000) . '-' . bin2hex(random_bytes(4));
        $plainPassword = $password; // Mot de passe stocké en clair sans hachage
        $now = (int)(microtime(true) * 1000);

        $stmt = $pdo->prepare("
            INSERT INTO users (id, name, username, email, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $name, $username, $email, $plainPassword, $now]);

        // Création du token de session
        $token = bin2hex(random_bytes(32));
        $expiresAt = $now + (SESSION_LIFETIME * 1000);

        $sess = $pdo->prepare("
            INSERT INTO sessions (token, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        ");
        $sess->execute([$token, $userId, $now, $expiresAt]);

        sendJson([
            'user' => [
                'id' => $userId,
                'name' => $name,
                'username' => $username,
                'email' => $email,
                'createdAt' => $now,
                'created_at' => $now
            ],
            'token' => $token
        ], 201);
    }

    // 2. Connexion (Login)
    if ($action === 'login' && $method === 'POST') {
        $identifier = strtolower(ltrim(trim($input['identifier'] ?? ''), '@'));
        $password = (string)($input['password'] ?? '');

        if (!$identifier || !$password) {
            sendError('Identifiant et mot de passe requis.', 400);
        }

        $stmt = $pdo->prepare("
            SELECT id, name, username, email, password_hash, created_at
            FROM users
            WHERE LOWER(email) = ? OR LOWER(username) = ?
        ");
        $stmt->execute([$identifier, $identifier]);
        $row = $stmt->fetch();

        // Vérification mot de passe en clair (ou bcrypt pour compatibilité anciens comptes)
        $isValid = $row && ($password === $row['password_hash'] || password_verify($password, $row['password_hash']));
        if (!$row || !$isValid) {
            sendError('Identifiant ou mot de passe incorrect.', 401);
        }

        $now = (int)(microtime(true) * 1000);
        $token = bin2hex(random_bytes(32));
        $expiresAt = $now + (SESSION_LIFETIME * 1000);

        $sess = $pdo->prepare("
            INSERT INTO sessions (token, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        ");
        $sess->execute([$token, $row['id'], $now, $expiresAt]);

        sendJson([
            'user' => [
                'id' => $row['id'],
                'name' => $row['name'],
                'username' => $row['username'],
                'email' => $row['email'],
                'createdAt' => (int)$row['created_at'],
                'created_at' => (int)$row['created_at']
            ],
            'token' => $token
        ]);
    }

    // 3. Utilisateur courant (Me)
    if ($action === 'me' && $method === 'GET') {
        $user = getAuthenticatedUser();
        if (!$user) {
            sendError('Session invalide ou expirée.', 401);
        }
        sendJson(['user' => $user]);
    }

    // 4. Déconnexion (Logout)
    if ($action === 'logout' && $method === 'POST') {
        $token = getBearerToken();
        if ($token) {
            $del = $pdo->prepare("DELETE FROM sessions WHERE token = ?");
            $del->execute([$token]);
        }
        sendJson(['success' => true]);
    }

    sendError('Action auth non trouvée.', 404);
}
