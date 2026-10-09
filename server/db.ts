import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isPostgres = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

let sqlClient: any = null;
let sqliteDb: any = null;
let initialized = false;

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

export interface DbUser {
  id: string;
  name: string;
  username: string;
  email: string;
  created_at: number;
}

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

export interface DbFriendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

function convertPlaceholders(query: string): string {
  let paramIndex = 1;
  return query.replace(/\?/g, () => `$${paramIndex++}`);
}

async function getDb(): Promise<{ type: 'postgres' | 'sqlite' | 'none'; client: any }> {
  if (isPostgres) {
    if (!sqlClient) {
      const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
      sqlClient = neon(connStr);
    }
    return { type: 'postgres', client: sqlClient };
  }

  // If in serverless (e.g. Vercel) without DATABASE_URL, local SQLite won't sync
  if (process.env.VERCEL) {
    return { type: 'none', client: null };
  }

  if (!sqliteDb) {
    try {
      const sqliteModule = await import('node:sqlite');
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'planify.sqlite');
      sqliteDb = new sqliteModule.DatabaseSync(dbPath);
      sqliteDb.exec('PRAGMA journal_mode = WAL;');
      sqliteDb.exec('PRAGMA foreign_keys = ON;');
    } catch {
      return { type: 'none', client: null };
    }
  }

  return { type: 'sqlite', client: sqliteDb };
}

export async function runQuery(sqlText: string, params: any[] = []): Promise<any[]> {
  const { type, client } = await getDb();
  if (type === 'none') {
    throw new Error('Aucune base de données SQL configurée.');
  }

  if (type === 'postgres') {
    const converted = convertPlaceholders(sqlText);
    const result = await client.query(converted, params);
    return Array.isArray(result) ? result : (result?.rows || []);
  } else {
    const stmt = client.prepare(sqlText);
    if (sqlText.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    } else {
      const res = stmt.run(...params);
      return [res];
    }
  }
}

