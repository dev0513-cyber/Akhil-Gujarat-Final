export function formatDateGu(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('gu-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDate(iso: string | null | undefined, lang: 'en' | 'gu'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(lang === 'gu' ? 'gu-IN' : 'en-US', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined, lang: 'en' | 'gu'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(lang === 'gu' ? 'gu-IN' : 'en-US', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTimeGu(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('gu-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTodayMasthead(): string {
  return new Date().toLocaleDateString('gu-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTodayMastheadShort(): string {
  return new Date().toLocaleDateString('gu-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function getISTDayRange(day?: string): { day: string; from: string; to: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dayStr = day || formatter.format(new Date());
  const start = new Date(`${dayStr}T00:00:00+05:30`);
  return {
    day: dayStr,
    from: start.toISOString(),
    to: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u0A80-\u0AFF]+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '');
}

export async function translateText(text: string, fromLang: 'en' | 'gu', toLang: 'en' | 'gu'): Promise<string> {
  if (!text) return '';
  try {
    if (fromLang === 'en' && toLang === 'gu') {
      const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=gu-t-i0-und&num=1`);
      const data = await res.json();
      if (data[0] === 'SUCCESS' && data[1]?.[0]?.[1]) {
        return data[1][0][1][0] || text;
      }
    }
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0][0][0] || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

const ERROR_MESSAGES_MAP: Record<string, [string, string]> = {
  'RECORD_EXISTS': ['આ રેકોર્ડ પહેલાથી જ અસ્તિત્વમાં છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This record already exists. Please choose a different name.'],
  'DATABASE_ERROR': ['સિસ્ટમમાં ભૂલ આવી છે. કૃપા કરીને ફરી પ્રયાસ કરો.', 'A database operation failed. Please try again.'],
  'SLUG_EXISTS_IN_CITIES': ['આ નામ પહેલેથી જ શહેરોમાં વપરાયેલ છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This name is already used in Cities. Please choose a different name.'],
  'SLUG_EXISTS_IN_CATEGORIES': ['આ નામ પહેલેથી જ વિભાગોમાં વપરાયેલ છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This name is already used in Categories. Please choose a different name.'],
  'NAME_EXISTS_IN_CITIES': ['ડુપ્લિકેશન માન્ય નથી — આ નામ પહેલેથી જ શહેરોમાં વપરાયેલ છે.', 'Duplication not allowed — this name is already used in Cities.'],
  'NAME_EXISTS_IN_CATEGORIES': ['ડુપ્લિકેશન માન્ય નથી — આ નામ પહેલેથી જ વિભાગોમાં વપરાયેલ છે.', 'Duplication not allowed — this name is already used in Categories.']
};

export function getErrorMessage(err: unknown, t: (gu: string, en: string) => string): string {
  let msg = '';
  if (err instanceof Error) {
    msg = err.message;
  } else if (typeof err === 'string') {
    msg = err;
  } else {
    return t('અજાણી ભૂલ આવી છે.', 'An unknown error occurred.');
  }

  if (ERROR_MESSAGES_MAP[msg]) {
    return t(ERROR_MESSAGES_MAP[msg][0], ERROR_MESSAGES_MAP[msg][1]);
  }
  
  if (msg.includes('headline, description, content, slug and category_id are required')) {
    return t('શીર્ષક, વર્ણન, સામગ્રી, સ્લગ અને વિભાગ જરૂરી છે.', 'Headline, description, content, slug and category are required.');
  }
  
  return msg;
}
