<?php
require_once __DIR__ . '/../db.php';

function handleUsers(string $method): void {
    if ($method !== 'GET') {
        sendError('Méthode non autorisée.', 405);
    }

    $pdo = getDb();
    $q = trim($_GET['q'] ?? '');

    if ($q !== '') {
        $stmt = $pdo->prepare("
            SELECT id, name, username, email, created_at
            FROM users
            WHERE LOWER(name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(email) LIKE ?
            ORDER BY created_at DESC
        ");
        $term = '%' . strtolower($q) . '%';
        $stmt->execute([$term, $term, $term]);
    } else {
        $stmt = $pdo->query("
            SELECT id, name, username, email, created_at
            FROM users
            ORDER BY created_at DESC
        ");
    }
    $rows = $stmt->fetchAll();

    $users = array_map(function($u) {
        return [
            'id' => $u['id'],
            'name' => $u['name'],
            'username' => $u['username'],
            'email' => $u['email'],
            'createdAt' => (int)$u['created_at'],
            'created_at' => (int)$u['created_at'],
        ];
    }, $rows);

    sendJson(['users' => $users]);
}
