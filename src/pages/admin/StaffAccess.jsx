import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { unwrapApiRecord } from '../../utils/apiResponse';
import { PERMISSION_GROUPS } from '../../utils/staffPermissions';
import { useToast } from '../../context/ToastContext';

export default function StaffAccess() {
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    let active = true;
    api.get('/api/admin/staff').then(res => { if (active) setStaff(unwrapApiRecord(res)?.staff || []); }).catch(cause => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const choose = id => {
    setSelected(id);
    setPermissions([...(staff.find(user => user._id === id)?.staffPermissions || [])]);
    setError('');
  };
  const toggle = key => setPermissions(previous => {
    const next = new Set(previous);
    if (next.has(key)) {
      next.delete(key);
      if (key.endsWith('.view')) next.delete(key.replace('.view', '.manage'));
    } else {
      next.add(key);
      if (key.endsWith('.manage') && ['orders', 'invoices', 'customers'].includes(key.split('.')[0])) next.add(key.replace('.manage', '.view'));
      if (key === 'credit.request') next.add('customers.view');
    }
    return [...next];
  });
  const save = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const user = unwrapApiRecord(await api.patch(`/api/admin/staff/${selected}/permissions`, { permissions }));
      setStaff(previous => previous.map(item => item._id === selected ? user : item));
      toast.success('Staff permissions saved. Backend restrictions apply immediately.');
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-4xl space-y-5"><header className="rounded-2xl border border-slate-200 bg-white p-5"><h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-brand-green-700" />Staff Permissions</h1><p className="mt-2 text-sm text-slate-500">Choose exactly what each admin can access. Only super admins can change permissions or approve credit-limit changes.</p><Link to="/admin/customers" className="mt-3 inline-block text-xs font-semibold text-brand-green-700">Promote a customer to admin in Customers</Link></header>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="text-sm text-slate-500">Loading staff…</p> : <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5"><label className="block text-xs font-semibold text-slate-600">Admin Account<select disabled={busy} value={selected} onChange={event => choose(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"><option value="">Select an admin</option>{staff.filter(user => user.role !== 'superadmin').map(user => <option key={user._id} value={user._id}>{user.firstName} {user.lastName} ({user.email})</option>)}</select></label>{selected && <><p className="mt-3 text-xs text-slate-500">Unselected permissions are denied. New admin accounts start with no operational permissions. Stock adjustment and product editing are separate permissions.</p><fieldset disabled={busy} className="mt-5 grid gap-5 sm:grid-cols-2">{PERMISSION_GROUPS.map(group => <div key={group.title} className="rounded-xl border border-slate-200 p-4"><h2 className="mb-3 text-sm font-semibold">{group.title}</h2>{group.options.map(([key, label]) => <label key={key} className="mb-3 flex items-start gap-2.5 text-xs leading-relaxed text-slate-600"><input type="checkbox" checked={permissions.includes(key)} onChange={() => toggle(key)} className="mt-0.5 accent-green-700" /><span>{label}</span></label>)}</div>)}</fieldset><div className="mt-5 flex justify-end"><button disabled={busy} className="rounded-lg bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save Permissions'}</button></div></>}</form>}</div>;
}
