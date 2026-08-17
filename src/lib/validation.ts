import 'server-only';
import { z } from 'zod';

export const articleSchema = z.object({
  id: z.number().optional(),
  headline: z.string().min(1).max(500),
  description: z.string().optional().default(''),
  content: z.string().min(1),
  image_url: z.string().min(1, 'કવર ફોટો જરૂરી છે (Cover photo is required)'),
  extra_images: z.array(z.string()).default([]),

  category_id: z.number(),
  city_id: z.number().nullable().optional(),
  published_at: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  slug: z.string().min(1).max(500),
  video_url: z.string().nullable().optional(),

  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_trending: z.boolean().default(false),
  view_count: z.number().default(0),
  author: z.string().nullable().optional(),
});

export const categorySchema = z.object({
  id: z.number().optional(),
  name_en: z.string().min(1).max(255),
  name_gu: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  sort_order: z.number().default(0),
  description: z.string().nullable().optional(),
});

export const citySchema = z.object({
  id: z.number().optional(),
  name_en: z.string().min(1).max(255),
  name_gu: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  sort_order: z.number().default(0),
});

export const ePaperSchema = z.object({
  id: z.number().optional(),
  published_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(255),
  pdf_url: z.string().min(1),
  thumbnail_url: z.string().nullable().optional(),
  view_count: z.number().default(0),
});

export const staticPageSchema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1).max(255),
  title_gu: z.string().min(1).max(255),
  title_en: z.string().min(1).max(255),
  content: z.string().min(1),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
