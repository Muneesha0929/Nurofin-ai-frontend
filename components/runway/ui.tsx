'use client';

// Building blocks for the Runway page, copied from the approved design (design/runway.html):
// quiet white cards, one dark primary button, a slide-in sheet for every add / edit, a toast with Undo.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { mLong, parseRs } from './story';

export const C = {
  ink: '#0E1726', ink2: '#526070', ink3: '#8A94A3', line: '#E4E7EC', line2: '#D0D5DD', sunk: '#F0F2F5',
  in: '#12A26B', inSoft: '#E8F7F0', out: '#5B6BD6', accent: '#2F54EB', accentSoft: '#EEF2FF', watch: '#D98A00', watchSoft: '#FFF6E5', risk: '#D64545',
};

export const Card = ({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
  <section className={cn('bg-white border border-[#E4E7EC] rounded-[20px] min-w-0', className)} {...rest}>{children}</section>
);

type BtnKind = 'primary' | 'quiet' | 'text' | 'danger';
export const Btn = ({ kind = 'quiet', className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) => (
  <button
    type="button"
    className={cn(
      'inline-flex items-center gap-2 rounded-[10px] text-[14px] font-medium whitespace-nowrap transition-colors disabled:opacity-50',
      kind === 'primary' && 'bg-[#0E1726] text-white hover:bg-[#1f2a3c] px-4 min-h-[40px]',
      kind === 'quiet' && 'bg-white border border-[#E4E7EC] hover:border-[#D0D5DD] px-4 min-h-[40px]',
      kind === 'text' && 'text-[#2F54EB] hover:bg-[#EEF2FF] px-2 min-h-[32px]',
      kind === 'danger' && 'text-[#D64545] hover:bg-[#FDEEEE] px-3 min-h-[40px]',
      className,
    )}
    {...rest}
  />
);

export const IconBtn = ({ label, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => (
  <button type="button" aria-label={label} title={label}
    className={cn('w-9 h-9 rounded-[9px] grid place-items-center text-[#526070] hover:bg-[#F0F2F5] hover:text-[#0E1726] shrink-0', className)} {...rest}>
    {children}
  </button>
);

export const Pill = ({ tone = 'gray', children }: { tone?: 'gray' | 'plan' | 'est' | 'ok'; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center text-[12.5px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap',
    tone === 'gray' && 'bg-[#F0F2F5] text-[#526070]', tone === 'plan' && 'bg-[#EEF2FF] text-[#2F54EB]',
    tone === 'est' && 'bg-[#FFF6E5] text-[#9A6200]', tone === 'ok' && 'bg-[#E8F7F0] text-[#0B7A50]')}>{children}</span>
);

export const Banner = ({ tone = 'watch', children }: { tone?: 'watch' | 'info'; children: React.ReactNode }) => (
  <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-[14.5px] mb-4', tone === 'watch' ? 'bg-[#FFF6E5]' : 'bg-[#EEF2FF]')}>{children}</div>
);

// ----------------------------------------------------------------- form fields

export function Field({ label, help, error, children, htmlFor }: { label: string; help?: string; error?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[14px] font-medium mb-1.5 text-[#0E1726]">{label}</label>
      {children}
      {help && !error && <div className="text-[13px] text-[#8A94A3] mt-1.5">{help}</div>}
      {error && <div className="text-[13px] text-[#D64545] mt-1.5" role="alert">{error}</div>}
    </div>
  );
}

export const inputCls = 'w-full border border-[#D0D5DD] rounded-[10px] px-3 py-2.5 bg-white min-h-[44px] text-[15px] focus:outline-none focus:border-[#2F54EB] focus:ring-[3px] focus:ring-[#EEF2FF]';

export const TextInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(inputCls, p.className)} autoComplete="off" />;

/** Rupee input that shows Indian grouping (1,50,000) once you leave the field. */
export function MoneyInput({ id, value, onChange, autoFocus }: { id: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A94A3]">₹</span>
      <input id={id} inputMode="numeric" autoComplete="off" autoFocus={autoFocus} value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => { const v = parseRs(value); if (!isNaN(v)) onChange(Math.round(v).toLocaleString('en-IN')); }}
        className={cn(inputCls, 'pl-7 tabular-nums')} />
    </div>
  );
}
export const moneyText = (n: number | null | undefined) => (n == null || isNaN(n as number) ? '' : Math.round(n as number).toLocaleString('en-IN'));

export function MonthSelect({ id, value, onChange, months, blank }: { id: string; value: string; onChange: (v: string) => void; months: string[]; blank?: string }) {
  return (
    <select id={id} value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
      {blank && <option value="">{blank}</option>}
      {months.map(m => <option key={m} value={m}>{mLong(m)}</option>)}
    </select>
  );
}

export function Choice<T extends string>({ name, value, onChange, options }: { name: string; value: T; onChange: (v: T) => void; options: { value: T; title: string; hint: string }[] }) {
  return (
    <div className="grid gap-2" role="radiogroup">
      {options.map(o => (
        <label key={o.value} className={cn('flex gap-3 items-start border rounded-xl px-3.5 py-3 cursor-pointer',
          value === o.value ? 'border-[#2F54EB] bg-[#EEF2FF]' : 'border-[#D0D5DD] hover:border-[#8A94A3]')}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-1 w-4 h-4 accent-[#2F54EB]" />
          <span><b className="block font-medium">{o.title}</b><small className="text-[13px] text-[#526070]">{o.hint}</small></span>
        </label>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- sheet

/**
 * The slide-in panel used for every add / edit. Delete asks for a second tap instead of a dialog.
 * onSave returns false (or throws) to keep the sheet open; thrown messages show above the buttons.
 */
export function Sheet({ title, onClose, onSave, saveLabel = 'Save', onDelete, hideCancel, children }: {
  title: string; onClose: () => void; onSave: () => Promise<boolean | void> | boolean | void; saveLabel?: string;
  onDelete?: () => Promise<void> | void; hideCancel?: boolean; children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const save = async () => {
    setErr(''); setBusy(true);
    try { if ((await onSave()) !== false) onClose(); }
    catch (e: any) { setErr(e?.message || 'Could not save. Please try again.'); }
    finally { setBusy(false); }
  };
  const del = async () => {
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    try { await onDelete!(); onClose(); } catch (e: any) { setErr(e?.message || 'Could not delete.'); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] normal-case">
      <motion.div className="absolute inset-0 bg-[rgba(14,23,38,.32)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label={title}
        initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: .22, ease: [.2, .7, .2, 1] }}
        className="absolute bg-white flex flex-col shadow-[0_24px_64px_rgba(14,23,38,.24)] inset-x-0 bottom-0 max-h-[92vh] rounded-t-[20px] sm:inset-auto sm:top-3 sm:right-3 sm:bottom-3 sm:w-[440px] sm:max-h-none sm:rounded-[20px]">
        <div className="flex items-center justify-between px-5 pt-[18px] pb-2.5">
          <h2 className="text-[18px] font-semibold tracking-[-.01em] text-[#0E1726]">{title}</h2>
          <IconBtn label="Close" onClick={onClose}><X className="w-[18px] h-[18px]" /></IconBtn>
        </div>
        <form className="px-5 pt-2 pb-5 overflow-y-auto flex flex-col gap-[18px] flex-1" onSubmit={e => { e.preventDefault(); save(); }}>
          {children}
          <button type="submit" hidden />
        </form>
        {err && <div className="mx-5 mb-2 text-[13.5px] text-[#D64545]" role="alert">{err}</div>}
        <div className="px-5 py-3.5 border-t border-[#E4E7EC] flex justify-between items-center gap-2">
          <div>{onDelete && <Btn kind="danger" onClick={del} disabled={busy} className={armed ? '!bg-[#D64545] !text-white' : ''}>{armed ? 'Tap again to delete' : 'Delete'}</Btn>}</div>
          <div className="flex gap-2">
            {!hideCancel && <Btn onClick={onClose}>Cancel</Btn>}
            <Btn kind="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : saveLabel}</Btn>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------- toast with undo

type ToastFn = (msg: string, undo?: () => void) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ msg: string; undo?: () => void; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback<ToastFn>((msg, undo) => {
    clearTimeout(timer.current);
    setT({ msg, undo, key: Date.now() });
    timer.current = setTimeout(() => setT(null), undo ? 6000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <AnimatePresence>
        {t && (
          <motion.div key={t.key} role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[70] bg-[#0E1726] text-white rounded-xl pl-4 pr-3 py-2.5 flex gap-3.5 items-center text-[14px] shadow-[0_12px_32px_rgba(0,0,0,.2)] max-w-[calc(100%-32px)] normal-case">
            <span>{t.msg}</span>
            {t.undo && <button type="button" className="text-[#A5B4FC] font-semibold px-2 py-1 rounded-md" onClick={() => { t.undo!(); setT(null); }}>Undo</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}
