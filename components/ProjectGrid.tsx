'use client';
import { useTheme } from '@/lib/theme-context';
import type { Project } from '@/lib/types';
import ProjectCard from './ProjectCard';

interface Props { projects: Project[]; }

export default function ProjectGrid({ projects }: Props) {
  const { theme } = useTheme();
  const isFlap = theme === 'flap';

  if (projects.length === 0) {
    const emptyColor = isFlap ? 'text-flap-yellow/50' : 'text-crt-green/50';
    return (
      <div className={`py-12 text-center font-mono text-sm ${emptyColor}`}>
        <p>&gt; NO SIGNAL DETECTED</p>
        <p className="mt-1">&gt; TRY DIFFERENT SEARCH FREQUENCY</p>
      </div>
    );
  }

  if (isFlap) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono">
          <thead>
            <tr className="border-b-2 border-flap-border text-flap-yellow/40 text-xs uppercase">
              <th className="py-2 px-3 text-left font-normal">CATEGORY</th>
              <th className="py-2 px-3 text-left font-normal">PROJECT</th>
              <th className="py-2 px-3 text-left font-normal hidden sm:table-cell">AUTHOR</th>
              <th className="py-2 px-3 text-left font-normal hidden md:table-cell">LIKES</th>
              <th className="py-2 px-3 text-left font-normal hidden lg:table-cell">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
