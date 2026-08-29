"use client";
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAdminLang } from '../contexts/AdminLangContext';

type BaseModalProps = Readonly<{
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  icon: ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  children: ReactNode;
  isActioning?: boolean;
}>;

export function BaseModal({
  isOpen,
  title,
  message,
  onClose,
  icon,
  iconBgClass,
  iconColorClass,
  children,
  isActioning = false,
}: BaseModalProps) {
  const { lang } = useAdminLang();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isActioning) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isActioning]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
      <dialog open
        className="relative m-0 p-0 border-0 bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        aria-modal="true"
      >
        <div className="flex justify-between items-start p-5 border-b border-rule">
          <div className="flex gap-3 items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass} ${iconColorClass}`}>
              {icon}
            </div>
            <div>
              <h3 className={`text-xl font-extrabold text-ink ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                {title}
              </h3>
            </div>
          </div>
          <button type="button"
            onClick={onClose}
            disabled={isActioning}
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
          {children}
        </div>
      </dialog>
    </div>
  );
}
