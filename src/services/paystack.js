import api from './api';
import { unwrapApiRecord } from '../utils/apiResponse';

export const startPayment = async (record) => {
  const response = await api.post('/api/payments/initialize', record);
  const payment = unwrapApiRecord(response);
  if (!payment?.authorization_url?.startsWith('https://checkout.paystack.com/')) throw new Error('Invalid checkout link');
  window.location.assign(payment.authorization_url);
};
