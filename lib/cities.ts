import type { CityKey, CityConfig } from './types';

export const CITIES: Record<CityKey, CityConfig> = {
  nyc: {
    key: 'nyc', name: 'New York', displayName: 'NEW YORK CITY', gridName: 'NYC', timezone: 'America/New_York',
    searchTerms: ['NYC', 'New York', 'Manhattan', 'Brooklyn', 'MTA', 'subway', 'bodega', 'Central Park', 'NYC taxi', 'NYC data visualization', 'NYC open data', 'NYC creative coding', 'I built NYC app', 'New York side project'],
  },
  london: {
    key: 'london', name: 'London', displayName: 'LONDON', gridName: 'LDN', timezone: 'Europe/London',
    searchTerms: ['London', 'London UK', 'TfL', 'London tube', 'oyster card', 'London pubs', 'London rain', 'London data visualization', 'London interactive map', 'London open data', 'London creative coding', 'I built London app'],
  },
  sf: {
    key: 'sf', name: 'San Francisco', displayName: 'SAN FRANCISCO', gridName: 'SFO', timezone: 'America/Los_Angeles',
    searchTerms: ['San Francisco', 'SF', 'Bay Area', 'BART', 'SF fog', 'tech layoffs', 'sourdough SF', 'SF open data', 'SF data visualization', 'SF creative coding', 'Bay Area side project', 'I built SF app'],
  },
  los_angeles: {
    key: 'los_angeles', name: 'Los Angeles', displayName: 'LOS ANGELES', gridName: 'LAX', timezone: 'America/Los_Angeles',
    searchTerms: ['Los Angeles', 'LA', 'Hollywood tech', 'LA traffic', 'LA hiking trails', 'LA earthquakes', 'LA taco', 'LA open data', 'LA data visualization', 'LA creative coding', 'Los Angeles side project', 'I built LA app'],
  },
};

export const CITY_KEYS = Object.keys(CITIES) as CityKey[];

export const PRIMARY_CITIES: CityKey[] = ['nyc', 'london', 'sf', 'los_angeles'];
