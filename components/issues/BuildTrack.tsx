'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Smartphone, Monitor, MapPin, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { issueExternalService, IssueExternalDetail } from '@/services/issueExternal';

// This app capitalises text globally (globals.css), so everything here opts out with `normal-case`:
// emails, route paths, device names and the reporter's own words must show exactly as they were sent.

export function BuildTrackBadge({ className }: { className?: string }) {
  return (
    <span
      title="Raised by a user from the Build-Track app"
      className={cn(
        'normal-case inline-flex items-center px-1.5 py-0.5 rounded border border-accent-blue bg-accent-blue-light text-accent-blue text-[9px] font-bold tracking-wide whitespace-nowrap',
        className,
      )}
    >
      Build-Track
    </span>
  );
}

const IST = 'Asia/Kolkata';
function fmtIST(iso?: string | null, withDate = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const opts: Intl.DateTimeFormatOptions = withDate
    ? { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }
    : { timeZone: IST, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
  return `${d.toLocaleString('en-IN', opts)}${withDate ? ' IST' : ''}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">{label}</span>
      <span className="block mt-0.5 font-semibold break-words">{children || '—'}</span>
    </div>
  );
}

function deviceLine(d: IssueExternalDetail['device']): string {
  const platform = d.platform === 'ios' ? 'iOS' : d.platform === 'android' ? 'Android' : d.platform === 'web' ? 'Web' : d.platform || '';
  const parts = [
    d.model,
    [platform, d.osVersion].filter(Boolean).join(' '),
    d.viewport && `viewport ${d.viewport}`,
    d.appVersion && `app ${d.appVersion}${d.buildNumber ? ` (${d.buildNumber})` : ''}`,
  ].filter(Boolean) as string[];
  return parts.join(' · ');
}

export function BuildTrackDetails({ issueId, onEnlarge }: { issueId: number; onEnlarge: (url: string) => void }) {
  const [data, setData] = useState<IssueExternalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [shotError, setShotError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setData(null); setError(null); setShot(null); setShotError(false);
    issueExternalService.get(issueId)
      .then(async d => {
        if (cancelled) return;
        setData(d);
        if (d.has_screenshot) {
          try {
            const u = await issueExternalService.screenshotUrl(issueId);
            if (cancelled) { URL.revokeObjectURL(u); return; }
            objectUrl = u;
            setShot(u);
          } catch { if (!cancelled) setShotError(true); }
        }
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Could not load the report'); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [issueId]);

  if (error) {
    return <div className="normal-case text-2xs text-text-muted italic">Build-Track report details are not available: {error}</div>;
  }
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-2xs normal-case">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading the Build-Track report...
      </div>
    );
  }

  const r = data.reporter || {};
  const isWeb = data.device?.platform === 'web';
  const steps = data.breadcrumbs || [];

  return (
    <div className="normal-case space-y-3 bg-background-primary rounded-lg border border-border-subtle p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BuildTrackBadge />
          <span className="font-bold text-text-secondary">Reported from the Build-Track app</span>
        </div>
        <span className="text-text-muted font-semibold">{data.external_id}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Reporter">{r.name}</Field>
        <Field label="Company">{r.company}</Field>
        <Field label="Role">{r.role}</Field>
        <Field label="Email">{r.email}</Field>
        <Field label="Phone">{r.phone}</Field>
        <Field label="Project">{data.project?.name}</Field>
        <Field label="Screen">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-text-muted shrink-0" />
            {data.screen?.name || data.screen?.route || '—'}
          </span>
          {data.screen?.name && data.screen?.route ? <span className="block text-text-muted font-normal">{data.screen.route}</span> : null}
        </Field>
        <Field label="Happened (device time)">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-text-muted shrink-0" />{fmtIST(data.occurred_at)}</span>
        </Field>
        <Field label="Received">{fmtIST(data.received_at)}</Field>
      </div>

      <div className="flex items-start gap-1.5 text-text-secondary">
        {isWeb ? <Monitor className="w-3.5 h-3.5 mt-px shrink-0" /> : <Smartphone className="w-3.5 h-3.5 mt-px shrink-0" />}
        <span className="break-words">{deviceLine(data.device || {}) || 'No device details'}</span>
      </div>

      {data.has_screenshot && (
        <div className="space-y-1.5">
          <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Screenshot</span>
          {shot ? (
            <button type="button" onClick={() => onEnlarge(shot)} title="Click to enlarge"
              className="block border border-border-subtle rounded overflow-hidden hover:opacity-80 transition-opacity cursor-zoom-in">
              <img src={shot} alt="Screenshot sent with the report" className="max-h-52 w-auto object-contain bg-background-secondary" />
            </button>
          ) : shotError ? (
            <span className="text-text-muted italic">The screenshot could not be loaded.</span>
          ) : (
            <span className="flex items-center gap-1.5 text-text-muted"><Loader2 className="w-3 h-3 animate-spin" /> Loading screenshot...</span>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-text-muted uppercase font-bold tracking-wider block text-[9px]">Recent steps</span>
        {steps.length === 0 ? (
          <span className="text-text-muted italic">No steps were recorded.</span>
        ) : (
          <ol className="relative border-l border-border-subtle ml-1.5 space-y-1">
            {steps.map((s, i) => {
              const bad = s.kind === 'api_error' || s.kind === 'error';
              return (
                <li key={i} className={cn('ml-3 pl-2 pr-2 py-1 rounded relative', bad && 'bg-accent-red-light border border-accent-red-light')}>
                  <span className={cn('absolute -left-[17px] top-2 w-2 h-2 rounded-full border border-background-primary', bad ? 'bg-accent-red' : 'bg-accent-blue')} />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn('font-semibold break-words', bad && 'text-accent-red')}>
                      <span className="text-text-muted font-bold uppercase text-[9px] mr-1.5">{(s.kind || 'step').replace('_', ' ')}</span>
                      {s.label}
                    </span>
                    <span className="text-text-muted text-[9px] whitespace-nowrap">{fmtIST(s.at, false)}</span>
                  </div>
                  {s.detail ? <span className="block text-text-secondary break-words">{s.detail}</span> : null}
                </li>
              );
            })}
          </ol>
        )}
        <span className="block text-text-muted text-[9px]">Times shown in IST. Only screens, taps and errors are recorded, never anything typed.</span>
      </div>
    </div>
  );
}
