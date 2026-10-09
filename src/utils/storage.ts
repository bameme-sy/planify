import { TimeSlot, WeekTemplate, PlanningConfig } from '../types';

const STORAGE_KEYS = {
  SLOTS: 'planify_slots_v1',
  TEMPLATES: 'planify_templates_v1',
  CONFIG: 'planify_config_v1',
  THEME: 'planify_theme_v1',
};

export const DEFAULT_CONFIG: PlanningConfig = {
  startHour: 0,
  endHour: 23,
  showWeekends: true,
  weeklyTargetHours: 35,
  timeStepMinutes: 30,
  viewMode: '7-days',
  themeStyle: 'modern-indigo',
};

export function loadSlots(): TimeSlot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading slots from localStorage', e);
    return [];
  }
}

export function saveSlots(slots: TimeSlot[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
  } catch (e) {
    console.error('Error saving slots to localStorage', e);
  }
}

export function loadTemplates(userId?: string): WeekTemplate[] {
  try {
    const key = userId ? `planify_templates_user_${userId}` : STORAGE_KEYS.TEMPLATES;
    let data = localStorage.getItem(key);
    
    // If user key not found but global key exists, attempt migration
    if (!data && userId) {
      data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    }

    if (!data) {
      return [];
    }

    const parsed: WeekTemplate[] = JSON.parse(data);
    // Purge legacy hardcoded demo templates
    const clean = parsed.filter(
      (t) => t.id !== 'standard-work-week' && t.id !== 'etudiant-formation'
    );

    if (clean.length !== parsed.length) {
      saveTemplates(clean, userId);
    }
    return clean;
  } catch (e) {
    console.error('Error loading templates', e);
    return [];
  }
}

export function saveTemplates(templates: WeekTemplate[], userId?: string): void {
  try {
    const clean = templates.filter(
      (t) => t.id !== 'standard-work-week' && t.id !== 'etudiant-formation'
    );
    const key = userId ? `planify_templates_user_${userId}` : STORAGE_KEYS.TEMPLATES;
    localStorage.setItem(key, JSON.stringify(clean));
    if (userId) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(clean));
    }
  } catch (e) {
    console.error('Error saving templates', e);
  }
}

export function loadConfig(): PlanningConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!data) return DEFAULT_CONFIG;
    const parsed = JSON.parse(data);
    if (parsed.startHour === 7 && parsed.endHour === 21) {
      parsed.startHour = 0;
      parsed.endHour = 23;
      saveConfig({ ...DEFAULT_CONFIG, ...parsed });
    }
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: PlanningConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config', e);
  }
}
