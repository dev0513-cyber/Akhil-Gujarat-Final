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
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 180));
  return `${mins} મિનિટ વાંચન`;
}

export async function translateText(text: string, fromLang: 'en' | 'gu', toLang: 'en' | 'gu'): Promise<string> {
  if (!text) return '';
  try {
    if (fromLang === 'en' && toLang === 'gu') {
      const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=gu-t-i0-und&num=1`);
      const data = await res.json();
      if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
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

export function getErrorMessage(err: unknown, t: (gu: string, en: string) => string): string {
  if (err instanceof Error) {
    if (err.message === 'RECORD_EXISTS') {
      return t('આ રેકોર્ડ પહેલાથી જ અસ્તિત્વમાં છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This record already exists. Please choose a different name.');
    }
    if (err.message === 'DATABASE_ERROR') {
      return t('સિસ્ટમમાં ભૂલ આવી છે. કૃપા કરીને ફરી પ્રયાસ કરો.', 'A database operation failed. Please try again.');
    }
    if (err.message.includes('headline, description, content, slug and category_id are required')) {
      return t('શીર્ષક, વર્ણન, સામગ્રી, સ્લગ અને વિભાગ જરૂરી છે.', 'Headline, description, content, slug and category are required.');
    }
    if (err.message === 'SLUG_EXISTS_IN_CITIES') {
      return t('આ નામ પહેલેથી જ શહેરોમાં વપરાયેલ છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This name is already used in Cities. Please choose a different name.');
    }
    if (err.message === 'SLUG_EXISTS_IN_CATEGORIES') {
      return t('આ નામ પહેલેથી જ વિભાગોમાં વપરાયેલ છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This name is already used in Categories. Please choose a different name.');
    }
    return err.message;
  }
  
  if (typeof err === 'string') {
    if (err.includes('headline, description, content, slug and category_id are required')) {
      return t('શીર્ષક, વર્ણન, સામગ્રી, સ્લગ અને વિભાગ જરૂરી છે.', 'Headline, description, content, slug and category are required.');
    }
    if (err.includes('SLUG_EXISTS_IN_CITIES')) {
      return t('આ નામ પહેલેથી જ શહેરોમાં વપરાયેલ છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This name is already used in Cities. Please choose a different name.');
    }
    if (err.includes('SLUG_EXISTS_IN_CATEGORIES')) {
      return t('આ નામ પહેલેથી જ વિભાગોમાં વપરાયેલ છે. કૃપા કરીને અલગ નામ પસંદ કરો.', 'This name is already used in Categories. Please choose a different name.');
    }
  }
  
  return typeof err === 'string' ? err : t('અજાણી ભૂલ આવી છે.', 'An unknown error occurred.');
}
