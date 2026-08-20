import { describe, it, expect } from 'vitest';
import { AD_SLOTS, AD_FRAMES, AD_FRAME_KEYS, getAdFrame } from '../src/lib/ads';

describe('AD_SLOTS', () => {
  it('has 11 slots with unique keys', () => {
    const keys = AD_SLOTS.map((s) => s.key);
    expect(keys).toHaveLength(11);
    expect(new Set(keys).size).toBe(11);
  });

  it('includes the 5 new slots', () => {
    expect(AD_SLOTS.map((s) => s.key)).toEqual(
      expect.arrayContaining([
        'homepage_trending_sidebar',
        'homepage_between_categories',
        'homepage_after_city',
        'article_sidebar',
        'search_top',
      ])
    );
  });
});

describe('AD_FRAMES', () => {
  it('has 4 frames with unique keys', () => {
    const keys = AD_FRAMES.map((f) => f.key);
    expect(keys).toEqual(['banner', 'rectangle', 'skyscraper', 'small']);
    expect(AD_FRAME_KEYS).toEqual(keys);
  });

  it('getAdFrame returns the matching frame', () => {
    expect(getAdFrame('skyscraper').aspect).toBe('aspect-[1/2]');
  });

  it('getAdFrame falls back to banner for unknown keys', () => {
    expect(getAdFrame('bogus').key).toBe('banner');
  });
});