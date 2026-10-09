import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Download, 
  Copy, 
  Trash2, 
  Moon, 
  Sun, 
  Sliders, 
  Bookmark, 
  PanelLeft, 
  Search, 
  X, 
  Users,
  LogOut,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { formatWeekRange } from '../utils/dateUtils';
import { PlanningConfig, CalendarViewMode, User } from '../types';

interface NavbarProps {
  currentMonday: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onOpenNewSlotModal: () => void;
  onOpenTemplatesModal: () => void;
  onOpenExportModal: () => void;
  onOpenConfigModal: () => void;
  onOpenFriendsModal: () => void;
  pendingRequestsCount: number;
  currentUser: User | null;
  onLogout: () => void;
  isViewingFriend: boolean;
  onCopyPrevWeek: () => void;
  onClearWeek: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  config: PlanningConfig;
  onChangeViewMode: (mode: CalendarViewMode) => void;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  totalSlotsThisWeek: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

const VIEW_MODES: { id: CalendarViewMode; label: string; mobileLabel: string }[] = [
  { id: '1-day', label: 'Jour', mobileLabel: '1J' },
  { id: '3-days', label: '3 Jours', mobileLabel: '3J' },
  { id: '5-days', label: 'Semaine (5j)', mobileLabel: '5J' },
  { id: '7-days', label: 'Semaine (7j)', mobileLabel: '7J' },
];

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const Navbar: React.FC<NavbarProps> = ({
  currentMonday,
  onPrevWeek,
  onNextWeek,
  onToday,
  onOpenNewSlotModal,
  onOpenTemplatesModal,
  onOpenExportModal,
  onOpenConfigModal,
  onOpenFriendsModal,
  pendingRequestsCount,
  currentUser,
  onLogout,
  isViewingFriend,
  onCopyPrevWeek,
  onClearWeek,
  isDarkMode,
  onToggleDarkMode,
  config,
  onChangeViewMode,
  onToggleSidebar,
  totalSlotsThisWeek,
  searchQuery,
  onSearchChange,
  onSync,
  isSyncing = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  const daysInView = config.viewMode === '1-day' ? 1 : config.viewMode === '3-days' ? 3 : config.viewMode === '5-days' ? 5 : 7;
  const endDate = new Date(currentMonday);
  endDate.setDate(currentMonday.getDate() + daysInView - 1);
  const weekRangeText = formatWeekRange(currentMonday, endDate);

  const displayMonth = MONTH_NAMES_FR[currentMonday.getMonth()];
  const displayYear = currentMonday.getFullYear();

  return (
    <header className="sticky top-0 z-30 bg-[#f6f6f7]/95 dark:bg-[#252528]/95 backdrop-blur-xl border-b border-[#e5e5ea] dark:border-[#38383a] select-none no-print transition-colors">
      <div className="w-full px-2.5 sm:px-4">
        {/* Main Row */}
        <div className="flex items-center justify-between h-[48px] sm:h-[52px] gap-1 sm:gap-2">
          
          {/* Left section: Sidebar toggle + Nav buttons + Date Title */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            {/* macOS Window Traffic Lights (desktop only) */}
            <div className="hidden lg:flex items-center gap-1.5 pr-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
            </div>

            {/* Sidebar toggle button */}
            <button
              onClick={onToggleSidebar}
              title="Barre latérale"
              className="p-1.5 rounded-[6px] text-[#48484a] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              <PanelLeft className="h-4 w-4" />
            </button>

            {/* Navigation buttons: Prev / Next / Today */}
            <div className="flex items-center gap-1">
              <div className="inline-flex rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#323234] shadow-[0_1px_1px_rgba(0,0,0,0.03)] overflow-hidden divide-x divide-[#d1d1d6] dark:divide-[#48484a]">
                <button
                  onClick={onPrevWeek}
                  title="Précédent"
                  className="px-1.5 py-1 text-[#48484a] dark:text-[#d1d1d6] hover:bg-[#f2f2f7] dark:hover:bg-[#3a3a3c] transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onNextWeek}
                  title="Suivant"
                  className="px-1.5 py-1 text-[#48484a] dark:text-[#d1d1d6] hover:bg-[#f2f2f7] dark:hover:bg-[#3a3a3c] transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={onToday}
                className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] bg-white dark:bg-[#323234] border border-[#d1d1d6] dark:border-[#48484a] hover:bg-[#f2f2f7] dark:hover:bg-[#3a3a3c] rounded-[6px] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-colors shrink-0"
              >
                Aujourd'hui
              </button>
            </div>

            {/* Date Header: Month and Year */}
            <div className="flex items-baseline gap-1 pl-1 truncate">
              <span className="text-[14px] sm:text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight truncate">
                {displayMonth}
              </span>
              <span className="text-[12px] sm:text-[14px] font-normal text-[#8e8e93] dark:text-[#98989d]">
                {displayYear}
              </span>
              <span className="text-[11px] text-[#8e8e93] dark:text-[#98989d] hidden 2xl:inline pl-1 font-mono">
                ({weekRangeText})
              </span>
            </div>
          </div>

          {/* Center: Apple Segmented View Control (Tablet & Desktop) */}
          <div className="hidden md:flex items-center">
            <div className="inline-flex items-center p-[2px] rounded-[7px] bg-[#e3e3e8] dark:bg-[#3a3a3c]">
              {VIEW_MODES.map((mode) => {
                const isActive = config.viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => onChangeViewMode(mode.id)}
                    className={`px-2.5 py-0.5 text-[12px] font-medium rounded-[5px] transition-all ${
                      isActive
                        ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] font-semibold'
                        : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right section: Search + Add + Friends + Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Desktop Search Bar */}
            <div className="hidden lg:flex items-center relative w-36 xl:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8e8e93] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-7 py-1 text-[12px] rounded-[6px] bg-[#e3e3e8]/70 dark:bg-[#3a3a3c]/70 hover:bg-[#e3e3e8] dark:hover:bg-[#3a3a3c] focus:bg-white dark:focus:bg-[#1e1e1e] border border-transparent focus:border-[#007aff]/50 focus:ring-2 focus:ring-[#007aff]/20 text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Mobile Search Toggle Icon */}
            <button
              onClick={() => setIsMobileSearchActive(!isMobileSearchActive)}
              className="lg:hidden p-1.5 rounded-[6px] text-[#48484a] dark:text-[#aeaeb2] hover:bg-black/5 dark:hover:bg-white/10"
              title="Rechercher"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Friends / Réseau Button */}
            <button
              onClick={onOpenFriendsModal}
              title="Réseau & Partages"
              className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white dark:bg-[#323234] border border-[#d1d1d6] dark:border-[#48484a] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-medium shadow-2xs relative"
            >
              <Users className="h-3.5 w-3.5 text-[#007aff]" />
              <span className="hidden sm:inline">Réseau</span>
              {pendingRequestsCount > 0 && (
                <span className="h-4 min-w-[15px] px-1 rounded-full bg-[#ff3b30] text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {/* Quick Add Button */}
            {!isViewingFriend && (
              <button
                onClick={onOpenNewSlotModal}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-[#007aff] hover:bg-[#0069d9] active:bg-[#0051a8] text-white rounded-[6px] text-[12px] font-medium shadow-2xs transition-colors shrink-0"
                title="Ajouter un créneau"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Créneau</span>
              </button>
            )}

            {/* Cloud SQL Sync Button */}
            {onSync && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                title={isSyncing ? "Synchronisation en cours avec la base SQL..." : "Synchroniser avec la base de données SQL"}
                className={`flex items-center gap-1 px-2 py-1 rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#323234] shadow-2xs transition-all ${
                  isSyncing 
                    ? 'text-[#007aff] border-[#007aff]/50 bg-[#007aff]/5' 
                    : 'text-[#48484a] dark:text-[#aeaeb2] hover:text-[#007aff] dark:hover:text-white'
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-[#007aff]' : ''}`} />
                <span className="hidden xl:inline text-[11px] font-medium">Sync SQL</span>
              </button>
            )}

            {/* Desktop Toolbar Secondary Actions */}
            <div className="hidden md:flex items-center gap-0.5">
              {!isViewingFriend && (
                <button
                  onClick={onOpenTemplatesModal}
                  title="Modèles enregistrés"
                  className="p-1.5 text-[#48484a] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-[6px] transition-colors"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              )}

              {!isViewingFriend && (
                <button
                  onClick={onCopyPrevWeek}
                  title="Copier la semaine passée"
                  className="p-1.5 text-[#48484a] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-[6px] transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}

              {!isViewingFriend && totalSlotsThisWeek > 0 && (
                <button
                  onClick={onClearWeek}
                  title="Vider la semaine"
                  className="p-1.5 text-[#8e8e93] hover:text-[#ff3b30] hover:bg-black/5 dark:hover:bg-white/10 rounded-[6px] transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={onOpenExportModal}
                title="Exporter (.ics, PDF)"
                className="p-1.5 text-[#48484a] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-[6px] transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>

              <button
                onClick={onOpenConfigModal}
                title="Réglages"
                className="p-1.5 text-[#48484a] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-[6px] transition-colors"
              >
                <Sliders className="h-4 w-4" />
              </button>

              <button
                onClick={onToggleDarkMode}
                title={isDarkMode ? "Mode clair" : "Mode sombre"}
                className="p-1.5 rounded-[6px] text-[#48484a] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-[#ffd60a]" /> : <Moon className="h-4 w-4 text-[#5856d6]" />}
              </button>
            </div>

            {/* User Avatar (Desktop) */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1 pl-1">
                <div 
                  className="h-7 w-7 rounded-full bg-[#007aff] text-white flex items-center justify-center font-semibold text-[11px] shadow-2xs"
                  title={`${currentUser.name} (@${currentUser.username})`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={onLogout}
                  title="Fermer la session"
                  className="p-1 text-[#8e8e93] hover:text-[#ff3b30] rounded-[6px] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Mobile Overflow Menu Button (Three dots ...) */}
            <div className="relative md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 rounded-[6px] text-[#48484a] dark:text-[#aeaeb2] hover:bg-black/5 dark:hover:bg-white/10"
                title="Plus d'options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {/* Mobile Dropdown Popover */}
              {isMobileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#252528] rounded-xl shadow-xl border border-[#e5e5ea] dark:border-[#38383a] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {currentUser && (
                      <div className="px-3 py-2 border-b border-[#e5e5ea] dark:border-[#38383a] flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[#007aff] text-white flex items-center justify-center text-[10px] font-bold">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                            {currentUser.name}
                          </div>
                          <div className="text-[10px] text-[#8e8e93]">
                            @{currentUser.username}
                          </div>
                        </div>
                      </div>
                    )}

                    {onSync && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onSync();
                        }}
                        className="w-full px-3 py-2 text-left text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 text-[#007aff] ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>Synchroniser SQL</span>
                      </button>
                    )}

                    {!isViewingFriend && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenTemplatesModal();
                        }}
                        className="w-full px-3 py-2 text-left text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                      >
                        <Bookmark className="h-4 w-4 text-[#007aff]" />
                        <span>Modèles enregistrés</span>
                      </button>
                    )}

                    {!isViewingFriend && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onCopyPrevWeek();
                        }}
                        className="w-full px-3 py-2 text-left text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4 text-[#ff9500]" />
                        <span>Copier la semaine passée</span>
                      </button>
                    )}

                    {!isViewingFriend && totalSlotsThisWeek > 0 && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onClearWeek();
                        }}
                        className="w-full px-3 py-2 text-left text-[12px] text-[#ff3b30] hover:bg-[#ff3b30]/10 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Vider la semaine ({totalSlotsThisWeek})</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenExportModal();
                      }}
                      className="w-full px-3 py-2 text-left text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4 text-[#34c759]" />
                      <span>Exporter (.ics, PDF)</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenConfigModal();
                      }}
                      className="w-full px-3 py-2 text-left text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                    >
                      <Sliders className="h-4 w-4 text-[#5856d6]" />
                      <span>Réglages horaires</span>
                    </button>

                    <button
                      onClick={() => {
                        onToggleDarkMode();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                    >
                      {isDarkMode ? (
                        <>
                          <Sun className="h-4 w-4 text-[#ffd60a]" />
                          <span>Mode clair</span>
                        </>
                      ) : (
                        <>
                          <Moon className="h-4 w-4 text-[#5856d6]" />
                          <span>Mode sombre</span>
                        </>
                      )}
                    </button>

                    {currentUser && (
                      <div className="pt-1 mt-1 border-t border-[#e5e5ea] dark:border-[#38383a]">
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full px-3 py-2 text-left text-[12px] text-[#ff3b30] hover:bg-[#ff3b30]/10 flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Fermer la session</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Search Row (Expands when search icon tapped) */}
        {isMobileSearchActive && (
          <div className="lg:hidden pb-2 pt-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8e8e93]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher créneau..."
                className="w-full pl-8 pr-7 py-1 text-[12px] rounded-[6px] bg-[#e3e3e8] dark:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8e8e93]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsMobileSearchActive(false)}
              className="text-[12px] text-[#007aff] px-1"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Mobile View Mode Switcher Sub-Bar (1J, 3J, 5J, 7J) */}
        <div className="flex md:hidden items-center justify-center pb-2 pt-0.5">
          <div className="inline-flex items-center p-[2px] rounded-[7px] bg-[#e3e3e8] dark:bg-[#3a3a3c] w-full max-w-xs">
            {VIEW_MODES.map((mode) => {
              const isActive = config.viewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => onChangeViewMode(mode.id)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-[5px] transition-all text-center ${
                    isActive
                      ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                      : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
                  }`}
                >
                  {mode.mobileLabel}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </header>
  );
};
