import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={[
          'fixed top-24 z-[100000] flex flex-col gap-3 pointer-events-none',
          isRtl ? 'left-4 sm:left-8 right-auto' : 'right-4 sm:right-8 left-auto',
        ].join(' ')}
        role="status"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-card-hover border backdrop-blur-md animate-in slide-in-from-right-full duration-300 min-w-[280px] max-w-md
              ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500/50' : ''}
              ${toast.type === 'error' ? 'bg-red-600 text-white border-red-500/50' : ''}
              ${toast.type === 'warning' ? 'bg-amber-500 text-white border-amber-400/50' : ''}
              ${toast.type === 'info' ? 'bg-slate-700 text-white border-slate-600/50' : ''}
            `}
            aria-label={toast.message}
          >
            <span className="shrink-0">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </span>
            <p className="text-xs font-black uppercase tracking-widest flex-1 leading-relaxed">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
