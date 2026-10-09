import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  TimeSlot, 
  PlanningConfig, 
  CategoryId, 
  DayInfo 
} from '../types';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import { 
  timeToMinutes, 
  minutesToTime, 
  calculateDurationMinutes, 
  formatDuration, 
  layoutDaySlots 
} from '../utils/dateUtils';
import { 
  Clock, 
  MapPin, 
  Check, 
  Trash2, 
  Plus
} from 'lucide-react';

interface CalendarGridProps {
  days: DayInfo[];
  slots: TimeSlot[];
  config: PlanningConfig;
  onSelectSlot: (slot: TimeSlot) => void;
  onCreateSlotAt: (date: string, startTime: string, endTime: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onUpdateSlotDuration: (slotId: string, newEndTime: string) => void;
  onToggleSlotStatus: (slotId: string) => void;
  selectedCategoryFilter: CategoryId | 'all';
  visibleCategories?: Record<CategoryId, boolean>;
  searchQuery: string;
  isReadOnly?: boolean;
}

const HOUR_HEIGHT = 60; // 60px per hour

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  slots,
  config,
  onSelectSlot,
  onCreateSlotAt,
  onDeleteSlot,
  onUpdateSlotDuration,
  onToggleSlotStatus,
  selectedCategoryFilter,
  visibleCategories,
  searchQuery,
  isReadOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { startHour, endHour, timeStepMinutes } = config;
  const calendarStartMinutes = startHour * 60;
  const calendarEndMinutes = (endHour + 1) * 60;
  const totalCalendarMinutes = calendarEndMinutes - calendarStartMinutes;

