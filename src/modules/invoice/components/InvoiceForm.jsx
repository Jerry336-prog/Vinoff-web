import React, { useState, useEffect } from 'react';
import { dbGetProducts, dbGetAllUsers } from '../../../services/firebase/db';
import { calculateInvoice } from '../utils/calculateInvoice';
import { INVOICE_STATUS } from '../utils/invoiceStatus';
import { useInvoice } from '../hooks/useInvoice';
import { formatCurrency } from '../../../utils/formatCurrency';
import { X, Plus, Trash2, Search, Percent, DollarSign, Edit3, User, BookOpen } from 'lucide-react';
import Button from '../../../components/ui/Button';

/**
 * Premium Invoice Form Modal for creating and editing wholesale invoices.
 * Supports searchable product dropdowns, real-time calculations, carton toggling.
 * 
 * @param {object} initialData - Prefill object for invoice creation or edit
 * @param {boolean} isOpen - Modal visibility state
 * @param {function} onClose - Close modal callback
 * @param {function} onSave - Success callback returning the final invoice object
 */
export const InvoiceForm = ({ initialData = {}, isOpen = false, onClose, onSave }) => {
  const { createInvoice, updateInvoice } = useInvoice();

  // Database lists
  const [productsList, setProductsList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  
  // Search states
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Form fields
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [orderId, setOrderId] = useState(null);
  
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [status, setStatus] = useState('Pending');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch DB data on open
  useEffect(() => {
    if (isOpen) {
      dbGetProducts().then(setProductsList).catch(console.error);
      dbGetAllUsers().then(users => {
        // filter down to customers
        const list = users.filter(u => u.role !== 'admin');
        setCustomersList(list);
      }).catch(console.error);
    }
  }, [isOpen]);

  // 2. Prefill form fields from initialData
  useEffect(() => {
    if (isOpen && initialData) {
      setCustomerId(initialData.customerId || '');
      setCustomerName(initialData.customerName || '');
      setBusinessName(initialData.businessName || '');
      setOrderId(initialData.orderId || null);
      
      setItems(initialData.items || []);
      setDiscount(initialData.discount || 0);
      setDeposit(initialData.deposit || 0);
      setStatus(initialData.status || 'Pending');
      setNotes(initialData.notes || '');
      
      setErrorMessage('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // 3. Centralized calculations inside the render loop!
  const calcs = calculateInvoice(items, discount, deposit, status);

  // 4. Handle adding products to items list
  const handleAddProduct = (product) => {
    const existingIndex = items.findIndex(item => item.id === product.id && item.isCarton === true);
    
    if (existingIndex > -1) {
      // Increment quantity
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: product.id,
          name: product.name,
          cartonPrice: product.cartonPrice,
          unitPrice: product.unitPrice,
          unitsPerCarton: product.unitsPerCarton || 12,
          quantity: 1,
          isCarton: true
        }
      ]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  // 5. Update items quantity or packaging mode
  const handleUpdateItemQuantity = (index, value) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, parseInt(value) || 1);
    setItems(updated);
  };

  const handleToggleItemMode = (index) => {
    const updated = [...items];
    updated[index].isCarton = !updated[index].isCarton;
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // 6. Handle customer selection dropdown
  const handleCustomerChange = (userId) => {
    const selected = customersList.find(c => c.id === userId);
    if (selected) {
      setCustomerId(selected.id);
      setCustomerName(selected.name || selected.displayName || 'Buyer');
      setBusinessName(selected.businessName || 'Wholesale Partner');
    }
  };

  // 7. Save handler (Submit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMessage("Please select a customer for the invoice.");
      return;
    }
    if (items.length === 0) {
      setErrorMessage("Please add at least one item to the invoice.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let finalInvoice;
      const invoicePayload = {
        customerId,
        customerName,
        businessName,
        orderId,
        items,
        discount: Number(discount) || 0,
        deposit: status === 'Paid' ? calcs.total : (Number(deposit) || 0),
        status,
        notes,
        createdBy: "Jerry (Admin)"
      };

      if (initialData?.id) {
        // Edit flow
        finalInvoice = await updateInvoice(initialData.id, invoicePayload);
      } else {
        // Create flow
        finalInvoice = await createInvoice(invoicePayload);
      }

      if (onSave) {
        onSave(finalInvoice);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred while saving the invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products for dropdown search
  const filteredProducts = productsList.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <form 
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] animate-scale-up"
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-green-50 border border-brand-green-200 flex items-center justify-center text-brand-green-700">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
                {initialData?.id ? `Edit Invoice ${initialData.invoiceNumber}` : 'Create New Wholesale Invoice'}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Invoice Generator Engine</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* SECTION 1: CUSTOMER SELECTION & METADATA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Customer select */}
            <div>
              <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Target Customer</label>
              {initialData?.customerId ? (
                // Locked display on edit
                <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs font-bold text-slate-850 flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-green-600" />
                  <div>
                    <p>{customerName}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{businessName}</p>
                  </div>
                </div>
              ) : (
                // Dropdown on create
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                  required
                >
                  <option value="">-- Choose Wholesale Buyer --</option>
                  {customersList.map(cust => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.businessName || 'No business outlet'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Payment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
              >
                <option value={INVOICE_STATUS.PENDING}>Pending Payment</option>
                <option value={INVOICE_STATUS.PAID}>Fully Paid</option>
                <option value={INVOICE_STATUS.OVERDUE}>Overdue</option>
              </select>
            </div>

            {/* Order Ref */}
            <div>
              <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Order Reference Link</label>
              <input
                type="text"
                value={orderId || ''}
                readOnly
                placeholder="Unlinked to checkout order"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-3 text-xs font-bold text-slate-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* SECTION 2: PRODUCT SEARCH AND ADD */}
          <div className="relative">
            <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Search & Add Bulk Products</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search products shelf by name..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-750 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            {/* Drodown results list */}
            {showProductDropdown && productSearch.trim() !== '' && (
              <div className="absolute top-13 left-0 right-0 max-h-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 overflow-y-auto p-1.5 space-y-1">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium italic p-3 text-center">No products match search term.</p>
                ) : (
                  filteredProducts.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-brand-green-50/70 transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{prod.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-semibold">Category: {prod.category}</p>
                      </div>
                      <div className="text-right text-[10px]">
                        <p className="font-extrabold text-brand-green-700">Ctn: {formatCurrency(prod.cartonPrice)}</p>
                        <p className="text-slate-500">Unit: {formatCurrency(prod.unitPrice)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: LINE ITEMS LIST */}
          <div className="space-y-2">
            <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Invoice Line Items</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-extrabold border-b border-slate-200">
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-4 text-center">Packaging</th>
                    <th className="py-3 px-4 text-center w-24">Qty</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium italic">
                        Select a product above to add invoice items.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/30">
                        <td className="py-3 px-4 font-bold text-slate-800 max-w-xs truncate">{item.name}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleItemMode(index)}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase transition ${
                              item.isCarton 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100' 
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {item.isCarton ? 'Carton' : 'Single Unit'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQuantity(index, e.target.value)}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-brand-green-500 font-mono"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatCurrency(item.isCarton ? item.cartonPrice : item.unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                          {formatCurrency(item.quantity * (item.isCarton ? item.cartonPrice : item.unitPrice))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: FINANCIAL BREAKDOWN AND DEPOSIT */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-4">Financial Adjustments & Notes</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Controls and Notes */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Discount Field */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-slate-400" />
                      Wholesale Discount ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-green-500 font-mono"
                    />
                  </div>

                  {/* Deposit Field */}
                  <div>
                    <label className="block text-[10px] text-slate-550 font-bold mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      Deposit Amount ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={status === 'Paid'}
                      value={status === 'Paid' ? calcs.total : deposit}
                      onChange={(e) => setDeposit(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200/80 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-green-500 font-mono"
                    />
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    Special Terms / Customer Notes
                  </label>
                  <textarea
                    placeholder="Enter special instructions or payment schedules..."
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 px-3 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-green-500"
                  />
                </div>
              </div>

              {/* Real-time Math Summary Panel */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3 font-semibold text-slate-655 text-xs">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-200/60 pb-2">Real-Time Calculations Review</p>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(calcs.subtotal)}</span>
                </div>
                {calcs.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(calcs.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Deposit Amount:</span>
                  <span className="font-mono font-bold text-blue-600">{formatCurrency(calcs.deposit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(calcs.balance)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-3 text-slate-900">
                  <span className="font-bold">Grand Total:</span>
                  <span className="font-black font-mono text-sm text-brand-green-700">{formatCurrency(calcs.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl px-5 py-2.5 font-extrabold text-xs"
          >
            {isSubmitting ? 'Syncing with Firestore...' : (initialData?.id ? 'Save Invoice Changes' : 'Generate Digital Invoice')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default InvoiceForm;
