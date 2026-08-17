"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Lang = 'gu' | 'en';

interface AdminLangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (gu: string, en: string) => string;
}

const AdminLangContext = createContext<AdminLangContextType | undefined>(undefined);

export function AdminLangProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [lang, setLangState] = useState<Lang>('gu');

  useEffect(() => {
    const saved = localStorage.getItem('admin_lang') as Lang;
    if (saved === 'en' || saved === 'gu') {
      setTimeout(() => setLangState(saved), 0);
    }
  }, []);

  const setLang = React.useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('admin_lang', newLang);
  }, []);

  const t = React.useCallback((gu: string, en: string) => {
    return lang === 'en' ? en : gu;
  }, [lang]);

  const value = React.useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <AdminLangContext.Provider value={value}>
      {children}
    </AdminLangContext.Provider>
  );
}

export function useAdminLang() {
  const context = useContext(AdminLangContext);
  if (context === undefined) {
    throw new Error('useAdminLang must be used within an AdminLangProvider');
  }
  return context;
}
