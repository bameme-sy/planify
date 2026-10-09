import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { 
  usersRepo, 
  sessionsRepo, 
  slotsRepo, 
  templatesRepo, 
  friendshipsRepo,
  verifyPassword,
  initDb,
  isPostgres,
  DbUser
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface AuthRequest extends Request {
  user?: DbUser;
}

// Authentication middleware
async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé : token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const user = await sessionsRepo.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Session invalide ou expirée' });
    }
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la vérification de session' });
  }
}

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs (nom, pseudo, email, mot de passe) sont obligatoires' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const cleanEmail = email.trim().toLowerCase();

  try {
    const existing = (await usersRepo.findByLogin(cleanEmail)) || (await usersRepo.findByLogin(cleanUsername));
    if (existing) {
      return res.status(409).json({ error: 'Ce nom d’utilisateur ou cet e-mail est déjà utilisé' });
    }

    const user = await usersRepo.create(name, cleanUsername, cleanEmail, password);
    const token = await sessionsRepo.create(user.id);
    return res.status(201).json({ user, token });
  } catch (err: any) {
    console.error('Registration error', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de la création du compte' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  try {
    const record = await usersRepo.findByLogin(identifier);
    if (!record) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const isValid = verifyPassword(password, record.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const token = await sessionsRepo.create(record.user.id);
    return res.json({ user: record.user, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur lors de la connexion' });
  }
});

// Get current user
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

// Logout
app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await sessionsRepo.delete(token);
  }
  return res.json({ success: true });
});

// --- USERS DIRECTORY ---

app.get('/api/users', async (_req, res) => {
  try {
    const users = await usersRepo.getAll();
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur chargement utilisateurs' });
  }
});

// --- SLOTS (CRÉNEAUX) ROUTES ---

app.get('/api/slots', async (req: AuthRequest, res) => {
  const targetUserId = (req.query.userId as string) || req.user?.id;
  if (!targetUserId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  try {
    const slots = await slotsRepo.getByUserId(targetUserId);
    return res.json({ slots });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur récupération des créneaux' });
  }
});

app.put('/api/slots', requireAuth, async (req: AuthRequest, res) => {
  const { slots } = req.body;
  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'Format invalide : slots doit être un tableau' });
  }

  try {
    await slotsRepo.saveAllForUser(req.user!.id, slots);
    return res.json({ success: true, count: slots.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur sauvegarde des créneaux' });
  }
});

app.post('/api/slots', requireAuth, async (req: AuthRequest, res) => {
  const slot = req.body;
  if (!slot.id || !slot.title || !slot.date || !slot.startTime || !slot.endTime) {
    return res.status(400).json({ error: 'Champs obligatoires manquants pour le créneau' });
  }

  try {
    await slotsRepo.createOrUpdate(req.user!.id, slot);
    return res.status(201).json({ success: true, slot });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur enregistrement créneau' });
  }
});

app.delete('/api/slots/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await slotsRepo.delete(req.user!.id, id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur suppression créneau' });
  }
});

// --- TEMPLATES ROUTES ---

app.get('/api/templates', requireAuth, async (req: AuthRequest, res) => {
  try {
    const templates = await templatesRepo.getByUserId(req.user!.id);
    return res.json({ templates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur chargement modèles' });
  }
});

app.post('/api/templates', requireAuth, async (req: AuthRequest, res) => {
  const template = req.body;
  if (!template.id || !template.name) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (id, name)' });
  }

  try {
    await templatesRepo.create(req.user!.id, template);
    return res.status(201).json({ success: true, template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur création modèle' });
  }
});

app.put('/api/templates/:id', requireAuth, async (req: AuthRequest, res) => {
  const template = req.body;
  try {
    await templatesRepo.update(req.user!.id, template);
    return res.json({ success: true, template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur mise à jour modèle' });
  }
});

app.delete('/api/templates/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await templatesRepo.delete(req.user!.id, id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur suppression modèle' });
  }
});

// --- FRIENDSHIPS ROUTES ---

app.get('/api/friendships', requireAuth, async (req: AuthRequest, res) => {
  try {
    const all = await friendshipsRepo.getAll();
    const userFriendships = all.filter(
      (f) => f.senderId === req.user!.id || f.receiverId === req.user!.id
    );
    return res.json({ friendships: userFriendships });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur chargement amis' });
  }
});

app.post('/api/friendships', requireAuth, async (req: AuthRequest, res) => {
  const { receiverId } = req.body;
  if (!receiverId || receiverId === req.user!.id) {
    return res.status(400).json({ error: 'Destinataire invalide' });
  }

  try {
    const all = await friendshipsRepo.getAll();
    const existing = all.find(
      (f) =>
        (f.senderId === req.user!.id && f.receiverId === receiverId) ||
        (f.receiverId === req.user!.id && f.senderId === receiverId)
    );

    if (existing) {
      return res.status(409).json({ error: 'Une demande d’ami existe déjà avec cet utilisateur' });
    }

    const friendship = await friendshipsRepo.sendRequest(req.user!.id, receiverId);
    return res.status(201).json({ friendship });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur envoi demande d’ami' });
  }
});

app.patch('/api/friendships/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'accepted' && status !== 'declined') {
    return res.status(400).json({ error: 'Statut invalide (doit être "accepted" ou "declined")' });
  }

  try {
    await friendshipsRepo.updateStatus(id, req.user!.id, status);
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur mise à jour demande' });
  }
});

// --- HEALTH CHECK ROUTE ---

app.get('/api/health', async (_req, res) => {
  const isReady = await initDb();
  if (!isReady && process.env.VERCEL) {
    return res.status(503).json({
      status: 'waiting_for_db',
      database: 'none',
      message: 'Veuillez connecter Neon Postgres dans l’onglet Storage de Vercel pour activer la synchronisation multi-appareils.',
      timestamp: Date.now(),
    });
  }

  return res.json({ 
    status: 'ok', 
    database: isPostgres ? 'postgres' : 'sqlite', 
    timestamp: Date.now() 
  });
});

export default app;

// In local environment, start HTTP server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Planify SQL Backend running on http://localhost:${PORT}`);
  });
}
