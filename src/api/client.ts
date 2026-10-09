import { User, TimeSlot, WeekTemplate, Friendship } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'planify_auth_token';

export const apiClient = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Erreur serveur (${res.status})`);
    }

    return data as T;
  },

  // Auth API
  async register(name: string, username: string, email: string, password?: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password: password || 'password' }),
    });
    this.setToken(res.token);
    return res;
  },

  async login(identifier: string, password?: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password: password || 'password' }),
    });
    this.setToken(res.token);
    return res;
  },

  async getMe(): Promise<User | null> {
    if (!this.getToken()) return null;
    try {
      const res = await this.request<{ user: User }>('/api/auth/me');
      return res.user;
    } catch {
      this.setToken(null);
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  },

  // Users Directory
  async getAllUsers(): Promise<User[]> {
    const res = await this.request<{ users: User[] }>('/api/users');
    return res.users;
  },

  // Slots API
  async getSlots(userId?: string): Promise<TimeSlot[]> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await this.request<{ slots: TimeSlot[] }>(`/api/slots${query}`);
    return res.slots;
  },

  async saveAllSlots(slots: TimeSlot[]): Promise<void> {
    await this.request('/api/slots', {
      method: 'PUT',
      body: JSON.stringify({ slots }),
    });
  },

  async saveSlot(slot: TimeSlot): Promise<void> {
    await this.request('/api/slots', {
      method: 'POST',
      body: JSON.stringify(slot),
    });
  },

  async deleteSlot(id: string): Promise<void> {
    await this.request(`/api/slots/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Templates API
  async getTemplates(): Promise<WeekTemplate[]> {
    const res = await this.request<{ templates: WeekTemplate[] }>('/api/templates');
    return res.templates;
  },

  async createTemplate(template: WeekTemplate): Promise<WeekTemplate> {
    const res = await this.request<{ template: WeekTemplate }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
    return res.template;
  },

  async updateTemplate(id: string, template: WeekTemplate): Promise<WeekTemplate> {
    const res = await this.request<{ template: WeekTemplate }>(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
    return res.template;
  },

  async deleteTemplate(id: string): Promise<void> {
    await this.request(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Friendships API
  async getFriendships(): Promise<Friendship[]> {
    const res = await this.request<{ friendships: Friendship[] }>('/api/friendships');
    return res.friendships;
  },

  async sendFriendRequest(receiverId: string): Promise<Friendship> {
    const res = await this.request<{ friendship: Friendship }>('/api/friendships', {
      method: 'POST',
      body: JSON.stringify({ receiverId }),
    });
    return res.friendship;
  },

  async updateFriendshipStatus(id: string, status: 'accepted' | 'declined'): Promise<void> {
    await this.request(`/api/friendships/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
