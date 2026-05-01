'use client';
import { useTheme } from '@/lib/theme-context';
import type { Project } from '@/lib/types';

interface Props { project: Project; }

export default function ProjectCardExpanded({ project }: Props) {
  const { theme } = useTheme();
  const isFlap = theme === 'flap';

  const textCls = isFlap ? 'text-flap-yellow' : 'text-crt-green';
  const dimCls = isFlap ? 'text-flap-yellow/60' : 'text-crt-green/60';
  const linkCls = isFlap ? 'text-crt-amber hover:text-flap-yellow' : 'text-crt-cyan hover:text-crt-green';

  return (
    <div className={`font-mono text-xs mt-2 ${textCls}`}>
      <p className={`${dimCls} mb-2`}>{project.description}</p>
      <div className="flex flex-wrap gap-3 mb-2">
        <span className={dimCls}>DATE: {project.date}</span>
        {project.likes !== undefined && project.likes > 0 && (
          <span className={dimCls}>LIKES: {project.likes}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={project.sourceUrl ?? project.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkCls} underline transition-colors`}
          onClick={e => e.stopPropagation()}
        >
          [{project.source === 'hackernews' ? 'HN' : project.source.toUpperCase()}]
        </a>
        {project.sourceUrl && project.sourceUrl !== project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkCls} underline transition-colors`}
            onClick={e => e.stopPropagation()}
          >
            [VIEW PROJECT]
          </a>
        )}
      </div>
    </div>
  );
}
