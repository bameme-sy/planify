import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'planify.sqlite');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS slots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category_id TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    notes TEXT,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_slots_user_date ON slots(user_id, date);

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS template_slots (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',
    day_of_week INTEGER NOT NULL,
    notes TEXT,
    location TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_template_slots ON template_slots(template_id);

  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    UNIQUE(sender_id, receiver_id)
  );
`);

// Password hashing utility with scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// User repository
export interface DbUser {
  id: string;
  name: string;
  username: string;
  email: string;
  created_at: number;
}

export const usersRepo = {
  create(name: string, username: string, email: string, passwordPlain: string): DbUser {
    const id = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(passwordPlain);
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO users (id, name, username, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name.trim(), cleanUsername, cleanEmail, passwordHash, now);

    return {
      id,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      created_at: now,
    };
  },

  findByLogin(identifier: string): { user: DbUser; password_hash: string } | null {
    const clean = identifier.trim().toLowerCase().replace(/^@/, '');
    const stmt = db.prepare(`
      SELECT id, name, username, email, password_hash, created_at
      FROM users
      WHERE email = ? OR username = ?
    `);
    const row = stmt.get(clean, clean) as any;
    if (!row) return null;

    return {
      user: {
        id: row.id,
        name: row.name,
        username: row.username,
        email: row.email,
        created_at: Number(row.created_at),
      },
      password_hash: row.password_hash,
    };
  },

  findById(id: string): DbUser | null {
    const stmt = db.prepare('SELECT id, name, username, email, created_at FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      created_at: Number(row.created_at),
    };
  },

  getAll(): DbUser[] {
    const stmt = db.prepare('SELECT id, name, username, email, created_at FROM users ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username,
      email: r.email,
      created_at: Number(r.created_at),
    }));
  },
};

// Sessions repository
export const sessionsRepo = {
  create(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 3600 * 1000; // 30 days
    const stmt = db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
    stmt.run(token, userId, now, expiresAt);
    return token;
  },

  getUserByToken(token: string): DbUser | null {
    const now = Date.now();
    const stmt = db.prepare(`
      SELECT u.id, u.name, u.username, u.email, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `);
    const row = stmt.get(token, now) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      created_at: Number(row.created_at),
    };
  },

  delete(token: string): void {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  },
};

// Slots repository
export interface DbSlot {
  id: string;
  userId: string;
  title: string;
  categoryId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  location?: string;
  status: string;
  createdAt: number;
}

export const slotsRepo = {
  getByUserId(userId: string): DbSlot[] {
    const stmt = db.prepare(`
      SELECT id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at
      FROM slots
      WHERE user_id = ?
      ORDER BY date ASC, start_time ASC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      categoryId: r.category_id,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      notes: r.notes || undefined,
      location: r.location || undefined,
      status: r.status,
      createdAt: Number(r.created_at),
    }));
  },

  saveAllForUser(userId: string, slots: DbSlot[]): void {
    // Atomic transaction: replace all user slots
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM slots WHERE user_id = ?').run(userId);
      const insertStmt = db.prepare(`
        INSERT INTO slots (id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of slots) {
        insertStmt.run(
          s.id,
          userId,
          s.title,
          s.categoryId,
          s.date,
          s.startTime,
          s.endTime,
          s.notes || null,
          s.location || null,
          s.status || 'planned',
          s.createdAt || Date.now()
        );
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  },

  createOrUpdate(userId: string, slot: DbSlot): void {
    const stmt = db.prepare(`
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
    `);
    stmt.run(
      slot.id,
      userId,
      slot.title,
      slot.categoryId,
      slot.date,
      slot.startTime,
      slot.endTime,
      slot.notes || null,
      slot.location || null,
      slot.status,
      slot.createdAt
    );
  },

  delete(userId: string, slotId: string): void {
    const stmt = db.prepare('DELETE FROM slots WHERE id = ? AND user_id = ?');
    stmt.run(slotId, userId);
  },
};

// Templates repository
export interface DbTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: number;
  slots: {
    title: string;
    categoryId: string;
    startTime: string;
    endTime: string;
    status: string;
    dayOfWeek: number;
    notes?: string;
    location?: string;
  }[];
}

export const templatesRepo = {
  getByUserId(userId: string): DbTemplate[] {
    const stmt = db.prepare(`
      SELECT id, user_id, name, description, created_at
      FROM templates
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as any[];

    const slotStmt = db.prepare(`
      SELECT id, title, category_id, start_time, end_time, status, day_of_week, notes, location
      FROM template_slots
      WHERE template_id = ?
      ORDER BY day_of_week ASC, start_time ASC
    `);

    return rows.map((r) => {
      const slots = (slotStmt.all(r.id) as any[]).map((s) => ({
        title: s.title,
        categoryId: s.category_id,
        startTime: s.start_time,
        endTime: s.end_time,
        status: s.status,
        dayOfWeek: Number(s.day_of_week),
        notes: s.notes || undefined,
        location: s.location || undefined,
      }));

      return {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        description: r.description || undefined,
        createdAt: Number(r.created_at),
        slots,
      };
    });
  },

  create(userId: string, tpl: DbTemplate): void {
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO templates (id, user_id, name, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(tpl.id, userId, tpl.name, tpl.description || null, tpl.createdAt);

      const slotStmt = db.prepare(`
        INSERT INTO template_slots (id, template_id, title, category_id, start_time, end_time, status, day_of_week, notes, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < tpl.slots.length; i++) {
        const s = tpl.slots[i];
        const slotId = `tslot-${tpl.id}-${i}`;
        slotStmt.run(
          slotId,
          tpl.id,
          s.title,
          s.categoryId,
          s.startTime,
          s.endTime,
          s.status || 'planned',
          s.dayOfWeek,
          s.notes || null,
          s.location || null
        );
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  },

  update(userId: string, tpl: DbTemplate): void {
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE templates SET name = ?, description = ?
        WHERE id = ? AND user_id = ?
      `).run(tpl.name, tpl.description || null, tpl.id, userId);

      db.prepare('DELETE FROM template_slots WHERE template_id = ?').run(tpl.id);

      const slotStmt = db.prepare(`
        INSERT INTO template_slots (id, template_id, title, category_id, start_time, end_time, status, day_of_week, notes, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < tpl.slots.length; i++) {
        const s = tpl.slots[i];
        const slotId = `tslot-${tpl.id}-${i}`;
        slotStmt.run(
          slotId,
          tpl.id,
          s.title,
          s.categoryId,
          s.startTime,
          s.endTime,
          s.status || 'planned',
          s.dayOfWeek,
          s.notes || null,
          s.location || null
        );
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
  },

  delete(userId: string, templateId: string): void {
    const stmt = db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?');
    stmt.run(templateId, userId);
  },
};

// Friendships repository
export interface DbFriendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export const friendshipsRepo = {
  getAll(): DbFriendship[] {
    const stmt = db.prepare('SELECT id, sender_id, receiver_id, status, created_at FROM friendships');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      status: r.status,
      createdAt: Number(r.created_at),
    }));
  },

  sendRequest(senderId: string, receiverId: string): DbFriendship {
    const id = `friendship-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO friendships (id, sender_id, receiver_id, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `);
    stmt.run(id, senderId, receiverId, now);
    return {
      id,
      senderId,
      receiverId,
      status: 'pending',
      createdAt: now,
    };
  },

  updateStatus(friendshipId: string, userId: string, newStatus: 'accepted' | 'declined'): void {
    const stmt = db.prepare(`
      UPDATE friendships SET status = ?
      WHERE id = ? AND (receiver_id = ? OR sender_id = ?)
    `);
    stmt.run(newStatus, friendshipId, userId, userId);
  },
};
