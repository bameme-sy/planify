import React, { useState } from 'react';
import { WeekTemplate, TemplateSlot, CategoryId } from '../types';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import { formatDuration, calculateDurationMinutes } from '../utils/dateUtils';
import { 
  X, 
  Bookmark, 
  Plus, 
  Trash2, 
  Play, 
  Clock, 
  Edit2, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  ArrowLeft
} from 'lucide-react';

const DAYS_NAMES = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche'
];

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WeekTemplate[];
  onApplyTemplate: (template: WeekTemplate, mode: 'replace' | 'merge') => void;
  onSaveCurrentWeekAsTemplate: (name: string, description: string) => void;
  onCreateCustomTemplate: (template: WeekTemplate) => void;
  onUpdateTemplate: (template: WeekTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  currentWeekSlotsCount: number;
}

type ModalView = 'list' | 'save-week' | 'builder';

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  onApplyTemplate,
  onSaveCurrentWeekAsTemplate,
  onCreateCustomTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  currentWeekSlotsCount,
}) => {
  const [currentView, setCurrentView] = useState<ModalView>('list');
  const [applyMode, setApplyMode] = useState<'replace' | 'merge'>('replace');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Save week form state
  const [weekTemplateName, setWeekTemplateName] = useState('');
  const [weekTemplateDesc, setWeekTemplateDesc] = useState('');

  // Builder form state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderSlots, setBuilderSlots] = useState<TemplateSlot[]>([]);

  // Slot adder within builder
  const [slotDay, setSlotDay] = useState<number>(0);
  const [slotTitle, setSlotTitle] = useState('');
  const [slotCategory, setSlotCategory] = useState<CategoryId>('work');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('12:00');

  if (!isOpen) return null;

  // Handle saving the current week
  const handleSaveWeekSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekTemplateName.trim()) return;
    onSaveCurrentWeekAsTemplate(weekTemplateName.trim(), weekTemplateDesc.trim());
    setWeekTemplateName('');
    setWeekTemplateDesc('');
    setCurrentView('list');
  };

  // Start new builder from scratch
  const handleStartNewBuilder = () => {
    setEditingTemplateId(null);
    setBuilderName('');
    setBuilderDesc('');
    setBuilderSlots([]);
    setSlotDay(0);
    setSlotTitle('');
    setSlotCategory('work');
    setSlotStartTime('09:00');
    setSlotEndTime('12:00');
    setCurrentView('builder');
  };

  // Start editing existing template
  const handleStartEditTemplate = (tpl: WeekTemplate) => {
    setEditingTemplateId(tpl.id);
    setBuilderName(tpl.name);
    setBuilderDesc(tpl.description || '');
    setBuilderSlots([...tpl.slots]);
    setSlotDay(0);
    setSlotTitle('');
    setSlotCategory('work');
    setSlotStartTime('09:00');
    setSlotEndTime('12:00');
    setCurrentView('builder');
  };

  // Add slot to current builder
  const handleAddSlotToBuilder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTitle.trim()) return;

    const newSlot: TemplateSlot = {
      title: slotTitle.trim(),
      categoryId: slotCategory,
      startTime: slotStartTime,
      endTime: slotEndTime,
      status: 'planned',
      dayOfWeek: slotDay,
    };

    setBuilderSlots((prev) => [...prev, newSlot]);
    setSlotTitle('');
  };

  // Remove slot from builder
  const handleRemoveSlotFromBuilder = (index: number) => {
    setBuilderSlots((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit builder (create or update)
  const handleSubmitBuilder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderName.trim() || builderSlots.length === 0) return;

    if (editingTemplateId) {
      onUpdateTemplate({
        id: editingTemplateId,
        name: builderName.trim(),
        description: builderDesc.trim() || undefined,
        createdAt: Date.now(),
        slots: builderSlots,
      });
    } else {
      onCreateCustomTemplate({
        id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: builderName.trim(),
        description: builderDesc.trim() || undefined,
        createdAt: Date.now(),
        slots: builderSlots,
      });
    }

    setCurrentView('list');
  };

  const builderTotalMinutes = builderSlots.reduce(
    (sum, s) => sum + calculateDurationMinutes(s.startTime, s.endTime),
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div 
        className="bg-white dark:bg-[#252528] rounded-xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between bg-[#f6f6f7] dark:bg-[#202022] shrink-0">
          <div className="flex items-center gap-2">
            {currentView !== 'list' && (
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors mr-0.5"
                title="Retour à la liste"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Bookmark className="h-4 w-4 text-[#007aff]" />
            <div>
              <h3 className="font-semibold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                {currentView === 'list' && 'Modèles enregistrés'}
                {currentView === 'save-week' && 'Enregistrer la semaine comme modèle'}
                {currentView === 'builder' && (editingTemplateId ? 'Modifier le modèle' : 'Créer un modèle personnalisé')}
              </h3>
              <p className="text-[11px] text-[#8e8e93]">
                {currentView === 'list' && 'Vos structures de planning personnalisées et réutilisables'}
                {currentView === 'save-week' && 'Sauvegarde les créneaux actuels sous forme de modèle type'}
                {currentView === 'builder' && 'Configurez les créneaux jour par jour'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">

          {/* VIEW: SAVE CURRENT WEEK */}
          {currentView === 'save-week' && (
            <form onSubmit={handleSaveWeekSubmit} className="space-y-3.5">
              <div className="p-3 rounded-[8px] bg-[#f6f6f7] dark:bg-[#202022] border border-[#e5e5ea] dark:border-[#38383a]">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  <Calendar className="h-4 w-4 text-[#007aff]" />
                  <span>Semaine active</span>
                </div>
                <p className="text-[11px] text-[#8e8e93] mt-1">
                  {currentWeekSlotsCount} créneau(x) de cette semaine seront enregistrés dans ce modèle.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                  Nom du modèle *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="ex: Semaine standard bureau, Horaires d'hiver..."
                  value={weekTemplateName}
                  onChange={(e) => setWeekTemplateName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex: Répartition 35h avec sport mardi et jeudi"
                  value={weekTemplateDesc}
                  onChange={(e) => setWeekTemplateDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5 rounded-[6px] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!weekTemplateName.trim()}
                  className="px-3.5 py-1.5 text-[12px] font-medium bg-[#007aff] hover:bg-[#0069d9] disabled:opacity-40 text-white rounded-[6px] transition-colors"
                >
                  Enregistrer le modèle
                </button>
              </div>
            </form>
          )}

          {/* VIEW: CUSTOM BUILDER (NEW OR EDIT) */}
          {currentView === 'builder' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                    Nom du modèle *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Semaine Cours & Révisions, Planning 4 jours..."
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                    Description (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Planning dédié aux projets clients du matin"
                    value={builderDesc}
                    onChange={(e) => setBuilderDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
                  />
                </div>
              </div>

              {/* Sub-form: Add a slot */}
              <div className="p-3 rounded-[8px] bg-[#f6f6f7] dark:bg-[#202022] border border-[#e5e5ea] dark:border-[#38383a] space-y-2.5">
                <div className="text-[11px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider flex items-center justify-between">
                  <span>Ajouter un créneau au modèle</span>
                  <span className="text-[#8e8e93] font-normal lowercase">
                    {builderSlots.length} créneau(x) ({formatDuration(builderTotalMinutes)})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#8e8e93] block mb-0.5">Jour</label>
                    <select
                      value={slotDay}
                      onChange={(e) => setSlotDay(Number(e.target.value))}
                      className="w-full px-2 py-1 text-[11px] rounded-[5px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] outline-none"
                    >
                      {DAYS_NAMES.map((name, i) => (
                        <option key={i} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8e8e93] block mb-0.5">Catégorie</label>
                    <select
                      value={slotCategory}
                      onChange={(e) => setSlotCategory(e.target.value as CategoryId)}
                      className="w-full px-2 py-1 text-[11px] rounded-[5px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] outline-none"
                    >
                      {Object.values(DEFAULT_CATEGORIES).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-[10px] text-[#8e8e93] block mb-0.5">Début</label>
                    <input
                      type="time"
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] font-mono rounded-[5px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] outline-none"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] text-[#8e8e93] block mb-0.5">Fin</label>
                    <input
                      type="time"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] font-mono rounded-[5px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] outline-none"
                    />
                  </div>

                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddSlotToBuilder}
                      disabled={!slotTitle.trim()}
                      className="w-full py-1 text-[11px] font-medium bg-[#007aff] hover:bg-[#0069d9] disabled:opacity-40 text-white rounded-[5px] transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Intitulé du créneau (ex: Focus projet, Entraînement...)"
                    value={slotTitle}
                    onChange={(e) => setSlotTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSlotToBuilder(e);
                      }
                    }}
                    className="w-full px-2.5 py-1 text-[11px] rounded-[5px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] outline-none"
                  />
                </div>
              </div>

              {/* Slots List in Builder */}
              <div>
                <div className="text-[11px] font-semibold text-[#8e8e93] mb-1.5">
                  Créneaux inclus ({builderSlots.length})
                </div>
                {builderSlots.length === 0 ? (
                  <div className="text-center py-4 px-3 border border-dashed border-[#d1d1d6] dark:border-[#48484a] rounded-[8px] text-[11px] text-[#8e8e93]">
                    Aucun créneau ajouté. Remplissez le formulaire ci-dessus pour ajouter des créneaux à votre modèle.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-[#e5e5ea] dark:border-[#38383a] rounded-[8px] p-1.5 bg-white dark:bg-[#1e1e1e]">
                    {builderSlots.map((s, idx) => {
                      const cat = DEFAULT_CATEGORIES[s.categoryId] || DEFAULT_CATEGORIES.custom;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded-[5px] bg-[#f6f6f7] dark:bg-[#252528] text-[11px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] w-14 shrink-0 truncate">
                              {DAYS_NAMES[s.dayOfWeek]}
                            </span>
                            <span className="font-mono text-[#8e8e93] shrink-0">
                              {s.startTime}-{s.endTime}
                            </span>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${cat.dotColor}`} />
                            <span className="truncate text-[#1d1d1f] dark:text-[#f5f5f7]">
                              {s.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSlotFromBuilder(idx)}
                            className="p-1 text-[#8e8e93] hover:text-[#ff3b30] rounded-[4px] transition-colors"
                            title="Retirer ce créneau"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e5ea] dark:border-[#38383a]">
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5 rounded-[6px] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmitBuilder}
                  disabled={!builderName.trim() || builderSlots.length === 0}
                  className="px-3.5 py-1.5 text-[12px] font-medium bg-[#007aff] hover:bg-[#0069d9] disabled:opacity-40 text-white rounded-[6px] transition-colors"
                >
                  {editingTemplateId ? 'Mettre à jour le modèle' : 'Enregistrer le modèle'}
                </button>
              </div>
            </div>
          )}

          {/* VIEW: TEMPLATES LIST */}
          {currentView === 'list' && (
            <div className="space-y-3.5">
              
              {/* Top Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-[8px] bg-[#f6f6f7] dark:bg-[#202022] border border-[#e5e5ea] dark:border-[#38383a]">
                <div className="flex items-center gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => setCurrentView('save-week')}
                    disabled={currentWeekSlotsCount === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#2c2c2e] hover:bg-black/5 dark:hover:bg-white/5 border border-[#d1d1d6] dark:border-[#48484a] text-[#1d1d1f] dark:text-[#f5f5f7] disabled:opacity-40 rounded-[6px] text-[11px] font-medium transition-colors"
                    title={currentWeekSlotsCount === 0 ? "Aucun créneau dans la semaine active" : "Enregistrer les créneaux de cette semaine"}
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#007aff]" />
                    <span>Enregistrer la semaine</span>
                    {currentWeekSlotsCount > 0 && (
                      <span className="text-[10px] bg-[#007aff]/10 text-[#007aff] px-1 py-0.2 rounded font-mono">
                        {currentWeekSlotsCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleStartNewBuilder}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#007aff] hover:bg-[#0069d9] text-white rounded-[6px] text-[11px] font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nouveau modèle</span>
                  </button>
                </div>

                {/* Apply mode toggle */}
                {templates.length > 0 && (
                  <div className="inline-flex p-[2px] rounded-[6px] bg-[#e3e3e8] dark:bg-[#3a3a3c] shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setApplyMode('replace')}
                      title="Remplace tous les créneaux existants de la semaine"
                      className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium transition-all ${
                        applyMode === 'replace'
                          ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                          : 'text-[#636366] dark:text-[#aeaeb2]'
                      }`}
                    >
                      Remplacer
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyMode('merge')}
                      title="Ajoute les créneaux du modèle sans effacer ceux déjà présents"
                      className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium transition-all ${
                        applyMode === 'merge'
                          ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                          : 'text-[#636366] dark:text-[#aeaeb2]'
                      }`}
                    >
                      Fusionner
                    </button>
                  </div>
                )}
              </div>

              {/* Templates List */}
              {templates.length === 0 ? (
                <div className="py-8 px-4 text-center border border-dashed border-[#d1d1d6] dark:border-[#48484a] rounded-[10px] space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center text-[#8e8e93]">
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Aucun modèle enregistré
                  </h4>
                  <p className="text-[11px] text-[#8e8e93] max-w-sm mx-auto leading-relaxed">
                    Créez vos modèles préfaits pour réutiliser vos semaines types en un clic. Vous pouvez enregistrer votre semaine en cours ou concevoir un modèle de zéro.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    {currentWeekSlotsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setCurrentView('save-week')}
                        className="px-3 py-1.5 bg-white dark:bg-[#2c2c2e] border border-[#d1d1d6] dark:border-[#48484a] text-[#1d1d1f] dark:text-[#f5f5f7] rounded-[6px] text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        Enregistrer cette semaine ({currentWeekSlotsCount})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStartNewBuilder}
                      className="px-3 py-1.5 bg-[#007aff] hover:bg-[#0069d9] text-white rounded-[6px] text-[11px] font-medium transition-colors"
                    >
                      Créer un modèle
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {templates.map((tpl) => {
                    const totalMinutes = tpl.slots.reduce(
                      (sum, s) => sum + calculateDurationMinutes(s.startTime, s.endTime),
                      0
                    );
                    const isExpanded = expandedTemplateId === tpl.id;

                    return (
                      <div
                        key={tpl.id}
                        className="p-3 rounded-[8px] border border-[#e5e5ea] dark:border-[#38383a] bg-white dark:bg-[#202022] hover:border-[#007aff]/60 transition-colors shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                                {tpl.name}
                              </h4>
                              <span className="text-[10px] font-mono text-[#8e8e93] flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {formatDuration(totalMinutes)}
                              </span>
                            </div>

                            {tpl.description && (
                              <p className="text-[11px] text-[#8e8e93] line-clamp-2">
                                {tpl.description}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] text-[#8e8e93]">
                                {tpl.slots.length} créneau(x)
                              </span>
                              <span className="text-[10px] text-[#d1d1d6] dark:text-[#48484a]">•</span>
                              {Array.from(new Set(tpl.slots.map((s) => s.categoryId))).map((catId) => {
                                const cat = DEFAULT_CATEGORIES[catId];
                                if (!cat) return null;
                                return (
                                  <span
                                    key={catId}
                                    className={`inline-block h-2 w-2 rounded-full ${cat.dotColor}`}
                                    title={cat.label}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick Card Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onApplyTemplate(tpl, applyMode)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#007aff] hover:bg-[#0069d9] text-white rounded-[6px] text-[11px] font-medium transition-colors shadow-2xs"
                              title={`Appliquer au planning (${applyMode === 'replace' ? 'Remplacer' : 'Fusionner'})`}
                            >
                              <Play className="h-3 w-3 fill-current" />
                              <span>Appliquer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditTemplate(tpl)}
                              title="Modifier ce modèle"
                              className="p-1 text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Supprimer définitivement le modèle "${tpl.name}" ?`)) {
                                  onDeleteTemplate(tpl.id);
                                }
                              }}
                              title="Supprimer ce modèle"
                              className="p-1 text-[#8e8e93] hover:text-[#ff3b30] rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable details button */}
                        <div className="pt-1 border-t border-[#f2f2f7] dark:border-[#2a2a2c] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedTemplateId(isExpanded ? null : tpl.id)}
                            className="flex items-center gap-1 text-[10px] text-[#007aff] hover:underline"
                          >
                            <span>{isExpanded ? 'Masquer le détail' : 'Voir les créneaux inclus'}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          <span className="text-[9px] text-[#8e8e93]">
                            Créé le {new Date(tpl.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        {/* Expanded Slots Details */}
                        {isExpanded && (
                          <div className="pt-1.5 space-y-1 border-t border-[#f2f2f7] dark:border-[#2a2a2c] max-h-36 overflow-y-auto">
                            {tpl.slots.map((s, sIdx) => {
                              const cat = DEFAULT_CATEGORIES[s.categoryId] || DEFAULT_CATEGORIES.custom;
                              return (
                                <div
                                  key={sIdx}
                                  className="flex items-center justify-between text-[10px] py-0.5 px-1.5 rounded-[4px] bg-[#f6f6f7] dark:bg-[#1a1a1c]"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] w-12 shrink-0 truncate">
                                      {DAYS_NAMES[s.dayOfWeek]}
                                    </span>
                                    <span className="font-mono text-[#8e8e93] shrink-0">
                                      {s.startTime}-{s.endTime}
                                    </span>
                                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cat.dotColor}`} />
                                    <span className="truncate text-[#1d1d1f] dark:text-[#f5f5f7]">
                                      {s.title}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
