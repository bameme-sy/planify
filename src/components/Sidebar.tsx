import React from 'react';
import { 
  Plus, 
  Bookmark, 
  Sliders, 
  Clock, 
  Target, 
  ChevronRight,
  Moon,
  Sun,
  Users,
  Eye,
  UserPlus,
  Check,
  X
} from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { CategoryId, TimeSlot, WeekTemplate, User } from '../types';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import { calculateDurationMinutes, formatDuration } from '../utils/dateUtils';

interface SidebarProps {
  currentMonday: Date;
  onSelectDate: (date: Date) => void;
  onOpenNewSlotModal: () => void;
  onOpenTemplatesModal: () => void;
  onOpenConfigModal: () => void;
  onOpenFriendsModal: () => void;
  slots: TimeSlot[];
  templates: WeekTemplate[];
  onApplyTemplate: (template: WeekTemplate) => void;
  weeklyTargetHours: number;
  visibleCategories: Record<CategoryId, boolean>;
  onToggleCategory: (catId: CategoryId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  friends: User[];
  viewingFriend: User | null;
  onViewFriendSchedule: (friend: User) => void;
  onReturnToMySchedule: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMonday,
  onSelectDate,
  onOpenNewSlotModal,
  onOpenTemplatesModal,
  onOpenConfigModal,
  onOpenFriendsModal,
  slots,
  templates,
  onApplyTemplate,
  weeklyTargetHours,
  visibleCategories,
  onToggleCategory,
  isCollapsed,
  onToggleCollapse,
  isDarkMode,
  onToggleDarkMode,
  friends,
  viewingFriend,
  onViewFriendSchedule,
  onReturnToMySchedule,
}) => {
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

  const handleMobileSelectDate = (date: Date) => {
    onSelectDate(date);
    if (window.innerWidth < 768) {
      onToggleCollapse();
    }
  };

  const handleMobileViewFriend = (friend: User) => {
    onViewFriendSchedule(friend);
    if (window.innerWidth < 768) {
      onToggleCollapse();
    }
  };

  // If collapsed: hidden on mobile (< md), mini rail on desktop (md+)
  if (isCollapsed) {
    return (
      <aside className="hidden md:flex w-12 shrink-0 bg-[#f6f6f7] dark:bg-[#202022] border-r border-[#e5e5ea] dark:border-[#38383a] flex-col items-center py-3 gap-3 no-print select-none transition-colors">
        <button
          onClick={onToggleCollapse}
          title="Afficher la barre latérale"
          className="p-1.5 rounded-[6px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {!viewingFriend && (
          <button
            onClick={onOpenNewSlotModal}
            title="Nouveau créneau"
            className="h-8 w-8 rounded-[6px] bg-[#007aff] hover:bg-[#0069d9] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={onOpenFriendsModal}
          title="Réseau & Amis"
          className="p-1.5 rounded-[6px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Users className="h-4 w-4" />
        </button>

        <div className="h-px w-5 bg-[#e5e5ea] dark:bg-[#38383a]" />

        <button
          onClick={onOpenTemplatesModal}
          title="Modèles"
          className="p-1.5 rounded-[6px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Bookmark className="h-4 w-4" />
        </button>

        <button
          onClick={onOpenConfigModal}
          title="Réglages"
          className="p-1.5 rounded-[6px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Sliders className="h-4 w-4" />
        </button>

        <div className="mt-auto">
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Mode clair" : "Mode sombre"}
            className="p-1.5 rounded-[6px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-[#ffd60a]" /> : <Moon className="h-4 w-4 text-[#5856d6]" />}
          </button>
        </div>
      </aside>
    );
  }

  // If expanded: drawer on mobile (< md), in-flow panel on desktop (md+)
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
        onClick={onToggleCollapse}
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:relative md:w-64 sm:md:w-68 shrink-0 bg-[#f6f6f7] dark:bg-[#202022] border-r border-[#e5e5ea] dark:border-[#38383a] flex flex-col h-full overflow-y-auto no-print select-none shadow-2xl md:shadow-none transition-transform animate-in slide-in-from-left duration-200">
        <div className="p-3 space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {viewingFriend ? `Planning de ${viewingFriend.name}` : 'Calendriers'}
            </span>

            <button
              onClick={onToggleCollapse}
              title="Masquer"
              className="p-1.5 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4 md:hidden" />
              <ChevronRight className="h-3.5 w-3.5 hidden md:block" />
            </button>
          </div>

          {/* Viewing Friend Banner in Sidebar */}
          {viewingFriend && (
            <button
              onClick={() => {
                onReturnToMySchedule();
                if (window.innerWidth < 768) onToggleCollapse();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[6px] bg-white dark:bg-[#323234] border border-[#d1d1d6] dark:border-[#48484a] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-medium shadow-2xs hover:bg-[#f2f2f7] dark:hover:bg-[#3a3a3c] transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-[#007aff]" />
              <span>Revenir à mon planning</span>
            </button>
          )}

          {/* Mini Calendar Widget */}
          <div className="rounded-[8px] bg-white/70 dark:bg-black/20 border border-[#e5e5ea] dark:border-[#38383a]">
            <MiniCalendar
              currentMonday={currentMonday}
              onSelectDate={handleMobileSelectDate}
            />
          </div>

          {/* Section: Mes Calendriers */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-semibold tracking-wide text-[#8e8e93] dark:text-[#98989d] uppercase">
                Mes Calendriers
              </span>
            </div>

            <div className="space-y-0.5">
              {Object.values(DEFAULT_CATEGORIES).map((cat) => {
                const isVisible = visibleCategories[cat.id] ?? true;
                const minutes = categoryMinutes[cat.id] || 0;

                return (
                  <button
                    key={cat.id}
                    onClick={() => onToggleCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-[5px] text-[12px] transition-colors ${
                      isVisible
                        ? 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5'
                        : 'opacity-40 text-[#8e8e93] hover:opacity-75 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div 
                        className={`h-3.5 w-3.5 rounded-[4px] flex items-center justify-center transition-colors border ${
                          isVisible ? 'text-white' : 'border-[#8e8e93] bg-transparent'
                        }`}
                        style={{
                          backgroundColor: isVisible ? cat.color : 'transparent',
                          borderColor: cat.color,
                        }}
                      >
                        {isVisible && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate font-medium">{cat.label}</span>
                    </div>

                    {minutes > 0 && (
                      <span className="text-[10px] text-[#8e8e93] dark:text-[#98989d] font-mono">
                        {formatDuration(minutes)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Contacts & Partages */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-semibold tracking-wide text-[#8e8e93] dark:text-[#98989d] uppercase">
                Partagés avec moi ({friends.length})
              </span>
              <button
                onClick={() => {
                  onOpenFriendsModal();
                  if (window.innerWidth < 768) onToggleCollapse();
                }}
                className="text-[11px] text-[#007aff] hover:underline flex items-center gap-0.5"
              >
                <UserPlus className="h-3 w-3" />
                <span>Gérer</span>
              </button>
            </div>

            {friends.length === 0 ? (
              <button
                onClick={() => {
                  onOpenFriendsModal();
                  if (window.innerWidth < 768) onToggleCollapse();
                }}
                className="w-full py-2 px-2.5 rounded-[6px] border border-dashed border-[#d1d1d6] dark:border-[#38383a] text-left text-[11px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
              >
                + Trouver des contacts
              </button>
            ) : (
              <div className="space-y-0.5">
                {friends.map((friend) => {
                  const isCurrentViewing = viewingFriend?.id === friend.id;

                  return (
                    <button
                      key={friend.id}
                      onClick={() => handleMobileViewFriend(friend)}
                      title={`Consulter le calendrier de ${friend.name}`}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-[5px] text-[12px] transition-colors ${
                        isCurrentViewing
                          ? 'bg-[#007aff] text-white font-medium shadow-2xs'
                          : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-semibold ${
                          isCurrentViewing
                            ? 'bg-white text-[#007aff]'
                            : 'bg-[#d1d1d6] dark:bg-[#48484a] text-[#1d1d1f] dark:text-white'
                        }`}>
                          {friend.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{friend.name}</span>
                      </div>

                      <span className={`text-[10px] ${isCurrentViewing ? 'text-white/80' : 'text-[#8e8e93]'}`}>
                        @{friend.username.slice(0, 7)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Objectif Hebdomadaire */}
          <div className="p-2.5 rounded-[8px] bg-white/70 dark:bg-black/20 border border-[#e5e5ea] dark:border-[#38383a]">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                <Target className="h-3.5 w-3.5 text-[#007aff]" />
                <span>{viewingFriend ? 'Total semaine ami' : 'Objectif hebdomadaire'}</span>
              </div>
              {!viewingFriend && (
                <span className="text-[11px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {progressPct}%
                </span>
              )}
            </div>

            {!viewingFriend && (
              <div className="h-1.5 w-full bg-[#e5e5ea] dark:bg-[#38383a] rounded-full overflow-hidden mb-1.5">
                <div 
                  className="h-full bg-[#007aff] rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-[#8e8e93] dark:text-[#98989d]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(totalMinutes)} planifié
              </span>
              {!viewingFriend && <span>/ {weeklyTargetHours}h</span>}
            </div>
          </div>

          {/* User Saved Templates Section */}
          {!viewingFriend && (
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] font-semibold tracking-wide text-[#8e8e93] dark:text-[#98989d] uppercase">
                  Mes modèles
                </span>
                <button
                  onClick={() => {
                    onOpenTemplatesModal();
                    if (window.innerWidth < 768) onToggleCollapse();
                  }}
                  className="text-[11px] text-[#007aff] hover:underline flex items-center gap-0.5"
                >
                  <span>{templates.length > 0 ? 'Gérer' : '+ Créer'}</span>
                </button>
              </div>

              {templates.length > 0 ? (
                <div className="space-y-1">
                  {templates.slice(0, 4).map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        onApplyTemplate(tpl);
                        if (window.innerWidth < 768) onToggleCollapse();
                      }}
                      title={`Appliquer le modèle "${tpl.name}"`}
                      className="w-full text-left p-2 rounded-[6px] bg-white/70 dark:bg-black/20 border border-[#e5e5ea] dark:border-[#38383a] hover:border-[#007aff] transition-colors group flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                          {tpl.name}
                        </div>
                        <div className="text-[10px] text-[#8e8e93] mt-0.5">
                          {tpl.slots.length} créneau(x)
                        </div>
                      </div>
                      <span className="text-[10px] text-[#007aff] opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
                        Appliquer
                      </span>
                    </button>
                  ))}
                  {templates.length > 4 && (
                    <button
                      onClick={() => {
                        onOpenTemplatesModal();
                        if (window.innerWidth < 768) onToggleCollapse();
                      }}
                      className="w-full py-1 text-center text-[10px] text-[#8e8e93] hover:text-[#007aff] transition-colors"
                    >
                      + {templates.length - 4} autre(s) modèle(s)
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-[6px] border border-dashed border-[#e5e5ea] dark:border-[#38383a] text-center space-y-1.5">
                  <p className="text-[10px] text-[#8e8e93]">
                    Aucun modèle préenregistré.
                  </p>
                  <button
                    onClick={() => {
                      onOpenTemplatesModal();
                      if (window.innerWidth < 768) onToggleCollapse();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#007aff] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Créer un modèle</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </aside>
    </>
  );
};
