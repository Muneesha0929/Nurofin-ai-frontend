'use client';

// One quiet line on the CEO's Overview: the Runway headline, cash in the bank, and whether
// anything needs updating. Everything else stays on the Runway page, so the dashboard stays calm.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { runwayService, Glance } from '@/services/runway';
import { L, TONE_COLOR, story } from './story';

export function RunwayCard() {
  const [g, setG] = useState<Glance | null>(null);
  useEffect(() => { runwayService.glance().then(setG).catch(() => setG(null)); }, []);
  if (!g) return null;
  const st = story(g);
  const updates = g.todo.length;
  return (
    <Link href="/runway" className="group flex flex-wrap sm:flex-nowrap items-center gap-x-5 gap-y-2 bg-background-secondary border border-border-subtle rounded-xl px-4 py-3.5 hover:border-border-active transition-colors normal-case">
      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-text-secondary shrink-0">
        <span className="w-2 h-2 rounded-full" style={{ background: TONE_COLOR[st.tone] }} />Runway
      </span>
      <span className="text-[15px] font-semibold text-text-primary min-w-0 flex-1">{st.short}</span>
      {st.tone !== 'setup' && <span className="text-[13px] text-text-secondary shrink-0 tabular-nums">{L(g.cash_now)} in the bank</span>}
      {st.tone !== 'setup' && updates > 0 && <span className="text-[12.5px] font-medium px-2.5 py-0.5 rounded-full bg-[#FFF6E5] text-[#9A6200] shrink-0">{updates} to update</span>}
      <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform shrink-0" />
    </Link>
  );
}
