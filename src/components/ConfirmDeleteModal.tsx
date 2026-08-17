"use client";
import { AlertTriangle, X } from 'lucide-react';
import { useAdminLang } from '../contexts/AdminLangContext';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  const { t, lang } = useAdminLang();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-start p-5 border-b border-rule">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 text-crimson">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className={`text-xl font-extrabold text-ink ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                {title}
              </h3>
            </div>
          </div>
          <button 
            onClick={onCancel}
            disabled={isDeleting}
            className="text-ink/40 hover:text-ink transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5">
          <p className={`text-base text-ink/90 font-medium leading-relaxed break-words whitespace-pre-wrap ${lang === 'gu' ? 'font-gujarati' : ''}`}>
            {message}
          </p>
        </div>
        
        <div className="bg-paper p-4 flex justify-end gap-3 border-t border-rule">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className={`px-4 py-2 text-sm border border-rule bg-white text-ink hover:bg-stone-50 rounded transition-colors font-medium ${lang === 'gu' ? 'font-gujarati' : ''}`}
          >
            {t('રદ કરો', 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={`px-4 py-2 text-sm bg-crimson hover:bg-red-700 text-white rounded transition-colors flex items-center gap-2 shadow-sm font-medium ${lang === 'gu' ? 'font-gujarati' : ''}`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('કાઢી રહ્યું છે...', 'Deleting...')}
              </>
            ) : (
              t('હા, કાઢી નાખો', 'Yes, Delete')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
