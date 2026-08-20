export type Category = {
  id: number;
  name_en: string;
  name_gu: string;
  slug: string;
  sort_order: number;
  description: string | null;
};

export type City = {
  id: number;
  name_en: string;
  name_gu: string;
  slug: string;
  sort_order: number;
};

export type SiteSetting = {
  key: string;
  value: string;
  updated_at?: string;
};

export type EPaper = {
  id: number;
  published_date: string;
  title: string;
  pdf_url: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Article = {
  id: number;
  headline: string;
  description: string;
  content: string;
  image_url: string | null;
  extra_images: string[];

  category_id: number;
  city_id: number | null;
  published_at: string | null;
  tags: string | null;
  source: string | null;
  seo_title: string | null;
  seo_description: string | null;
  slug: string;
  video_url: string | null;
  status: string;
  is_trending: boolean;
  author: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  city?: City | null;
};

export type StaticPage = {
  id: number;
  slug: string;
  title_gu: string;
  title_en: string;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
};

export type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  slot: string;
  frame: string;
  is_active: boolean;
  created_at: string;
};
