"use client";
import { AlertTriangle } from 'lucide-react';
import { useAdminLang } from '../contexts/AdminLangContext';
import { BaseModal } from './BaseModal';

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

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      message={message}
      onClose={onCancel}
      icon={<AlertTriangle size={20} />}
      iconBgClass="bg-red-50"
      iconColorClass="text-crimson"
      isActioning={isDeleting}
    >
      <button type="button"
        onClick={onCancel}
        disabled={isDeleting}
        className={`px-4 py-2 text-sm border border-rule bg-white text-ink hover:bg-stone-50 rounded transition-colors font-medium ${lang === 'gu' ? 'font-gujarati' : ''}`}
      >
        {t('રદ કરો', 'Cancel')}
      </button>
      <button type="button"
        onClick={onConfirm}
        disabled={isDeleting}
        className={`px-4 py-2 text-sm bg-crimson hover:bg-red-700 text-white rounded transition-colors flex items-center gap-2 shadow-sm font-medium ${lang === 'gu' ? 'font-gujarati' : ''}`}
      >
        {isDeleting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block align-middle mr-2" />
            {t('કાઢી રહ્યું છે...', 'Deleting...')}
          </>
        ) : (
          t('હા, કાઢી નાખો', 'Yes, Delete')
        )}
      </button>
    </BaseModal>
  );
}
