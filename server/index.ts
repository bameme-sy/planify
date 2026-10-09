import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { 
  db, 
  usersRepo, 
  sessionsRepo, 
  slotsRepo, 
  templatesRepo, 
  friendshipsRepo,
  verifyPassword,
  DbUser
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Extend express request to include authenticated user
interface AuthRequest extends Request {
  user?: DbUser;
}

// Authentication middleware
function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé : token manquant' });
  }

  const token = authHeader.split(' ')[1];
  const user = sessionsRepo.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }

  req.user = user;
  next();
}

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs (nom, pseudo, email, mot de passe) sont obligatoires' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const cleanEmail = email.trim().toLowerCase();

  const existing = usersRepo.findByLogin(cleanEmail) || usersRepo.findByLogin(cleanUsername);
  if (existing) {
    return res.status(409).json({ error: 'Ce nom d’utilisateur ou cet e-mail est déjà utilisé' });
  }

  try {
    const user = usersRepo.create(name, cleanUsername, cleanEmail, password);
    const token = sessionsRepo.create(user.id);
    return res.status(201).json({ user, token });
  } catch (err: any) {
    console.error('Registration error', err);
    return res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  const record = usersRepo.findByLogin(identifier);
  if (!record) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  }

  const isValid = verifyPassword(password, record.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  }

  const token = sessionsRepo.create(record.user.id);
  return res.json({ user: record.user, token });
});

// Get current user
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

// Logout
app.post('/api/auth/logout', requireAuth, (req: AuthRequest, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    sessionsRepo.delete(token);
  }
  return res.json({ success: true });
});

// --- USERS DIRECTORY ---

app.get('/api/users', requireAuth, (_req, res) => {
  const users = usersRepo.getAll();
  return res.json({ users });
});

// --- SLOTS ROUTES ---

// Get slots (own or friend's)
app.get('/api/slots', requireAuth, (req: AuthRequest, res) => {
  const targetUserId = (req.query.userId as string) || req.user!.id;

  // If requesting another user's slots, check friendship status
  if (targetUserId !== req.user!.id) {
    const friendships = friendshipsRepo.getAll();
    const isFriend = friendships.some(
      (f) =>
        f.status === 'accepted' &&
        ((f.senderId === req.user!.id && f.receiverId === targetUserId) ||
          (f.receiverId === req.user!.id && f.senderId === targetUserId))
    );

    if (!isFriend) {
      return res.status(403).json({ error: 'Accès refusé : vous devez être ami pour voir ce planning' });
    }
  }

  const slots = slotsRepo.getByUserId(targetUserId);
  return res.json({ slots });
});

// Save all slots (sync)
app.put('/api/slots', requireAuth, (req: AuthRequest, res) => {
  const { slots } = req.body;
  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'Liste de créneaux invalide' });
  }

  try {
    slotsRepo.saveAllForUser(req.user!.id, slots);
    return res.json({ success: true, count: slots.length });
  } catch (err: any) {
    console.error('Error saving slots', err);
    return res.status(500).json({ error: 'Erreur lors de l’enregistrement des créneaux' });
  }
});

// Create or update a single slot
app.post('/api/slots', requireAuth, (req: AuthRequest, res) => {
  const slot = req.body;
  if (!slot.id || !slot.title || !slot.date || !slot.startTime || !slot.endTime) {
    return res.status(400).json({ error: 'Champs de créneau obligatoires manquants' });
  }

  try {
    slotsRepo.createOrUpdate(req.user!.id, slot);
    return res.status(201).json({ slot });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du créneau' });
  }
});

// Delete a slot
app.delete('/api/slots/:id', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  slotsRepo.delete(req.user!.id, id);
  return res.json({ success: true });
});

// --- TEMPLATES ROUTES ---

// Get templates
app.get('/api/templates', requireAuth, (req: AuthRequest, res) => {
  const templates = templatesRepo.getByUserId(req.user!.id);
  return res.json({ templates });
});

// Create template
app.post('/api/templates', requireAuth, (req: AuthRequest, res) => {
  const tpl = req.body;
  if (!tpl.name || !Array.isArray(tpl.slots)) {
    return res.status(400).json({ error: 'Nom et liste de créneaux requis pour le modèle' });
  }

  const newTemplate = {
    id: tpl.id || `tpl-${Date.now()}`,
    userId: req.user!.id,
    name: tpl.name.trim(),
    description: tpl.description || undefined,
    createdAt: tpl.createdAt || Date.now(),
    slots: tpl.slots,
  };

  try {
    templatesRepo.create(req.user!.id, newTemplate);
    return res.status(201).json({ template: newTemplate });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erreur lors de la création du modèle' });
  }
});

// Update template
app.put('/api/templates/:id', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const tpl = req.body;
  if (!tpl.name || !Array.isArray(tpl.slots)) {
    return res.status(400).json({ error: 'Nom et liste de créneaux requis' });
  }

  const updated = {
    id,
    userId: req.user!.id,
    name: tpl.name.trim(),
    description: tpl.description || undefined,
    createdAt: tpl.createdAt || Date.now(),
    slots: tpl.slots,
  };

  try {
    templatesRepo.update(req.user!.id, updated);
    return res.json({ template: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du modèle' });
  }
});

// Delete template
app.delete('/api/templates/:id', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  templatesRepo.delete(req.user!.id, id);
  return res.json({ success: true });
});

// --- FRIENDSHIPS ROUTES ---

// Get friendships
app.get('/api/friendships', requireAuth, (req: AuthRequest, res) => {
  const all = friendshipsRepo.getAll();
  const userFriendships = all.filter(
    (f) => f.senderId === req.user!.id || f.receiverId === req.user!.id
  );
  return res.json({ friendships: userFriendships });
});

// Send request
app.post('/api/friendships', requireAuth, (req: AuthRequest, res) => {
  const { receiverId } = req.body;
  if (!receiverId || receiverId === req.user!.id) {
    return res.status(400).json({ error: 'Destinataire invalide' });
  }

  const all = friendshipsRepo.getAll();
  const existing = all.find(
    (f) =>
      (f.senderId === req.user!.id && f.receiverId === receiverId) ||
      (f.receiverId === req.user!.id && f.senderId === receiverId)
  );

  if (existing) {
    return res.status(409).json({ error: 'Une demande d’ami existe déjà avec cet utilisateur' });
  }

  const friendship = friendshipsRepo.sendRequest(req.user!.id, receiverId);
  return res.status(201).json({ friendship });
});

// Update friendship status (accept / decline)
app.patch('/api/friendships/:id', requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'accepted' && status !== 'declined') {
    return res.status(400).json({ error: 'Statut invalide (doit être "accepted" ou "declined")' });
  }

  try {
    friendshipsRepo.updateStatus(id, req.user!.id, status);
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la demande' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  return res.json({ status: 'ok', database: 'sqlite', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Planify SQL Backend running on http://localhost:${PORT}`);
});
