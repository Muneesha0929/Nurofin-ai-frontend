'use client';

/**
 * Runway (CEO only): are we okay, how long does the money last, when do we break even.
 * Built from the approved design (design/runway.html): one plain answer on top, then lists where
 * every figure can be added, changed or deleted. Products are dynamic, so new income lines need no code.
 */
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { runwayService, Runway, RunwayError } from '@/services/runway';
import { Btn, ToastHost } from '@/components/runway/ui';
import { CapitalView, Expenses, Income, Open, Overview } from '@/components/runway/views';
import { ImportSheet } from '@/components/runway/ImportSheet';
import { BankSheet, CapitalSheet, CategoriesSheet, ExpenseSheet, FigureSheet, HowSheet, MonthTotalSheet, ProductSheet } from '@/components/runway/sheets';

const TABS = [['overview', 'Overview'], ['expenses', 'Expenses'], ['income', 'Income'], ['capital', 'Capital']] as const;

export default function RunwayPage() {
  return <Suspense fallback={null}><ToastHost><RunwayInner /></ToastHost></Suspense>;
}

function RunwayInner() {
  const { userProfile } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get('tab') as typeof TABS[number][0]) || 'overview';
  const [rw, setRw] = useState<Runway | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [sheet, setSheet] = useState<Open | null>(null);
  const [menu, setMenu] = useState(false);
  const [month, setMonth] = useState<string>(params.get('month') || '');
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    runwayService.get().then(r => { setRw(r); setError(null); }).catch((e: RunwayError) => setError({ status: e.status, message: e.message }));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (rw && !month) setMonth(rw.summary.last_month >= rw.data.settings.start_month ? rw.summary.last_month : rw.summary.current_month); }, [rw, month]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menu]);

  const go = (t: string, m?: string) => {
    if (m) setMonth(m);
    const q = new URLSearchParams({ tab: t, ...(m ? { month: m } : {}) });
    router.push(`/runway?${q.toString()}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };
  const isCeo = (userProfile?.role || '').toLowerCase() === 'ceo';

  if (error?.status === 403 || (userProfile && !isCeo && !rw)) {
    return (
      <Shell>
        <div className="max-w-[440px] mx-auto mt-[12vh] text-center">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-white border border-[#E4E7EC] grid place-items-center mx-auto mb-4 text-[#526070]"><Lock className="w-5 h-5" /></div>
          <h2 className="text-[20px] font-semibold mb-2">Only the CEO can see this page</h2>
          <p className="text-[#526070]">Runway, salaries and capital are private to the CEO. The server refuses this data to every other account, admins included.</p>
        </div>
      </Shell>
    );
  }
  if (error) {
    return <Shell><div className="max-w-[480px] mx-auto mt-[12vh] text-center"><h2 className="text-[20px] font-semibold mb-2">Runway did not load</h2><p className="text-[#526070] mb-4">{error.message}</p><Btn kind="primary" onClick={load}>Try again</Btn></div></Shell>;
  }
  if (!rw || !month) return <Shell><Skeleton /></Shell>;

  const props = { rw, apply: setRw, open: (o: Open) => { setMenu(false); setSheet(o); }, go };
  const close = () => setSheet(null);
  const figureProducts = rw.data.products.filter(p => p.tracking === 'figures');

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 sm:mb-7">
        <nav className="flex gap-1 bg-[#F0F2F5] p-1 rounded-xl w-full sm:w-auto overflow-x-auto" aria-label="Runway sections">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => go(k)} aria-current={tab === k ? 'page' : undefined}
              className={cn('flex-1 sm:flex-none px-3.5 py-1.5 rounded-[9px] text-[14px] font-medium min-h-[36px] whitespace-nowrap', tab === k ? 'bg-white text-[#0E1726] shadow-[0_1px_2px_rgba(14,23,38,.08)]' : 'text-[#526070]')}>{l}</button>
          ))}
        </nav>
        <div ref={menuRef} className="relative">
          <Btn kind="primary" onClick={() => setMenu(m => !m)} aria-haspopup="menu" aria-expanded={menu}><Plus className="w-[18px] h-[18px]" />Add</Btn>
          {menu && (
            <div role="menu" className="absolute right-0 top-[calc(100%+6px)] bg-white border border-[#E4E7EC] rounded-[14px] shadow-[0_12px_32px_rgba(14,23,38,.12)] p-1.5 min-w-[250px] z-20">
              {[
                { t: 'Expense', s: 'A salary, AWS, rent, a one-off cost', o: { kind: 'expense', expense: null } as Open },
                ...(figureProducts.length ? [{ t: figureProducts.length === 1 ? `${figureProducts[0].name} figure` : 'Product figure', s: 'Revenue so far this month', o: { kind: 'figure', productId: figureProducts.length === 1 ? figureProducts[0].id : null, figureId: null } as Open }] : []),
                { t: 'Money put in', s: 'Capital added to the company', o: { kind: 'capital', id: null } as Open },
                { t: 'Product', s: 'Something new the company earns from', o: { kind: 'product', product: null } as Open },
                { t: 'Import from a spreadsheet', s: 'Many months at once, from a CSV file', o: { kind: 'import' } as Open },
              ].map(x => (
                <button key={x.t} role="menuitem" type="button" onClick={() => props.open(x.o)} className="flex flex-col items-start w-full px-3 py-2.5 rounded-[9px] text-left hover:bg-[#F0F2F5]">
                  <span className="text-[14.5px]">{x.t}</span><small className="text-[12.5px] text-[#8A94A3]">{x.s}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === 'overview' && <Overview {...props} />}
      {tab === 'expenses' && <Expenses {...props} month={month} setMonth={m => go('expenses', m)} />}
      {tab === 'income' && <Income {...props} />}
      {tab === 'capital' && <CapitalView {...props} />}

      {sheet?.kind === 'expense' && <ExpenseSheet rw={rw} expense={sheet.expense} month={month} apply={setRw} onClose={close} />}
      {sheet?.kind === 'categories' && <CategoriesSheet rw={rw} apply={setRw} onClose={close} />}
      {sheet?.kind === 'product' && <ProductSheet rw={rw} product={sheet.product} apply={setRw} onClose={close} onCreated={() => tab !== 'income' && go('income')} />}
      {sheet?.kind === 'figure' && <FigureSheet rw={rw} productId={sheet.productId} figure={sheet.figureId ? rw.data.products.flatMap(p => p.figures).find(f => f.id === sheet.figureId) || null : null} apply={setRw} onClose={close} />}
      {sheet?.kind === 'month' && (() => { const p = rw.data.products.find(x => x.id === sheet.productId); return p ? <MonthTotalSheet rw={rw} product={p} month={sheet.month} apply={setRw} onClose={close} /> : null; })()}
      {sheet?.kind === 'capital' && <CapitalSheet rw={rw} entry={sheet.id ? rw.data.capital.find(c => c.id === sheet.id) || null : null} apply={setRw} onClose={close} />}
      {sheet?.kind === 'bank' && <BankSheet rw={rw} apply={setRw} onClose={close} />}
      {sheet?.kind === 'how' && <HowSheet rw={rw} apply={setRw} onClose={close} />}
      {sheet?.kind === 'import' && <ImportSheet rw={rw} apply={setRw} onClose={close} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#0E1726] normal-case px-4 sm:px-8 lg:px-12 pt-7 pb-24 text-[15px] leading-[1.55]">
      <style>{`@media (prefers-reduced-motion: no-preference){.rw-grow{animation:rwgrow .9s cubic-bezier(.2,.7,.2,1) both}@keyframes rwgrow{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}}`}</style>
      <div className="max-w-[920px] mx-auto">{children}</div>
    </div>
  );
}

function Skeleton() {
  const bar = 'bg-[#E9ECF1] rounded-lg animate-pulse';
  return (
    <div aria-busy="true" aria-label="Loading Runway">
      <div className={cn(bar, 'h-11 w-80 mb-8')} />
      <div className={cn(bar, 'h-4 w-24 mb-4')} />
      <div className={cn(bar, 'h-10 w-[70%] mb-3')} />
      <div className={cn(bar, 'h-5 w-[85%] mb-10')} />
      <div className={cn(bar, 'h-28 w-full rounded-[20px] mb-5')} />
      <div className={cn(bar, 'h-72 w-full rounded-[20px]')} />
    </div>
  );
}
