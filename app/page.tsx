import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Dashboard from '@/components/Dashboard';
import { CITY_KEYS } from '@/lib/cities';
import type { Project, CityKey } from '@/lib/types';

function loadCity(city: CityKey): Project[] {
  const filePath = join(process.cwd(), 'data', `${city}.json`);
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Project[];
  } catch {
    return [];
  }
}

export default function Page() {
  const initialData = Object.fromEntries(
    CITY_KEYS.map(key => [key, loadCity(key)])
  ) as Record<CityKey, Project[]>;

  return <Dashboard initialData={initialData} />;
}
