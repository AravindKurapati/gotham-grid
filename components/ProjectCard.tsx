'use client';
import { useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import { CATEGORIES } from '@/lib/categories';
import type { Project } from '@/lib/types';
import ProjectCardExpanded from './ProjectCardExpanded';

interface Props { project: Project; scanCode?: string; }

export default function ProjectCard({ project, scanCode }: Props) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES[project.category];

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
          <td className="py-2 px-3 text-crt-pink font-mono text-xs whitespace-nowrap hidden md:table-cell">
            {project.likes ?? '--'}
          </td>
          <td className="py-2 px-3 hidden lg:table-cell">
            <span className="text-crt-green text-xs font-mono">[*] LIVE</span>
          </td>
        </tr>
        {expanded && (
          <tr className="bg-flap-tile">
            <td colSpan={5} className="px-4 py-3">
              <ProjectCardExpanded project={project} scanCode={scanCode} />
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
        <div className="mt-2 flex items-center justify-between">
          {project.likes !== undefined && (
            <span className="text-crt-pink text-xs font-mono">{project.likes} likes</span>
          )}
          <span className="text-crt-cyan text-xs font-mono">[VIEW -&gt;]</span>
        </div>
      )}
      {expanded && <ProjectCardExpanded project={project} scanCode={scanCode} />}
    </div>
  );
}
