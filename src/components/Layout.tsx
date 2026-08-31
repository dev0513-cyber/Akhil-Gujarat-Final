"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, X, MapPin, Newspaper, Phone, Mail } from 'lucide-react';
import Image from 'next/image';
import type { Category, City } from '../lib/types';
import { formatTodayMasthead, formatTodayMastheadShort } from '../lib/format';

type LayoutProps = Readonly<{
  children: ReactNode;
  initialCategories?: Category[];
  initialCities?: City[];
  initialSettings?: Record<string, string>;
}>;

export default function Layout({ children, initialCategories = [], initialCities = [], initialSettings = {} }: LayoutProps) {
  const [cats] = useState<Category[]>(initialCategories);
  const [cities] = useState<City[]>(initialCities);
  const [open, setOpen] = useState(false);
  const [gujaratOpen, setGujaratOpen] = useState(false);
  const gujaratBtnRef = useRef<HTMLDivElement | null>(null);
  const [gujaratTop, setGujaratTop] = useState(0);
  const [q, setQ] = useState('');
  const [now, setNow] = useState<Date | null>(null);
  const [settings] = useState<Record<string, string>>(initialSettings);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Force scroll to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      setOpen(false);
      setGujaratOpen(false);
    }, 0);
  }, [pathname]);


  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setOpen(false);
  };



  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black focus:font-bold">Skip to content</a>
      <div className="bg-ink text-white/80 text-[11px] tracking-wide">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2 md:gap-3">
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <span className="font-mono tabular-nums text-[11px] md:text-sm font-medium tracking-wider whitespace-nowrap">
              {now ? now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '...'}
            </span>
            <div className="flex items-center gap-2.5 md:gap-3 border-l border-white/20 pl-3 md:pl-4">
              <a href={settings.instagram_url || '#'} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-white transition-colors">
                <InstagramIcon size={16} />
              </a>
              <a href={settings.youtube_url || '#'} target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:text-white transition-colors">
                <YoutubeIcon size={16} />
              </a>
              <a href={settings.facebook_url || '#'} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-white transition-colors">
                <FacebookIcon size={16} />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="font-gujarati text-[11px] md:text-sm font-medium whitespace-nowrap">
              {now ? (
                <>
                  <span className="sm:hidden" suppressHydrationWarning>{formatTodayMastheadShort()}</span>
                  <span className="hidden sm:inline" suppressHydrationWarning>{formatTodayMasthead()}</span>
                </>
              ) : '...'}
            </span>
          </div>
        </div>
      </div>

      <header className="border-b border-rule bg-paper sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center justify-center md:justify-start gap-3 w-full md:w-auto">
              <Image src="/logo.png" alt="Logo" width={120} height={56} className="h-10 md:h-14 w-auto object-contain" style={{ width: 'auto' }} priority />
              <div className="flex flex-col items-center md:items-start">
                <h1 className="font-display text-2xl md:text-3xl leading-none text-ink tracking-tight">
                  અખિલ ગુજરાત
                </h1>
                <div className="text-[10px] tracking-[0.28em] text-ink/45 mt-1 uppercase text-center md:text-left">
                  Unity · Culture · Progress
                </div>
              </div>
            </Link>

            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto mt-3 md:mt-0">
              <Link 
                href="/epaper" 
                className="group flex items-center justify-center gap-2 bg-crimson text-white font-bold px-5 py-1.5 hover:bg-crimson/90 transition-all shadow-sm w-full md:w-auto whitespace-nowrap border border-crimson"
              >
                <Newspaper size={16} className="group-hover:-rotate-12 transition-transform duration-300" />
                <span>ઈ-પેપર</span>
              </Link>
              <form 
                action="/search"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
                className="flex items-center border border-rule bg-white px-3 py-1.5 w-full md:w-64"
              >
                <input
                  name="q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="સમાચાર શોધો..."
                  className="flex-1 outline-none text-sm bg-transparent font-gujarati"
                />
                <button type="submit" aria-label="શોધ">
                  <Search size={16} className="text-ink/50" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <nav className="block border-t border-rule">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-0 overflow-x-auto md:overflow-visible md:flex-wrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <NavItem to="/" className="pl-0">મુખ્ય પાનું</NavItem>
            {cats.map((c) => {
              if (c.slug === 'gujarat' && cities.length > 0) {
                return (
                  <div key={c.id} className="relative" ref={gujaratBtnRef}>
                    <button type="button"
                      aria-expanded={gujaratOpen}
                      aria-haspopup="true"
                      onClick={() => {
                        if (!gujaratOpen) {
                          const r = gujaratBtnRef.current?.getBoundingClientRect();
                          setGujaratTop(r ? r.bottom + 4 : 56);
                        }
                        setGujaratOpen(!gujaratOpen);
                      }}
                      className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 font-gujarati flex items-center gap-1 outline-none ${gujaratOpen ? 'border-crimson text-crimson' : 'border-transparent text-ink/75 hover:text-crimson'}`}
                    >
                      {c.name_gu} <span className="text-[10px] text-ink/40">{gujaratOpen ? '▲' : '▼'}</span>
                    </button>
                    {gujaratOpen && (
                      <>
                        <div aria-hidden="true" className="fixed inset-0 z-40 cursor-default" onClick={() => setGujaratOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setGujaratOpen(false); }} />
                        <div className="absolute left-0 top-full bg-white border border-rule shadow-xl py-2 min-w-[180px] z-50 hidden md:block">
                          <GujaratDropdownItems cities={cities} onNavigate={() => setGujaratOpen(false)} />
                        </div>
                        <div
                          className="fixed inset-x-0 z-50 bg-white border border-rule shadow-xl py-2 max-h-[65vh] overflow-y-auto md:hidden"
                          style={{ top: gujaratTop }}
                        >
                          <GujaratDropdownItems cities={cities} onNavigate={() => setGujaratOpen(false)} />
                        </div>
                      </>
                    )}
                  </div>
                );
              }
              return (
                <NavItem key={c.id} to={`/category/${c.slug}`}>
                  {c.name_gu}
                </NavItem>
              );
            })}

          </div>
        </nav>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-black/40 cursor-default" onClick={() => setOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }} />
          <aside className="absolute left-0 top-0 bottom-0 w-[82%] max-w-sm bg-paper shadow-xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-display text-2xl">અખિલ ગુજરાત</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="બંધ">
                <X size={22} />
              </button>
            </div>
            <form action="/search" onSubmit={onSearch} className="flex items-center border border-rule bg-white px-3 py-2 mb-5">
              <input
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="સમાચાર શોધો..."
                className="flex-1 outline-none text-sm bg-transparent font-gujarati"
              />
              <button type="submit" aria-label="શોધ">
                <Search size={16} />
              </button>
            </form>
            <div className="flex flex-col text-lg font-display">
              <MobileLink to="/" onClick={() => setOpen(false)}>
                મુખ્ય પાનું
              </MobileLink>
              {cats.map((c) => (
                <MobileLink key={c.id} to={`/category/${c.slug}`} onClick={() => setOpen(false)}>
                  {c.name_gu}
                </MobileLink>
              ))}

              <p className="mt-5 mb-1 text-[11px] tracking-[0.2em] uppercase text-ink/40">શહેરો</p>
              {cities.map((c) => (
                <MobileLink key={c.id} to={`/city/${c.slug}`} onClick={() => setOpen(false)}>
                  {c.name_gu}
                </MobileLink>
              ))}
            </div>
          </aside>
        </div>
      )}

      <main id="main-content" className="flex-1">{children}</main>

      <footer className="mt-12 bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <div className="col-span-2 lg:col-span-2">
            <div className="font-display text-[11px] tracking-[0.4em] text-gold uppercase">Akhil Gujarat</div>
            <div className="font-display text-3xl mt-2">અખિલ ગુજરાત</div>
            <p className="mt-4 text-white/65 text-sm font-gujarati max-w-md leading-relaxed">
              ગુજરાત, ભારત અને વિશ્વના વિશ્વસનીય ગુજરાતી સમાચાર. સત્ય, સ્પષ્ટતા અને સમાજ — આ ત્રણ સ્તંભો પર ઊભું ડિજિટલ અખબાર.
            </p>
          </div>
          <div>
            <h3 className="text-xs tracking-[0.2em] uppercase text-gold mb-3">સંપર્ક (Contact)</h3>
            <ul className="space-y-3 text-sm text-white/75 font-gujarati min-w-0">
              <li className="flex items-start gap-2 min-w-0">
                <MapPin size={16} className="text-crimson shrink-0 mt-0.5" />
                <span className="font-sans min-w-0 break-words">Ahmedabad, Gujarat</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <Phone size={16} className="text-crimson shrink-0" />
                <span className="font-sans min-w-0 break-words">+91 97232 74144</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <Mail size={16} className="text-crimson shrink-0" />
                <span className="font-sans min-w-0 break-all">akhilgujaratdaily@gmail.com</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs tracking-[0.2em] uppercase text-gold mb-3">માહિતી (Information)</h3>
            <ul className="space-y-1.5 text-sm text-white/75 font-gujarati">
              <li>
                <Link href="/p/about" className="hover:text-white">
                  અમારા વિશે
                </Link>
              </li>
              <li>
                <Link href="/p/privacy" className="hover:text-white">
                  ગોપનીયતા નીતિ
                </Link>
              </li>
              <li>
                <Link href="/p/terms" className="hover:text-white">
                  નિયમો અને શરતો
                </Link>
              </li>
              <li>
                <Link href="/p/disclaimer" className="hover:text-white">
                  ડિસ્ક્લેમર
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 text-center text-[11px] text-white/45 py-4 font-sans uppercase tracking-wider">
          © {new Date().getFullYear()} Akhil Gujarat. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, className, children }: Readonly<{ to: string; className?: string; children: ReactNode }>) {
  return (
    <Link
      href={to}
      
      className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 font-gujarati border-transparent text-ink/75 hover:text-crimson ${className || ''}`}
    >
      {children}
    </Link>
  );
}

function MobileLink({ to, onClick, children }: Readonly<{ to: string; onClick?: () => void; children: ReactNode }>) {
  return (
    <Link href={to} onClick={onClick} className="block border-b border-rule py-3 text-ink hover:text-crimson transition-colors">
      {children}
    </Link>
  );
}

function GujaratDropdownItems({ cities, onNavigate }: Readonly<{ cities: City[]; onNavigate: () => void }>) {
  return (
    <div>
      {cities.map(city => (
        <Link
          key={city.id}
          href={`/city/${city.slug}`}
          className="block px-4 py-2 text-sm font-gujarati text-ink hover:bg-paper hover:text-crimson"
          onClick={onNavigate}
        >
          {city.name_gu}
        </Link>
      ))}
      <div className="h-px bg-rule my-1" />
      <Link
        href="/category/gujarat"
        className="block px-4 py-2 text-sm font-gujarati font-bold text-crimson hover:bg-paper"
        onClick={onNavigate}
      >
        બધા ગુજરાત સમાચાર →
      </Link>
    </div>
  );
}

const FacebookIcon = ({ size = 14 }: Readonly<{ size?: number }>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const InstagramIcon = ({ size = 14 }: Readonly<{ size?: number }>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const YoutubeIcon = ({ size = 14 }: Readonly<{ size?: number }>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
);
