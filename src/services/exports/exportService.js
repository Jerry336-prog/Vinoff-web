import { fetchAllExportRecords } from './fetchRecords';
import { throwIfExportCancelled } from './pagination';
import { loadReportData } from './reportData';
import { EXPORT_TYPES } from './exportConfig';
import { createInvoicePDFFile, createDailyExpensePDFFile } from '../../utils/generatePDF';
import { createHistoryPDFFile } from '../../utils/exportHistory';
import { fetchLiveBusinessInfo } from '../../context/BusinessContext';
import { hasInvoiceStamp, isInvoiceStampRequiredError } from '../invoice/downloadAccess';
import { filterByExportRange, exportRangeParams, exportRangeLabel, exportDateKey, groupExportRecords } from '../../utils/exportRange';
import { createCSVContent, createExportArchive, safeExportFilename, saveExportBlob } from '../../utils/exportFiles';

const idOf = value => String(typeof value === 'object' && value ? value._id || value.id || '' : value || '');
const customerName = record => record.customerName || record.customer?.name || [record.customer?.firstName, record.customer?.lastName].filter(Boolean).join(' ');
let activeExport = false;

export const prepareExport = async (kind, options = {}) => {
  const { range = {}, customerId, adminMode, signal, onProgress, format, grouping } = options;
  const config = EXPORT_TYPES[kind];
  if (!config) throw new Error('Unsupported export type.');
  if (!adminMode && !['invoices', 'credit-invoices', 'notifications', 'orders'].includes(kind)) throw new Error('Administrator access is required for this export.');
  const params = {};
  if (customerId && adminMode) params.customerId = customerId;
  let report;
  if (config.category === 'invoice') {
    Object.assign(params, exportRangeParams(range));
    if (kind === 'credit-invoices') params.isCredit = 'true';
    const invoices = await fetchAllExportRecords('/api/invoices', { params, signal, onProgress });
    const matching = filterByExportRange(invoices, range, invoice => invoice.createdAt || invoice.date)
      .filter(invoice => (!customerId || idOf(invoice.customer) === String(customerId)) && (kind !== 'credit-invoices' || invoice.isCredit || invoice.status === 'On Credit'));
    report = {
      title: config.title,
      headers: ['Invoice', 'Issued Date', 'Customer', 'Customer Email', 'Status', 'Total (NGN)', 'Admin Stamp'],
      records: matching.map(invoice => ({
        id: idOf(invoice), date: invoice.createdAt || invoice.date, source: invoice,
        locked: !adminMode && !hasInvoiceStamp(invoice),
        cells: [invoice.invoiceNumber || idOf(invoice), exportDateKey(invoice.createdAt || invoice.date), customerName(invoice), invoice.customer?.email || '', invoice.status || '', Number(invoice.total ?? invoice.totalAmount ?? 0), invoice.issuedBy || ''],
      })),
    };
  } else if (config.category === 'expense') {
    const ledgers = await fetchAllExportRecords('/api/admin/expenses/history', { signal, onProgress });
    report = {
      title: config.title,
      headers: ['Ledger Date', 'Opening Balance (NGN)', 'Income (NGN)', 'Expenses (NGN)', 'Closing Balance (NGN)', 'Status'],
      records: filterByExportRange(ledgers, range, ledger => ledger.date).map(ledger => {
        const sum = items => (items || []).reduce((total, item) => total + Number(item.amount || 0), 0);
        const income = Number(ledger.totalIncome ?? sum(ledger.lineItems?.filter(item => item.type === 'income') || ledger.income));
        const expenses = Number(ledger.totalExpenses ?? ledger.totalExpense ?? sum(ledger.lineItems?.filter(item => item.type === 'expense') || ledger.expenses));
        const opening = Number(ledger.openingBalance || 0);
        return {
          id: idOf(ledger), date: ledger.date, source: ledger,
          cells: [exportDateKey(ledger.date), opening, income, expenses, Number(ledger.closingBalance ?? opening + income - expenses), ledger.status || ''],
        };
      }),
    };
  } else {
    report = await loadReportData(kind, { range, customerId, signal, onProgress, grouping: format === 'zip' ? grouping : undefined });
  }
  throwIfExportCancelled(signal);
  if (report.records.some(record => !record.id)) throw new Error('The server returned a record without an ID. No incomplete export can be created.');
  return { ...report, kind, config, preparedAt: new Date().toISOString() };
};

