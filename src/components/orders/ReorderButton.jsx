import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import api from '../../services/api';
import { CartContext } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { unwrapApiRecord } from '../../utils/apiResponse';

export default function ReorderButton({ orderId }) {
  const { cartItems, replaceCart } = useContext(CartContext);
  const { toast, showModal } = useToast();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const reorder = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = unwrapApiRecord(await api.get(`/api/orders/${orderId}/reorder-preview`));
      if (!result?.items?.length) { toast.warning((result?.notices || ['These products are currently unavailable.']).join(' ')); return; }
      replaceCart(result.items);
      navigate('/cart');
      if (result.notices?.length) showModal({ title: 'Reorder Updated for Availability', message: `${result.notices.join(' ')} Current prices have been applied. Review your cart before checkout.`, confirmText: 'Review Cart', type: 'info' });
      else toast.success('Previous items added using current prices. Review your cart before checkout.');
    } catch (cause) { toast.error(cause.message); }
    finally { setBusy(false); }
  };
  const click = event => {
    event.stopPropagation();
    if (cartItems.length) showModal({ title: 'Replace Current Cart?', message: 'Reordering will replace the items currently in your cart with this previous order, using current prices and available stock. No order or payment is placed yet.', confirmText: 'Replace & Reorder', cancelText: 'Keep Current Cart', onConfirm: reorder, type: 'info' });
    else reorder();
  };
  return <button type="button" disabled={busy} onClick={click} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-green-200 bg-brand-green-50 px-3 py-2 text-xs font-semibold text-brand-green-800 hover:bg-brand-green-100 disabled:opacity-50"><RotateCcw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Checking Stock…' : 'Reorder'}</button>;
}
