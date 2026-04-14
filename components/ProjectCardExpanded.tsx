'use client';
import { useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import type { Project, DeepScanData } from '@/lib/types';

interface Props { project: Project; scanCode?: string; }

export default function ProjectCardExpanded({ project, scanCode }: Props) {
  const { theme } = useTheme();
  const [deepData, setDeepData] = useState<DeepScanData | null>(project.deepScan ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const isFlap = theme === 'flap';

  const textCls = isFlap ? 'text-flap-yellow' : 'text-crt-green';
  const dimCls = isFlap ? 'text-flap-yellow/60' : 'text-crt-green/60';
  const linkCls = isFlap ? 'text-crt-amber hover:text-flap-yellow' : 'text-crt-cyan hover:text-crt-green';
  const btnCls = isFlap
    ? 'border-crt-amber text-crt-amber hover:bg-crt-amber/10'
    : 'border-crt-cyan text-crt-cyan hover:bg-crt-cyan/10';

  const handleDeepScan = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/deep-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: project.url, title: project.title, scanCode }),
      });
      if (!res.ok) { setErr(await res.text()); return; }
      setDeepData(await res.json());
    } catch {
      setErr('DEEP SCAN FAILED');
    } finally {
      setLoading(false);
    }
  };

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

      {deepData ? (
        <div className="mt-3 border-t border-current/20 pt-2">
          {deepData.vibeScore !== undefined && (
            <div className="mb-1">
              VIBE: [{`#`.repeat(deepData.vibeScore)}{`.`.repeat(10 - deepData.vibeScore)}] {deepData.vibeScore}/10
            </div>
          )}
          {deepData.techStack && deepData.techStack.length > 0 && (
            <div className="mb-1">STACK: {deepData.techStack.map(t => `[${t}]`).join(' ')}</div>
          )}
          {deepData.githubStars !== undefined && (
            <div className="mb-1">STARS: {deepData.githubStars} *</div>
          )}
          {deepData.summary && (
            <p className={`${dimCls} mt-1`}>{deepData.summary}</p>
          )}
        </div>
      ) : (
        <div className="mt-2">
          {err && <p className="text-crt-red mb-1">[ERR] {err}</p>}
          <button
            onClick={e => { e.stopPropagation(); handleDeepScan(); }}
            disabled={loading}
            className={`border px-2 py-1 text-xs cursor-pointer transition-colors ${btnCls} ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? '[...SCANNING]' : '[+] DEEP SCAN'}
          </button>
        </div>
      )}
    </div>
  );
}
