'use client';

// Resolves the universal code at the start of the quick bar text (debounced, cached).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ResolvedCode, codesService } from '@/services/timeline';

type CacheEntry = { at: number; value: ResolvedCode | null };
const cache = new Map<string, CacheEntry>();
const TTL = 30_000;

if (typeof window !== 'undefined') {
  const clear = () => cache.clear();
  window.addEventListener('cos:changed', clear);
  window.addEventListener('task:created', clear);
}

async function fetchCode(code: string): Promise<ResolvedCode | null | undefined> {
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  try {
    const value = await codesService.resolve(code);
    cache.set(code, { at: Date.now(), value });
    return value;
  } catch (e: any) {
    if (e?.status === 404) {
      cache.set(code, { at: Date.now(), value: null });
      return null;
    }
    return undefined; // network / server error: unknown, don't cache
  }
}

export interface CodeResolveState {
  code: string | null;
  loading: boolean;
  resolved: ResolvedCode | null;
  /** true once the server said "no such item" for the current code */
  notFound: boolean;
  /** Resolve right now (skips the debounce); used when Enter is pressed early. */
  ensure: () => Promise<ResolvedCode | null>;
}

export function useCodeResolve(code: string | null, debounceMs = 200): CodeResolveState {
  const [state, setState] = useState<{ code: string | null; loading: boolean; resolved: ResolvedCode | null; notFound: boolean }>({ code: null, loading: false, resolved: null, notFound: false });
  const current = useRef<string | null>(null);
  current.current = code;

  useEffect(() => {
    if (!code) { setState({ code: null, loading: false, resolved: null, notFound: false }); return; }
    const hit = cache.get(code);
    if (hit && Date.now() - hit.at < TTL) {
      setState({ code, loading: false, resolved: hit.value, notFound: hit.value === null });
      return;
    }
    setState(s => ({ code, loading: true, resolved: s.code === code ? s.resolved : null, notFound: false }));
    const t = setTimeout(async () => {
      const v = await fetchCode(code);
      if (current.current !== code) return;
      setState({ code, loading: false, resolved: v ?? null, notFound: v === null });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [code, debounceMs]);

  const ensure = useCallback(async () => {
    const c = current.current;
    if (!c) return null;
    const v = await fetchCode(c);
    if (current.current === c) setState({ code: c, loading: false, resolved: v ?? null, notFound: v === null });
    return v ?? null;
  }, []);

  const fresh = state.code === code;
  return {
    code,
    loading: code ? !fresh || state.loading : false,
    resolved: fresh ? state.resolved : null,
    notFound: fresh && state.notFound,
    ensure,
  };
}
