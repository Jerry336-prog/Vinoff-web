import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { unwrapApiRecord } from '../../utils/apiResponse';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!reference) { setError('Payment reference is missing.'); return; }
    api.get(`/api/payments/verify/${encodeURIComponent(reference)}`)
      .then(res => { if (active) setResult(unwrapApiRecord(res)); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [reference, attempt]);
  return <div className="max-w-lg mx-auto p-8 bg-white border border-slate-200 rounded-3xl space-y-4">
    <h1 className="text-xl font-bold text-brand-green-800">{result?.status === 'success' ? 'Payment confirmed' : 'Payment verification'}</h1>
    <p className="text-sm text-slate-600">{error || (result ? result.status === 'success' ? 'Your payment has been verified and your invoice updated automatically.' : 'Payment is not yet successful. You can check again or return to your order.' : 'Checking your payment securely...')}</p>
    {(error || (result && result.status !== 'success')) && <button className="text-brand-green-700 font-bold" onClick={() => { setError(''); setResult(null); setAttempt(a => a + 1); }}>Check again</button>}
    <Link className="block text-brand-green-700 font-bold" to={result?.orderId ? `/orders/${result.orderId}` : '/invoices'}>View {result?.orderId ? 'order' : 'invoices'}</Link>
  </div>;
}
