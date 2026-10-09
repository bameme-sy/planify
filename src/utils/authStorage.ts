import { User, Friendship, TimeSlot } from '../types';

const AUTH_KEYS = {
  USERS: 'planify_users_v2',
  CURRENT_USER_ID: 'planify_current_user_id_v2',
  FRIENDSHIPS: 'planify_friendships_v2',
  USER_SLOTS_PREFIX: 'planify_slots_user_',
};

// Clean up any legacy fake demo accounts that might exist in browser storage
export function initAuthStorage(): void {
  try {
    const rawUsers = localStorage.getItem(AUTH_KEYS.USERS);
    if (rawUsers) {
      const users: User[] = JSON.parse(rawUsers);
      // Filter out legacy demo accounts (user-alice, user-lucas, user-sarah)
      const realUsers = users.filter((u) => !u.id.startsWith('user-alice') && !u.id.startsWith('user-lucas') && !u.id.startsWith('user-sarah'));
      if (realUsers.length !== users.length) {
        saveUsers(realUsers);
      }
    }

    const rawFriendships = localStorage.getItem(AUTH_KEYS.FRIENDSHIPS);
    if (rawFriendships) {
      const friendships: Friendship[] = JSON.parse(rawFriendships);
      const realFriendships = friendships.filter(
        (f) => !f.senderId.startsWith('user-') || (!f.senderId.includes('alice') && !f.senderId.includes('lucas') && !f.senderId.includes('sarah') && !f.receiverId.includes('alice') && !f.receiverId.includes('lucas') && !f.receiverId.includes('sarah'))
      );
      if (realFriendships.length !== friendships.length) {
        saveFriendships(realFriendships);
      }
    }
  } catch (e) {
    console.error('Error initializing auth storage', e);
  }
}

// User Accounts CRUD
export function getAllUsers(): User[] {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.USERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users', e);
  }
}

export function getCurrentUser(): User | null {
  try {
    const currentUserId = localStorage.getItem(AUTH_KEYS.CURRENT_USER_ID);
    if (!currentUserId) return null;
    const users = getAllUsers();
    return users.find((u) => u.id === currentUserId) || null;
  } catch {
    return null;
  }
}

export function setCurrentUserId(userId: string | null): void {
  if (userId) {
    localStorage.setItem(AUTH_KEYS.CURRENT_USER_ID, userId);
  } else {
    localStorage.removeItem(AUTH_KEYS.CURRENT_USER_ID);
  }
}

export function registerUser(name: string, username: string, email: string, password?: string): User {
  const users = getAllUsers();
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Le pseudo @${cleanUsername} est déjà utilisé.`);
  }
  if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    throw new Error(`L'adresse email ${email} est déjà enregistrée.`);
  }

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    username: cleanUsername,
    email: email.trim().toLowerCase(),
    password: password || 'password',
    createdAt: Date.now(),
  };

  const updatedUsers = [...users, newUser];
  saveUsers(updatedUsers);
  setCurrentUserId(newUser.id);

  return newUser;
}

export function loginUser(emailOrUsername: string): User {
  const users = getAllUsers();
  const term = emailOrUsername.trim().toLowerCase().replace(/^@/, '');
  
  const found = users.find(
    (u) => u.email.toLowerCase() === term || u.username.toLowerCase() === term
  );

  if (!found) {
    throw new Error('Utilisateur non trouvé. Vérifiez votre pseudo ou email.');
  }

  setCurrentUserId(found.id);
  return found;
}

export function logoutUser(): void {
  setCurrentUserId(null);
}

// Per-User Slots Storage
export function getUserSlots(userId: string): TimeSlot[] {
  if (!userId) return [];
  try {
    const key = `${AUTH_KEYS.USER_SLOTS_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUserSlots(userId: string, slots: TimeSlot[]): void {
  if (!userId) return;
  try {
    const key = `${AUTH_KEYS.USER_SLOTS_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(slots));
  } catch (e) {
    console.error('Error saving user slots', e);
  }
}

// Friendship Management
export function getFriendships(): Friendship[] {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.FRIENDSHIPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveFriendships(friendships: Friendship[]): void {
  try {
    localStorage.setItem(AUTH_KEYS.FRIENDSHIPS, JSON.stringify(friendships));
  } catch (e) {
    console.error('Error saving friendships', e);
  }
}

export function getFriendsForUser(userId: string): User[] {
  if (!userId) return [];
  const friendships = getFriendships();
  const allUsers = getAllUsers();

  const accepted = friendships.filter(
    (f) => f.status === 'accepted' && (f.senderId === userId || f.receiverId === userId)
  );

  const friendIds = accepted.map((f) => (f.senderId === userId ? f.receiverId : f.senderId));
  return allUsers.filter((u) => friendIds.includes(u.id));
}

export function getPendingRequestsReceived(userId: string): { request: Friendship; sender: User }[] {
  if (!userId) return [];
  const friendships = getFriendships();
  const allUsers = getAllUsers();

  return friendships
    .filter((f) => f.receiverId === userId && f.status === 'pending')
    .map((request) => {
      const sender = allUsers.find((u) => u.id === request.senderId) || {
        id: request.senderId,
        name: 'Utilisateur',
        username: 'inconnu',
        email: '',
        createdAt: 0,
      };
      return { request, sender };
    });
}

export function getPendingRequestsSent(userId: string): { request: Friendship; receiver: User }[] {
  if (!userId) return [];
  const friendships = getFriendships();
  const allUsers = getAllUsers();

  return friendships
    .filter((f) => f.senderId === userId && f.status === 'pending')
    .map((request) => {
      const receiver = allUsers.find((u) => u.id === request.receiverId) || {
        id: request.receiverId,
        name: 'Utilisateur',
        username: 'inconnu',
        email: '',
        createdAt: 0,
      };
      return { request, receiver };
    });
}

export function sendFriendRequest(senderId: string, receiverId: string): Friendship {
  if (senderId === receiverId) {
    throw new Error('Vous ne pouvez pas vous ajouter vous-même.');
  }

  const friendships = getFriendships();
  const existing = friendships.find(
    (f) =>
      (f.senderId === senderId && f.receiverId === receiverId) ||
      (f.senderId === receiverId && f.receiverId === senderId)
  );

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error('Vous êtes déjà amis.');
    }
    if (existing.status === 'pending') {
      throw new Error('Une demande est déjà en attente entre vous.');
    }
  }

  const newFriendship: Friendship = {
    id: `fr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId,
    status: 'pending',
    createdAt: Date.now(),
  };

  saveFriendships([...friendships, newFriendship]);
  return newFriendship;
}

export function acceptFriendRequest(requestId: string): void {
  const friendships = getFriendships();
  const updated = friendships.map((f) =>
    f.id === requestId ? { ...f, status: 'accepted' as const } : f
  );
  saveFriendships(updated);
}

export function declineFriendRequest(requestId: string): void {
  const friendships = getFriendships();
  const updated = friendships.filter((f) => f.id !== requestId);
  saveFriendships(updated);
}

export function removeFriend(userId: string, friendId: string): void {
  const friendships = getFriendships();
  const updated = friendships.filter(
    (f) =>
      !(
        (f.senderId === userId && f.receiverId === friendId) ||
        (f.senderId === friendId && f.receiverId === userId)
      )
  );
  saveFriendships(updated);
}
