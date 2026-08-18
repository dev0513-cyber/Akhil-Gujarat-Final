import { describe, it, expect } from 'vitest';
import { getISTDayRange } from '../src/lib/format';

describe('getISTDayRange', () => {
  it('returns IST midnight boundaries for a fixed date', () => {
    const range = getISTDayRange('2026-08-18');
    expect(range.day).toBe('2026-08-18');
    // 00:00:00+05:30 on Aug 18 == 18:30:00Z on Aug 17
    expect(range.from).toBe('2026-08-17T18:30:00.000Z');
    // 00:00:00+05:30 on Aug 19 == 18:30:00Z on Aug 18
    expect(range.to).toBe('2026-08-18T18:30:00.000Z');
  });

  it('defaults to today in IST when no day is given', () => {
    const range = getISTDayRange();
    expect(range.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // IST midnight always maps to 18:30:00.000Z of the previous UTC day
    expect(range.from.endsWith('T18:30:00.000Z')).toBe(true);
    expect(range.to.endsWith('T18:30:00.000Z')).toBe(true);
    // exactly 24 hours apart
    const diff = Date.parse(range.to) - Date.parse(range.from);
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it('handles the IST midnight edge where UTC date differs', () => {
    // 2026-08-18 00:00 IST is still 2026-08-17 in UTC
    const range = getISTDayRange('2026-08-18');
    expect(Date.parse(range.from)).toBe(Date.parse('2026-08-17T18:30:00.000Z'));
  });
});
