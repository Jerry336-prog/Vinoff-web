import React, { useState, useEffect } from 'react';
import { dbGetOrders } from '../../services/firebase/db';
import { formatCurrency } from '../../utils/formatCurrency';
import Badge from '../../components/ui/Badge';
import { FileText, Download, Printer, Search } from 'lucide-react';

export const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dbGetOrders()
      .then(ordersData => {
        // Collect invoice metadata based on order list
        const list = ordersData.map(o => ({
          invoiceNumber: o.invoiceNumber,
          orderId: o.id,
          customerName: o.customerName,
          businessName: o.businessName,
          dateIssued: o.date || new Date().toISOString().split('T')[0],
          dueDate: new Date(new Date(o.date).getTime() + 5*24*60*60*1000).toISOString().split('T')[0],
          subtotal: o.subtotal,
          vat: o.vat,
          total: o.total,
          status: o.status
        }));
        setInvoices(list);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Wholesale Invoice Registry</h2>
          <p className="text-xs text-slate-500 font-medium">Monitor payment dues terms, value-added taxes (VAT), and digital invoice documents.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search invoice or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 animate-pulse text-xs font-semibold">Syncing invoices...</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                  <th className="py-3.5 px-4">Invoice Num</th>
                  <th className="py-3.5 px-4">Issued To</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Tax (VAT 7.5%)</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredInvoices.map(inv => (
                  <tr key={inv.invoiceNumber} className="hover:bg-slate-50/50">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-extrabold text-slate-800 leading-tight">{inv.customerName}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">{inv.businessName}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">{inv.dateIssued}</td>
                    <td className="py-4 px-4 text-slate-500 font-medium">{inv.dueDate}</td>
                    <td className="py-4 px-4 text-right text-slate-500">{formatCurrency(inv.vat)}</td>
                    <td className="py-4 px-4 text-right text-slate-900 font-black">{formatCurrency(inv.total)}</td>
                    <td className="py-4 px-4 text-center">
                      <Badge status={inv.status} className="text-[9px]" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={handlePrint}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition"
                          title="Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href="https://pdfobject.com/pdf/sample.pdf"
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default Invoices;
