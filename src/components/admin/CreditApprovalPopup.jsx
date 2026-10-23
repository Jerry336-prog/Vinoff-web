import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotificationContext } from '../../context/NotificationContext';
import AppDialog from '../ui/AppDialog';

export default function CreditApprovalPopup() {
  const { notifications, markAsRead } = useContext(NotificationContext);
  const [dismissed, setDismissed] = useState(() => new Set());
  const notification = notifications.find(item => item.type === 'CREDIT_LIMIT_REQUESTED' && !(item.isRead || item.read) && !dismissed.has(item._id));
  if (!notification) return null;
  const dismiss = () => setDismissed(previous => new Set([...previous, notification._id]));
  const requestId = notification.relatedApproval?._id || notification.relatedApproval;
  return <AppDialog key={notification._id} title="Credit Limit Approval Required" onClose={dismiss}><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{notification.message}</p><p className="mt-3 text-xs text-slate-500">The customer's limit has not changed. Review and approve or reject this request.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={dismiss} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">Later</button><Link to={`/admin/credit-approvals${requestId ? `?request=${requestId}` : ''}`} onClick={() => { dismiss(); markAsRead(notification._id); }} className="rounded-lg bg-brand-green-700 px-4 py-2 text-xs font-semibold text-white">Review Request</Link></div></AppDialog>;
}
