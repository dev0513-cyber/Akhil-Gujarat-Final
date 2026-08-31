"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

type Lang = 'gu' | 'en';

interface AdminLangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (gu: string, en: string) => string;
}

const AdminLangContext = createContext<AdminLangContextType | undefined>(undefined);

export function AdminLangProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [langValue, setLangValue] = useState<Lang>('gu');

  useEffect(() => {
    const saved = localStorage.getItem('admin_lang') as Lang;
    if (saved === 'en' || saved === 'gu') {
      setTimeout(() => setLangValue(saved), 0);
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangValue(newLang);
    localStorage.setItem('admin_lang', newLang);
  }, []);

  const t = useCallback((gu: string, en: string) => {
    return langValue === 'en' ? en : gu;
  }, [langValue]);

  const value = useMemo(() => ({ lang: langValue, setLang, t }), [langValue, setLang, t]);

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
