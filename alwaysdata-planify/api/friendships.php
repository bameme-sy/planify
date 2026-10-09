<?php
require_once __DIR__ . '/../db.php';

function handleFriendships(string $method, ?string $subId = null): void {
    $pdo = getDb();
    $user = getAuthenticatedUser();
    $input = getJsonInput();

    $userId = $user ? $user['id'] : (!empty($_GET['userId']) ? trim($_GET['userId']) : (!empty($input['senderId']) ? trim($input['senderId']) : resolveUserId($input)));
    if (!$userId) {
        sendError('Accès non autorisé : utilisateur non identifié ou token manquant.', 401);
    }

    // 1. GET /api/friendships
    if ($method === 'GET' && !$subId) {
        $stmt = $pdo->prepare("
            SELECT id, sender_id, receiver_id, status, created_at, updated_at
            FROM friendships
            WHERE sender_id = ? OR receiver_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId, $userId]);
        $rows = $stmt->fetchAll();

        $friendships = array_map(function($f) {
            return [
                'id' => $f['id'],
                'senderId' => $f['sender_id'],
                'receiverId' => $f['receiver_id'],
                'status' => $f['status'],
                'createdAt' => (int)$f['created_at'],
                'updatedAt' => (int)$f['updated_at'],
            ];
        }, $rows);

        sendJson(['friendships' => $friendships]);
    }

    // 2. POST /api/friendships (Envoyer une demande d'ami)
    if ($method === 'POST') {
        $receiverId = trim($input['receiverId'] ?? '');
        $senderId = !empty($input['senderId']) ? trim($input['senderId']) : $userId;

        if (!$receiverId) {
            sendError('receiverId requis.', 400);
        }
        if ($receiverId === $senderId) {
            sendError('Vous ne pouvez pas vous ajouter vous-même en ami.', 400);
        }

        // Vérifier si une relation existe déjà
        $check = $pdo->prepare("
            SELECT id, sender_id, receiver_id, status, created_at, updated_at
            FROM friendships
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ");
        $check->execute([$senderId, $receiverId, $receiverId, $senderId]);
        $existing = $check->fetch();

        if ($existing) {
            if ($existing['status'] === 'declined') {
                $now = (int)(microtime(true) * 1000);
                $upd = $pdo->prepare("
                    UPDATE friendships
                    SET sender_id = ?, receiver_id = ?, status = 'pending', updated_at = ?
                    WHERE id = ?
                ");
                $upd->execute([$senderId, $receiverId, $now, $existing['id']]);

                sendJson(['friendship' => [
                    'id' => $existing['id'],
                    'senderId' => $senderId,
                    'receiverId' => $receiverId,
                    'status' => 'pending',
                    'createdAt' => (int)$existing['created_at'],
                    'updatedAt' => $now,
                ]]);
            }

            sendJson(['friendship' => [
                'id' => $existing['id'],
                'senderId' => $existing['sender_id'],
                'receiverId' => $existing['receiver_id'],
                'status' => $existing['status'],
                'createdAt' => (int)$existing['created_at'],
                'updatedAt' => (int)$existing['updated_at'],
            ]]);
        }

        $now = (int)(microtime(true) * 1000);
        $id = 'friendship-' . $now . '-' . bin2hex(random_bytes(3));

        ensureUserExists($senderId);
        ensureUserExists($receiverId);

        $stmt = $pdo->prepare("
            INSERT INTO friendships (id, sender_id, receiver_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', ?, ?)
        ");
        $stmt->execute([$id, $senderId, $receiverId, $now, $now]);

        sendJson(['friendship' => [
            'id' => $id,
            'senderId' => $senderId,
            'receiverId' => $receiverId,
            'status' => 'pending',
            'createdAt' => $now,
            'updatedAt' => $now,
        ]], 201);
    }

    // 3. PATCH /api/friendships/:id (Accepter ou refuser)
    if ($method === 'PATCH' && $subId) {
        $status = $input['status'] ?? '';
        if (!in_array($status, ['accepted', 'declined'])) {
            sendError('Statut invalide (accepted ou declined attendu).', 400);
        }

        $now = (int)(microtime(true) * 1000);
        $stmt = $pdo->prepare("
            UPDATE friendships
            SET status = ?, updated_at = ?
            WHERE id = ? AND (receiver_id = ? OR sender_id = ?)
        ");
        $stmt->execute([$status, $now, $subId, $userId, $userId]);

        sendJson(['success' => true]);
    }

    // 4. DELETE /api/friendships/:id ou ?friendId=... (Supprimer / Retirer un ami)
    if ($method === 'DELETE') {
        $targetId = $subId ?: ($input['id'] ?? ($_GET['id'] ?? null));
        $friendId = $input['friendId'] ?? ($_GET['friendId'] ?? null);

        if ($targetId) {
            $stmt = $pdo->prepare("
                DELETE FROM friendships
                WHERE id = ? AND (sender_id = ? OR receiver_id = ?)
            ");
            $stmt->execute([$targetId, $userId, $userId]);
            sendJson(['success' => true]);
        } elseif ($friendId) {
            $stmt = $pdo->prepare("
                DELETE FROM friendships
                WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ");
            $stmt->execute([$userId, $friendId, $friendId, $userId]);
            sendJson(['success' => true]);
        } else {
            sendError('ID de relation ou friendId requis pour la suppression.', 400);
        }
    }

    sendError('Action friendships non supportée.', 405);
}
