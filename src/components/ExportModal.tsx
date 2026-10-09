import React, { useRef } from 'react';
import { TimeSlot } from '../types';
import { generateICS } from '../utils/dateUtils';
import { 
  X, 
  Download, 
  Calendar as CalendarIcon, 
  Printer, 
  FileJson, 
  Upload 
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: TimeSlot[];
  allSlots: TimeSlot[];
  onImportSlots: (importedSlots: TimeSlot[]) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  slots,
  allSlots,
  onImportSlots,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportICS = () => {
    const icsContent = generateICS(slots);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendrier-${Date.now()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(allSlots, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde-calendrier-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportSlots(parsed);
          alert(`${parsed.length} créneaux importés avec succès !`);
          onClose();
        } else {
          alert('Fichier JSON non conforme.');
        }
      } catch (err) {
        alert('Erreur lors de la lecture du fichier.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div 
        className="bg-white dark:bg-[#252528] rounded-xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between bg-[#f6f6f7] dark:bg-[#202022] shrink-0">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-[#007aff]" />
            <div>
              <h3 className="font-semibold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                Exporter & Partager
              </h3>
              <p className="text-[11px] text-[#8e8e93]">
                Formats Apple Calendar (.ics), impression et sauvegarde
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

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto flex-1">
          
          {/* iCalendar Option */}
          <div 
            onClick={handleExportICS}
            className="p-3 rounded-[8px] border border-[#e5e5ea] dark:border-[#38383a] hover:border-[#007aff] bg-white dark:bg-[#202022] hover:bg-[#f6f6f7] dark:hover:bg-[#2a2a2d] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[6px] bg-[#007aff]/10 text-[#007aff]">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Fichier iCalendar (.ics)
                </h4>
                <p className="text-[11px] text-[#8e8e93]">
                  Compatible avec Apple Calendrier, iPhone, Mac ({slots.length} créneaux)
                </p>
              </div>
            </div>
            <Download className="h-4 w-4 text-[#8e8e93] group-hover:text-[#007aff] transition-colors" />
          </div>

          {/* Print / PDF Option */}
          <div 
            onClick={handlePrint}
            className="p-3 rounded-[8px] border border-[#e5e5ea] dark:border-[#38383a] hover:border-[#007aff] bg-white dark:bg-[#202022] hover:bg-[#f6f6f7] dark:hover:bg-[#2a2a2d] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[6px] bg-[#34c759]/10 text-[#34c759]">
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Imprimer / Exporter PDF
                </h4>
                <p className="text-[11px] text-[#8e8e93]">
                  Format paysage adapté pour impression
                </p>
              </div>
            </div>
            <Download className="h-4 w-4 text-[#8e8e93] group-hover:text-[#34c759] transition-colors" />
          </div>

          {/* JSON Backup Option */}
          <div 
            onClick={handleExportJSON}
            className="p-3 rounded-[8px] border border-[#e5e5ea] dark:border-[#38383a] hover:border-[#007aff] bg-white dark:bg-[#202022] hover:bg-[#f6f6f7] dark:hover:bg-[#2a2a2d] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[6px] bg-[#ff9500]/10 text-[#ff9500]">
                <FileJson className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Archive JSON complète
                </h4>
                <p className="text-[11px] text-[#8e8e93]">
                  Sauvegarder l'intégralité ({allSlots.length} créneaux)
                </p>
              </div>
            </div>
            <Download className="h-4 w-4 text-[#8e8e93] group-hover:text-[#ff9500] transition-colors" />
          </div>

          {/* JSON Import */}
          <div className="pt-1.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 p-2 rounded-[6px] border border-dashed border-[#d1d1d6] dark:border-[#48484a] hover:border-[#007aff] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-medium transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-[#007aff]" />
              <span>Restaurer une archive JSON</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
