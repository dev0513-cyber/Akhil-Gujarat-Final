"use client";
import { AlertCircle } from 'lucide-react';
import { useAdminLang } from '../contexts/AdminLangContext';
import { BaseModal } from './BaseModal';

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
}

export function AlertModal({
  isOpen,
  title,
  message,
  onConfirm,
}: AlertModalProps) {
  const { t, lang } = useAdminLang();

  return (
    <BaseModal
      isOpen={isOpen}
      title={title || t('સૂચના', 'Notice')}
      message={message}
      onClose={onConfirm}
      icon={<AlertCircle size={20} />}
      iconBgClass="bg-red-50"
      iconColorClass="text-crimson"
    >
      <button
        onClick={onConfirm}
        className={`px-6 py-2 text-sm bg-crimson hover:bg-red-700 text-white rounded transition-colors flex items-center gap-2 shadow-sm font-medium ${lang === 'gu' ? 'font-gujarati' : ''}`}
      >
        {t('ઓકે', 'OK')}
      </button>
    </BaseModal>
  );
}
