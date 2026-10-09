import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TimeSlot, 
  WeekTemplate, 
  PlanningConfig, 
  CategoryId,
  CalendarViewMode,
  User 
} from './types';
import { 
  getMonday, 
  getWeekDays, 
  formatDateKey 
} from './utils/dateUtils';
import { 
  loadTemplates, 
  saveTemplates, 
  loadConfig, 
  saveConfig 
} from './utils/storage';
import { 
  initAuthStorage,
  getCurrentUser,
  logoutUser,
  getUserSlots,
  saveUserSlots,
  getFriendsForUser,
  getPendingRequestsReceived,
  saveOrUpdateLocalUser
} from './utils/authStorage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CalendarGrid } from './components/CalendarGrid';
import { SlotModal } from './components/SlotModal';
import { TemplatesModal } from './components/TemplatesModal';
import { ExportModal } from './components/ExportModal';
import { ConfigModal } from './components/ConfigModal';
import { AuthModal } from './components/AuthModal';
import { FriendsModal } from './components/FriendsModal';
import { FriendBanner } from './components/FriendBanner';
import { ToastContainer, ToastMessage } from './components/Toast';
import { apiClient } from './api/client';

export function App() {
  // Initialize demo accounts on first run and auto-reconnect cloud session
  useEffect(() => {
    initAuthStorage();
    if (apiClient.getToken()) {
      apiClient.getMe().then((user) => {
        if (user) {
          saveOrUpdateLocalUser(user);
          setCurrentUser(user);
        }
      }).catch(() => {});
    }
  }, []);

  // Theme: Black Theme / Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('planify_dark_mode');
    if (saved !== null) return saved === 'true';
    return true; // Default to black theme
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('planify_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<User | null>(null);

  // Current view date (Pinned to Monday of active week)
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));

  // Active viewing user ID: either current user or the friend being inspected!
  const activeUserId = viewingFriend ? viewingFriend.id : currentUser ? currentUser.id : '';

  // Slots State (loaded for active user)
  const [slots, setSlots] = useState<TimeSlot[]>(() => {
    if (!currentUser) return [];
    return getUserSlots(currentUser.id);
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Robust function to sync slots & templates with PostgreSQL cloud database
  const syncWithCloud = useCallback(async (notify = false) => {
    const targetId = viewingFriend ? viewingFriend.id : currentUser?.id;
    if (!targetId) return;

    setIsSyncing(true);
    try {
      // 1. Fetch remote slots
      const remoteSlots = await apiClient.getSlots(targetId);
      if (Array.isArray(remoteSlots)) {
        const localSlots = getUserSlots(targetId);
        if (remoteSlots.length > 0) {
          setSlots(remoteSlots);
          if (!viewingFriend) {
            saveUserSlots(targetId, remoteSlots);
          }
        } else if (localSlots.length > 0 && !viewingFriend) {
          // Cloud empty, upload local slots
          await apiClient.saveAllSlots(localSlots, targetId);
        } else {
          setSlots([]);
        }
      }

      // 2. Fetch remote templates (if own account)
      if (currentUser && !viewingFriend) {
        const remoteTemplates = await apiClient.getTemplates(currentUser.id);
        if (Array.isArray(remoteTemplates) && remoteTemplates.length > 0) {
          setTemplates(remoteTemplates);
          saveTemplates(remoteTemplates, currentUser.id);
        }
      }

      if (notify) {
        addToast('success', 'Planning synchronisé avec la base SQL !');
      }
    } catch {
      if (notify) {
        addToast('error', 'Erreur de synchronisation avec le serveur');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, viewingFriend]);

  // Reload slots when active user changes (self or friend)
  useEffect(() => {
    if (activeUserId) {
      const localSlots = getUserSlots(activeUserId);
      setSlots(localSlots);
      syncWithCloud(false);
    } else {
      setSlots([]);
    }
  }, [activeUserId, syncWithCloud]);

  const [templates, setTemplates] = useState<WeekTemplate[]>(() => loadTemplates(currentUser?.id));

  // Reload templates when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const localTpls = loadTemplates(currentUser.id);
      setTemplates(localTpls);
      apiClient.getTemplates(currentUser.id).then((remote) => {
        if (Array.isArray(remote)) {
          if (remote.length > 0) {
            setTemplates(remote);
            saveTemplates(remote, currentUser.id);
          } else if (localTpls.length > 0) {
            for (const tpl of localTpls) {
              apiClient.createTemplate(tpl, currentUser.id).catch(() => {});
            }
          }
        }
      }).catch(() => {});
    } else {
      setTemplates([]);
    }
  }, [currentUser?.id]);

  // Real-time multi-device sync: on tab focus, visibility change, and every 6 seconds
  useEffect(() => {
    if (!currentUser || viewingFriend) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncWithCloud(false);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncWithCloud(false);
      }
    }, 6000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(intervalId);
    };
  }, [currentUser?.id, viewingFriend, syncWithCloud]);

  const [config, setConfig] = useState<PlanningConfig>(() => loadConfig());

  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return window.innerWidth < 1024;
  });

  // Filter State (B&W Category toggles)
  const selectedCategoryFilter: CategoryId | 'all' = 'all';
  const [visibleCategories, setVisibleCategories] = useState<Record<CategoryId, boolean>>({
    work: true,
    meeting: true,
    project: true,
    study: true,
    sport: true,
    personal: true,
    break: true,
    custom: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotToEdit, setSlotToEdit] = useState<TimeSlot | null>(null);
  const [initialSlotDate, setInitialSlotDate] = useState<string | undefined>();
  const [initialStartTime, setInitialStartTime] = useState<string | undefined>();
  const [initialEndTime, setInitialEndTime] = useState<string | undefined>();

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync slots to user's storage (only when viewing own schedule)
  const updateSlots = (newSlots: TimeSlot[] | ((prev: TimeSlot[]) => TimeSlot[])) => {
    if (viewingFriend || !currentUser) {
      addToast('error', 'Modification impossible en mode consultation');
      return;
    }

    setSlots((prev) => {
      const resolved = typeof newSlots === 'function' ? newSlots(prev) : newSlots;
      saveUserSlots(currentUser.id, resolved);
      apiClient.saveAllSlots(resolved, currentUser.id).catch(() => {});
      return resolved;
    });
  };

  // Sync templates to user's storage
  const updateTemplates = (newTemplates: WeekTemplate[] | ((prev: WeekTemplate[]) => WeekTemplate[])) => {
    setTemplates((prev) => {
      const resolved = typeof newTemplates === 'function' ? newTemplates(prev) : newTemplates;
      saveTemplates(resolved, currentUser?.id);
      if (currentUser) {
        for (const tpl of resolved) {
          apiClient.createTemplate(tpl, currentUser.id).catch(() => {});
        }
      }
      return resolved;
    });
  };

  // Friends & social data
  const friends = useMemo(() => {
    if (!currentUser) return [];
    return getFriendsForUser(currentUser.id);
  }, [currentUser, isFriendsModalOpen]);

  const pendingRequestsCount = useMemo(() => {
    if (!currentUser) return 0;
    return getPendingRequestsReceived(currentUser.id).length;
  }, [currentUser, isFriendsModalOpen]);

  // Auth Handlers
  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setViewingFriend(null);
    const local = getUserSlots(user.id);
    setSlots(local);
    addToast('success', `Bienvenue, ${user.name} !`);

    try {
      const remote = await apiClient.getSlots(user.id);
      if (Array.isArray(remote)) {
        if (remote.length > 0) {
          setSlots(remote);
          saveUserSlots(user.id, remote);
        } else if (local.length > 0) {
          await apiClient.saveAllSlots(local, user.id);
        }
      }
    } catch {
      // Background catch
    }
  };

  const handleLogout = () => {
    apiClient.logout().catch(() => {});
    logoutUser();
    setCurrentUser(null);
    setViewingFriend(null);
    setSlots([]);
    addToast('info', 'Vous êtes déconnecté');
  };

  // Friend schedule viewing handlers
  const handleViewFriendSchedule = (friend: User) => {
    setViewingFriend(friend);
    addToast('info', `Planning de ${friend.name} affiché (lecture seule)`);
  };

  const handleReturnToMySchedule = () => {
    setViewingFriend(null);
    if (currentUser) {
      setSlots(getUserSlots(currentUser.id));
    }
  };

  // Config updater
  const handleSaveConfig = (newConfig: PlanningConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    addToast('success', 'Paramètres enregistrés');
  };

  // View mode switcher (1J, 3J, 5J, 7J)
  const handleChangeViewMode = (mode: CalendarViewMode) => {
    const updated = { ...config, viewMode: mode };
    setConfig(updated);
    saveConfig(updated);
  };

  // Toggle category visibility
  const handleToggleCategory = (catId: CategoryId) => {
    setVisibleCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Active days computation
  const allWeekDays = useMemo(() => {
    return getWeekDays(currentMonday, true);
  }, [currentMonday]);

  const activeDays = useMemo(() => {
    if (config.viewMode === '1-day') {
      const todayInWeek = allWeekDays.find((d) => d.isToday);
      return [todayInWeek || allWeekDays[0]];
    }
    if (config.viewMode === '3-days') {
      return allWeekDays.slice(0, 3);
    }
    if (config.viewMode === '5-days') {
      return allWeekDays.slice(0, 5);
    }
    return allWeekDays;
  }, [allWeekDays, config.viewMode]);

  const currentViewDateStrings = useMemo(() => {
    return new Set(activeDays.map((d) => d.dateString));
  }, [activeDays]);

  const currentViewSlots = useMemo(() => {
    return slots.filter((slot) => currentViewDateStrings.has(slot.date));
  }, [slots, currentViewDateStrings]);

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentMonday((prev) => {
      const step = config.viewMode === '1-day' ? 1 : config.viewMode === '3-days' ? 3 : 7;
      const d = new Date(prev);
      d.setDate(d.getDate() - step);
      return config.viewMode === '1-day' ? d : getMonday(d);
    });
  };

  const handleNextWeek = () => {
    setCurrentMonday((prev) => {
      const step = config.viewMode === '1-day' ? 1 : config.viewMode === '3-days' ? 3 : 7;
      const d = new Date(prev);
      d.setDate(d.getDate() + step);
      return config.viewMode === '1-day' ? d : getMonday(d);
    });
  };

  const handleToday = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  const handleSelectDateFromMiniCalendar = (date: Date) => {
    setCurrentMonday(getMonday(date));
  };

  // Slot modal handlers
  const handleOpenNewSlotModal = () => {
    if (viewingFriend) return;
    setSlotToEdit(null);
    setInitialSlotDate(activeDays[0]?.dateString);
    setInitialStartTime('09:00');
    setInitialEndTime('10:00');
    setIsSlotModalOpen(true);
  };

  const handleCreateSlotAt = useCallback((date: string, startTime: string, endTime: string) => {
    if (viewingFriend) return;
    setSlotToEdit(null);
    setInitialSlotDate(date);
    setInitialStartTime(startTime);
    setInitialEndTime(endTime);
    setIsSlotModalOpen(true);
  }, [viewingFriend]);

  const handleSelectSlot = useCallback((slot: TimeSlot) => {
    if (viewingFriend) {
      // In read-only mode, display info
      addToast('info', `${slot.title} (${slot.startTime} - ${slot.endTime})`);
      return;
    }
    setSlotToEdit(slot);
    setInitialSlotDate(slot.date);
    setInitialStartTime(slot.startTime);
    setInitialEndTime(slot.endTime);
    setIsSlotModalOpen(true);
  }, [viewingFriend]);

  const handleSaveSlot = (slotData: Partial<TimeSlot>, replicateDays?: string[]) => {
    if (viewingFriend || !currentUser) return;

    if (slotData.id) {
      updateSlots((prev) =>
        prev.map((s) => (s.id === slotData.id ? ({ ...s, ...slotData } as TimeSlot) : s))
      );
      addToast('success', 'Créneau mis à jour');
    } else {
      const newSlot: TimeSlot = {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.id,
        title: slotData.title || 'Nouvelle activité',
        categoryId: slotData.categoryId || 'work',
        date: slotData.date || activeDays[0].dateString,
        startTime: slotData.startTime || '09:00',
        endTime: slotData.endTime || '10:00',
        notes: slotData.notes,
        location: slotData.location,
        status: slotData.status || 'planned',
        createdAt: Date.now(),
      };

      const newSlotsToAdd = [newSlot];

      if (replicateDays && replicateDays.length > 0) {
        for (const repDate of replicateDays) {
          newSlotsToAdd.push({
            ...newSlot,
            id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            date: repDate,
          });
        }
      }

      updateSlots((prev) => [...prev, ...newSlotsToAdd]);
      addToast(
        'success',
        newSlotsToAdd.length > 1
          ? `${newSlotsToAdd.length} créneaux créés sur la semaine`
          : 'Créneau ajouté au planning'
      );
    }
  };

  const handleDeleteSlot = useCallback((slotId: string) => {
    if (viewingFriend) return;
    updateSlots((prev) => prev.filter((s) => s.id !== slotId));
    addToast('info', 'Créneau supprimé');
  }, [viewingFriend]);

  const handleUpdateSlotDuration = useCallback((slotId: string, newEndTime: string) => {
    if (viewingFriend) return;
    updateSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, endTime: newEndTime } : s))
    );
    addToast('success', 'Durée ajustée');
  }, [viewingFriend]);

  const handleToggleSlotStatus = useCallback((slotId: string) => {
    if (viewingFriend) return;
    updateSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const nextStatus = s.status === 'completed' ? 'planned' : 'completed';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  }, [viewingFriend]);

  const handleCopyPrevWeek = () => {
    if (viewingFriend || !currentUser) return;
    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevWeekDays = getWeekDays(prevMonday, true);
    const prevDateStrings = new Set(prevWeekDays.map((d) => d.dateString));

    const prevSlots = slots.filter((s) => prevDateStrings.has(s.date));
    if (prevSlots.length === 0) {
      addToast('error', 'Aucun créneau trouvé dans la période précédente');
      return;
    }

    if (
      currentViewSlots.length > 0 &&
      !confirm('La période actuelle contient déjà des créneaux. Voulez-vous ajouter les créneaux passés ?')
    ) {
      return;
    }

    const copiedSlots: TimeSlot[] = prevSlots.map((s) => {
      const oldDate = new Date(s.date);
      const newDate = new Date(oldDate);
      newDate.setDate(oldDate.getDate() + 7);

      return {
        ...s,
        id: `slot-copy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: formatDateKey(newDate),
        createdAt: Date.now(),
      };
    });

    updateSlots((prev) => [...prev, ...copiedSlots]);
    addToast('success', `${copiedSlots.length} créneaux copiés`);
  };

  const handleClearWeek = () => {
    if (viewingFriend) return;
    if (confirm('Voulez-vous vraiment vider tous les créneaux de cette période ?')) {
      updateSlots((prev) => prev.filter((s) => !currentViewDateStrings.has(s.date)));
      addToast('info', 'Période vidée');
    }
  };

  const handleApplyTemplate = (template: WeekTemplate, mode: 'replace' | 'merge' = 'replace') => {
    if (viewingFriend || !currentUser) return;

    const newSlots: TimeSlot[] = template.slots.map((s, index) => {
      const targetDate = new Date(currentMonday);
      targetDate.setDate(currentMonday.getDate() + s.dayOfWeek);

      return {
        id: `slot-tpl-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.id,
        title: s.title,
        categoryId: s.categoryId,
        date: formatDateKey(targetDate),
        startTime: s.startTime,
        endTime: s.endTime,
        notes: s.notes,
        location: s.location,
        status: s.status,
        createdAt: Date.now(),
      };
    });

    if (mode === 'replace') {
      updateSlots((prev) => [
        ...prev.filter((s) => !currentViewDateStrings.has(s.date)),
        ...newSlots,
      ]);
    } else {
      updateSlots((prev) => [...prev, ...newSlots]);
    }

    setIsTemplatesModalOpen(false);
    addToast('success', `Modèle "${template.name}" appliqué !`);
  };

  const handleSaveCurrentWeekAsTemplate = (name: string, description: string) => {
    const mondayTime = currentMonday.getTime();
    const templateSlots = currentViewSlots.map((s) => {
      const slotDate = new Date(s.date);
      const diffDays = Math.round((slotDate.getTime() - mondayTime) / (1000 * 3600 * 24));
      return {
        title: s.title,
        categoryId: s.categoryId,
        startTime: s.startTime,
        endTime: s.endTime,
        notes: s.notes,
        location: s.location,
        status: s.status,
        dayOfWeek: Math.max(0, Math.min(6, diffDays)),
      };
    });

    const newTemplate: WeekTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser?.id,
      name,
      description: description || undefined,
      createdAt: Date.now(),
      slots: templateSlots,
    };

    updateTemplates((prev) => [...prev, newTemplate]);
    addToast('success', `Modèle "${name}" sauvegardé`);
  };

  const handleCreateCustomTemplate = (newTemplate: WeekTemplate) => {
    const templateWithUser: WeekTemplate = {
      ...newTemplate,
      userId: currentUser?.id,
    };
    updateTemplates((prev) => [...prev, templateWithUser]);
    apiClient.createTemplate(templateWithUser).catch(() => {});
    addToast('success', `Modèle "${newTemplate.name}" créé`);
  };

  const handleUpdateTemplate = (updatedTemplate: WeekTemplate) => {
    updateTemplates((prev) =>
      prev.map((t) => (t.id === updatedTemplate.id ? { ...updatedTemplate, userId: currentUser?.id } : t))
    );
    apiClient.updateTemplate(updatedTemplate.id, updatedTemplate).catch(() => {});
    addToast('success', `Modèle "${updatedTemplate.name}" mis à jour`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    updateTemplates((prev) => prev.filter((t) => t.id !== templateId));
    apiClient.deleteTemplate(templateId).catch(() => {});
    addToast('info', 'Modèle supprimé');
  };

  const handleImportSlots = (imported: TimeSlot[]) => {
    if (viewingFriend) return;
    updateSlots(imported);
    addToast('success', `${imported.length} créneaux importés avec succès`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handlePrevWeek();
      } else if (e.key === 'ArrowRight') {
        handleNextWeek();
      } else if (e.key.toLowerCase() === 't') {
        handleToday();
      } else if (e.key.toLowerCase() === 'n' && !viewingFriend) {
        handleOpenNewSlotModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMonday, config.viewMode, viewingFriend]);

  return (
    <div className="h-screen flex flex-col font-sans transition-colors bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7]">
      
      {/* Top Navigation */}
      <Navbar
        currentMonday={currentMonday}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onOpenNewSlotModal={handleOpenNewSlotModal}
        onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
        onOpenFriendsModal={() => setIsFriendsModalOpen(true)}
        pendingRequestsCount={pendingRequestsCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        isViewingFriend={Boolean(viewingFriend)}
        onCopyPrevWeek={handleCopyPrevWeek}
        onClearWeek={handleClearWeek}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        config={config}
        onChangeViewMode={handleChangeViewMode}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
        totalSlotsThisWeek={currentViewSlots.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSync={() => syncWithCloud(true)}
        isSyncing={isSyncing}
      />

      {/* Friend Schedule Consultation Banner */}
      {viewingFriend && (
        <FriendBanner
          friend={viewingFriend}
          onReturnToMySchedule={handleReturnToMySchedule}
        />
      )}

      {/* Main Area: Sidebar + Calendar Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Monochrome Sidebar */}
        <Sidebar
          currentMonday={currentMonday}
          onSelectDate={handleSelectDateFromMiniCalendar}
          onOpenNewSlotModal={handleOpenNewSlotModal}
          onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          onOpenFriendsModal={() => setIsFriendsModalOpen(true)}
          slots={currentViewSlots}
          templates={templates}
          onApplyTemplate={handleApplyTemplate}
          weeklyTargetHours={config.weeklyTargetHours}
          visibleCategories={visibleCategories}
          onToggleCategory={handleToggleCategory}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          friends={friends}
          viewingFriend={viewingFriend}
          onViewFriendSchedule={handleViewFriendSchedule}
          onReturnToMySchedule={handleReturnToMySchedule}
        />

        {/* Calendar Grid */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <CalendarGrid
            days={activeDays}
            slots={currentViewSlots}
            config={config}
            onSelectSlot={handleSelectSlot}
            onCreateSlotAt={handleCreateSlotAt}
            onDeleteSlot={handleDeleteSlot}
            onUpdateSlotDuration={handleUpdateSlotDuration}
            onToggleSlotStatus={handleToggleSlotStatus}
            selectedCategoryFilter={selectedCategoryFilter}
            visibleCategories={visibleCategories}
            searchQuery={searchQuery}
            isReadOnly={Boolean(viewingFriend)}
          />
        </main>
      </div>

      {/* Mandatory Account Auth Modal (Active if not logged in) */}
      <AuthModal
        isOpen={currentUser === null}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Friends & Social Directory Modal */}
      {currentUser && (
        <FriendsModal
          isOpen={isFriendsModalOpen}
          onClose={() => setIsFriendsModalOpen(false)}
          currentUser={currentUser}
          onViewFriendSchedule={handleViewFriendSchedule}
        />
      )}

      {/* Modals */}
      <SlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
        slotToEdit={slotToEdit}
        initialDate={initialSlotDate}
        initialStartTime={initialStartTime}
        initialEndTime={initialEndTime}
        weekDays={activeDays}
      />

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
        onSaveCurrentWeekAsTemplate={handleSaveCurrentWeekAsTemplate}
        onCreateCustomTemplate={handleCreateCustomTemplate}
        onUpdateTemplate={handleUpdateTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        currentWeekSlotsCount={currentViewSlots.length}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        slots={currentViewSlots}
        allSlots={slots}
        onImportSlots={handleImportSlots}
      />

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
      />

      {/* Notifications Toast */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}

export default App;
