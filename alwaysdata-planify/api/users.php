<?php
require_once __DIR__ . '/../db.php';

function handleUsers(string $method): void {
    if ($method !== 'GET') {
        sendError('Méthode non autorisée.', 405);
    }

    $pdo = getDb();
    $stmt = $pdo->query("
        SELECT id, name, username, email, created_at
        FROM users
        ORDER BY created_at DESC
    ");
    $rows = $stmt->fetchAll();

    $users = array_map(function($u) {
        return [
            'id' => $u['id'],
            'name' => $u['name'],
            'username' => $u['username'],
            'email' => $u['email'],
            'created_at' => (int)$u['created_at'],
        ];
    }, $rows);

    sendJson(['users' => $users]);
}
