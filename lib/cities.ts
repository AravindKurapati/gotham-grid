import type { CityKey, CityConfig } from './types';

export const CITIES: Record<CityKey, CityConfig> = {
  nyc: { key: 'nyc', name: 'New York', displayName: 'NEW YORK CITY', gridName: 'NYC', searchTerms: ['NYC', 'New York', 'Manhattan', 'Brooklyn'], timezone: 'America/New_York' },
  london: { key: 'london', name: 'London', displayName: 'LONDON', gridName: 'LDN', searchTerms: ['London', 'London UK'], timezone: 'Europe/London' },
  tokyo: { key: 'tokyo', name: 'Tokyo', displayName: 'TOKYO', gridName: 'TKY', searchTerms: ['Tokyo'], timezone: 'Asia/Tokyo' },
  berlin: { key: 'berlin', name: 'Berlin', displayName: 'BERLIN', gridName: 'BER', searchTerms: ['Berlin', 'Berlin Germany'], timezone: 'Europe/Berlin' },
  paris: { key: 'paris', name: 'Paris', displayName: 'PARIS', gridName: 'PAR', searchTerms: ['Paris', 'Paris France'], timezone: 'Europe/Paris' },
  sf: { key: 'sf', name: 'San Francisco', displayName: 'SAN FRANCISCO', gridName: 'SFO', searchTerms: ['San Francisco', 'SF', 'Bay Area'], timezone: 'America/Los_Angeles' },
  seoul: { key: 'seoul', name: 'Seoul', displayName: 'SEOUL', gridName: 'SEL', searchTerms: ['Seoul'], timezone: 'Asia/Seoul' },
  mumbai: { key: 'mumbai', name: 'Mumbai', displayName: 'MUMBAI', gridName: 'BOM', searchTerms: ['Mumbai', 'Bombay'], timezone: 'Asia/Kolkata' },
  lagos: { key: 'lagos', name: 'Lagos', displayName: 'LAGOS', gridName: 'LOS', searchTerms: ['Lagos', 'Lagos Nigeria'], timezone: 'Africa/Lagos' },
  sao_paulo: { key: 'sao_paulo', name: 'Sao Paulo', displayName: 'SAO PAULO', gridName: 'GRU', searchTerms: ['Sao Paulo', 'Brazil tech'], timezone: 'America/Sao_Paulo' },
  hyderabad: { key: 'hyderabad', name: 'Hyderabad', displayName: 'HYDERABAD', gridName: 'HYD', searchTerms: ['Hyderabad', 'Hyderabad tech'], timezone: 'Asia/Kolkata' },
  bangalore: { key: 'bangalore', name: 'Bangalore', displayName: 'BANGALORE', gridName: 'BLR', searchTerms: ['Bangalore', 'Bengaluru', 'Bangalore tech'], timezone: 'Asia/Kolkata' },
  delhi: { key: 'delhi', name: 'Delhi', displayName: 'DELHI', gridName: 'DEL', searchTerms: ['Delhi', 'New Delhi', 'Delhi tech'], timezone: 'Asia/Kolkata' },
  chennai: { key: 'chennai', name: 'Chennai', displayName: 'CHENNAI', gridName: 'MAA', searchTerms: ['Chennai', 'Madras', 'Chennai tech'], timezone: 'Asia/Kolkata' },
  dubai: { key: 'dubai', name: 'Dubai', displayName: 'DUBAI', gridName: 'DXB', searchTerms: ['Dubai', 'Dubai tech'], timezone: 'Asia/Dubai' },
  singapore: { key: 'singapore', name: 'Singapore', displayName: 'SINGAPORE', gridName: 'SIN', searchTerms: ['Singapore', 'Singapore tech'], timezone: 'Asia/Singapore' },
  sydney: { key: 'sydney', name: 'Sydney', displayName: 'SYDNEY', gridName: 'SYD', searchTerms: ['Sydney', 'Sydney Australia', 'Sydney tech'], timezone: 'Australia/Sydney' },
  toronto: { key: 'toronto', name: 'Toronto', displayName: 'TORONTO', gridName: 'YYZ', searchTerms: ['Toronto', 'Toronto tech'], timezone: 'America/Toronto' },
  amsterdam: { key: 'amsterdam', name: 'Amsterdam', displayName: 'AMSTERDAM', gridName: 'AMS', searchTerms: ['Amsterdam', 'Netherlands tech'], timezone: 'Europe/Amsterdam' },
  stockholm: { key: 'stockholm', name: 'Stockholm', displayName: 'STOCKHOLM', gridName: 'ARN', searchTerms: ['Stockholm', 'Sweden tech'], timezone: 'Europe/Stockholm' },
  tel_aviv: { key: 'tel_aviv', name: 'Tel Aviv', displayName: 'TEL AVIV', gridName: 'TLV', searchTerms: ['Tel Aviv', 'Israel tech'], timezone: 'Asia/Jerusalem' },
  budapest: { key: 'budapest', name: 'Budapest', displayName: 'BUDAPEST', gridName: 'BUD', searchTerms: ['Budapest', 'Hungary tech'], timezone: 'Europe/Budapest' },
  brussels: { key: 'brussels', name: 'Brussels', displayName: 'BRUSSELS', gridName: 'BRU', searchTerms: ['Brussels', 'Belgium tech'], timezone: 'Europe/Brussels' },
  athens: { key: 'athens', name: 'Athens', displayName: 'ATHENS', gridName: 'ATH', searchTerms: ['Athens', 'Greece tech'], timezone: 'Europe/Athens' },
  los_angeles: { key: 'los_angeles', name: 'Los Angeles', displayName: 'LOS ANGELES', gridName: 'LAX', searchTerms: ['Los Angeles', 'LA tech', 'Hollywood tech'], timezone: 'America/Los_Angeles' },
};

export const CITY_KEYS = Object.keys(CITIES) as CityKey[];

/** First 8 shown in tab bar; rest go in overflow menu */
export const PRIMARY_CITIES: CityKey[] = [
  'nyc', 'london', 'tokyo', 'sf', 'berlin', 'singapore', 'dubai', 'toronto',
];
