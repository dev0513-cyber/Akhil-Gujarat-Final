"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, FileText, Download, Share2, ExternalLink, ChevronDown } from 'lucide-react';
import { fetchEPapers } from '../../../src/lib/api';
import type { EPaper } from '../../../src/lib/types';

export default function EPaperClient() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthEPapers, setMonthEPapers] = useState<EPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchEPapers({ month: currentMonth.getMonth() + 1, year: currentMonth.getFullYear() })
      .then(setMonthEPapers)
      .catch((err) => console.error('Failed to fetch epapers', err))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectedEPaper = monthEPapers.find(e => e.published_date === selectedDate);

  const monthNames = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];
  const weekDays = ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"];

  const handleShare = async () => {
    if (!selectedEPaper) return;
    const shareData = {
      title: selectedEPaper.title,
      text: `${selectedDate} નું અખિલ ગુજરાત ઈ-પેપર વાંચો.`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('લિંક કોપી કરવામાં આવી છે!');
    }
  };

  return (
    <div className="bg-paper min-h-[calc(100vh-200px)] py-8 border-b border-rule">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-ink mb-2">અખિલ ગુજરાત ઈ-પેપર</h1>
          <p className="text-ink/60 font-gujarati">તમારું દૈનિક સમાચાર પત્ર, હવે ડિજિટલ ફોર્મેટમાં.</p>
        </div>

        <div className="flex flex-col md:flex-row bg-white border border-rule shadow-sm">
          
          <div className="md:hidden p-4 border-b border-rule bg-gray-50/50">
            <button type="button"
              onClick={() => setShowMobileCalendar(!showMobileCalendar)}
              className="w-full flex items-center justify-between p-3 border border-rule bg-white rounded shadow-sm font-bold font-gujarati text-ink"
            >
              <span>{selectedDate} નું ઈ-પેપર</span>
              <ChevronDown size={20} className={`transform transition-transform ${showMobileCalendar ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className={`${showMobileCalendar ? 'block' : 'hidden'} md:block w-full md:w-[350px] p-6 border-b md:border-b-0 md:border-r border-rule bg-gray-50/50`}>
            <h3 className="font-bold text-lg mb-6 border-b border-rule pb-2 text-ink">તારીખ પસંદ કરો</h3>
            
            <div className="flex items-center justify-between mb-6">
              <button type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-rule/30 rounded-full transition-colors text-ink"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-base font-bold font-gujarati text-crimson">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-rule/30 rounded-full transition-colors text-ink"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center font-gujarati mb-2">
              {weekDays.map(d => <div key={d} className="text-xs font-semibold text-ink/40 py-2">{d}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-1 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <div className="w-6 h-6 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {Array.from({ length: firstDay }).map((_, i) => {
                const padDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - firstDay + 1);
                return <div key={`empty-${padDate.getFullYear()}-${padDate.getMonth()}-${padDate.getDate()}`} />;
              })}
              {days.map(day => {
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasEPaper = monthEPapers.some(e => e.published_date === dateStr);
                const isSelected = selectedDate === dateStr;
                const isFuture = new Date(dateStr) > new Date();
                
                  let stateClass = '';
                  if (isSelected) {
                    stateClass = 'bg-crimson text-white shadow-md';
                  } else if (!isFuture) {
                    stateClass = 'hover:bg-rule/30 text-ink';
                  }

                  let ringClass = '';
                  if (hasEPaper && !isSelected) {
                    ringClass = 'font-bold text-crimson ring-1 ring-inset ring-crimson/30';
                  }

                  return (
                  <button type="button"
                    key={day}
                    disabled={isFuture}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setShowMobileCalendar(false);
                    }}
                    className={`
                      aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all
                      ${isFuture ? 'text-ink/20 cursor-not-allowed' : ''}
                      ${stateClass}
                      ${ringClass}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-rule text-xs text-ink/50 flex items-center gap-2 justify-center">
              <span className="w-3 h-3 rounded-full border border-crimson/30 inline-block" /> 
              <span>ઈ-પેપર ઉપલબ્ધ છે</span>
            </div>
          </div>

          <div className="flex-1 p-6 md:p-10 flex flex-col justify-center min-h-[400px]">
            {selectedEPaper ? (
              <div className="animate-in fade-in zoom-in-95 duration-300 max-w-md mx-auto w-full">
                
                <div className="bg-white shadow-xl border border-rule/50 w-full aspect-[2/3] relative mb-8 overflow-hidden group">
                  {selectedEPaper.thumbnail_url ? (
                    <Image src={selectedEPaper.thumbnail_url} alt={selectedEPaper.title} fill sizes="(max-width: 768px) 100vw, 450px" className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized={selectedEPaper.thumbnail_url.startsWith('/api/media')} />
                  ) : (
                    <div className="w-full h-full bg-paper flex flex-col items-center justify-center text-ink/20">
                      <FileText size={64} strokeWidth={1} className="mb-4" />
                      <span className="font-gujarati text-sm font-semibold">કવર પેજ ઉપલબ્ધ નથી</span>
                    </div>
                  )}
                  <div className="absolute inset-0 shadow-[inset_10px_0_20px_rgba(0,0,0,0.05)] pointer-events-none" />
                </div>
                
                <div className="text-center">
                  <p className="text-ink/60 mb-6 font-mono font-semibold tracking-widest">{selectedEPaper.published_date}</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <a 
                      href={selectedEPaper.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-crimson text-white font-bold rounded shadow-md shadow-crimson/20 hover:bg-crimson/90 transition-all hover:-translate-y-0.5 active:scale-95 active:opacity-90"
                    >
                      <ExternalLink size={18} /> વાંચો (Read)
                    </a>
                    <a 
                      href={`${selectedEPaper.pdf_url}?download=1`}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-ink text-white font-bold rounded shadow-md shadow-ink/20 hover:bg-ink/90 transition-all hover:-translate-y-0.5 active:scale-95 active:opacity-90"
                    >
                      <Download size={18} /> ડાઉનલોડ
                    </a>
                  </div>
                  
                  <button type="button"
                    onClick={handleShare}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-ink hover:text-crimson transition-all active:scale-95"
                  >
                    <Share2 size={16} /> મિત્રો સાથે શેર કરો
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center flex flex-col items-center justify-center text-ink/40 animate-in fade-in">
                <FileText size={48} strokeWidth={1} className="mb-4" />
                <h3 className="text-lg font-bold mb-1 font-gujarati text-ink/60">ઈ-પેપર ઉપલબ્ધ નથી</h3>
                <p className="text-sm">{selectedDate} માટે ઈ-પેપર અપલોડ કરવામાં આવ્યું નથી.</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
