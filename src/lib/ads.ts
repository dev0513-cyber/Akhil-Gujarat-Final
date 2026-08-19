export const AD_SLOTS = [
  { key: 'homepage_after_hero', labelGu: 'હોમપેજ — હીરો પછી', labelEn: 'Homepage — after hero' },
  { key: 'homepage_between', labelGu: 'હોમપેજ — સેક્શન વચ્ચે', labelEn: 'Homepage — between sections' },
  { key: 'article_top', labelGu: 'આર્ટિકલ — ઉપર', labelEn: 'Article — top' },
  { key: 'article_middle', labelGu: 'આર્ટિકલ — વચ્ચે', labelEn: 'Article — middle' },
  { key: 'article_bottom', labelGu: 'આર્ટિકલ — નીચે', labelEn: 'Article — bottom' },
  { key: 'category_top', labelGu: 'વિભાગ — ઉપર', labelEn: 'Category — top' },
] as const;

export type AdSlotKey = (typeof AD_SLOTS)[number]['key'];

export const AD_SLOT_KEYS: readonly [string, ...string[]] = AD_SLOTS.map((s) => s.key) as unknown as readonly [string, ...string[]];
