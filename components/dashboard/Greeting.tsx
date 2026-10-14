'use client';

import React, { useEffect, useState } from 'react';

type Period = { from: number; to: number; hello: string; lines: string[] };

// Four lines per part of the day. The line changes every two days so it doesn't feel repetitive.
const PERIODS: Period[] = [
  { from: 0, to: 5, hello: 'Up late', lines: [
    'Still up? Park the idea in Quick notes and get some sleep.',
    'Quiet hours are good for thinking. Rest is better for tomorrow.',
    'Rested teams hit targets. Late nights rarely do.',
    'Write it down. It will be here in the morning.',
  ] },
  { from: 5, to: 12, hello: 'Good morning', lines: [
    'What is the one thing that moves this quarter forward today?',
    'Start with the hardest task while the day is still quiet.',
    'Small wins before lunch add up by Friday.',
    'Check today’s deadlines, then go make progress.',
  ] },
  { from: 12, to: 17, hello: 'Good afternoon', lines: [
    'Halfway through the day. Is the most important task done yet?',
    'Good time to post an update on what moved.',
    'Clear one blocker before the day ends.',
    'Keep going. Steady beats busy.',
  ] },
  { from: 17, to: 21, hello: 'Good evening', lines: [
    'Wrap up: mark what is done and note what comes next.',
    'Before you log off, update your progress for the team.',
    'Good work today. Leave tomorrow a clear first step.',
    'What moved closer to the target today?',
  ] },
  { from: 21, to: 24, hello: 'Working late', lines: [
    'Note tomorrow’s first task, then call it a day.',
    'Tomorrow’s deadlines are on the calendar. Rest well.',
    'One last update, then switch off.',
    'Done is better than perfect. Pick it up fresh tomorrow.',
  ] },
];

export function pickGreeting(now: Date) {
  const h = now.getHours();
  const p = PERIODS.find(x => h >= x.from && h < x.to) || PERIODS[1];
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  return { hello: p.hello, line: p.lines[Math.floor(day / 2) % p.lines.length] };
}

export function Greeting({ name }: { name?: string }) {
  // Computed after mount: the page is pre-rendered at build time, when the hour is unknown.
  const [g, setG] = useState<{ hello: string; line: string; date: string } | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setG({ ...pickGreeting(now), date: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) });
    };
    tick();
    const t = setInterval(tick, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-wrap items-end justify-between gap-2 normal-case min-h-[52px]">
      <div>
        <div className="text-2xl font-extrabold text-text-primary">{g ? `${g.hello}, ${name?.split(' ')[0] || 'there'}` : ' '}</div>
        <div className="text-[13.5px] text-text-muted mt-1">{g?.line}</div>
      </div>
      <div className="text-[12.5px] text-text-muted">{g?.date}</div>
    </div>
  );
}
