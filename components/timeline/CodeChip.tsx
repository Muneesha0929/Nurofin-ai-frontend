'use client';

// The universal code (e.g. PROD-1.2.3) as a small mono chip. Click copies it.
import React, { useState } from 'react';
import { cn } from '@/utils/cn';

export function CodeChip({ code, className, title, size = 'sm' }: { code?: string | null; className?: string; title?: string; size?: 'xs' | 'sm' }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }).catch(() => {});
      }}
      title={title || `${code} — click to copy. Type it in the quick bar to open it.`}
      className={cn(
        'normal-case inline-flex items-center shrink-0 rounded-md border font-mono font-semibold tracking-tight whitespace-nowrap transition-colors',
        size === 'xs' ? 'text-[10px] px-1.5 py-[1px]' : 'text-[11px] px-1.5 py-0.5',
        copied
          ? 'border-accent-green/40 bg-accent-green/10 text-accent-green'
          : 'border-border-subtle bg-[var(--bg-primary)] text-text-secondary hover:text-accent-blue hover:border-accent-blue/40',
        className,
      )}
    >
      {copied ? 'Copied' : code}
    </button>
  );
}
