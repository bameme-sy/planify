import React, { useState } from 'react';
import { PlanningConfig } from '../types';
import { X, Sliders } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PlanningConfig;
  onSaveConfig: (newConfig: PlanningConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [startHour, setStartHour] = useState(config.startHour);
  const [endHour, setEndHour] = useState(config.endHour);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(config.weeklyTargetHours);
  const [timeStepMinutes, setTimeStepMinutes] = useState(config.timeStepMinutes);
  const [showWeekends, setShowWeekends] = useState(config.showWeekends);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startHour >= endHour) {
      alert("L'heure de début doit être strictement inférieure à l'heure de fin.");
      return;
    }

    onSaveConfig({
      ...config,
      startHour,
      endHour,
      weeklyTargetHours,
      timeStepMinutes,
      showWeekends,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div 
        className="bg-white dark:bg-[#252528] rounded-xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between bg-[#f6f6f7] dark:bg-[#202022] shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#007aff]" />
            <div>
              <h3 className="font-semibold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                Réglages du calendrier
              </h3>
              <p className="text-[11px] text-[#8e8e93]">
                Plages horaires et affichage
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          
          {/* Hours range */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                Heure de début
              </label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i} disabled={i >= endHour}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                Heure de fin
              </label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i} disabled={i <= startHour}>
                    {i === 23 ? '23:59 (Fin de journée)' : `${String(i).padStart(2, '0')}:00`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Step */}
          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
              Précision horaire
            </label>
            <div className="inline-flex p-[2px] rounded-[7px] bg-[#e3e3e8] dark:bg-[#3a3a3c] w-full">
              {[15, 30, 60].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setTimeStepMinutes(step)}
                  className={`flex-1 py-0.5 text-[11px] font-medium rounded-[5px] transition-all ${
                    timeStepMinutes === step
                      ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                      : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
                  }`}
                >
                  {step} min
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Target Hours */}
          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
              Objectif d'activité hebdomadaire
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={weeklyTargetHours}
                onChange={(e) => setWeeklyTargetHours(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
              />
              <span className="text-[12px] text-[#8e8e93]">heures</span>
            </div>
          </div>

          {/* Show Weekends */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showWeekends}
                onChange={(e) => setShowWeekends(e.target.checked)}
                className="h-4 w-4 rounded accent-[#007aff]"
              />
              <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                Afficher le week-end (Samedi & Dimanche)
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-[#e5e5ea] dark:border-[#38383a] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5 rounded-[6px] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-3.5 py-1 text-[12px] font-medium bg-[#007aff] hover:bg-[#0069d9] active:bg-[#0051a8] text-white rounded-[6px] transition-colors"
            >
              Enregistrer
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
