<?php
require_once __DIR__ . '/../db.php';

function handleTemplates(string $method, ?string $subId = null): void {
    $pdo = getDb();
    $input = getJsonInput();
    $userId = resolveUserId($input);

    if (!$userId) {
        sendError('Utilisateur non identifié.', 401);
    }

    ensureUserExists($userId);

    // 1. GET /api/templates
    if ($method === 'GET' && !$subId) {
        $stmt = $pdo->prepare("
            SELECT id, user_id, name, description, created_at
            FROM templates
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        $templates = [];
        $slotStmt = $pdo->prepare("
            SELECT id, title, category_id, start_time, end_time, status, day_of_week, notes, location
            FROM template_slots
            WHERE template_id = ?
            ORDER BY day_of_week ASC, start_time ASC
        ");

        foreach ($rows as $r) {
            $slotStmt->execute([$r['id']]);
            $slotRows = $slotStmt->fetchAll();

            $templates[] = [
                'id' => $r['id'],
                'userId' => $r['user_id'],
                'name' => $r['name'],
                'description' => $r['description'] ?: null,
                'createdAt' => (int)$r['created_at'],
                'slots' => array_map(function($s) {
                    return [
                        'title' => $s['title'],
                        'categoryId' => $s['category_id'],
                        'startTime' => $s['start_time'],
                        'endTime' => $s['end_time'],
                        'status' => $s['status'],
                        'dayOfWeek' => (int)$s['day_of_week'],
                        'notes' => $s['notes'] ?: null,
                        'location' => $s['location'] ?: null,
                    ];
                }, $slotRows),
            ];
        }

        sendJson(['templates' => $templates]);
    }

    // 2. POST /api/templates (Créer un modèle)
    if ($method === 'POST') {
        $tpl = $input;
        if (empty($tpl['name'])) {
            sendError('Le nom du modèle est requis.', 400);
        }

        $now = (int)(microtime(true) * 1000);
        $tplId = !empty($tpl['id']) ? $tpl['id'] : ('tpl-' . $now . '-' . bin2hex(random_bytes(3)));
        $createdAt = isset($tpl['createdAt']) && is_numeric($tpl['createdAt']) ? (int)$tpl['createdAt'] : $now;
        $slots = is_array($tpl['slots'] ?? null) ? $tpl['slots'] : [];

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO templates (id, user_id, name, description, created_at)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $tplId,
                $userId,
                $tpl['name'],
                $tpl['description'] ?? null,
                $createdAt,
            ]);

            if (!empty($slots)) {
                $slotIns = $pdo->prepare("
                    INSERT INTO template_slots (id, template_id, title, category_id, start_time, end_time, status, day_of_week, notes, location)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");

                foreach ($slots as $idx => $s) {
                    $slotId = 'tslot-' . $now . '-' . $idx . '-' . bin2hex(random_bytes(2));
                    $slotIns->execute([
                        $slotId,
                        $tplId,
                        $s['title'] ?? 'Activité',
                        $s['categoryId'] ?? 'work',
                        $s['startTime'] ?? '09:00',
                        $s['endTime'] ?? '10:00',
                        $s['status'] ?? 'planned',
                        (int)($s['dayOfWeek'] ?? 0),
                        $s['notes'] ?? null,
                        $s['location'] ?? null,
                    ]);
                }
            }

            $pdo->commit();
            sendJson(['template' => [
                'id' => $tplId,
                'userId' => $userId,
                'name' => $tpl['name'],
                'description' => $tpl['description'] ?? null,
                'createdAt' => $createdAt,
                'slots' => $slots,
            ]], 201);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendError('Erreur création modèle : ' . $e->getMessage(), 500);
        }
    }

    // 3. PUT /api/templates/:id (Mettre à jour)
    if ($method === 'PUT' && $subId) {
        $tpl = $input;
        $slots = is_array($tpl['slots'] ?? null) ? $tpl['slots'] : [];
        $now = (int)(microtime(true) * 1000);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                UPDATE templates
                SET name = ?, description = ?
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([
                $tpl['name'] ?? 'Modèle',
                $tpl['description'] ?? null,
                $subId,
                $userId,
            ]);

            $del = $pdo->prepare("DELETE FROM template_slots WHERE template_id = ?");
            $del->execute([$subId]);

            if (!empty($slots)) {
                $slotIns = $pdo->prepare("
                    INSERT INTO template_slots (id, template_id, title, category_id, start_time, end_time, status, day_of_week, notes, location)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                foreach ($slots as $idx => $s) {
                    $slotId = 'tslot-' . $now . '-' . $idx . '-' . bin2hex(random_bytes(2));
                    $slotIns->execute([
                        $slotId,
                        $subId,
                        $s['title'] ?? 'Activité',
                        $s['categoryId'] ?? 'work',
                        $s['startTime'] ?? '09:00',
                        $s['endTime'] ?? '10:00',
                        $s['status'] ?? 'planned',
                        (int)($s['dayOfWeek'] ?? 0),
                        $s['notes'] ?? null,
                        $s['location'] ?? null,
                    ]);
                }
            }

            $pdo->commit();
            sendJson(['template' => $tpl]);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendError('Erreur mise à jour modèle : ' . $e->getMessage(), 500);
        }
    }

    // 4. DELETE /api/templates/:id
    if ($method === 'DELETE' && $subId) {
        $del = $pdo->prepare("DELETE FROM templates WHERE id = ? AND user_id = ?");
        $del->execute([$subId, $userId]);
        sendJson(['success' => true]);
    }

    sendError('Action templates non supportée.', 405);
}
