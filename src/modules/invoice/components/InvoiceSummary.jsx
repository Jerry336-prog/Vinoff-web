import React from 'react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { CreditCard, Wallet, DollarSign, Tag, Landmark } from 'lucide-react';

/**
 * Premium dashboard widget or section presenting financial summaries.
 * 
 * @param {number} subtotal
 * @param {number} discount
 * @param {number} total
 * @param {number} deposit
 * @param {number} balance
 */
export const InvoiceSummary = ({ subtotal = 0, discount = 0, total = 0, deposit = 0, balance = 0 }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Subtotal Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Subtotal</span>
          <Landmark className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-800 mt-2 font-mono">{formatCurrency(subtotal)}</p>
      </div>

      {/* Discount Card */}
      <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider">Discount</span>
          <Tag className="w-4 h-4 text-rose-400" />
        </div>
        <p className="text-sm font-bold text-rose-700 mt-2 font-mono">-{formatCurrency(discount)}</p>
      </div>

      {/* Deposit Card */}
      <div className="bg-blue-50/50 border border-blue-150 rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-blue-500 font-extrabold uppercase tracking-wider">Deposit Paid</span>
          <CreditCard className="w-4 h-4 text-blue-550" />
        </div>
        <p className="text-sm font-black text-blue-600 mt-2 font-mono">{formatCurrency(deposit)}</p>
      </div>

      {/* Balance Card */}
      <div className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-emerald-650 font-extrabold uppercase tracking-wider">Outstanding Balance</span>
          <Wallet className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="text-sm font-black text-emerald-700 mt-2 font-mono">{formatCurrency(balance)}</p>
      </div>

      {/* Grand Total Card */}
      <div className="col-span-2 lg:col-span-1 bg-amber-500 text-white rounded-2xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-amber-100">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Grand Total</span>
          <DollarSign className="w-4 h-4" />
        </div>
        <p className="text-lg font-black mt-2 font-mono">{formatCurrency(total)}</p>
      </div>
    </div>
  );
};

export default InvoiceSummary;
