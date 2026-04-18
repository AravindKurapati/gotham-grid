import * as dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CITIES, CITY_KEYS } from '../lib/cities';
import { runAgentLoop } from '../lib/agent-loop';
import type { CityKey } from '../lib/types';

dotenv.config({ path: '.env.local' });

if (!process.env.GROQ_API_KEY) {
  console.error('[ERR] GROQ_API_KEY not set. Add it to .env.local');
  process.exit(1);
}
if (!process.env.TAVILY_API_KEY) {
  console.error('[ERR] TAVILY_API_KEY not set. Add it to .env.local');
  process.exit(1);
}

function pad(s: string, len: number): string {
  return s.padEnd(len, '.');
}

async function main() {
  const argCities = process.argv.slice(2).filter(a => a in CITIES) as CityKey[];
  const citiesToScan: CityKey[] = argCities.length > 0 ? argCities : CITY_KEYS;

  console.log('\n[GOTHAM GRID SCANNER] -- Tavily + Groq llama-3.3-70b-versatile');
  console.log('='.repeat(50));
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });

  let total = 0;
  for (const cityKey of citiesToScan) {
    const city = CITIES[cityKey];
    process.stdout.write(`> SCANNING ${pad(city.displayName, 22)} `);
    try {
      const { projects, loops, finalQuality } = await runAgentLoop(city);
      const outPath = join(process.cwd(), 'data', `${cityKey}.json`);
      writeFileSync(outPath, JSON.stringify(projects, null, 2), 'utf-8');
      total += projects.length;
      console.log(
        `${projects.length} projects (${loops} loop${loops > 1 ? 's' : ''}, ${Math.round(finalQuality * 100)}% quality)`,
      );
    } catch (err) {
      console.log(`ERR: ${err instanceof Error ? err.message : String(err)}`);
      const outPath = join(process.cwd(), 'data', `${cityKey}.json`);
      writeFileSync(outPath, '[]', 'utf-8');
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('='.repeat(50));
  console.log(`[DONE] ${total} total projects across ${citiesToScan.length} cities`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
