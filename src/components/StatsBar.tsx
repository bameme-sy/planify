import React from 'react';
import { TimeSlot, CategoryId } from '../types';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import { calculateDurationMinutes, formatDuration } from '../utils/dateUtils';
import { Clock, CheckCircle2, Search, X } from 'lucide-react';

interface StatsBarProps {
  slots: TimeSlot[];
  weeklyTargetHours: number;
  selectedCategoryFilter: CategoryId | 'all';
  onSelectCategoryFilter: (cat: CategoryId | 'all') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  slots,
  weeklyTargetHours,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  searchQuery,
  onSearchChange,
}) => {
  // Compute totals
  let totalMinutes = 0;
  const categoryMinutes: Record<string, number> = {};

  for (const slot of slots) {
    if (slot.status === 'cancelled') continue;
    const dur = calculateDurationMinutes(slot.startTime, slot.endTime);
    totalMinutes += dur;
    categoryMinutes[slot.categoryId] = (categoryMinutes[slot.categoryId] || 0) + dur;
  }

  const targetMinutes = weeklyTargetHours * 60;
  const progressPct = targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0;
  const isTargetReached = totalMinutes >= targetMinutes && targetMinutes > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors py-3 px-4 sm:px-6 lg:px-8 shadow-xs no-print">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Total hours and Target progress */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              isTargetReached 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
            }`}>
              {isTargetReached ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total planifié</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {formatDuration(totalMinutes)}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                  / {weeklyTargetHours}h obj.
                </span>
              </div>
            </div>
          </div>

          {/* Mini Progress Bar */}
          <div className="w-32 hidden lg:block">
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>Objectif</span>
              <span className="font-semibold">{progressPct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  isTargetReached ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Category Chips (Filterable) */}
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto py-1">
            <button
              onClick={() => onSelectCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tous ({slots.length})
            </button>

            {Object.values(DEFAULT_CATEGORIES).map((cat) => {
              const minutes = categoryMinutes[cat.id] || 0;
              if (minutes === 0) return null;
              const isSelected = selectedCategoryFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategoryFilter(isSelected ? 'all' : cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 font-semibold shadow-xs'
                      : 'opacity-85 hover:opacity-100'
                  } ${cat.bgLight} ${cat.bgDark} ${cat.textColorLight} ${cat.textColorDark}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.label}</span>
                  <span className="opacity-75 font-mono text-[11px]">
                    {formatDuration(minutes)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrer créneau..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
