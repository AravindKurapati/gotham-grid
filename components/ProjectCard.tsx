'use client';
import { useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import { CATEGORIES } from '@/lib/categories';
import type { Project } from '@/lib/types';
import ProjectCardExpanded from './ProjectCardExpanded';

interface Props { project: Project; }

const SOURCE_LABELS: Record<string, string> = {
  twitter: 'TWITTER',
  github: 'GITHUB',
  reddit: 'REDDIT',
  hackernews: 'HN',
  blog: 'BLOG',
  producthunt: 'PH',
  other: 'WEB',
};

export default function ProjectCard({ project }: Props) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES[project.category];
  const sourceLabel = SOURCE_LABELS[project.source] ?? project.source.toUpperCase();
  const sourceLink = project.sourceUrl ?? project.url;
  const hasDistinctSource = project.sourceUrl && project.sourceUrl !== project.url;

  if (theme === 'flap') {
    return (
      <>
        <tr
          className="border-b border-flap-border cursor-pointer hover:bg-[#252525] transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          <td className="py-2 px-3 text-crt-amber font-mono text-xs whitespace-nowrap">
            {cat.tag} {project.category}
          </td>
          <td className="py-2 px-3 text-flap-yellow font-mono text-sm font-bold uppercase tracking-wide max-w-[200px] md:max-w-[320px] truncate">
            {project.title}
          </td>
          <td className="py-2 px-3 text-crt-gray font-mono text-xs whitespace-nowrap hidden sm:table-cell">
            {project.author}
          </td>
          <td className="py-2 px-3 font-mono text-xs whitespace-nowrap hidden md:table-cell">
            {project.likes !== undefined && project.likes > 0
              ? <span className="text-crt-pink">{project.likes}</span>
              : <span className="text-crt-gray">--</span>}
          </td>
          <td className="py-2 px-3 hidden lg:table-cell">
            <a
              href={sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-crt-cyan text-xs font-mono hover:text-flap-yellow transition-colors"
              onClick={e => e.stopPropagation()}
            >
              [{sourceLabel}]
            </a>
            {hasDistinctSource && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-crt-green text-xs font-mono hover:text-flap-yellow transition-colors ml-2"
                onClick={e => e.stopPropagation()}
              >
                [VIEW]
              </a>
            )}
          </td>
        </tr>
        {expanded && (
          <tr className="bg-flap-tile">
            <td colSpan={5} className="px-4 py-3">
              <ProjectCardExpanded project={project} />
            </td>
          </tr>
        )}
      </>
    );
  }

  // CRT mode
  return (
    <div
      className="border border-crt-green/30 bg-crt-bg p-4 cursor-pointer hover:border-crt-green hover:shadow-[0_0_8px_rgba(51,255,51,0.25)] transition-all"
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-crt-amber text-xs font-mono">{cat.tag} {project.category}</span>
        <span className="text-crt-gray text-xs font-mono">{project.date}</span>
      </div>
      <div className="text-crt-green font-bold font-mono text-sm mb-1 uppercase tracking-wide">
        {project.title}
      </div>
      <div className="text-crt-gray text-xs font-mono mb-2">{project.author}</div>
      {!expanded && (
        <div className="text-crt-green/70 text-xs font-mono line-clamp-2">{project.description}</div>
      )}
      {!expanded && (
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {project.likes !== undefined && project.likes > 0 && (
            <span className="text-crt-pink text-xs font-mono">{project.likes} likes</span>
          )}
          <a
            href={sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-crt-cyan text-xs font-mono hover:text-crt-green transition-colors"
            onClick={e => e.stopPropagation()}
          >
            [{sourceLabel}]
          </a>
          {hasDistinctSource && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-crt-green text-xs font-mono hover:text-crt-green/70 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              [VIEW -&gt;]
            </a>
          )}
        </div>
      )}
      {expanded && <ProjectCardExpanded project={project} />}
    </div>
  );
}
