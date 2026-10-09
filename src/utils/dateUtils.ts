import { DayInfo, TimeSlot } from '../types';

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // day 0 is Sunday, so if Sunday (0) we subtract 6 days, otherwise subtract (day - 1)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function getWeekDays(mondayDate: Date, showWeekends: boolean = true): DayInfo[] {
  const daysCount = showWeekends ? 7 : 5;
  const days: DayInfo[] = [];
  const todayStr = formatDateKey(new Date());

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    const dateString = formatDateKey(d);

    days.push({
      date: d,
      dateString,
      dayName: DAY_NAMES[i],
      dayNumber: d.getDate(),
      monthName: MONTH_NAMES[d.getMonth()],
      isToday: dateString === todayStr,
      dayOfWeek: i,
    });
  }

  return days;
}

export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export function formatWeekRange(startDate: Date, endDate: Date): string {
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = MONTH_NAMES[startDate.getMonth()];
  const endMonth = MONTH_NAMES[endDate.getMonth()];
  const year = endDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth} ${year}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
}

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const effectiveEnd = end === 1439 ? 1440 : end;
  return Math.max(0, effectiveEnd - start);
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export interface PositionedSlot {
  slot: TimeSlot;
  column: number;
  totalColumns: number;
}

/**
 * Calculates columns layout for overlapping slots in the same day
 */
export function layoutDaySlots(slots: TimeSlot[]): PositionedSlot[] {
  if (slots.length === 0) return [];

  // Sort slots by start time, then duration descending
  const sorted = [...slots].sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return (
      calculateDurationMinutes(b.startTime, b.endTime) -
      calculateDurationMinutes(a.startTime, a.endTime)
    );
  });

  const positioned: PositionedSlot[] = [];
  const columns: { endMinutes: number }[] = [];

  for (const slot of sorted) {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);

    let placedCol = -1;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].endMinutes <= start) {
        placedCol = c;
        columns[c].endMinutes = end;
        break;
      }
    }

    if (placedCol === -1) {
      placedCol = columns.length;
      columns.push({ endMinutes: end });
    }

    positioned.push({
      slot,
      column: placedCol,
      totalColumns: 1, // Will be resolved next
    });
  }

  // Calculate cluster overlaps to distribute widths evenly
  for (let i = 0; i < positioned.length; i++) {
    const itemA = positioned[i];
    const startA = timeToMinutes(itemA.slot.startTime);
    const endA = timeToMinutes(itemA.slot.endTime);

    // Find all slots that overlap with itemA
    const overlappingGroup = [itemA];
    for (let j = 0; j < positioned.length; j++) {
      if (i === j) continue;
      const itemB = positioned[j];
      const startB = timeToMinutes(itemB.slot.startTime);
      const endB = timeToMinutes(itemB.slot.endTime);

      if (Math.max(startA, startB) < Math.min(endA, endB)) {
        overlappingGroup.push(itemB);
      }
    }

    const maxCols = Math.max(...overlappingGroup.map((item) => item.column + 1));
    for (const member of overlappingGroup) {
      member.totalColumns = Math.max(member.totalColumns, maxCols);
    }
  }

  return positioned;
}

/**
 * Generate iCalendar RFC 5545 format export (.ics)
 */
export function generateICS(slots: TimeSlot[]): string {
  const formatICSDate = (dateStr: string, timeStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const [hh, mm] = timeStr.split(':');
    return `${y}${m}${d}T${hh}${mm}00`;
  };

  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planify//Gestionnaire de Planning Hebdomadaire//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Mon Planning Hebdomadaire',
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  for (const slot of slots) {
    if (slot.status === 'cancelled') continue;
    const dtStart = formatICSDate(slot.date, slot.startTime);
    const dtEnd = formatICSDate(slot.date, slot.endTime);

    ics.push(
      'BEGIN:VEVENT',
      `UID:planify-${slot.id}@planify.app`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${slot.title.replace(/[,;]/g, ' ')}`,
      slot.location ? `LOCATION:${slot.location.replace(/[,;]/g, ' ')}` : '',
      slot.notes ? `DESCRIPTION:${slot.notes.replace(/\n/g, '\\n')}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  ics.push('END:VCALENDAR');
  return ics.filter(Boolean).join('\r\n');
}