export async function initDb(): Promise<boolean> {
  if (initialized) return true;
  const { type, client } = await getDb();
  if (type === 'none') return false;

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS slots (
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
      created_at BIGINT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_slots_user_date ON slots(user_id, date)`,
    `CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS template_slots (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_template_slots ON template_slots(template_id)`,
    `CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL,
      UNIQUE(sender_id, receiver_id)
    )`,
  ];

  if (type === 'postgres') {
    for (const stmt of statements) {
      await client.query(stmt);
    }
  } else {
    for (const stmt of statements) {
      client.exec(stmt);
    }
  }

  // Seed demo users if empty
  try {
    const users = await runQuery('SELECT COUNT(*) as count FROM users');
    const count = Number(users[0]?.count || 0);
    if (count === 0) {
      const demoUsers = [
        { id: 'user-demo-sarah', name: 'Sarah Martin', username: 'sarah_m', email: 'sarah@apple.com' },
        { id: 'user-demo-alex', name: 'Alexandre Dubois', username: 'alex_d', email: 'alex@apple.com' },
        { id: 'user-demo-thomas', name: 'Thomas Bernard', username: 'thomas_b', email: 'thomas@apple.com' },
      ];
      const defaultHash = hashPassword('password');
      const now = Date.now();
      for (const u of demoUsers) {
        await runQuery(
          'INSERT INTO users (id, name, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [u.id, u.name, u.username, u.email, defaultHash, now]
        );
      }
    }
  } catch (seedErr) {
    console.warn('Seeding notice:', seedErr);
  }

  initialized = true;
  return true;
}

export const usersRepo = {
  async ensureExists(id: string, name = 'Utilisateur', username?: string, email?: string, passwordPlain = 'password'): Promise<DbUser> {
    await initDb();
    const existing = await this.findById(id);
    if (existing) return existing;

    const cleanUsername = (username || `user_${id.slice(-6)}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = (email || `${cleanUsername}@planify.app`).trim().toLowerCase();
    const passwordHash = hashPassword(passwordPlain);
    const now = Date.now();

    try {
      await runQuery(
        `INSERT INTO users (id, name, username, email, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [id, name.trim(), cleanUsername, cleanEmail, passwordHash, now]
      );
    } catch {
      // Ignored if user already exists
    }

    return {
      id,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      created_at: now,
    };
  },

  async create(name: string, username: string, email: string, passwordPlain: string): Promise<DbUser> {
    await initDb();
    const id = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(passwordPlain);
    const now = Date.now();

    await runQuery(
      'INSERT INTO users (id, name, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), cleanUsername, cleanEmail, passwordHash, now]
    );

    return {
      id,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      created_at: now,
    };
  },

  async findByLogin(identifier: string): Promise<{ user: DbUser; password_hash: string } | null> {
    await initDb();
    const clean = identifier.trim().toLowerCase().replace(/^@/, '');
    const rows = await runQuery(
      'SELECT id, name, username, email, password_hash, created_at FROM users WHERE email = ? OR username = ?',
      [clean, clean]
    );
    const row = rows[0];
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

  async findById(id: string): Promise<DbUser | null> {
    await initDb();
    const rows = await runQuery('SELECT id, name, username, email, created_at FROM users WHERE id = ?', [id]);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      created_at: Number(row.created_at),
    };
  },

  async getAll(): Promise<DbUser[]> {
    await initDb();
    const rows = await runQuery('SELECT id, name, username, email, created_at FROM users ORDER BY created_at DESC');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      username: r.username,
      email: r.email,
      created_at: Number(r.created_at),
    }));
  },
};

export const sessionsRepo = {
  async create(userId: string): Promise<string> {
    await initDb();
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 3600 * 1000;
    await runQuery('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [
      token,
      userId,
      now,
      expiresAt,
    ]);
    return token;
  },

  async getUserByToken(token: string): Promise<DbUser | null> {
    await initDb();
    const now = Date.now();
    const rows = await runQuery(
      `SELECT u.id, u.name, u.username, u.email, u.created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > ?`,
      [token, now]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      created_at: Number(row.created_at),
    };
  },

  async delete(token: string): Promise<void> {
    await initDb();
    await runQuery('DELETE FROM sessions WHERE token = ?', [token]);
  },
};

export const slotsRepo = {
  async getByUserId(userId: string): Promise<DbSlot[]> {
    await initDb();
    const rows = await runQuery(
      `SELECT id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at
       FROM slots
       WHERE user_id = ?
       ORDER BY date ASC, start_time ASC`,
      [userId]
    );
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

  async saveAllForUser(userId: string, slots: DbSlot[]): Promise<void> {
    await initDb();
    await usersRepo.ensureExists(userId);
    await runQuery('DELETE FROM slots WHERE user_id = ?', [userId]);
    for (const s of slots) {
      await runQuery(
        `INSERT INTO slots (id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          s.createdAt || Date.now(),
        ]
      );
    }
  },

  async createOrUpdate(userId: string, slot: DbSlot): Promise<void> {
    await initDb();
    await usersRepo.ensureExists(userId);
    await runQuery(
      `INSERT INTO slots (id, user_id, title, category_id, date, start_time, end_time, notes, location, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         category_id = excluded.category_id,
         date = excluded.date,
         start_time = excluded.start_time,
         end_time = excluded.end_time,
         notes = excluded.notes,
         location = excluded.location,
         status = excluded.status`,
      [
        slot.id,
        userId,
        slot.title,
        slot.categoryId,
        slot.date,
        slot.startTime,
        slot.endTime,
        slot.notes || null,
        slot.location || null,
        slot.status || 'planned',
        slot.createdAt || Date.now(),
      ]
    );
  },

  async delete(userId: string, slotId: string): Promise<void> {
    await initDb();
    await runQuery('DELETE FROM slots WHERE id = ? AND user_id = ?', [slotId, userId]);
  },
};

