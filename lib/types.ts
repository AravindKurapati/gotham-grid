export type Category = 'TRANSIT' | 'FOOD' | 'SUNSET' | 'MAPS' | 'UTILITY' | 'AI' | 'ART' | 'OTHER';
export type Source = 'twitter' | 'github' | 'reddit' | 'hackernews' | 'blog' | 'producthunt' | 'other';

export type CityKey =
  | 'nyc' | 'london' | 'tokyo' | 'berlin' | 'paris'
  | 'sf' | 'seoul' | 'mumbai' | 'lagos' | 'sao_paulo'
  | 'hyderabad' | 'bangalore' | 'delhi' | 'chennai'
  | 'dubai' | 'singapore' | 'sydney' | 'toronto'
  | 'amsterdam' | 'stockholm' | 'tel_aviv' | 'budapest'
  | 'brussels' | 'athens' | 'los_angeles';

export interface DeepScanData {
  githubStars?: number;
  techStack?: string[];
  lastUpdated?: string;
  summary?: string;
  vibeScore?: number;
}

export interface Project {
  id: string;
  title: string;
  author: string;
  description: string;
  category: Category;
  url: string;
  sourceUrl?: string;
  source: Source;
  date: string;
  likes?: number;
  city: CityKey;
  deepScan?: DeepScanData;
}

export interface CityConfig {
  key: CityKey;
  name: string;
  displayName: string;
  gridName: string;
  searchTerms: string[];
  timezone: string;
}

export interface DiscoverRequest {
  city: CityKey;
  category?: Category;
  query?: string;
  scanCode?: string;
}

export interface DiscoverResponse {
  projects: Project[];
  meta: {
    city: string;
    total: number;
    cached: boolean;
    source: 'static' | 'live';
    timestamp: string;
  };
}
