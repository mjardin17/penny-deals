import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-xl border border-[#2c2c35] text-sm text-[#f5f5f7] backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
          style={{
            backgroundColor: 'rgba(24, 24, 28, 0.95)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-[#ff3b30] shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 text-[#0a84ff] shrink-0" />
            )}
            <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="ml-3 text-[#92929d] hover:text-[#f5f5f7] transition-colors p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

