-- ==========================================================
-- Planify - Schéma MySQL pour alwaysdata
-- Base de données relationnelle pour le calendrier et planning
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table des utilisateurs
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_username` (`username`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des sessions d'authentification (tokens)
CREATE TABLE IF NOT EXISTS `sessions` (
  `token` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `created_at` BIGINT NOT NULL,
  `expires_at` BIGINT NOT NULL,
  PRIMARY KEY (`token`),
  KEY `idx_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table des créneaux horaires (slots)
CREATE TABLE IF NOT EXISTS `slots` (
  `id` VARCHAR(128) NOT NULL,
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
  PRIMARY KEY (`id`),
  KEY `idx_slots_user_date` (`user_id`, `date`),
  CONSTRAINT `fk_slots_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table des modèles de semaines (templates)
CREATE TABLE IF NOT EXISTS `templates` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_templates_user` (`user_id`),
  CONSTRAINT `fk_templates_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table des créneaux dans un modèle (template_slots)
CREATE TABLE IF NOT EXISTS `template_slots` (
  `id` VARCHAR(128) NOT NULL,
  `template_id` VARCHAR(128) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category_id` VARCHAR(50) NOT NULL,
  `start_time` VARCHAR(10) NOT NULL,
  `end_time` VARCHAR(10) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'planned',
  `day_of_week` INT NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_template_slots_tpl` (`template_id`),
  CONSTRAINT `fk_template_slots_tpl` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table des relations d'amitié / partage de planning (friendships)
CREATE TABLE IF NOT EXISTS `friendships` (
  `id` VARCHAR(128) NOT NULL,
  `sender_id` VARCHAR(64) NOT NULL,
  `receiver_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_friendships_sender` (`sender_id`),
  KEY `idx_friendships_receiver` (`receiver_id`),
  CONSTRAINT `fk_friendships_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friendships_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comptes de démonstration pré-configurés (Mot de passe pour tous : "password")
-- Hash bcrypt standard pour le mot de passe "password"
INSERT IGNORE INTO `users` (`id`, `name`, `username`, `email`, `password_hash`, `created_at`) VALUES
('user-demo-sarah', 'Sarah Martin', 'sarah_m', 'sarah@apple.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1700000000000),
('user-demo-alex', 'Alexandre Dubois', 'alex_d', 'alex@apple.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1700000000000),
('user-demo-thomas', 'Thomas Bernard', 'thomas_b', 'thomas@apple.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1700000000000);

SET FOREIGN_KEY_CHECKS = 1;
