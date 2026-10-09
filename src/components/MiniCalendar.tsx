import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateKey } from '../utils/dateUtils';

interface MiniCalendarProps {
  currentMonday: Date;
  onSelectDate: (date: Date) => void;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  currentMonday,
  onSelectDate,
}) => {
  const [viewDate, setViewDate] = useState<Date>(() => new Date(currentMonday));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevDays = Array.from(
    { length: firstDayIndex },
    (_, i) => prevMonthLastDay - firstDayIndex + i + 1
  );

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const totalCells = firstDayIndex + daysInMonth;
  const nextDaysCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const nextMonthDays = Array.from({ length: nextDaysCount }, (_, i) => i + 1);

  const todayStr = formatDateKey(new Date());
  
  const activeWeekDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    activeWeekDates.add(formatDateKey(d));
  }

  const handleDayClick = (dYear: number, dMonth: number, dayNum: number) => {
    const clicked = new Date(dYear, dMonth, dayNum);
    onSelectDate(clicked);
  };

  return (
    <div className="p-2.5 bg-transparent select-none">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          {MONTH_NAMES_FR[month]} {year}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={prevMonth}
            className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Weekday initials */}
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-[#8e8e93] dark:text-[#98989d] mb-1">
        {DAY_INITIALS.map((init, i) => (
          <div key={i} className="py-0.5">
            {init}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-[11px]">
        {/* Previous Month Days */}
        {prevDays.map((dayNum) => {
          const dStr = formatDateKey(new Date(year, month - 1, dayNum));
          const isInActiveWeek = activeWeekDates.has(dStr);
          return (
            <button
              key={`prev-${dayNum}`}
              onClick={() => handleDayClick(year, month - 1, dayNum)}
              className={`h-6 w-full flex items-center justify-center text-[#c7c7cc] dark:text-[#636366] transition-colors rounded-[4px] ${
                isInActiveWeek ? 'bg-black/5 dark:bg-white/5 font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {dayNum}
            </button>
          );
        })}

        {/* Current Month Days */}
        {currentMonthDays.map((dayNum) => {
          const dStr = formatDateKey(new Date(year, month, dayNum));
          const isToday = dStr === todayStr;
          const isInActiveWeek = activeWeekDates.has(dStr);

          return (
            <button
              key={`cur-${dayNum}`}
              onClick={() => handleDayClick(year, month, dayNum)}
              className={`h-6 w-full flex items-center justify-center transition-colors relative rounded-[4px] ${
                isInActiveWeek ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] ${
                  isToday
                    ? 'bg-[#ff3b30] dark:bg-[#ff453a] text-white font-semibold shadow-xs'
                    : isInActiveWeek
                    ? 'font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]'
                    : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
                }`}
              >
                {dayNum}
              </span>
            </button>
          );
        })}

        {/* Next Month Days */}
        {nextMonthDays.map((dayNum) => {
          const dStr = formatDateKey(new Date(year, month + 1, dayNum));
          const isInActiveWeek = activeWeekDates.has(dStr);
          return (
            <button
              key={`next-${dayNum}`}
              onClick={() => handleDayClick(year, month + 1, dayNum)}
              className={`h-6 w-full flex items-center justify-center text-[#c7c7cc] dark:text-[#636366] transition-colors rounded-[4px] ${
                isInActiveWeek ? 'bg-black/5 dark:bg-white/5 font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
};
