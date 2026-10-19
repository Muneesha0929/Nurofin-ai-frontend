'use client';

// Bulk upload from a spreadsheet: download a template (already filled with what Runway has),
// fill it in Excel, drop the CSV back, see exactly what will change, then import.
import React, { useRef, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { cn } from '@/utils/cn';
import { runwayService as api, ImportPreview, Runway } from '@/services/runway';
import { Btn, Choice, Sheet, useToast } from './ui';
import { mLong, rs } from './story';

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function ImportSheet({ rw, apply, onClose }: { rw: Runway; apply: (r: Runway) => void; onClose: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [replace, setReplace] = useState<'file' | 'keep'>('file');
  const [showChanges, setShowChanges] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const take = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) { toast('Choose a .csv file. In Excel: File, Save As, CSV.'); return; }
    if (f.size > 1_000_000) { toast('That file is larger than 1 MB. Split it into smaller files.'); return; }
    const text = await f.text();
    setFile({ name: f.name, text }); setPreview(null); setBusy(true);
    try { setPreview(await api.previewImport(text)); }
    catch (e: any) { toast(e?.message || 'Could not read that file.'); setFile(null); }
    finally { setBusy(false); }
  };
  const download = async (kind: 'monthly' | 'figures') => {
    try { await api.downloadTemplate(kind); } catch (e: any) { toast(e?.message || 'Could not download the template.'); }
  };

  const s = preview?.summary;
  const ready = !!preview && !preview.errors.length && !!s && (s.new_values + s.changed_values + s.new_expenses + s.new_products + s.new_categories > 0);
  const save = async () => {
    if (!file) { input.current?.click(); return false; }
    if (!ready) return false;
    const r = await api.applyImport(file.text, replace === 'file');
    apply(r);
    const i = r.imported;
    toast(`Imported ${plural(i.added + i.changed, 'figure')}${i.expenses ? `, ${plural(i.expenses, 'new expense')}` : ''}${i.products ? `, ${plural(i.products, 'new product')}` : ''}`);
  };

  return (
    <Sheet title="Import from a spreadsheet" onClose={onClose} onSave={save} saveLabel={!file ? 'Choose file' : ready ? 'Import' : preview?.errors.length ? 'Fix the file first' : 'Nothing to import'}>
      <p className="m-0 text-[14.5px] text-[#526070]">
        For entering many months at once, such as everything since {mLong(rw.data.settings.start_month)}. Download a template, fill it in Excel or Google Sheets, save it as CSV and drop it here. You will see what changes before anything is saved.
      </p>

      <div className="grid gap-2">
        {([['monthly', 'Monthly history', 'Expenses, product income and capital: one row each, one column per month'],
           ['figures', 'Product figures by date', 'Revenue so far on any day you looked, like the GMDI figures']] as const).map(([k, t, d]) => (
          <button key={k} type="button" onClick={() => download(k)} className="flex items-start gap-3 text-left border border-[#E4E7EC] rounded-xl px-3.5 py-3 hover:border-[#D0D5DD] hover:bg-[#FAFBFC]">
            <FileSpreadsheet className="w-5 h-5 mt-0.5 text-[#12A26B] shrink-0" />
            <span className="flex-1 min-w-0"><b className="block font-medium">{t}</b><small className="text-[13px] text-[#526070]">{d}</small></span>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2F54EB] shrink-0 mt-0.5"><Download className="w-4 h-4" />Template</span>
          </button>
        ))}
        <p className="m-0 text-[13px] text-[#8A94A3]">Templates come filled with what Runway already has, so you can also change figures there and upload again.</p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
        className={cn('border-2 border-dashed rounded-2xl px-4 py-6 text-center transition-colors', drag ? 'border-[#2F54EB] bg-[#EEF2FF]' : 'border-[#D0D5DD]')}>
        <Upload className="w-6 h-6 mx-auto text-[#8A94A3] mb-2" />
        {file ? <p className="m-0 font-medium">{file.name}</p> : <p className="m-0 text-[14.5px]">Drop the filled CSV here</p>}
        <Btn kind="text" className="mt-1" onClick={() => input.current?.click()}>{file ? 'Choose a different file' : 'or choose a file'}</Btn>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={e => { take(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {busy && <p className="m-0 text-[14px] text-[#526070]">Reading the file…</p>}

      {preview && preview.errors.length > 0 && (
        <div className="rounded-xl bg-[#FDEEEE] px-4 py-3">
          <p className="m-0 font-medium flex items-center gap-2 text-[#B42318]"><AlertCircle className="w-4 h-4" />{plural(preview.errors.length, 'thing')} to fix in the file</p>
          <ul className="mt-2 mb-0 pl-0 list-none flex flex-col gap-1.5 text-[14px]">
            {preview.errors.slice(0, 12).map((e, i) => (
              <li key={i}>{e.row ? <b className="font-medium">Row {e.row}{e.column ? `, ${e.column}` : ''}: </b> : null}{e.message}</li>
            ))}
          </ul>
          {preview.errors.length > 12 && <p className="mt-2 mb-0 text-[13px] text-[#526070]">…and {preview.errors.length - 12} more.</p>}
          <p className="mt-2 mb-0 text-[13px] text-[#526070]">Nothing has been saved. Fix these, save the file and drop it again.</p>
        </div>
      )}

      {preview && !preview.errors.length && s && (
        <div className="rounded-xl border border-[#E4E7EC] px-4 py-3.5 flex flex-col gap-2 text-[14.5px]">
          <p className="m-0 font-medium">{ready ? 'Ready to import' : 'Everything in this file is already in Runway'}</p>
          {(s.new_categories + s.new_expenses + s.new_products) > 0 && (
            <p className="m-0 text-[#526070]">Adds {[s.new_expenses && plural(s.new_expenses, 'expense'), s.new_categories && plural(s.new_categories, 'category', 'categories'), s.new_products && plural(s.new_products, 'product')].filter(Boolean).join(', ')}.
              {preview.expenses.length > 0 && <span className="block text-[13px] text-[#8A94A3] mt-0.5">{preview.expenses.slice(0, 6).map(e => `${e.name} (${e.how === 'monthly' ? 'every month' : e.how === 'varies' ? 'changes monthly' : 'one-time'}${e.end_month ? `, until ${mLong(e.end_month)}` : ''})`).join(', ')}{preview.expenses.length > 6 ? ', …' : ''}</span>}
            </p>
          )}
          {s.new_values > 0 && <p className="m-0 text-[#526070]">{plural(s.new_values, 'new figure')}{s.first_month && s.last_month ? `, ${s.first_month === s.last_month ? mLong(s.first_month) : `${mLong(s.first_month)} to ${mLong(s.last_month)}`}` : ''}.</p>}
          {s.unchanged_values > 0 && <p className="m-0 text-[13px] text-[#8A94A3]">{plural(s.unchanged_values, 'figure')} already match Runway and stay as they are.</p>}
          {s.changed_values > 0 && (
            <div className="border-t border-[#E4E7EC] pt-2.5 mt-1">
              <p className="m-0">{plural(s.changed_values, 'figure')} {s.changed_values === 1 ? 'is' : 'are'} different from what Runway has. <button type="button" className="text-[#2F54EB] font-medium" onClick={() => setShowChanges(v => !v)}>{showChanges ? 'Hide' : 'Show'}</button></p>
              {showChanges && (
                <ul className="list-none pl-0 my-2 flex flex-col gap-1 text-[13.5px] text-[#526070]">
                  {s.changes.map((c, i) => <li key={i}>{c.name}, {c.day ? c.day : mLong(c.month)}: {rs(c.old)} → <b className="font-medium text-[#0E1726]">{rs(c.new)}</b></li>)}
                  {s.changed_values > s.changes.length && <li>…and {s.changed_values - s.changes.length} more</li>}
                </ul>
              )}
              <div className="mt-2">
                <Choice name="imReplace" value={replace} onChange={setReplace} options={[
                  { value: 'file', title: "Use the file's figures", hint: 'The file is the newer version' },
                  { value: 'keep', title: 'Keep what Runway has', hint: 'Only add what is new' },
                ]} />
              </div>
            </div>
          )}
          {preview.warnings.length > 0 && <ul className="list-none pl-0 m-0 flex flex-col gap-1 text-[13px] text-[#8A94A3]">{preview.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}</ul>}
          {ready && <p className="m-0 text-[13px] text-[#8A94A3]">Everything imported can be edited or deleted afterwards like any other entry.</p>}
        </div>
      )}
    </Sheet>
  );
}
