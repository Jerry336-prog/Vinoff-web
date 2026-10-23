import { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { unwrapApiList } from '../../utils/apiResponse';
import { formatCurrency } from '../../utils/formatCurrency';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AppDialog from '../../components/ui/AppDialog';

const nameOf = user => user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unavailable account';
export default function CreditApprovals() {
  const { isSuperAdmin } = useContext(AuthContext);
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(false);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => api.get(`/api/admin/credit-requests${history ? '' : '?status=pending'}`).then(res => { if (active) { setRequests(unwrapApiList(res)); setError(''); } }).catch(cause => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    load(); const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [history, revision]);
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const res = await api.post(`/api/admin/credit-requests/${review.request._id}/review`, { decision: review.decision, note });
      toast.success(res.message || 'Request reviewed.'); setReview(null); setRevision(value => value + 1);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-4xl space-y-4"><header className="rounded-2xl border border-slate-200 bg-white p-5"><h1 className="text-xl font-semibold text-slate-900">Credit Limit Approvals</h1><p className="mt-1 text-sm text-slate-500">{isSuperAdmin ? 'Review staff requests before any customer limit changes.' : 'Track your submitted requests. Limits stay unchanged until a super admin approves.'}</p><div className="mt-4 flex gap-2">{[[false, 'Pending'], [true, 'All Requests']].map(([value, label]) => <button key={label} onClick={() => setHistory(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${history === value ? 'bg-brand-green-700 text-white' : 'border border-slate-200 text-slate-600'}`}>{label}</button>)}</div></header>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="text-sm text-slate-500">Loading requests…</p> : !requests.length ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No {history ? '' : 'pending '}requests.</div> : requests.map(request => <article key={request._id} className={`rounded-2xl border bg-white p-5 ${params.get('request') === request._id ? 'border-brand-green-500' : 'border-slate-200'}`}><div className="flex flex-wrap justify-between gap-2"><div><h2 className="text-sm font-semibold text-slate-900">{nameOf(request.customer)}</h2><p className="mt-1 text-xs text-slate-500">Requested by {nameOf(request.requestedBy)} · {new Date(request.createdAt).toLocaleDateString()}</p></div><span className="h-fit rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs capitalize">{request.status}</span></div><p className="mt-4 text-lg font-semibold tabular-nums">{formatCurrency(request.previousLimit)} <span className="px-2 text-slate-400">to</span> {formatCurrency(request.requestedLimit)}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{request.reason}</p>{request.reviewedBy && <p className="mt-3 text-xs text-slate-500">Reviewed by {nameOf(request.reviewedBy)}{request.reviewNote ? `: ${request.reviewNote}` : ''}</p>}<div className="mt-4 flex flex-wrap gap-2">{request.customer && <Link to={`/admin/customers/${request.customer._id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Customer Profile</Link>}{isSuperAdmin && request.status === 'pending' && <><button onClick={() => { setReview({ request, decision: 'approved' }); setNote(''); setError(''); }} className="rounded-lg bg-brand-green-700 px-3 py-2 text-xs font-semibold text-white">Approve</button><button onClick={() => { setReview({ request, decision: 'rejected' }); setNote(''); setError(''); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Reject</button></>}</div></article>)}{review && <AppDialog title={review.decision === 'approved' ? 'Approve Credit Limit' : 'Reject Credit Request'} onClose={() => setReview(null)} busy={busy}><form onSubmit={submit} className="space-y-4"><p className="text-sm text-slate-600">{nameOf(review.request.customer)}: {formatCurrency(review.request.previousLimit)} to {formatCurrency(review.request.requestedLimit)}.</p><p className="text-xs text-slate-500">{review.decision === 'approved' ? 'Approval applies this exact new limit immediately and records your identity.' : 'Rejection leaves the existing approved limit unchanged.'}</p><label className="block text-xs font-semibold">Review Note (Optional)<textarea maxLength={1000} rows={3} value={note} onChange={event => setNote(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-brand-green-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Confirm Decision'}</button></form></AppDialog>}</div>;
}
