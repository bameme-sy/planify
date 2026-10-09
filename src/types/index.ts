export type CategoryId = 
  | 'work' 
  | 'meeting' 
  | 'personal' 
  | 'sport' 
  | 'study' 
  | 'break' 
  | 'project' 
  | 'custom';

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
  dotColor: string;
  bgLight: string;
  bgDark: string;
  textColorLight: string;
  textColorDark: string;
  borderColor: string;
}

export type SlotStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface TimeSlot {
  id: string;
  userId?: string; // ID of the owner user
  title: string;
  categoryId: CategoryId;
  customCategoryName?: string;
  customColor?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "09:00")
  endTime: string; // HH:mm (e.g. "10:30")
  notes?: string;
  location?: string;
  status: SlotStatus;
  createdAt: number;
}

export interface TemplateSlot {
  title: string;
  categoryId: CategoryId;
  customCategoryName?: string;
  customColor?: string;
  startTime: string;
  endTime: string;
  notes?: string;
  location?: string;
  status: SlotStatus;
  dayOfWeek: number; // 0 for Monday, 6 for Sunday
}

export interface WeekTemplate {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  createdAt: number;
  slots: TemplateSlot[];
}

export type CalendarViewMode = '1-day' | '3-days' | '5-days' | '7-days';
export type AppThemeStyle = 'modern-indigo' | 'linear-dark' | 'apple-clean' | 'warm-notion';

export interface PlanningConfig {
  startHour: number;
  endHour: number;
  showWeekends: boolean;
  weeklyTargetHours: number;
  timeStepMinutes: number;
  viewMode: CalendarViewMode;
  themeStyle: AppThemeStyle;
}

export interface DayInfo {
  date: Date;
  dateString: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  dayOfWeek: number;
}

// User and Social Accounts
export interface User {
  id: string;
  name: string;
  username: string; // e.g. "alexandre"
  email: string;
  password?: string;
  bio?: string;
  createdAt: number;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: number;
}
