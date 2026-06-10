import React from 'react';
import { formatCurrency } from '../../../utils/formatCurrency';

/**
 * Renders a premium table of invoice line items.
 * 
 * @param {Array} items - List of invoice items
 * @param {boolean} editable - Whether the table permits edits (deletions)
 * @param {function} onRemoveItem - Callback to remove an item (only if editable is true)
 */
export const InvoiceItemsTable = ({ items = [], editable = false, onRemoveItem }) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-semibold text-slate-700">
          <thead>
            <tr className="text-slate-400 font-extrabold border-b border-slate-200 bg-slate-100/80">
              <th className="py-3 px-4">Item Description</th>
              <th className="py-3 px-4 text-center">Packaging</th>
              <th className="py-3 px-4 text-center">Quantity</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Total</th>
              {editable && <th className="py-3 px-4 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={editable ? 6 : 5} className="py-8 text-center text-slate-400 font-medium italic">
                  No items added to invoice yet.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {item.name}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-500">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      item.isCarton 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {item.isCarton ? 'Carton' : 'Unit'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-800 font-mono">
                    {item.quantity} {item.isCarton ? 'ctn' : 'pcs'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-655 font-mono">
                    {formatCurrency(item.isCarton ? item.cartonPrice : item.unitPrice)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-900 font-black font-mono">
                    {formatCurrency(item.total || (item.quantity * (item.isCarton ? item.cartonPrice : item.unitPrice)))}
                  </td>
                  {editable && (
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="px-2.5 py-1 text-[10px] bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg transition font-extrabold"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceItemsTable;
