import api from '../api';
import { unwrapApiRecord } from '../../utils/apiResponse';
import { showModal } from '../ui/modal';

export const isInvoiceStampRequiredError = error =>
  error?.data?.error?.code === 'INVOICE_NOT_STAMPED';

export const hasInvoiceStamp = invoice =>
  typeof invoice?.issuedBy === 'string' && Boolean(invoice.issuedBy.trim());

export const showInvoiceStampNotice = () => showModal({
  title: 'Admin Stamp Required',
  message: 'This invoice cannot be downloaded yet because it has not been stamped by an admin. Please contact the store to request a stamp, then try downloading again.',
  tone: 'warning',
  okText: 'Understood',
});

export const fetchInvoiceForExport = async (invoiceOrId, { requireStamp = true, signal, timeout } = {}) => {
  const id = typeof invoiceOrId === 'string' ? invoiceOrId : invoiceOrId?._id || invoiceOrId?.id;
  if (!id) throw new Error('An invoice ID is required to download this document.');
  if (requireStamp) {
    // Check the original record as older download responses may infer issuedBy
    // from createdBy, and admins may also open a customer-facing invoice page.
    const current = unwrapApiRecord(await api.get(`/api/invoices/${encodeURIComponent(id)}`, { signal, timeout }));
    if (!hasInvoiceStamp(current)) {
      throw Object.assign(new Error('Admin stamp required'), {
        status: 403,
        data: { error: { code: 'INVOICE_NOT_STAMPED' } },
      });
    }
  }
  // Always recheck the server: a cached invoice may predate its admin stamp.
  const response = await api.get(`/api/invoices/${encodeURIComponent(id)}/download`, { signal, timeout });
  const invoice = unwrapApiRecord(response);
  if (!invoice) throw new Error('Unable to retrieve invoice data for download.');
  return invoice;
};
