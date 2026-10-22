import api from './api';
import { unwrapApiRecord } from '../utils/apiResponse';

let sdkPromise;
const loadPopup = () => {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timeout);
      sdkPromise = null;
      script.remove();
      reject(new Error('Could not load Paystack. Check your connection and try again.'));
    };
    const timeout = window.setTimeout(fail, 20000);
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      if (window.PaystackPop) resolve(window.PaystackPop);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return sdkPromise;
};

export const payInPopup = async (record) => {
  if (record.orderId) {
    const order = unwrapApiRecord(await api.get(`/api/orders/${record.orderId}`));
    if (order?.paymentStatus === 'Confirmed') return { status: 'success', orderId: record.orderId };
  }
  const Popup = await loadPopup();
  const payment = unwrapApiRecord(await api.post('/api/payments/initialize', record));
  if (!payment?.access_code || !payment.reference) throw new Error('Payment session unavailable. Please retry.');
  await new Promise((resolve, reject) => {
    const popup = new Popup();
    popup.resumeTransaction(payment.access_code, {
      onSuccess: resolve,
      onCancel: () => reject(new Error('Payment cancelled. Your cart is still here; confirm again to resume payment.')),
      onError: error => reject(new Error(error?.message || 'Payment failed. Please try again.')),
    });
  });
  // Never accept the browser callback as proof of payment.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const verified = unwrapApiRecord(await api.get(`/api/payments/verify/${encodeURIComponent(payment.reference)}`));
    if (verified?.status === 'success') return verified;
    if (!['pending', 'ongoing', 'processing', 'queued'].includes(verified?.status)) break;
    if (attempt < 2) await new Promise(resolve => window.setTimeout(resolve, 1500));
  }
  throw new Error('Payment is still being verified. Please retry shortly; a confirmed order will not be charged again.');
};

export const startPayment = async (record) => {
  const response = await api.post('/api/payments/initialize', record);
  const payment = unwrapApiRecord(response);
  if (!payment?.authorization_url?.startsWith('https://checkout.paystack.com/')) throw new Error('Invalid checkout link');
  window.location.assign(payment.authorization_url);
};