export const downloadPreparedExport = async (report, options = {}) => {
  if (activeExport) throw new Error('Another export is already running. Wait for it to finish or cancel it first.');
  activeExport = true;
  const { range = {}, customerId, customerLabel, adminMode, signal, onProgress, format, grouping = 'month' } = options;
  try {
    const available = report.records.filter(record => !record.locked);
    const skipped = report.records.filter(record => record.locked);
    const manifest = skipped.map(record => ['', record.id, exportDateKey(record.date), 'Not exported: awaiting admin stamp']);
    throwIfExportCancelled(signal);
    if (!available.length) throw new Error(skipped.length ? 'All matching invoices are awaiting an admin stamp. No download was created.' : 'No records match this date range and customer.');
    const scope = customerLabel || (customerId ? `Customer ${customerId}` : adminMode ? 'All customers / accounts' : 'Your account');
    const subtitle = `${exportRangeLabel(range)} | ${scope}`;
    const filename = safeExportFilename(`Vinoff-${report.kind}-${customerId || 'all'}-${range.startDate || 'all-dates'}${range.endDate ? `-to-${range.endDate}` : ''}`);
    let result;
    let fileCount = 1;
    if (format === 'csv') {
      result = new File([createCSVContent(report.headers, available.map(record => record.cells))], `${filename}.csv`, { type: 'text/csv;charset=utf-8' });
    } else {
      onProgress?.({ phase: 'rendering', message: 'Preparing document branding...', completed: 0, total: available.length });
      const businessInfo = await fetchLiveBusinessInfo({ signal, timeout: 45000 });
      throwIfExportCancelled(signal);
      if (format === 'pdf') {
        result = await createHistoryPDFFile(report.title, filename, report.headers, available.map(record => record.cells), { businessInfo, subtitle, signal, onProgress });
      } else if (format === 'zip') {
        const files = [];
        const groups = report.config.category ? available.map(record => [record.id, [record]]) : groupExportRecords(available, grouping);
        for (const [key, records] of groups) {
          throwIfExportCancelled(signal);
          const record = records[0];
          onProgress?.({ phase: 'rendering', message: `Creating PDF ${files.length + 1} of ${groups.length}...`, completed: files.length, total: groups.length });
          await new Promise(resolve => setTimeout(resolve, 0));
          let file;
          if (report.config.category === 'invoice') {
            try {
              file = await createInvoicePDFFile(record.source, { requireStamp: !adminMode, businessInfo, signal, timeout: 45000 });
            } catch (error) {
              if (!adminMode && isInvoiceStampRequiredError(error)) {
                skipped.push(record);
                manifest.push(['', record.id, exportDateKey(record.date), 'Not exported: awaiting admin stamp']);
                continue;
              }
              throw new Error(`Invoice ${record.source.invoiceNumber || record.id} could not be exported. No incomplete ZIP was downloaded. ${error.message}`, { cause: error });
            }
            file = new File([file], `${safeExportFilename(record.source.invoiceNumber || 'Invoice').slice(0, 100)}-${safeExportFilename(record.id)}.pdf`, { type: 'application/pdf' });
          } else if (report.config.category === 'expense') {
            file = await createDailyExpensePDFFile(record.source, { businessInfo, signal });
            file = new File([file], `Expense-${exportDateKey(record.date)}-${safeExportFilename(record.id)}.pdf`, { type: 'application/pdf' });
          } else {
            file = await createHistoryPDFFile(`${report.title} - ${key}`, `${report.kind}-${key}`, report.headers, records.map(item => item.cells), { businessInfo, subtitle, signal });
          }
          throwIfExportCancelled(signal);
          files.push(file);
          records.forEach(item => manifest.push([file.name, item.id, exportDateKey(item.date), 'Exported']));
        }
        if (!files.length) throw new Error('No stamped invoices remain available. No ZIP was downloaded.');
        fileCount = files.length;
        onProgress?.({ phase: 'packaging', message: `Packaging ${fileCount} PDFs into ZIP...`, completed: fileCount, total: fileCount });
        files.push(new File([`${report.title}\n${subtitle}\nPrepared: ${report.preparedAt}\nPDF files: ${fileCount}\nNot exported (awaiting stamp): ${skipped.length}\n\nSee export-manifest.csv for the exact record list.\n`], 'export-summary.txt', { type: 'text/plain' }));
        result = await createExportArchive(files, manifest, { signal });
      } else throw new Error('Choose a valid download format.');
    }
    throwIfExportCancelled(signal);
    saveExportBlob(result, format === 'zip' ? `${filename}.zip` : result.name);
    return { fileCount, recordCount: report.records.length - skipped.length, skippedCount: skipped.length };
  } finally {
    activeExport = false;
  }
};
