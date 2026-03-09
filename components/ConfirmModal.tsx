import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'primary';
}

/**
 * مودال تأكيد — يعرض رسالة مناسبة للمستخدم بدل نافذة المتصفح (بدون "localhost says").
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    primary: 'bg-palma-primaryLight text-palma-primary',
  };
  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    primary: 'bg-palma-primary hover:bg-palma-primaryHover text-white',
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={() => !isLoading && onCancel()}
    >
      <div
        className="bg-white rounded-[2.5rem] max-w-md w-full p-8 space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${variantStyles[variant]}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-palma-navy">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => !isLoading && onCancel()}
            disabled={isLoading}
            className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-black text-sm uppercase tracking-wider hover:bg-slate-50 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 ${buttonStyles[variant]}`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
