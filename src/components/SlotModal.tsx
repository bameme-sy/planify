import React, { useState, useEffect } from 'react';
import { 
  TimeSlot, 
  CategoryId, 
  SlotStatus, 
  DayInfo 
} from '../types';
import { DEFAULT_CATEGORIES } from '../utils/categories';
import { 
  calculateDurationMinutes, 
  formatDuration, 
  timeToMinutes, 
  minutesToTime 
} from '../utils/dateUtils';
import { 
  X, 
  Clock, 
  Calendar as CalendarIcon, 
  MapPin, 
  AlignLeft, 
  Trash2, 
  Copy, 
  Check
} from 'lucide-react';

interface SlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slotData: Partial<TimeSlot>, replicateDays?: string[]) => void;
  onDelete?: (slotId: string) => void;
  slotToEdit?: TimeSlot | null;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  weekDays: DayInfo[];
}

export const SlotModal: React.FC<SlotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  slotToEdit,
  initialDate,
  initialStartTime,
  initialEndTime,
  weekDays,
}) => {
  const isEditing = Boolean(slotToEdit);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('work');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<SlotStatus>('planned');
  
  const [replicateDays, setReplicateDays] = useState<string[]>([]);

  useEffect(() => {
    if (slotToEdit) {
      setTitle(slotToEdit.title);
      setCategoryId(slotToEdit.categoryId);
      setDate(slotToEdit.date);
      setStartTime(slotToEdit.startTime);
      setEndTime(slotToEdit.endTime);
      setLocation(slotToEdit.location || '');
      setNotes(slotToEdit.notes || '');
      setStatus(slotToEdit.status);
      setReplicateDays([]);
    } else {
      setTitle('');
      setCategoryId('work');
      setDate(initialDate || (weekDays[0] ? weekDays[0].dateString : ''));
      setStartTime(initialStartTime || '09:00');
      setEndTime(initialEndTime || '10:00');
      setLocation('');
      setNotes('');
      setStatus('planned');
      setReplicateDays([]);
    }
  }, [slotToEdit, initialDate, initialStartTime, initialEndTime, weekDays, isOpen]);

  if (!isOpen) return null;

  const durationMin = calculateDurationMinutes(startTime, endTime);

  const handleAdjustDuration = (additionalMinutes: number) => {
    const startM = timeToMinutes(startTime);
    const newEndM = startM + additionalMinutes;
    setEndTime(minutesToTime(newEndM));
  };

  const toggleReplicateDay = (dayDateStr: string) => {
    setReplicateDays((prev) =>
      prev.includes(dayDateStr) ? prev.filter((d) => d !== dayDateStr) : [...prev, dayDateStr]
    );
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    const startM = timeToMinutes(newStartTime);
    const endM = timeToMinutes(endTime);
    if (endM <= startM) {
      setEndTime(minutesToTime(Math.min(1439, startM + 60)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      alert("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }

    onSave(
      {
        id: slotToEdit?.id,
        title: title.trim(),
        categoryId,
        date,
        startTime,
        endTime,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      },
      replicateDays
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div 
        className="bg-white dark:bg-[#252528] rounded-xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between bg-[#f6f6f7] dark:bg-[#202022] shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">
              {isEditing ? 'Détails de l\'événement' : 'Nouvel événement'}
            </h3>
            <span className="text-[11px] text-[#8e8e93] font-mono">
              ({formatDuration(durationMin)})
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          
          {/* Title input */}
          <div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'événement"
              className="w-full px-3 py-1.5 rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none text-[13px] font-medium"
            />
          </div>

          {/* Category selection (Apple Calendar source style) */}
          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
              Calendrier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {Object.values(DEFAULT_CATEGORIES).map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'border-[#007aff] bg-[#007aff]/10 text-[#007aff] dark:text-[#70baff] ring-1 ring-[#007aff]'
                        : 'border-[#e5e5ea] dark:border-[#38383a] hover:bg-black/5 dark:hover:bg-white/5 text-[#1d1d1f] dark:text-[#f5f5f7]'
                    }`}
                  >
                    <span 
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${cat.dotColor}`} 
                    />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and Time selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1 flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Début</span>
              </label>
              <input
                type="time"
                step="900"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-2.5 py-1 text-[12px] font-mono rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Fin</span>
              </label>
              <input
                type="time"
                step="900"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-1 text-[12px] font-mono rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              />
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#8e8e93] mr-1">Durée :</span>
            {[30, 45, 60, 90, 120].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => handleAdjustDuration(dur)}
                className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#f2f2f7] dark:bg-[#323234] hover:bg-[#e5e5ea] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] border border-[#e5e5ea] dark:border-[#38383a] transition-colors"
              >
                {dur >= 60 ? `${dur / 60}h` : `${dur}m`}
              </button>
            ))}
          </div>

          {/* Location and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Lieu ou lien</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Salle A, Visio..."
                className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1 flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>État</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SlotStatus)}
                className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              >
                <option value="planned">Prévu</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1 flex items-center gap-1">
              <AlignLeft className="h-3 w-3" />
              <span>Notes</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Détails, ordre du jour..."
              className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
            />
          </div>

          {/* Replicate to other days */}
          {!isEditing && (
            <div className="pt-2 border-t border-[#e5e5ea] dark:border-[#38383a]">
              <div className="flex items-center gap-1 mb-1.5">
                <Copy className="h-3 w-3 text-[#8e8e93]" />
                <span className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d]">
                  Répéter sur d'autres jours de la semaine
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {weekDays.map((day) => {
                  if (day.dateString === date) return null;
                  const isChecked = replicateDays.includes(day.dateString);
                  return (
                    <button
                      key={day.dateString}
                      type="button"
                      onClick={() => toggleReplicateDay(day.dateString)}
                      className={`px-2 py-0.5 text-[11px] rounded-[4px] border font-medium transition-colors ${
                        isChecked
                          ? 'bg-[#007aff] text-white border-[#007aff]'
                          : 'bg-[#f2f2f7] dark:bg-[#323234] border-[#e5e5ea] dark:border-[#38383a] text-[#1d1d1f] dark:text-[#f5f5f7]'
                      }`}
                    >
                      {day.dayName.slice(0, 3)} {day.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (slotToEdit && confirm('Supprimer cet événement ?')) {
                    onDelete(slotToEdit.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-[6px] text-[12px] font-medium transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Supprimer</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] bg-white dark:bg-[#323234] border border-[#d1d1d6] dark:border-[#48484a] hover:bg-[#f2f2f7] dark:hover:bg-[#3a3a3c] rounded-[6px] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 text-[12px] font-medium bg-[#007aff] hover:bg-[#0069d9] active:bg-[#0051a8] text-white rounded-[6px] shadow-2xs transition-colors"
              >
                {isEditing ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
