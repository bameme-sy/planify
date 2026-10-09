<?php
require_once __DIR__ . '/../db.php';

function handleSlots(string $method, ?string $subId = null): void {
    $pdo = getDb();
    $input = getJsonInput();
    $userId = resolveUserId($input);

    if (!$userId) {
        sendError('Utilisateur non identifié (userId requis).', 401);
    }

    ensureUserExists($userId);

    // 1. GET /api/slots
    if ($method === 'GET' && !$subId) {
        $stmt = $pdo->prepare("
            SELECT id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at
            FROM slots
            WHERE user_id = ?
            ORDER BY date ASC, start_time ASC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        $slots = array_map(function($r) {
            return [
                'id' => $r['id'],
                'userId' => $r['user_id'],
                'title' => $r['title'],
                'categoryId' => $r['category_id'],
                'date' => $r['date'],
                'startTime' => $r['start_time'],
                'endTime' => $r['end_time'],
                'notes' => $r['notes'] ?: null,
                'location' => $r['location'] ?: null,
                'status' => $r['status'] ?: 'planned',
                'createdAt' => (int)$r['created_at'],
            ];
        }, $rows);

        sendJson(['slots' => $slots]);
    }

    // 2. PUT /api/slots (Sauvegarde / Remplacement complet de tous les créneaux)
    if ($method === 'PUT') {
        $slots = $input['slots'] ?? null;
        if (!is_array($slots)) {
            sendError('Format invalide : slots doit être un tableau.', 400);
        }

        $now = (int)(microtime(true) * 1000);
        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare("DELETE FROM slots WHERE user_id = ?");
            $del->execute([$userId]);

            if (!empty($slots)) {
                $ins = $pdo->prepare("
                    INSERT INTO slots (id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");

                foreach ($slots as $s) {
                    $slotId = $s['id'] ?? ('slot-' . $now . '-' . bin2hex(random_bytes(3)));
                    $ins->execute([
                        $slotId,
                        $userId,
                        $s['title'] ?? 'Sans titre',
                        $s['categoryId'] ?? 'work',
                        $s['date'] ?? date('Y-m-d'),
                        $s['startTime'] ?? '09:00',
                        $s['endTime'] ?? '10:00',
                        $s['notes'] ?? null,
                        $s['location'] ?? null,
                        $s['status'] ?? 'planned',
                        isset($s['createdAt']) && is_numeric($s['createdAt']) ? (int)$s['createdAt'] : $now,
                    ]);
                }
            }
            $pdo->commit();
            sendJson(['success' => true, 'count' => count($slots)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendError('Erreur lors de la sauvegarde : ' . $e->getMessage(), 500);
        }
    }

    // 3. POST /api/slots (Création ou mise à jour individuelle)
    if ($method === 'POST') {
        $slot = $input;
        if (empty($slot['id']) || empty($slot['title']) || empty($slot['date']) || empty($slot['startTime']) || empty($slot['endTime'])) {
            sendError('Champs obligatoires manquants pour le créneau.', 400);
        }

        $now = (int)(microtime(true) * 1000);
        $createdAt = isset($slot['createdAt']) && is_numeric($slot['createdAt']) ? (int)$slot['createdAt'] : $now;
        $status = $slot['status'] ?? 'planned';

        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $sql = "
                INSERT INTO slots (id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  title = excluded.title,
                  category_id = excluded.category_id,
                  date = excluded.date,
                  start_time = excluded.start_time,
                  end_time = excluded.end_time,
                  notes = excluded.notes,
                  location = excluded.location,
                  status = excluded.status
            ";
        } else {
            $sql = "
                INSERT INTO slots (id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  title = VALUES(title),
                  category_id = VALUES(category_id),
                  date = VALUES(date),
                  start_time = VALUES(start_time),
                  end_time = VALUES(end_time),
                  notes = VALUES(notes),
                  location = VALUES(location),
                  status = VALUES(status)
            ";
        }

        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            $slot['id'],
            $userId,
            $slot['title'],
            $slot['categoryId'] ?? 'work',
            $slot['date'],
            $slot['startTime'],
            $slot['endTime'],
            $slot['notes'] ?? null,
            $slot['location'] ?? null,
            $status,
            $createdAt,
        ]);

        sendJson(['success' => true, 'slot' => $slot], 201);
    }

    // 4. DELETE /api/slots/:id
    if ($method === 'DELETE' && $subId) {
        $del = $pdo->prepare("DELETE FROM slots WHERE id = ? AND user_id = ?");
        $del->execute([$subId, $userId]);
        sendJson(['success' => true]);
    }

    sendError('Action slots non supportée.', 405);
}
