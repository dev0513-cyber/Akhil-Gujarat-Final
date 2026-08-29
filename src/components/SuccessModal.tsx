"use client";
import { CheckCircle } from 'lucide-react';
import { useAdminLang } from '../contexts/AdminLangContext';
import { BaseModal } from './BaseModal';

type SuccessModalProps = Readonly<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}>;

export function SuccessModal({
  isOpen,
  title,
  message,
  onConfirm,
}: SuccessModalProps) {
  const { t, lang } = useAdminLang();

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      message={message}
      onClose={onConfirm}
      icon={<CheckCircle size={20} />}
      iconBgClass="bg-green-50"
      iconColorClass="text-green-600"
    >
      <button type="button"
        autoFocus
        onClick={onConfirm}
        className={`px-6 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2 shadow-sm font-medium ${lang === 'gu' ? 'font-gujarati' : ''}`}
      >
        {t('ઓકે', 'OK')}
      </button>
    </BaseModal>
  );
}
