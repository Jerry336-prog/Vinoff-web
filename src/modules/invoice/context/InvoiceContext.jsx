import React, { createContext, useState } from 'react';
import invoiceService from '../services/invoiceService';

export const InvoiceContext = createContext({
  loading: false,
  createInvoice: async () => {},
  updateInvoice: async () => {},
  deleteInvoice: async () => {},
  getInvoice: async () => {},
  getCustomerInvoices: async () => {},
  getOrderInvoices: async () => {},
});

export const InvoiceProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  const handleServiceCall = async (serviceFunc, ...args) => {
    setLoading(true);
    try {
      const result = await serviceFunc(...args);
      return result;
    } catch (error) {
      console.error(`InvoiceContext error during service call:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    loading,
    createInvoice: (...args) => handleServiceCall(invoiceService.createInvoice, ...args),
    updateInvoice: (...args) => handleServiceCall(invoiceService.updateInvoice, ...args),
    deleteInvoice: (...args) => handleServiceCall(invoiceService.deleteInvoice, ...args),
    getInvoice: (...args) => handleServiceCall(invoiceService.getInvoice, ...args),
    getCustomerInvoices: (...args) => handleServiceCall(invoiceService.getCustomerInvoices, ...args),
    getOrderInvoices: (...args) => handleServiceCall(invoiceService.getOrderInvoices, ...args),
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};

export default InvoiceContext;
