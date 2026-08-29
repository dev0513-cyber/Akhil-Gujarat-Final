"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MapPin,
  Newspaper,
  Settings as SettingsIcon,
  Languages,
  Globe,
  Megaphone,
} from "lucide-react";

import { AdminLangProvider, useAdminLang } from "../contexts/AdminLangContext";
import { logoutAction } from "../../app/actions/auth";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

function IdleTimeout() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logoutAction();
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return null;
}

const links = [
  {
    to: "/admin",
    labelGu: "ડેશબોર્ડ",
    labelEn: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/articles",
    labelGu: "સમાચાર",
    labelEn: "Articles",
    icon: Newspaper,
  },
  {
    to: "/admin/epapers",
    labelGu: "ઈ-પેપર",
    labelEn: "E-Papers",
    icon: FileText,
  },
  {
    to: "/admin/ads",
    labelGu: "જાહેરાત",
    labelEn: "Ads",
    icon: Megaphone,
  },
  {
    to: "/admin/categories",
    labelGu: "વિભાગો",
    labelEn: "Categories",
    icon: FolderOpen,
  },
  { to: "/admin/cities", labelGu: "શહેરો", labelEn: "Cities", icon: MapPin },
  { to: "/admin/pages", labelGu: "પેજીસ", labelEn: "Pages", icon: FileText },
  {
    to: "/admin/settings",
    labelGu: "સેટિંગ્સ",
    labelEn: "Settings",
    icon: SettingsIcon,
  },
];

function AdminSidebar({ children, email }: Readonly<{ children: React.ReactNode, email?: string }>) {

  const { t, lang, setLang } = useAdminLang();

  const handleLogout = async () => {
    await logoutAction();
  };

  const toggleLang = () => {
    setLang(lang === "gu" ? "en" : "gu");
  };

  return (
    <div className="min-h-screen bg-[#f3eee4] text-ink flex flex-col md:flex-row font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-ink focus:text-white focus:font-bold">Skip to content</a>
      <aside className="md:w-64 bg-ink text-white shrink-0 flex flex-col relative z-20 shadow-2xl">
        <div className="px-5 py-6 border-b border-white/10 flex flex-col items-center text-center">
          <div className="flex flex-col items-center w-full mb-5">
            <div className="text-[10px] tracking-[0.4em] text-gold uppercase font-bold mb-1">
              Admin
            </div>
            <div className="font-display text-2xl tracking-wide">
              અખિલ ગુજરાત
            </div>
            <div className="text-[11px] text-white/40 mt-1.5 truncate max-w-full">
              {email}
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 w-full flex-wrap">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 text-[10px] bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded text-white/90 tracking-widest font-bold shadow-sm flex-1 max-w-[90px]"
              aria-label="View Site"
            >
              <Globe size={12} className="shrink-0" />
              <span>{t("સાઇટ", "SITE")}</span>
            </Link>
            <button type="button"
              onClick={toggleLang}
              className="flex items-center justify-center gap-1.5 text-[10px] bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded text-white/90 tracking-widest font-bold shadow-sm flex-1 max-w-[90px]"
              aria-label="Toggle Language"
            >
              <Languages size={12} className="shrink-0" />
              <span>{lang === "gu" ? "EN" : "GU"}</span>
            </button>
            <button type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-100 transition-colors px-3 py-2 rounded tracking-widest font-bold shadow-sm border border-red-500/20 flex-1 max-w-[90px]"
              aria-label="Sign Out"
            >
              <LogOut size={12} className="shrink-0" />
              <span>{t("આઉટ", "EXIT")}</span>
            </button>
          </div>
        </div>
        <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto flex-1">
          {links.map((l) => (
            <Link
              key={l.to}
              href={l.to}
              className="flex items-center gap-3 px-3 py-2.5 text-sm whitespace-nowrap text-white/70 hover:bg-white/10 hover:text-white rounded-md transition-colors font-medium"
            >
              <l.icon size={16} className="text-white/50" />
              <span className={lang === "gu" ? "font-gujarati" : ""}>
                {t(l.labelGu, l.labelEn)}
              </span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-8 bg-paper">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
  email,
}: Readonly<{
  children: React.ReactNode;
  email?: string;
}>) {
  return (
    <AdminLangProvider>
      <IdleTimeout />
      <AdminSidebar email={email}>{children}</AdminSidebar>
    </AdminLangProvider>
  );
}
