import React from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-5 z-50 flex flex-col gap-2 pointer-events-none no-print select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/95 dark:bg-[#252528]/95 backdrop-blur-xl text-[#1d1d1f] dark:text-[#f5f5f7] border border-[#e5e5ea] dark:border-[#38383a] shadow-xl text-[12px] font-medium animate-in slide-in-from-top-2 duration-150"
        >
          {toast.type === 'success' && <Check className="h-4 w-4 text-[#34c759]" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-[#ff3b30]" />}
          {toast.type === 'info' && <Info className="h-4 w-4 text-[#007aff]" />}
          
          <span>{toast.message}</span>

          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
