import { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { unwrapApiRecord } from '../../utils/apiResponse';
import { formatCurrency } from '../../utils/formatCurrency';
import AppDialog from '../ui/AppDialog';

export default function CustomerCreditControl({ customer, onUpdated }) {
  const { can, isSuperAdmin } = useContext(AuthContext);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!customer.isVipCreditPartner) return null;
  const limit = Number(customer.creditLimit || 0);
  const outstanding = Number(customer.outstandingCredit || 0);
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = unwrapApiRecord(await api.post(`/api/admin/customers/${customer._id || customer.id}/credit-limit`, { creditLimit: amount, reason }));
      if (!result.pending) onUpdated?.(result.customer);
      toast.success(result.pending ? 'Request sent. The current limit stays unchanged until the super admin approves it.' : 'Approved credit limit updated.');
      setOpen(false);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800">Approved Credit Facility</h3><p className="mt-1 text-xs text-slate-500">The limit covers all outstanding credit invoices, not each individual order.</p></div>{can('credit.request') && <button className="rounded-lg border border-brand-green-200 bg-brand-green-50 px-3 py-2 text-xs font-semibold text-brand-green-800" onClick={() => { setAmount(String(limit)); setReason(''); setError(''); setOpen(true); }}>{isSuperAdmin ? 'Set Credit Limit' : 'Request Limit Change'}</button>}</div>
    <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">{[['Approved Limit', limit], ['Outstanding', outstanding], ['Available Credit', Math.max(0, limit - outstanding)]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{formatCurrency(value)}</dd></div>)}</dl>
    {limit === 0 && <p className="mt-3 text-xs text-amber-800">No credit is available until the super admin approves a limit. Existing debt is not removed.</p>}
    {open && <AppDialog title={isSuperAdmin ? 'Set Approved Credit Limit' : 'Request Credit Limit Change'} onClose={() => setOpen(false)} busy={busy}><form onSubmit={save} className="space-y-4"><p className="text-sm text-slate-600">{customer.firstName} {customer.lastName} · Current limit: {formatCurrency(limit)}</p><label className="block text-xs font-medium">New Total Limit (NGN)<input required type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-medium">Reason<textarea required maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><p className="text-xs text-slate-500">{isSuperAdmin ? 'This change takes effect immediately and is recorded in the audit history.' : 'The super admin will receive an approval notification. This does not change the limit yet.'}</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || Number(amount) === limit} className="w-full rounded-lg bg-brand-green-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : isSuperAdmin ? 'Save Approved Limit' : 'Send Approval Request'}</button></form></AppDialog>}
  </section>;
}