export const templatesRepo = {
  async getByUserId(userId: string): Promise<DbTemplate[]> {
    await initDb();
    const rows = await runQuery(
      `SELECT id, user_id, name, description, created_at
       FROM templates
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    const result: DbTemplate[] = [];
    for (const r of rows) {
      const slotRows = await runQuery(
        `SELECT id, title, category_id, start_time, end_time, status, day_of_week, notes, location
         FROM template_slots
         WHERE template_id = ?
         ORDER BY day_of_week ASC, start_time ASC`,
        [r.id]
      );

      result.push({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        description: r.description || undefined,
        createdAt: Number(r.created_at),
        slots: slotRows.map((s) => ({
          title: s.title,
          categoryId: s.category_id,
          startTime: s.start_time,
          endTime: s.end_time,
          status: s.status,
          dayOfWeek: Number(s.day_of_week),
          notes: s.notes || undefined,
          location: s.location || undefined,
        })),
      });
    }

    return result;
  },

  async create(userId: string, tpl: DbTemplate): Promise<void> {
    await initDb();
    await usersRepo.ensureExists(userId);
    await runQuery(
      'INSERT INTO templates (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)',
      [tpl.id, userId, tpl.name, tpl.description || null, tpl.createdAt || Date.now()]
    );

    for (let i = 0; i < tpl.slots.length; i++) {
      const s = tpl.slots[i];
      const slotId = `tslot-${tpl.id}-${i}`;
      await runQuery(
        `INSERT INTO template_slots (id, template_id, title, category_id, start_time, end_time, status, day_of_week, notes, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slotId,
          tpl.id,
          s.title,
          s.categoryId,
          s.startTime,
          s.endTime,
          s.status || 'planned',
          s.dayOfWeek,
          s.notes || null,
          s.location || null,
        ]
      );
    }
  },

  async update(userId: string, tpl: DbTemplate): Promise<void> {
    await initDb();
    await runQuery(
      'UPDATE templates SET name = ?, description = ? WHERE id = ? AND user_id = ?',
      [tpl.name, tpl.description || null, tpl.id, userId]
    );

    await runQuery('DELETE FROM template_slots WHERE template_id = ?', [tpl.id]);

    for (let i = 0; i < tpl.slots.length; i++) {
      const s = tpl.slots[i];
      const slotId = `tslot-${tpl.id}-${i}`;
      await runQuery(
        `INSERT INTO template_slots (id, template_id, title, category_id, start_time, end_time, status, day_of_week, notes, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slotId,
          tpl.id,
          s.title,
          s.categoryId,
          s.startTime,
          s.endTime,
          s.status || 'planned',
          s.dayOfWeek,
          s.notes || null,
          s.location || null,
        ]
      );
    }
  },

  async delete(userId: string, templateId: string): Promise<void> {
    await initDb();
    await runQuery('DELETE FROM templates WHERE id = ? AND user_id = ?', [templateId, userId]);
  },
};

export const friendshipsRepo = {
  async getAll(): Promise<DbFriendship[]> {
    await initDb();
    const rows = await runQuery('SELECT id, sender_id, receiver_id, status, created_at FROM friendships');
    return rows.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      status: r.status,
      createdAt: Number(r.created_at),
    }));
  },

  async sendRequest(senderId: string, receiverId: string): Promise<DbFriendship> {
    await initDb();
    const id = `friendship-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = Date.now();
    await runQuery(
      `INSERT INTO friendships (id, sender_id, receiver_id, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`,
      [id, senderId, receiverId, now]
    );
    return {
      id,
      senderId,
      receiverId,
      status: 'pending',
      createdAt: now,
    };
  },

  async updateStatus(friendshipId: string, userId: string, newStatus: 'accepted' | 'declined'): Promise<void> {
    await initDb();
    await runQuery(
      `UPDATE friendships SET status = ?
       WHERE id = ? AND (receiver_id = ? OR sender_id = ?)`,
      [newStatus, friendshipId, userId, userId]
    );
  },
};
