import { useContext, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Archive, CalendarDays, CheckCircle2, Download, LoaderCircle, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { EXPORT_TYPES } from '../../services/exports/exportConfig';
import { prepareExport, downloadPreparedExport } from '../../services/exports/exportService';
import { fetchAllExportRecords } from '../../services/exports/fetchRecords';
import { exportDateKey, exportRangeLabel, resolveExportRange } from '../../utils/exportRange';

const inputClass = 'min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-green-600 focus:ring-1 focus:ring-brand-green-600 disabled:bg-slate-50 disabled:text-slate-500';
const nameOf = customer => customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Customer';

function ExportDialog({ kind, customerId, customerName, defaultFormat, onClose }) {
  const { isAdmin } = useContext(AuthContext);
  const location = useLocation();
  const adminMode = Boolean(isAdmin && location.pathname.startsWith('/admin'));
  const config = EXPORT_TYPES[kind];
  const today = exportDateKey(new Date());
  const [selection, setSelection] = useState({ period: 'all', month: today.slice(0, 7), year: today.slice(0, 4), quarter: Math.ceil(Number(today.slice(5, 7)) / 3), startDate: today, endDate: today, customerId: customerId || '', format: defaultFormat || (config.category ? 'zip' : 'pdf'), grouping: 'month' });
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerReload, setCustomerReload] = useState(0);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const dialog = useRef(null);
  const controller = useRef(null);
  const closeDialog = useEffectEvent(() => onClose());
  const headingId = useId();
  const fieldId = useId();
  const canChooseCustomer = adminMode && config.customerFilter && !customerId;
  let range;
  let rangeError = '';
  try { range = resolveExportRange(selection); } catch (cause) { rangeError = cause.message; }

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (controller.current) controller.current.abort();
        else closeDialog();
      }
      if (event.key !== 'Tab') return;
      const elements = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
      const first = elements[0];
      const last = elements.at(-1);
      if (!dialog.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      controller.current?.abort();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (!canChooseCustomer) return;
    const request = new AbortController();
    setCustomerLoading(true);
    setCustomerError('');
    fetchAllExportRecords('/api/admin/customers', { signal: request.signal })
      .then(setCustomers)
      .catch(cause => { if (!request.signal.aborted) setCustomerError(cause.message); })
      .finally(() => { if (!request.signal.aborted) setCustomerLoading(false); });
    return () => request.abort();
  }, [canChooseCustomer, customerReload]);

  const change = (field, value) => {
    setSelection(previous => ({ ...previous, [field]: value }));
    setReport(null);
    setSuccess(null);
    setError('');
    setProgress(null);
  };
  const options = signal => ({ ...selection, customerId: customerId || selection.customerId, customerLabel: customerName || (selection.customerId ? nameOf(customers.find(customer => String(customer._id || customer.id) === selection.customerId) || {}) : ''), range, adminMode, signal, onProgress: value => { if (!signal.aborted) setProgress(value); } });
  const run = async download => {
    if (rangeError || busy) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    setSuccess(null);
    try {
      if (download) {
        const result = await downloadPreparedExport(report, options(request.signal));
        setSuccess(result);
        toast.success(`${result.recordCount} ${result.recordCount === 1 ? 'record' : 'records'} exported${result.skippedCount ? `; ${result.skippedCount} unstamped ${result.skippedCount === 1 ? 'invoice' : 'invoices'} excluded` : ''}.`, 'Export Complete');
      } else {
        setProgress({ phase: 'loading', message: 'Retrieving matching records...' });
        const prepared = await prepareExport(kind, options(request.signal));
        setReport(prepared);
        setProgress(null);
      }
    } catch (cause) {
      if (request.signal.aborted || cause.name === 'AbortError') {
        setProgress(null);
        setError('Export cancelled. No new file was downloaded.');
      } else setError(cause.message || 'The export failed. Please try again.');
    } finally {
      controller.current = null;
      setBusy(false);
    }
  };
  const selectedCustomer = customerId || selection.customerId;
  const eligibleCount = report?.records.filter(record => !record.locked).length || 0;
  const lockedCount = (report?.records.length || 0) - eligibleCount;
  const percent = progress?.total ? Math.min(100, Math.round(progress.completed / progress.total * 100)) : undefined;
  const availableCustomers = customers.filter(customer => `${nameOf(customer)} ${customer.email || ''} ${customer.profile?.companyName || ''}`.toLowerCase().includes(customerSearch.toLowerCase()) || String(customer._id || customer.id) === selection.customerId);
  const category = config.category;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1} className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl outline-none">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-brand-green-700"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export Records</p>
            <h2 id={headingId} className="text-lg font-semibold text-slate-900">{config.title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close export dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-xs leading-relaxed text-slate-500">{config.description || 'Choose a date range and download a complete report, independent of the current table page.'}</p>
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
            <legend className="sr-only">Export options</legend>
            <div>
              <label htmlFor={`${fieldId}-period`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Date Range</label>
              <select id={`${fieldId}-period`} className={inputClass} value={selection.period} onChange={event => change('period', event.target.value)}>
                <option value="all">All dates</option><option value="month">By month</option><option value="quarter">By quarter (3 months)</option><option value="year">By year</option><option value="custom">Custom date range</option>
              </select>
            </div>
            {selection.period === 'month' && <div><label htmlFor={`${fieldId}-month`} className="mb-1.5 block text-xs font-medium text-slate-600">Month</label><input id={`${fieldId}-month`} type="month" min="1900-01" max="9999-12" className={inputClass} value={selection.month} onChange={event => change('month', event.target.value)} /></div>}
            {['quarter', 'year'].includes(selection.period) && <div className="grid grid-cols-2 gap-3">
              {selection.period === 'quarter' && <div><label htmlFor={`${fieldId}-quarter`} className="mb-1.5 block text-xs font-medium text-slate-600">Quarter</label><select id={`${fieldId}-quarter`} className={inputClass} value={selection.quarter} onChange={event => change('quarter', event.target.value)}><option value="1">Q1: January - March</option><option value="2">Q2: April - June</option><option value="3">Q3: July - September</option><option value="4">Q4: October - December</option></select></div>}
              <div><label htmlFor={`${fieldId}-year`} className="mb-1.5 block text-xs font-medium text-slate-600">Year</label><input id={`${fieldId}-year`} type="number" min="1900" max="9999" step="1" className={inputClass} value={selection.year} onChange={event => change('year', event.target.value)} /></div>
            </div>}
            {selection.period === 'custom' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label htmlFor={`${fieldId}-start`} className="mb-1.5 block text-xs font-medium text-slate-600">From</label><input id={`${fieldId}-start`} type="date" className={inputClass} value={selection.startDate} onChange={event => change('startDate', event.target.value)} /></div><div><label htmlFor={`${fieldId}-end`} className="mb-1.5 block text-xs font-medium text-slate-600">To (inclusive)</label><input id={`${fieldId}-end`} type="date" className={inputClass} min={selection.startDate} value={selection.endDate} onChange={event => change('endDate', event.target.value)} /></div></div>}
            <p className={`text-[11px] ${rangeError ? 'text-rose-700' : 'text-slate-500'}`}>{rangeError || (range?.startDate ? `${exportRangeLabel(range)}. Both dates included.` : 'All dates. Dates use Africa/Lagos time.')}</p>
            {customerId && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700"><span className="font-semibold">Customer: </span>{customerName || customerId}</div>}
            {canChooseCustomer && <div className="space-y-2">
              <label htmlFor={`${fieldId}-customer`} className="block text-xs font-semibold text-slate-700">Customer</label>
              <input type="search" aria-label="Find a customer for export" className={inputClass} placeholder="Find by name, email or business..." value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} />
              <select id={`${fieldId}-customer`} className={inputClass} disabled={customerLoading} value={selection.customerId} onChange={event => change('customerId', event.target.value)}><option value="">{customerLoading ? 'Loading customers...' : 'All customers'}</option>{availableCustomers.map(customer => <option key={customer._id || customer.id} value={customer._id || customer.id}>{nameOf(customer)}{customer.email ? ` (${customer.email})` : ''}</option>)}</select>
              {customerError && <p role="alert" className="text-xs text-rose-700">Customer list unavailable: {customerError} <button type="button" onClick={() => setCustomerReload(value => value + 1)} className="font-semibold underline">Retry</button></p>}
            </div>}
            <div><label htmlFor={`${fieldId}-format`} className="mb-1.5 block text-xs font-semibold text-slate-700">Download Format</label><select id={`${fieldId}-format`} className={inputClass} value={selection.format} onChange={event => change('format', event.target.value)}>
              <option value="zip">{category === 'invoice' ? 'ZIP - separate invoice PDFs' : category === 'expense' ? 'ZIP - separate daily statements' : 'ZIP - grouped PDF reports'}</option><option value="pdf">{category ? 'PDF - summary report' : 'PDF report'}</option><option value="csv">CSV spreadsheet</option>
            </select></div>
            {selection.format === 'zip' && !category && <div><label htmlFor={`${fieldId}-group`} className="mb-1.5 block text-xs font-medium text-slate-600">Separate Reports By</label><select id={`${fieldId}-group`} className={inputClass} value={selection.grouping} onChange={event => change('grouping', event.target.value)}><option value="month">Month</option><option value="day">Day</option><option value="year">Year</option></select></div>}
          </fieldset>
          {!adminMode && category === 'invoice' && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">Only admin-stamped invoices can be exported. Unstamped invoices are excluded and listed in the ZIP manifest.</p>}
          {report && !success && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">{eligibleCount} matching {category === 'invoice' ? 'invoices' : category === 'expense' ? 'ledger days' : 'records'} ready</p><p className="mt-1 text-xs text-slate-500">{selectedCustomer ? 'Selected customer' : canChooseCustomer ? 'All customers' : 'Selected records'} · {exportRangeLabel(range)}</p>{lockedCount > 0 && <p className="mt-2 text-xs text-amber-800">{lockedCount} invoices excluded while awaiting an admin stamp.</p>}{eligibleCount === 0 && <p className="mt-2 text-xs text-slate-600">Choose another range or customer to prepare a download.</p>}</div>}
          {busy && progress && <div role="status" aria-live="polite" className="space-y-2"><p className="flex items-center gap-2 text-xs font-medium text-slate-700"><LoaderCircle className="h-4 w-4 animate-spin text-brand-green-700" aria-hidden="true" />{progress.message}</p><div role="progressbar" aria-label="Export progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-brand-green-600 ${percent === undefined ? 'animate-pulse' : ''}`} style={{ width: `${percent ?? 30}%` }} /></div><p className="text-[11px] text-slate-500">Keep this window open. PDFs are generated one at a time to avoid overloading the server.</p></div>}
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800">{error}</p>}
          {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" /> Download Ready</p><p className="mt-1.5 text-xs">{success.recordCount} records exported{selection.format === 'zip' ? ` in ${success.fileCount} separate PDFs` : ''}.{success.skippedCount ? ` ${success.skippedCount} unstamped invoices were excluded.` : ''}</p></div>}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          {busy ? <button type="button" onClick={() => { controller.current?.abort(); setProgress({ message: 'Cancelling after the current operation...' }); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel Export</button> : <>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{success ? 'Done' : 'Cancel'}</button>
            {!success && <button type="button" onClick={() => run(Boolean(report))} disabled={Boolean(rangeError) || Boolean(report && !eligibleCount)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-green-800 disabled:cursor-not-allowed disabled:opacity-40">{report ? selection.format === 'zip' ? <Archive className="h-4 w-4" /> : <Download className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}{report ? `Download ${selection.format.toUpperCase()}` : 'Prepare Export'}</button>}
          </>}
        </footer>
      </section>
    </div>, document.body,
  );
}

export default function ExportButton({ kind, customerId, customerName, label = 'Export', defaultFormat }) {
  const [open, setOpen] = useState(false);
  if (!EXPORT_TYPES[kind]) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-green-200 hover:bg-brand-green-50 hover:text-brand-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600 print:hidden"><Download className="h-3.5 w-3.5" aria-hidden="true" />{label}</button>
      {open && <ExportDialog kind={kind} customerId={customerId} customerName={customerName} defaultFormat={defaultFormat} onClose={() => setOpen(false)} />}
    </>
  );
}
