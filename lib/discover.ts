import { runAgentLoop } from './agent-loop';
import type { Project, CityConfig, Category } from './types';

export async function discoverProjects(
  city: CityConfig,
  options: { category?: Category; query?: string } = {},
): Promise<Project[]> {
  const result = await runAgentLoop(city, options);
  return result.projects;
}
