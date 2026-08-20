export const AD_SLOTS = [
  { key: 'homepage_after_hero', labelGu: 'હોમપેજ — હીરો પછી', labelEn: 'Homepage — after hero' },
  { key: 'homepage_between', labelGu: 'હોમપેજ — સેક્શન વચ્ચે', labelEn: 'Homepage — between sections' },
  { key: 'article_top', labelGu: 'આર્ટિકલ — ઉપર', labelEn: 'Article — top' },
  { key: 'article_middle', labelGu: 'આર્ટિકલ — વચ્ચે', labelEn: 'Article — middle' },
  { key: 'article_bottom', labelGu: 'આર્ટિકલ — નીચે', labelEn: 'Article — bottom' },
  { key: 'category_top', labelGu: 'વિભાગ — ઉપર', labelEn: 'Category — top' },
  { key: 'homepage_trending_sidebar', labelGu: 'હોમપેજ — ટ્રેન્ડિંગ સાઇડબાર', labelEn: 'Homepage — trending sidebar' },
  { key: 'homepage_between_categories', labelGu: 'હોમપેજ — વિભાગો વચ્ચે', labelEn: 'Homepage — between categories' },
  { key: 'homepage_after_city', labelGu: 'હોમપેજ — શહેરી સમાચાર પછી', labelEn: 'Homepage — after city news' },
  { key: 'article_sidebar', labelGu: 'આર્ટિકલ — સાઇડબાર', labelEn: 'Article — sidebar' },
  { key: 'search_top', labelGu: 'શોધ — ઉપર', labelEn: 'Search — top' },
] as const;

export type AdSlotKey = (typeof AD_SLOTS)[number]['key'];

export const AD_SLOT_KEYS: readonly [string, ...string[]] = AD_SLOTS.map((s) => s.key) as unknown as readonly [string, ...string[]];

export const AD_FRAMES = [
  { key: 'banner',     labelGu: 'બેનર',    labelEn: 'Banner',     aspect: 'aspect-[4/1]',  maxWidth: '' },
  { key: 'rectangle',  labelGu: 'લંબચોરસ', labelEn: 'Rectangle',  aspect: 'aspect-[6/5]',  maxWidth: 'max-w-[300px]' },
  { key: 'skyscraper', labelGu: 'ઊભી',     labelEn: 'Skyscraper',  aspect: 'aspect-[1/2]',  maxWidth: 'max-w-[300px]' },
  { key: 'small',      labelGu: 'નાની',    labelEn: 'Small',       aspect: 'aspect-[16/9]', maxWidth: 'max-w-[160px]' },
] as const;

export type AdFrameKey = (typeof AD_FRAMES)[number]['key'];

export const AD_FRAME_KEYS: readonly [string, ...string[]] = AD_FRAMES.map((f) => f.key) as unknown as readonly [string, ...string[]];

export function getAdFrame(key: string): (typeof AD_FRAMES)[number] {
  return AD_FRAMES.find((f) => f.key === key) ?? AD_FRAMES[0];
}
