import { describe, it, expect } from 'vitest';
import { articleSchema, paginationSchema } from '../src/lib/validation';

describe('Zod Validation - articleSchema', () => {
  it('accepts valid article payload', () => {
    const validData = {
      headline: 'Test Headline',
      description: 'Test Desc',
      content: '<p>Test Content</p>',
      category_id: 1,
      slug: 'test-headline',
      status: 'draft',
      image_url: 'http://example.com/image.jpg',
    };
    const result = articleSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_trending).toBe(false); // default applied
    }
  });

  it('rejects invalid payload (missing required fields)', () => {
    const invalidData = {
      headline: 'Test Headline',
    };
    const result = articleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects invalid enum status', () => {
    const invalidData = {
      headline: 'Test Headline',
      description: 'Test Desc',
      content: '<p>Test Content</p>',
      category_id: 1,
      slug: 'test-headline',
      status: 'unknown_status', // Invalid enum
    };
    const result = articleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Zod Validation - paginationSchema', () => {
  it('parses valid strings to numbers', () => {
    const result = paginationSchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects limits over 100', () => {
    const result = paginationSchema.safeParse({ page: '1', limit: '101' });
    expect(result.success).toBe(false);
  });
});