  // Auto-scroll to 08:00 or current hour on mount
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentH = now.getHours();
      const targetHour = currentH >= startHour && currentH <= endHour 
        ? Math.max(startHour, currentH - 1)
        : Math.max(startHour, Math.min(endHour, 8));
      const scrollPos = (targetHour - startHour) * HOUR_HEIGHT;
      containerRef.current.scrollTop = Math.max(0, scrollPos - 10);
    }
  }, [startHour, endHour]);

  // Real-time live marker
  const [currentMinutesNow, setCurrentMinutesNow] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutesNow(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Drag selection state
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragDayDate, setDragDayDate] = useState<string | null>(null);
  const [dragStartMin, setDragStartMin] = useState<number | null>(null);
  const [dragCurrentMin, setDragCurrentMin] = useState<number | null>(null);

  // Resize state
  const [resizingSlotId, setResizingSlotId] = useState<string | null>(null);
  const [resizeCurrentEndTime, setResizeCurrentEndTime] = useState<string | null>(null);

  // Filter slots
  const filteredSlots = slots.filter((slot) => {
    if (visibleCategories && visibleCategories[slot.categoryId] === false) {
      return false;
    }
    if (selectedCategoryFilter !== 'all' && slot.categoryId !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = slot.title.toLowerCase().includes(q);
      const matchNotes = slot.notes?.toLowerCase().includes(q);
      const matchLocation = slot.location?.toLowerCase().includes(q);
      return matchTitle || matchNotes || matchLocation;
    }
    return true;
  });

  // Snap minutes
  const snapMinutes = useCallback(
    (minutes: number): number => {
      const snapped = Math.round(minutes / timeStepMinutes) * timeStepMinutes;
      return Math.max(calendarStartMinutes, Math.min(calendarEndMinutes, snapped));
    },
    [timeStepMinutes, calendarStartMinutes, calendarEndMinutes]
  );

  const getMinutesFromMouseEvent = (e: React.MouseEvent | MouseEvent, columnElement: HTMLElement): number => {
    const rect = columnElement.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = calendarStartMinutes + (offsetY / HOUR_HEIGHT) * 60;
    return snapMinutes(minutes);
  };

  const handleDayMouseDown = (e: React.MouseEvent, dateString: string) => {
    if (isReadOnly) return;
    if ((e.target as HTMLElement).closest('.time-slot-card')) {
      return;
    }
    if (e.button !== 0) return;

    const columnElem = e.currentTarget as HTMLElement;
    const minutes = getMinutesFromMouseEvent(e, columnElem);

    setIsDraggingSelection(true);
    setDragDayDate(dateString);
    setDragStartMin(minutes);
    setDragCurrentMin(minutes + 60);
  };

  const handleDayMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSelection || !dragDayDate || dragStartMin === null) return;
    const columnElem = e.currentTarget as HTMLElement;
    const currentMin = getMinutesFromMouseEvent(e, columnElem);
    setDragCurrentMin(currentMin);
  };

  // Quick tap/click to create on mobile or desktop without dragging
  const handleDayClick = (e: React.MouseEvent, dateString: string) => {
    if (isReadOnly) return;
    if ((e.target as HTMLElement).closest('.time-slot-card')) {
      return;
    }
    // Only if not dragging a range
    if (dragStartMin !== null && dragCurrentMin !== null && Math.abs(dragCurrentMin - dragStartMin) > 30) {
      return;
    }
    const columnElem = e.currentTarget as HTMLElement;
    const minutes = getMinutesFromMouseEvent(e, columnElem);
    const startM = Math.min(calendarEndMinutes - timeStepMinutes, snapMinutes(minutes));
    const endM = Math.min(calendarEndMinutes, startM + 60);
    onCreateSlotAt(dateString, minutesToTime(startM), minutesToTime(endM));
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingSelection && dragDayDate && dragStartMin !== null && dragCurrentMin !== null) {
        let start = Math.min(dragStartMin, dragCurrentMin);
        let end = Math.max(dragStartMin, dragCurrentMin);

        if (end - start >= 30) {
          onCreateSlotAt(dragDayDate, minutesToTime(start), minutesToTime(end));
        }
      }

      if (resizingSlotId && resizeCurrentEndTime) {
        onUpdateSlotDuration(resizingSlotId, resizeCurrentEndTime);
      }

      setIsDraggingSelection(false);
      setDragDayDate(null);
      setDragStartMin(null);
      setDragCurrentMin(null);
      setResizingSlotId(null);
      setResizeCurrentEndTime(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [
    isDraggingSelection,
    dragDayDate,
    dragStartMin,
    dragCurrentMin,
    resizingSlotId,
    resizeCurrentEndTime,
    calendarEndMinutes,
    onCreateSlotAt,
    onUpdateSlotDuration,
  ]);

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );

  // Responsive min-width calculation so day columns are always comfortably readable
  const minContentWidth = useMemo(() => {
    const numDays = days.length;
    if (numDays === 1) return '100%';
    if (numDays <= 3) return '100%';
    // For 5 or 7 days, guarantee at least 115px per column plus 56px for time gutter
    const calculated = numDays * 115 + 56;
    return `${calculated}px`;
  }, [days.length]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto select-none calendar-container bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors relative"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div 
        className="inline-flex flex-col min-w-full"
        style={{ minWidth: minContentWidth }}
      >
        {/* Sticky Day Headers (Synchronized horizontally with grid columns!) */}
        <div className="sticky top-0 z-30 flex border-b border-[#e5e5ea] dark:border-[#38383a] bg-[#fdfdfd]/95 dark:bg-[#202022]/95 backdrop-blur-md">
          {/* Top-left corner: Sticky left & top */}
          <div className="w-12 sm:w-16 shrink-0 sticky left-0 z-40 bg-[#fdfdfd] dark:bg-[#202022] border-r border-[#e5e5ea] dark:border-[#38383a] p-2 flex items-center justify-center text-[10px] text-[#8e8e93]">
            <Clock className="h-3.5 w-3.5" />
          </div>

          {/* Days Columns Header */}
          <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-[#e5e5ea] dark:divide-[#38383a]">
            {days.map((day) => {
              const dayMinutes = slots
                .filter((s) => s.date === day.dateString && s.status !== 'cancelled')
                .reduce((sum, s) => sum + calculateDurationMinutes(s.startTime, s.endTime), 0);

              return (
                <div
                  key={day.dateString}
                  className={`py-2 px-1 text-center flex flex-col items-center justify-center transition-colors min-w-0 ${
                    day.isToday
                      ? 'bg-[#007aff]/[0.02] dark:bg-[#0a84ff]/[0.03]'
                      : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.015]'
                  }`}
                >
                  <div className={`text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase truncate ${
                    day.isToday ? 'text-[#ff3b30] dark:text-[#ff453a]' : 'text-[#8e8e93] dark:text-[#98989d]'
                  }`}>
                    {day.dayName.slice(0, 3)}.
                  </div>
                  
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex items-center justify-center text-[13px] sm:text-[15px] transition-transform ${
                        day.isToday
                          ? 'h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[#ff3b30] dark:bg-[#ff453a] text-white font-semibold shadow-xs'
                          : 'h-6 w-6 sm:h-7 sm:w-7 rounded-full font-normal text-[#1d1d1f] dark:text-[#f5f5f7]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  {dayMinutes > 0 && (
                    <span className="mt-0.5 text-[9px] font-medium text-[#8e8e93] dark:text-[#98989d] truncate">
                      {formatDuration(dayMinutes)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Body Area */}
        <div 
          className="flex relative"
          style={{ height: `${(totalCalendarMinutes / 60) * HOUR_HEIGHT}px` }}
        >
          {/* Time Gutter (Left labels) - Sticky Left! */}
          <div className="w-12 sm:w-16 shrink-0 sticky left-0 z-20 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xs border-r border-[#e5e5ea] dark:border-[#38383a] select-none">
            {hours.map((hour) => (
              <div
                key={hour}
                className={`absolute right-1.5 sm:right-2 text-[10px] sm:text-[11px] font-normal text-[#8e8e93] dark:text-[#98989d] ${
                  hour === startHour ? 'translate-y-0.5' : '-translate-y-2.5'
                }`}
                style={{ top: `${(hour - startHour) * HOUR_HEIGHT}px` }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
            {/* Terminating boundary hour */}
            <div
              className="absolute right-1.5 sm:right-2 text-[10px] sm:text-[11px] font-normal text-[#8e8e93] dark:text-[#98989d] -translate-y-3"
              style={{ top: `${(endHour + 1 - startHour) * HOUR_HEIGHT}px` }}
            >
              {endHour === 23 ? '24:00' : `${String(endHour + 1).padStart(2, '0')}:00`}
            </div>
          </div>

          {/* Grid Background Horizontal Lines */}
          <div className="absolute inset-0 left-12 sm:left-16 pointer-events-none">
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                <div
                  className="absolute left-0 right-0 border-t border-[#e5e5ea] dark:border-[#38383a]"
                  style={{ top: `${(hour - startHour) * HOUR_HEIGHT}px` }}
                />
                <div
                  className="absolute left-0 right-0 border-t border-dotted border-[#e5e5ea]/50 dark:border-[#38383a]/50"
                  style={{ top: `${(hour - startHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                />
              </React.Fragment>
            ))}
            {/* Terminating line for final hour */}
            <div
              className="absolute left-0 right-0 border-t border-[#e5e5ea] dark:border-[#38383a]"
              style={{ top: `${(endHour + 1 - startHour) * HOUR_HEIGHT}px` }}
            />
          </div>

          {/* Day Columns */}
          <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-[#e5e5ea] dark:divide-[#38383a] relative">
            {days.map((day) => {
              const daySlots = filteredSlots.filter((s) => s.date === day.dateString);
              const positionedSlots = layoutDaySlots(daySlots);

              // Live Time Marker (Apple Calendar Red Laser)
              const isToday = day.isToday;
              const showLiveIndicator =
                isToday &&
                currentMinutesNow >= calendarStartMinutes &&
                currentMinutesNow <= calendarEndMinutes;
              const liveTopPx =
                ((currentMinutesNow - calendarStartMinutes) / 60) * HOUR_HEIGHT;

              // Selection preview box for this day
              const isSelectedDay = isDraggingSelection && dragDayDate === day.dateString;
              let selectionTop = 0;
              let selectionHeight = 0;
              let selectionStartTimeStr = '';
              let selectionEndTimeStr = '';

              if (isSelectedDay && dragStartMin !== null && dragCurrentMin !== null) {
                const start = Math.min(dragStartMin, dragCurrentMin);
                const end = Math.max(dragStartMin, dragCurrentMin);
                selectionTop = ((start - calendarStartMinutes) / 60) * HOUR_HEIGHT;
                selectionHeight = Math.max(20, ((end - start) / 60) * HOUR_HEIGHT);
                selectionStartTimeStr = minutesToTime(start);
                selectionEndTimeStr = minutesToTime(end);
              }

              return (
                <div
                  key={day.dateString}
                  onMouseDown={(e) => handleDayMouseDown(e, day.dateString)}
                  onMouseMove={handleDayMouseMove}
                  onClick={(e) => handleDayClick(e, day.dateString)}
                  className={`relative h-full cursor-pointer transition-colors ${
                    day.isToday ? 'bg-[#007aff]/[0.015] dark:bg-[#0a84ff]/[0.025]' : ''
                  }`}
                >
                  {/* Apple Red Laser Indicator */}
                  {showLiveIndicator && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${liveTopPx}px` }}
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-[#ff3b30] dark:bg-[#ff453a] shadow-xs ring-2 ring-white dark:ring-[#1e1e1e] -ml-1" />
                      <div className="h-[1.5px] flex-1 bg-[#ff3b30] dark:bg-[#ff453a]" />
                    </div>
                  )}

                  {/* Drag Selection Preview Box */}
                  {isSelectedDay && (
                    <div
                      className="absolute left-1 right-1 rounded-[5px] bg-[#007aff]/15 border border-[#007aff] border-dashed z-20 pointer-events-none p-1 sm:p-1.5 flex flex-col justify-between shadow-sm backdrop-blur-2xs"
                      style={{
                        top: `${selectionTop}px`,
                        height: `${selectionHeight}px`,
                      }}
                    >
                      <div className="text-[10px] sm:text-[11px] font-semibold text-[#007aff] flex items-center gap-1 truncate">
                        <Plus className="h-3 w-3 shrink-0" />
                        <span className="truncate">Nouveau créneau</span>
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-medium text-[#007aff] bg-white/80 dark:bg-black/60 px-1 py-0.2 rounded-[4px] w-fit">
                        {selectionStartTimeStr} - {selectionEndTimeStr}
                      </div>
                    </div>
                  )}

                  {/* Render Positioned Slots */}
                  {positionedSlots.map(({ slot, column, totalColumns }) => {
                    const category = DEFAULT_CATEGORIES[slot.categoryId] || DEFAULT_CATEGORIES.custom;
                    const startMin = timeToMinutes(slot.startTime);
                    
                    const isResizing = resizingSlotId === slot.id;
                    const endMinRaw = isResizing && resizeCurrentEndTime
                      ? timeToMinutes(resizeCurrentEndTime)
                      : timeToMinutes(slot.endTime);
                    const endMin = endMinRaw === 1439 ? 1440 : endMinRaw;

                    const topPx = ((startMin - calendarStartMinutes) / 60) * HOUR_HEIGHT;
                    const durationMin = Math.max(15, endMin - startMin);
                    const heightPx = (durationMin / 60) * HOUR_HEIGHT;

                    const colWidthPct = 100 / totalColumns;
                    const leftPct = column * colWidthPct;

                    const isCancelled = slot.status === 'cancelled';
                    const isCompleted = slot.status === 'completed';

                    return (
                      <div
                        key={slot.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSlot(slot);
                        }}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          left: `calc(${leftPct}% + 1px)`,
                          width: `calc(${colWidthPct}% - 2px)`,
                        }}
                        className={`time-slot-card absolute rounded-[5px] px-1.5 sm:px-2 py-1 transition-all text-left shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-md cursor-pointer group flex flex-col justify-between overflow-hidden z-10 ${
                          category.bgLight
                        } ${category.bgDark} ${
                          isCancelled ? 'opacity-40 line-through' : ''
                        }`}
                      >
                        {/* Event Content Header */}
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-[11px] sm:text-[12px] font-semibold truncate leading-tight">
                              {slot.title}
                            </h4>

                            {/* Hover Quick Actions on desktop */}
                            {!isReadOnly && (
                              <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSlotStatus(slot.id);
                                  }}
                                  title={isCompleted ? "Marquer à faire" : "Marquer terminé"}
                                  className="p-0.5 rounded-[4px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSlot(slot.id);
                                  }}
                                  title="Supprimer"
                                  className="p-0.5 rounded-[4px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Time range */}
                          {durationMin >= 30 && (
                            <div className="text-[9px] sm:text-[10px] opacity-75 font-normal leading-tight mt-0.5 truncate">
                              {slot.startTime} - {isResizing ? resizeCurrentEndTime : slot.endTime}
                            </div>
                          )}
                        </div>

                        {/* Event Footer */}
                        {durationMin >= 45 && (
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] mt-0.5 opacity-80 truncate">
                            {slot.location ? (
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{slot.location}</span>
                              </span>
                            ) : (
                              <span className="text-[8px] sm:text-[9px] font-medium uppercase tracking-wider truncate">
                                {category.label}
                              </span>
                            )}

                            {isCompleted && (
                              <span className="inline-flex items-center gap-0.5 font-medium text-[8px] sm:text-[9px] px-1 rounded bg-black/10 dark:bg-white/10 shrink-0">
                                <Check className="h-2 w-2" />
                                Fait
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bottom Resize Handle */}
                        {!isReadOnly && (
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizingSlotId(slot.id);
                              setResizeCurrentEndTime(slot.endTime);

                              const startY = e.clientY;
                              const origEndMin = timeToMinutes(slot.endTime);

                              const handleMouseMove = (moveEvent: MouseEvent) => {
                                const diffY = moveEvent.clientY - startY;
                                const diffMin = Math.round((diffY / HOUR_HEIGHT) * 60);
                                const newMin = snapMinutes(origEndMin + diffMin);
                                const minAllowed = timeToMinutes(slot.startTime) + 15;
                                const clampedMin = Math.max(minAllowed, Math.min(calendarEndMinutes, newMin));
                                setResizeCurrentEndTime(minutesToTime(clampedMin));
                              };

                              const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                              };

                              window.addEventListener('mousemove', handleMouseMove);
                              window.addEventListener('mouseup', handleMouseUp);
                            }}
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/5 dark:bg-white/5"
                            title="Ajuster la durée"
                          >
                            <div className="w-5 h-0.5 rounded-full bg-current opacity-40" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
