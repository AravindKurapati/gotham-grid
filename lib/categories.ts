import type { Category } from './types';

export const CATEGORIES: Record<Category, { label: string; color: string; tag: string }> = {
  TRANSIT:  { label: 'TRANSIT',  color: '#ffaa33', tag: '[>]' },
  FOOD:     { label: 'FOOD',     color: '#ff6666', tag: '[#]' },
  SUNSET:   { label: 'SUNSET',   color: '#ff66cc', tag: '[*]' },
  MAPS:     { label: 'MAPS',     color: '#66ccff', tag: '[+]' },
  UTILITY:  { label: 'UTILITY',  color: '#33ff33', tag: '[-]' },
  AI:       { label: 'AI/ML',    color: '#cc99ff', tag: '[^]' },
  ART:      { label: 'ART',      color: '#ffcc66', tag: '[~]' },
  OTHER:    { label: 'OTHER',    color: '#888888', tag: '[?]' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
