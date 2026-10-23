import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { strFromU8, unzipSync } from 'fflate';
import {
  exportDateKey, exportRangeLabel, exportRangeParams, filterByExportRange,
  groupExportRecords, resolveExportRange, validateExportRange,
} from '../src/utils/exportRange.js';
import {
  createCSVContent, createExportArchive, safeExportFilename,
} from '../src/utils/exportFiles.js';
import { collectExportPages, throwIfExportCancelled } from '../src/services/exports/pagination.js';
import { EXPORT_TYPES } from '../src/services/exports/exportConfig.js';
import { unwrapApiRecord } from '../src/utils/apiResponse.js';
import { PAYSTACK_INSTRUCTIONS, normalizePaymentInstructions } from '../src/utils/paymentInstructions.js';

const allDates = { startDate: '', endDate: '' };
const october = { startDate: '2026-10-01', endDate: '2026-10-31' };
const plain = value => JSON.parse(JSON.stringify(value));
const ids = records => Array.from(records, record => record.id || record._id);
const isAbort = error => error.name === 'AbortError';

function standardPage(items, totalItems, currentPage = 1, limit = 100) {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    success: true, message: 'Retrieved', data: items,
    meta: {
      totalItems, totalPages, currentPage, limit,
      hasNextPage: currentPage < totalPages, hasPrevPage: currentPage > 1,
    },
  };
}

function expensePage(items, total, page = 1, limit = 90) {
  return { success: true, data: items, total, page, pages: Math.ceil(total / limit) };
}

function loadVMModule(path, dependencies, names, { endBefore } = {}) {
  // Keep real service control flow without loading Vite/JSX/browser dependencies.
  let source = readFileSync(new URL(path, import.meta.url), 'utf8');
  if (endBefore) {
    assert.ok(source.includes(endBefore), `Missing module boundary: ${endBefore}`);
    source = source.slice(0, source.indexOf(endBefore));
  }
  source = source.replace(/^import\b[\s\S]*?;\r?\n/gm, '')
    .replaceAll('export const ', 'const ')
    .replace(/^export default .*;\r?\n?/gm, '');
  const context = {
    File, Blob, DOMException, AbortController, setTimeout, clearTimeout,
    ...dependencies,
  };
  vm.runInNewContext(`${source}\nglobalThis.subject = { ${names.join(', ')} };`, context, { filename: path });
  return context.subject;
}

function invoice(id, extra = {}) {
  return {
    _id: id, invoiceNumber: 'INV/001', createdAt: '2026-10-10T12:00:00Z',
    customer: { _id: 'buyer', firstName: 'Ada', lastName: 'Buyer', email: 'ada@example.test' },
    issuedBy: 'Approving Admin', status: 'Paid', total: 125,
    ...extra,
  };
}

function ledger(id, date, extra = {}) {
  return {
    _id: id, date, openingBalance: 100, totalIncome: 50,
    totalExpenses: 20, closingBalance: 130, status: 'closed', ...extra,
  };
}

function options(extra = {}) {
  return { range: allDates, adminMode: true, format: 'zip', grouping: 'month', ...extra };
}

function serviceHarness({ lists = {}, pageSize = 100, get, loadReport, ...overrides } = {}) {
  const calls = { api: [], invoice: [], expense: [], history: [], reports: [], archives: [], saves: [], business: [], bank: [] };
  const businessInfo = { businessName: 'Fixture Store', watermarkText: 'Fixture Watermark' };
  const bankDetails = { bankName: 'Fixture Bank' };
  const pdfFile = (name, content) => new File([`%PDF-1.4\n${content}\n%%EOF`], `${name}.pdf`, { type: 'application/pdf' });
  const api = { get: async (path, request) => {
    calls.api.push({ path, ...request });
    if (get) return get(path, request);
    assert.ok(Object.hasOwn(lists, path), `Unexpected list request: ${path}`);
    const limit = Math.min(request.params.limit, pageSize, path.includes('/expenses') ? 90 : 100);
    const { page } = request.params;
    const items = lists[path].slice((page - 1) * limit, page * limit);
    return path.includes('/expenses')
      ? expensePage(items, lists[path].length, page, limit)
      : standardPage(items, lists[path].length, page, limit);
  } };
  const { fetchAllExportRecords } = loadVMModule('../src/services/exports/fetchRecords.js', { api, collectExportPages }, ['fetchAllExportRecords']);
  const service = loadVMModule('../src/services/exports/exportService.js', {
    fetchAllExportRecords, throwIfExportCancelled, EXPORT_TYPES,
    filterByExportRange, exportRangeParams, exportRangeLabel, exportDateKey, groupExportRecords,
    createCSVContent, safeExportFilename,
    hasInvoiceStamp: value => typeof value?.issuedBy === 'string' && Boolean(value.issuedBy.trim()),
    isInvoiceStampRequiredError: error => error?.data?.error?.code === 'INVOICE_NOT_STAMPED',
    loadReportData: async (kind, request) => {
      calls.reports.push({ kind, ...request });
      assert.ok(loadReport, `Unexpected report request: ${kind}`);
      return loadReport(kind, request);
    },
    fetchLiveBusinessInfo: async request => {
      calls.business.push(request);
      return overrides.business ? overrides.business(request) : businessInfo;
    },
    fetchLiveBankDetails: async request => {
      calls.bank.push(request);
      return overrides.bank ? overrides.bank(request) : bankDetails;
    },
    createInvoicePDFFile: async (source, request) => {
      calls.invoice.push({ source, options: request });
      return overrides.invoicePDF ? overrides.invoicePDF(source, request) : pdfFile('same-name', source._id);
    },
    createDailyExpensePDFFile: async (source, request) => {
      calls.expense.push({ source, options: request });
      return overrides.expensePDF ? overrides.expensePDF(source, request) : pdfFile('same-name', source._id);
    },
    createHistoryPDFFile: async (title, filename, headers, rows, request) => {
      calls.history.push({ title, filename, headers, rows, options: request });
      return overrides.historyPDF
        ? overrides.historyPDF(title, filename, headers, rows, request)
        : pdfFile(filename, JSON.stringify(rows));
    },
    createExportArchive: async (files, manifest, request) => {
      calls.archives.push({ files, manifest, options: request });
      return createExportArchive(files, manifest, request);
    },
    saveExportBlob: (blob, filename) => calls.saves.push({ blob, filename }),
  }, ['prepareExport', 'downloadPreparedExport']);
  return { ...service, calls, businessInfo, bankDetails };
}

async function unzipSaved(harness) {
  assert.equal(harness.calls.saves.length, 1, 'Exactly one complete archive should be saved');
  const [{ blob, filename }] = harness.calls.saves;
  assert.equal(blob.type, 'application/zip');
  assert.match(filename, /\.zip$/);
  return unzipSync(new Uint8Array(await blob.arrayBuffer()));
}

const entryText = (archive, name) => strFromU8(archive[name]).replace(/^\ufeff/, '');

describe('exportRange: Lagos calendar boundaries and validation', () => {
  test('date keys and inclusive filtering use Lagos midnight, not the viewer timezone', () => {
    const records = [
      { id: 'before', date: '2026-09-30T22:59:59.999Z' },
      { id: 'start', date: '2026-09-30T23:00:00.000Z' },
      { id: 'end', date: '2026-10-31T22:59:59.999Z' },
      { id: 'after', date: '2026-10-31T23:00:00.000Z' },
      { id: 'date-only', date: '2026-10-31' },
      { id: 'invalid', date: 'not-a-date' },
    ];
    assert.equal(exportDateKey(records[0].date), '2026-09-30');
    assert.equal(exportDateKey(new Date(records[1].date)), '2026-10-01');
    assert.equal(exportDateKey(records[3].date), '2026-11-01');
    assert.equal(exportDateKey('not-a-date'), '');
    assert.equal(exportDateKey(null), '');
    assert.deepEqual(ids(filterByExportRange(records, october)), ['start', 'end', 'date-only']);
    assert.equal(filterByExportRange(records, allDates), records);
    assert.deepEqual(ids(filterByExportRange([{ id: 'custom', createdAt: records[1].date }], october, row => row.createdAt)), ['custom']);
    assert.deepEqual(exportRangeParams(october), {
      startDate: '2026-10-01T00:00:00.000+01:00', endDate: '2026-10-31T23:59:59.999+01:00',
    });
    assert.equal(new Date(exportRangeParams(october).startDate).toISOString(), records[1].date);
    assert.equal(new Date(exportRangeParams(october).endDate).toISOString(), records[2].date);
    assert.deepEqual(exportRangeParams(allDates), {});
    assert.match(exportRangeLabel(october), /2026-10-01 to 2026-10-31 \(Lagos time\)/);
    assert.equal(exportRangeLabel(allDates), 'All dates');
  });

  test('month presets handle leap years, century exceptions, and year-end', () => {
    for (const [month, endDate] of [
      ['2024-02', '2024-02-29'], ['2025-02', '2025-02-28'],
      ['2000-02', '2000-02-29'], ['1900-02', '1900-02-28'], ['2026-12', '2026-12-31'],
    ]) {
      assert.deepEqual(resolveExportRange({ period: 'month', month }), { startDate: `${month}-01`, endDate });
    }
  });

  test('all four quarters and a full year resolve inclusive endpoints', () => {
    for (const [quarter, startDate, endDate] of [
      [1, '2024-01-01', '2024-03-31'], [2, '2024-04-01', '2024-06-30'],
      [3, '2024-07-01', '2024-09-30'], [4, '2024-10-01', '2024-12-31'],
    ]) {
      assert.deepEqual(resolveExportRange({ period: 'quarter', quarter: String(quarter), year: '2024' }), { startDate, endDate });
    }
    assert.deepEqual(resolveExportRange({ period: 'year', year: '2024' }), { startDate: '2024-01-01', endDate: '2024-12-31' });
    assert.deepEqual(resolveExportRange({ period: 'all' }), allDates);
    const sameDay = { startDate: '2024-02-29', endDate: '2024-02-29' };
    assert.deepEqual(resolveExportRange({ period: 'custom', ...sameDay }), sameDay);
    assert.equal(validateExportRange(sameDay), '');
  });

  test('invalid dates, inverted or partial custom ranges, periods, quarters and years are rejected', () => {
    for (const range of [
      { startDate: '2025-02-29', endDate: '2025-03-01' },
      { startDate: '2024-02-30', endDate: '2024-03-01' },
      { startDate: '2026-04-31', endDate: '2026-05-01' },
      { startDate: '2026-1-01', endDate: '2026-01-31' },
      { startDate: '2026-12-31', endDate: '2026-01-01' },
      { startDate: '2026-01-01', endDate: '' },
      { startDate: '', endDate: '2026-01-31' },
    ]) {
      assert.ok(validateExportRange(range));
      assert.throws(() => resolveExportRange({ period: 'custom', ...range }));
      assert.throws(() => filterByExportRange([], range));
    }
    assert.equal(validateExportRange(), '');
    assert.throws(() => resolveExportRange({ period: 'custom' }), /Choose/);
    for (const month of ['2026-00', '2026-13', '2026-2', '1899-12', 'not-a-month']) {
      assert.throws(() => resolveExportRange({ period: 'month', month }));
    }
    for (const quarter of [0, 5, 1.5, 'Q1']) {
      assert.throws(() => resolveExportRange({ period: 'quarter', quarter, year: 2026 }));
    }
    for (const year of [1899, 10000, 2026.5, 'invalid', undefined]) {
      assert.throws(() => resolveExportRange({ period: 'year', year }));
    }
    assert.throws(() => resolveExportRange({ period: 'weekly', year: 2026 }), /valid date period/);
  });

  test('archive grouping is ordered, includes years, and preserves undated records', () => {
    const records = [
      { id: 'february', date: '2026-01-31T23:00:00Z' },
      { id: 'previous-year', date: '2025-12-30T12:00:00Z' },
      { id: 'january', date: '2026-01-31T22:59:59.999Z' },
      { id: 'undated', date: '' },
    ];
    assert.deepEqual(groupExportRecords(records).map(([key, rows]) => [key, ids(rows)]), [
      ['2025-12', ['previous-year']], ['2026-01', ['january']], ['2026-02', ['february']], ['undated', ['undated']],
    ]);
    assert.deepEqual(groupExportRecords(records, 'year').map(([key, rows]) => [key, ids(rows)]), [
      ['2025', ['previous-year']], ['2026', ['february', 'january']], ['undated', ['undated']],
    ]);
    assert.equal(groupExportRecords(records, 'day')[2][0], '2026-02-01');
    assert.throws(() => groupExportRecords(records, 'quarter'), /valid archive grouping/);
  });
});

describe('pagination: complete retrieval or explicit failure', () => {
  for (const [name, limit, envelope] of [['standard', 100, standardPage], ['expenses', 90, expensePage]]) {
    test(`${name} retrieves every page despite server-capped sizes`, async () => {
      const records = Array.from({ length: limit * 2 + 7 }, (_, index) => ({ _id: `row-${index}` }));
      const requested = [];
      const progress = [];
      const result = await collectExportPages(async page => {
        requested.push(page);
        return envelope(records.slice((page - 1) * limit, page * limit), records.length, page, limit);
      }, { onProgress: event => progress.push(event) });
      assert.deepEqual(result, records);
      assert.deepEqual(requested, [1, 2, 3]);
      assert.deepEqual(progress.map(event => event.completed), [limit, limit * 2, records.length]);
      assert.ok(progress.every(event => event.total === records.length && event.phase === 'loading'));
    });
  }

  test('empty standard and expense envelopes terminate after one request', async () => {
    for (const envelope of [standardPage, expensePage]) {
      let requests = 0;
      assert.deepEqual(await collectExportPages(async () => { requests++; return envelope([], 0); }), []);
      assert.equal(requests, 1);
    }
  });

  test('nested and alternate standard pagination envelopes are supported', async () => {
    for (const variant of ['nested', 'pagination', 'data-pagination', 'data-meta']) {
      const result = await collectExportPages(async page => {
        const response = standardPage([{ _id: String(page) }], 2, page, 1);
        if (variant === 'nested') return { ...response, meta: { pagination: response.meta } };
        if (variant.startsWith('data-')) {
          return { success: true, data: { items: response.data, [variant.slice(5)]: response.meta } };
        }
        return { success: true, data: response.data, pagination: response.meta };
      });
      assert.deepEqual(ids(result), ['1', '2']);
    }
  });

  test('a repeated/wrong server page is rejected rather than saved', async () => {
    await assert.rejects(collectExportPages(async page =>
      standardPage([{ _id: String(page) }], 2, 1, 1)), /wrong export page/);
  });

  test('duplicates within a page, across pages, and numeric/string IDs are rejected', async () => {
    await assert.rejects(collectExportPages(async () => standardPage([{ _id: 'a' }, { _id: 'a' }], 2)), /repeated/);
    await assert.rejects(collectExportPages(async page => standardPage([{ id: page === 1 ? 7 : '7' }], 2, page, 1)), /repeated/);
  });

  test('increasing or decreasing totals reject the whole retrieval', async () => {
    for (const laterTotal of [2, 4]) {
      await assert.rejects(collectExportPages(async page =>
        standardPage([{ _id: String(page) }], page === 1 ? 3 : laterTotal, page, 1)), /Records changed/);
    }
  });

  test('an early terminal page or empty intermediate page cannot silently truncate', async () => {
    await assert.rejects(collectExportPages(async () => ({
      ...standardPage([{ _id: 'a' }], 2, 1, 1), meta: { totalItems: 2, currentPage: 1, hasNextPage: false },
    })), /incomplete.*export/);
    await assert.rejects(collectExportPages(async page =>
      standardPage(page === 1 ? [{ _id: 'a' }] : [], 3, page, 1)), /stopped returning new records/);
  });

  test('receiving more records than the advertised total is inconsistent and must reject', async () => {
    await assert.rejects(collectExportPages(async () => standardPage([{ _id: 'a' }, { _id: 'b' }], 1)), /incomplete|changed|total|inconsistent/i);
  });

  test('a failed later page propagates the failure instead of returning a partial array', async () => {
    const failure = new Error('Page 2 unavailable');
    const requested = [];
    await assert.rejects(collectExportPages(async page => {
      requested.push(page);
      if (page === 2) throw failure;
      return standardPage([{ _id: 'first' }], 2, page, 1);
    }), error => error === failure);
    assert.deepEqual(requested, [1, 2]);
  });

  test('an unsuccessful JSON response on a later page rejects even without an HTTP error', async () => {
    await assert.rejects(collectExportPages(async page => page === 1
      ? standardPage([{ _id: 'first' }], 2, 1, 1)
      : { success: false, message: 'Export permission expired', data: [] }), /Export permission expired/);
  });

  test('cancellation before the first request makes no request', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(collectExportPages(() => assert.fail('Must not request after cancellation'), { signal: controller.signal }), isAbort);
  });

  test('cancellation during a later request discards all fetched records', async () => {
    const controller = new AbortController();
    const requested = [];
    await assert.rejects(collectExportPages(async page => {
      requested.push(page);
      if (page === 2) controller.abort();
      return standardPage([{ _id: String(page) }], 3, page, 1);
    }, { signal: controller.signal }), isAbort);
    assert.deepEqual(requested, [1, 2]);
  });
});

describe('exportFiles: real ZIP entries and formula-safe CSV', () => {
  test('CSV quotes every cell, escapes quotes/newlines, includes a BOM, and preserves numeric zeros', () => {
    const csv = createCSVContent(['Name', 'Notes', 'Amount', 'Optional'], [
      ['Ada, Buyer', 'He said "hello"\r\nnext line', 0, null],
      ['Plain', 'Ordinary text', -25, undefined],
    ]);
    assert.equal(csv, '\ufeff"Name","Notes","Amount","Optional"\r\n"Ada, Buyer","He said ""hello""\r\nnext line","0",""\r\n"Plain","Ordinary text","-25",""');
  });

  test('formula-like string cells and headers are neutralized, but negative numbers stay numeric', () => {
    for (const value of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '   =1', '\tcommand', '\rcommand']) {
      assert.equal(createCSVContent([value], [[value]]), `\ufeff"'${value}"\r\n"'${value}"`);
    }
    assert.equal(createCSVContent(['Value'], [[-12.5], [12], [false]]), '\ufeff"Value"\r\n"-12.5"\r\n"12"\r\n"false"');
  });

  test('filenames strip traversal, invalid characters and control bytes and have a bounded length', () => {
    assert.equal(safeExportFilename('../Q1:Sales?.pdf'), '_Q1_Sales_.pdf');
    assert.equal(safeExportFilename('A\\B\u0000C.pdf'), 'A_B_C.pdf');
    assert.equal(safeExportFilename('...'), 'export');
    assert.equal(safeExportFilename('x'.repeat(200)).length, 160);
  });

  test('real fflate decompression verifies separate PDF bytes and the exact safe manifest', async () => {
    const files = [new File(['%PDF-one'], 'Invoice:one.pdf'), new File(['%PDF-two'], 'Invoice?two.pdf')];
    const manifest = [['Invoice_one.pdf', '=record', '2026-10-01', 'Exported'], ['Invoice_two.pdf', '@record', '2026-10-02', 'Exported']];
    const blob = await createExportArchive(files, manifest);
    assert.equal(blob.type, 'application/zip');
    const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    assert.deepEqual(Object.keys(archive).sort(), ['Invoice_one.pdf', 'Invoice_two.pdf', 'export-manifest.csv']);
    assert.equal(entryText(archive, 'Invoice_one.pdf'), '%PDF-one');
    assert.equal(entryText(archive, 'Invoice_two.pdf'), '%PDF-two');
    assert.equal(entryText(archive, 'export-manifest.csv'), createCSVContent(['File', 'Record', 'Date', 'Result'], manifest).replace(/^\ufeff/, ''));
    assert.match(entryText(archive, 'export-manifest.csv'), /"'=record"/);
    assert.match(entryText(archive, 'export-manifest.csv'), /"'@record"/);
  });

  test('sanitization collisions reject instead of overwriting a file', async () => {
    await assert.rejects(createExportArchive([
      new File(['one'], 'Invoice:1.pdf'), new File(['two'], 'Invoice?1.pdf'),
    ], []), /Duplicate archive filename/);
  });

  test('the generated manifest cannot silently overwrite a supplied file with the reserved name', async () => {
    await assert.rejects(createExportArchive([new File(['must not disappear'], 'export-manifest.csv')], []), /duplicate|reserved|manifest/i);
  });

  test('archive cancellation before and during file reads rejects', async () => {
    const before = new AbortController();
    before.abort();
    await assert.rejects(createExportArchive([], [], { signal: before.signal }), isAbort);
    const during = new AbortController();
    await assert.rejects(createExportArchive([{
      name: 'cancelled.pdf', arrayBuffer: async () => { during.abort(); return new ArrayBuffer(0); },
    }], [], { signal: during.signal }), isAbort);
  });
});

describe('exportService: scoped preparation and complete download orchestration', () => {
  test('invoice preparation sends inclusive range/customer server params and rechecks local scope', async () => {
    const records = [
      invoice('before', { createdAt: '2026-09-30T22:59:59.999Z' }),
      invoice('start', { createdAt: '2026-09-30T23:00:00.000Z' }),
      invoice('end', { customer: 'buyer', createdAt: '2026-10-31T22:59:59.999Z' }),
      invoice('after', { createdAt: '2026-10-31T23:00:00.000Z' }),
      invoice('other', { customer: { _id: 'other', firstName: 'Ada', lastName: 'Buyer' } }),
    ];
    const harness = serviceHarness({ lists: { '/api/invoices': records }, pageSize: 2 });
    const signal = new AbortController().signal;
    const onProgress = () => {};
    const report = await harness.prepareExport('invoices', options({ range: october, customerId: 'buyer', signal, onProgress }));
    assert.deepEqual(ids(report.records), ['start', 'end']);
    assert.ok(report.records.every(record => !record.locked));
    assert.deepEqual(harness.calls.api.map(call => plain(call.params)), [1, 2, 3].map(page => ({
      customerId: 'buyer', ...exportRangeParams(october), page, limit: 100,
    })));
    assert.ok(harness.calls.api.every(call => call.path === '/api/invoices' && call.signal === signal));
    assert.ok(Number.isFinite(Date.parse(report.preparedAt)));
    assert.equal(harness.calls.saves.length, 0);
  });

  test('credit preparation sends isCredit and retains credit flag or legacy On Credit status', async () => {
    const harness = serviceHarness({ lists: { '/api/invoices': [
      invoice('flagged', { isCredit: true, status: 'Paid' }),
      invoice('legacy', { status: 'On Credit' }), invoice('cash'),
    ] } });
    const report = await harness.prepareExport('credit-invoices', options());
    assert.deepEqual(ids(report.records), ['flagged', 'legacy']);
    assert.deepEqual(plain(harness.calls.api[0].params), { isCredit: 'true', page: 1, limit: 100 });
  });

  test('customer mode preserves server account scope, rechecks local scope, and locks unstamped paid invoices', async () => {
    const harness = serviceHarness({ lists: { '/api/invoices': [
      invoice('stamped'), invoice('blank', { issuedBy: '' }),
      invoice('whitespace', { issuedBy: '  ', createdBy: { name: 'Not a stamp' } }),
    ] } });
    const report = await harness.prepareExport('invoices', options({ adminMode: false, customerId: 'buyer' }));
    assert.deepEqual(plain(harness.calls.api[0].params), { page: 1, limit: 100 });
    assert.deepEqual(Array.from(report.records, row => [row.id, row.locked]), [['stamped', false], ['blank', true], ['whitespace', true]]);
    const other = await harness.prepareExport('invoices', options({ adminMode: false, customerId: 'other' }));
    assert.deepEqual(ids(other.records), []);
    assert.deepEqual(plain(harness.calls.api[1].params), { page: 1, limit: 100 });
  });

  test('expense preparation paginates all days before applying inclusive local date filtering', async () => {
    const harness = serviceHarness({ lists: { '/api/admin/expenses/history': [
      ledger('before', '2026-09-30'), ledger('start', '2026-10-01'),
      ledger('end', '2026-10-31'), ledger('after', '2026-11-01'),
    ] }, pageSize: 2 });
    const report = await harness.prepareExport('expenses', options({ range: october }));
    assert.deepEqual(ids(report.records), ['start', 'end']);
    assert.deepEqual(harness.calls.api.map(call => plain(call.params)), [{ page: 1, limit: 100 }, { page: 2, limit: 100 }]);
    assert.deepEqual(Array.from(report.records[0].cells), ['2026-10-01', 100, 50, 20, 130, 'closed']);
  });

  test('expense summaries derive absent totals and closing balance from typed line items', async () => {
    const harness = serviceHarness({ lists: { '/api/admin/expenses/history': [{
      _id: 'derived', date: '2026-10-01', openingBalance: '100', closingBalance: null, status: 'open',
      lineItems: [
        { type: 'income', amount: '40.25' }, { type: 'income', amount: 9.75 },
        { type: 'expense', amount: '12.50' }, { type: 'income' }, { type: 'other', amount: 999 },
      ],
      income: [{ amount: 9999 }], expenses: [{ amount: 9999 }],
    }] } });
    const report = await harness.prepareExport('expenses', options());
    assert.deepEqual(Array.from(report.records[0].cells), ['2026-10-01', 100, 50, 12.5, 137.5, 'open']);
  });

  test('expense summaries fall back to income and expense arrays when lineItems is absent', async () => {
    const harness = serviceHarness({ lists: { '/api/admin/expenses/history': [{
      _id: 'raw-arrays', date: '2026-10-02', openingBalance: '10',
      totalIncome: null, totalExpenses: undefined, totalExpense: null,
      income: [{ amount: 30 }, { amount: '5' }], expenses: [{ amount: '15' }, { amount: 0 }, {}],
    }, { _id: 'empty', date: '2026-10-03', openingBalance: '25', closingBalance: null }] } });
    const report = await harness.prepareExport('expenses', options());
    assert.deepEqual(Array.from(report.records[0].cells), ['2026-10-02', 10, 35, 15, 30, '']);
    assert.deepEqual(Array.from(report.records[1].cells), ['2026-10-03', 25, 0, 0, 25, '']);
  });

  test('expense summaries preserve explicit zero totals/balances and respect totalExpense alias precedence', async () => {
    const harness = serviceHarness({ lists: { '/api/admin/expenses/history': [
      ledger('zero', '2026-10-01', {
        openingBalance: 0, totalIncome: 0, totalExpenses: 0, totalExpense: 999, closingBalance: 0,
        lineItems: [{ type: 'income', amount: 100 }, { type: 'expense', amount: 50 }],
      }),
      ledger('alias', '2026-10-02', { openingBalance: 20, totalIncome: '10', totalExpenses: null, totalExpense: '7.5', closingBalance: null }),
      ledger('preferred', '2026-10-03', { totalExpenses: '9', totalExpense: 999, closingBalance: '100' }),
    ] } });
    const report = await harness.prepareExport('expenses', options());
    assert.deepEqual(Array.from(report.records[0].cells), ['2026-10-01', 0, 0, 0, 0, 'closed']);
    assert.deepEqual(Array.from(report.records[1].cells), ['2026-10-02', 20, 10, 7.5, 22.5, 'closed']);
    assert.deepEqual(Array.from(report.records[2].cells), ['2026-10-03', 100, 50, 9, 100, 'closed']);
  });

  for (const [kind, format] of [['invoices', 'zip'], ['expenses', 'zip'], ['orders', 'zip'], ['orders', 'pdf']]) {
    test(`${kind}/${format}: batch requests forward the exact abort signal and bounded branding/invoice timeouts`, async () => {
      const harness = serviceHarness({
        lists: { '/api/invoices': [invoice('a')], '/api/admin/expenses/history': [ledger('a', '2026-10-01')] },
        loadReport: async () => ({ title: 'Orders', headers: ['ID'], records: [{ id: 'a', date: '2026-10-01', cells: ['a'] }] }),
      });
      const signal = new AbortController().signal;
      const config = options({ signal, format });
      await harness.downloadPreparedExport(await harness.prepareExport(kind, config), config);
      assert.equal(harness.calls.business.length, 1);
      assert.equal(harness.calls.business[0].signal, signal);
      assert.equal(harness.calls.business[0].timeout, 45000);
      for (const call of [...harness.calls.invoice, ...harness.calls.expense, ...harness.calls.history]) {
        assert.equal(call.options.signal, signal);
      }
      if (kind === 'invoices') {
        assert.equal(harness.calls.bank.length, 0);
        assert.equal(harness.calls.invoice[0].options.timeout, 45000);
      } else {
        assert.equal(harness.calls.bank.length, 0);
      }
      if (format === 'zip') assert.equal(harness.calls.archives[0].options.signal, signal);
      assert.equal(harness.calls.saves.length, 1);
    });
  }

  for (const stage of ['business']) {
    test(`cancellation during ${stage} lookup reaches the pending request and saves nothing`, { timeout: 2000 }, async () => {
      const controller = new AbortController();
      let started;
      const pending = new Promise(resolve => { started = resolve; });
      const harness = serviceHarness({
        lists: { '/api/invoices': [invoice('a')] },
        [stage]: request => new Promise((_resolve, reject) => {
          assert.equal(request.signal, controller.signal);
          assert.equal(request.timeout, 45000);
          request.signal.addEventListener('abort', () => reject(new DOMException('Request cancelled', 'AbortError')), { once: true });
          started();
        }),
      });
      const report = await harness.prepareExport('invoices', options());
      const download = harness.downloadPreparedExport(report, options({ signal: controller.signal }));
      const rejected = assert.rejects(download, isAbort);
      await pending;
      controller.abort();
      await rejected;
      assert.equal(harness.calls.invoice.length + harness.calls.archives.length + harness.calls.saves.length, 0);
    });
  }

  test('unknown kinds, non-admin reports, missing IDs, and failed later pages never save', async () => {
    const harness = serviceHarness({ lists: { '/api/invoices': [invoice('')] } });
    await assert.rejects(harness.prepareExport('not-an-export', options()), /Unsupported export type/);
    await assert.rejects(harness.prepareExport('expenses', options({ adminMode: false })), /Administrator access/);
    await assert.rejects(harness.prepareExport('invoices', options()), /without an ID/);
    const failed = serviceHarness({ get: async (_path, request) => {
      if (request.params.page === 2) throw new Error('Later invoice page failed');
      return standardPage([invoice('first')], 2, 1, 1);
    } });
    await assert.rejects(failed.prepareExport('invoices', options()), /Later invoice page failed/);
    assert.equal(failed.calls.saves.length, 0);
    assert.equal(harness.calls.saves.length, 0);
  });

  test('invoice ZIP preserves distinct documents with colliding display numbers and exact manifest rows', async () => {
    const harness = serviceHarness({ lists: { '/api/invoices': [
      invoice('inv-a', { invoiceNumber: 'INV/001', issuedBy: '' }),
      invoice('inv-b', { invoiceNumber: 'INV:001' }),
    ] } });
    const config = options({ range: october, customerId: 'buyer', customerLabel: 'Ada Buyer' });
    const report = await harness.prepareExport('invoices', config);
    const result = await harness.downloadPreparedExport(report, config);
    assert.deepEqual(plain(result), { fileCount: 2, recordCount: 2, skippedCount: 0 });
    const archive = await unzipSaved(harness);
    assert.deepEqual(Object.keys(archive).sort(), ['INV_001-inv-a.pdf', 'INV_001-inv-b.pdf', 'export-manifest.csv', 'export-summary.txt']);
    assert.match(entryText(archive, 'INV_001-inv-a.pdf'), /inv-a/);
    assert.match(entryText(archive, 'INV_001-inv-b.pdf'), /inv-b/);
    assert.equal(entryText(archive, 'export-manifest.csv'), [
      '"File","Record","Date","Result"',
      '"INV_001-inv-a.pdf","inv-a","2026-10-10","Exported"',
      '"INV_001-inv-b.pdf","inv-b","2026-10-10","Exported"',
    ].join('\r\n'));
    assert.match(entryText(archive, 'export-summary.txt'), /PDF files: 2/);
    assert.match(entryText(archive, 'export-summary.txt'), /Ada Buyer/);
    assert.match(harness.calls.saves[0].filename, /buyer-2026-10-01-to-2026-10-31\.zip$/);
    assert.equal(harness.calls.business.length, 1);
    assert.equal(harness.calls.bank.length, 0);
    assert.ok(harness.calls.invoice.every(call => call.options.requireStamp === false && call.options.businessInfo === harness.businessInfo && call.options.bankDetails === undefined));
  });

  test('expense ZIP creates one named PDF per ledger, not a merged summary', async () => {
    const harness = serviceHarness({ lists: { '/api/admin/expenses/history': [ledger('day-a', '2026-10-01'), ledger('day-b', '2026-10-02')] } });
    const report = await harness.prepareExport('expenses', options());
    assert.deepEqual(plain(await harness.downloadPreparedExport(report, options())), { fileCount: 2, recordCount: 2, skippedCount: 0 });
    const archive = await unzipSaved(harness);
    assert.deepEqual(Object.keys(archive).sort(), ['Expense-2026-10-01-day-a.pdf', 'Expense-2026-10-02-day-b.pdf', 'export-manifest.csv', 'export-summary.txt']);
    assert.match(entryText(archive, 'Expense-2026-10-01-day-a.pdf'), /day-a/);
    assert.match(entryText(archive, 'Expense-2026-10-02-day-b.pdf'), /day-b/);
    assert.match(entryText(archive, 'export-manifest.csv'), /"Expense-2026-10-02-day-b.pdf","day-b","2026-10-02","Exported"/);
    assert.equal(harness.calls.expense.length, 2);
    assert.equal(harness.calls.history.length, 0);
    assert.equal(harness.calls.bank.length, 0);
    assert.ok(harness.calls.expense.every(call => call.options.businessInfo === harness.businessInfo));
  });

  for (const kind of ['invoices', 'expenses']) {
    test(`${kind}: a later PDF failure saves no partial ZIP and releases the export lock`, async () => {
      const failure = new Error('Second PDF failed');
      let fail = true;
      const render = async source => {
        if (source._id === 'second' && fail) throw failure;
        return new File([`%PDF-${source._id}`], 'document.pdf', { type: 'application/pdf' });
      };
      const harness = serviceHarness(kind === 'invoices'
        ? { lists: { '/api/invoices': [invoice('first'), invoice('second')] }, invoicePDF: render }
        : { lists: { '/api/admin/expenses/history': [ledger('first', '2026-10-01'), ledger('second', '2026-10-02')] }, expensePDF: render });
      const report = await harness.prepareExport(kind, options());
      await assert.rejects(harness.downloadPreparedExport(report, options()), error => {
        assert.match(error.message, /Second PDF failed/);
        if (kind === 'invoices') {
          assert.match(error.message, /No incomplete ZIP/);
          assert.equal(error.cause, failure);
        }
        return true;
      });
      assert.equal(harness.calls.saves.length, 0);
      assert.equal(harness.calls.archives.length, 0);
      fail = false;
      await harness.downloadPreparedExport(report, options());
      assert.equal(Object.keys(await unzipSaved(harness)).filter(name => name.endsWith('.pdf')).length, 2);
    });
  }

  test('customer ZIP skips locked invoices visibly in manifest and summary and requires a stamp on rendered invoices', async () => {
    const harness = serviceHarness({ lists: { '/api/invoices': [invoice('ready'), invoice('locked', { issuedBy: '' })] } });
    const config = options({ adminMode: false });
    const report = await harness.prepareExport('invoices', config);
    assert.deepEqual(plain(await harness.downloadPreparedExport(report, config)), { fileCount: 1, recordCount: 1, skippedCount: 1 });
    const archive = await unzipSaved(harness);
    assert.deepEqual(Object.keys(archive).filter(name => name.endsWith('.pdf')), ['INV_001-ready.pdf']);
    assert.match(entryText(archive, 'export-manifest.csv'), /"","locked","2026-10-10","Not exported: awaiting admin stamp"/);
    assert.match(entryText(archive, 'export-summary.txt'), /Not exported \(awaiting stamp\): 1/);
    assert.equal(harness.calls.invoice.length, 1);
    assert.equal(harness.calls.invoice[0].options.requireStamp, true);
  });

  test('a stamp revoked during rendering is listed as skipped; all revoked stamps save nothing', async () => {
    const denied = () => Object.assign(new Error('Stamp revoked'), { data: { error: { code: 'INVOICE_NOT_STAMPED' } } });
    const harness = serviceHarness({
      lists: { '/api/invoices': [invoice('revoked'), invoice('ready')] },
      invoicePDF: async source => {
        if (source._id === 'revoked') throw denied();
        return new File(['%PDF-ready'], 'ready.pdf', { type: 'application/pdf' });
      },
    });
    const config = options({ adminMode: false });
    const report = await harness.prepareExport('invoices', config);
    assert.deepEqual(plain(await harness.downloadPreparedExport(report, config)), { fileCount: 1, recordCount: 1, skippedCount: 1 });
    assert.match(entryText(await unzipSaved(harness), 'export-manifest.csv'), /"","revoked"/);
    const none = serviceHarness({ lists: { '/api/invoices': [invoice('revoked')] }, invoicePDF: async () => { throw denied(); } });
    await assert.rejects(none.downloadPreparedExport(await none.prepareExport('invoices', config), config), /No ZIP was downloaded/);
    assert.equal(none.calls.saves.length, 0);
  });

  test('grouped report ZIP uses Lagos months, separates years, and retains every row in the manifest', async () => {
    const records = [
      { id: 'feb', date: '2026-01-31T23:00:00Z', cells: ['feb', 20] },
      { id: 'jan-a', date: '2026-01-15T12:00:00Z', cells: ['jan-a', 10] },
      { id: 'jan-b', date: '2026-01-31T22:59:59.999Z', cells: ['jan-b', 15] },
      { id: 'prior-year', date: '2025-01-15T12:00:00Z', cells: ['prior-year', 5] },
      { id: 'undated', date: '', cells: ['undated', 1] },
    ];
    const harness = serviceHarness({ loadReport: async () => ({ title: 'Orders and Sales', headers: ['Order', 'Total'], records }) });
    const signal = new AbortController().signal;
    const config = options({ signal, customerId: 'buyer' });
    const report = await harness.prepareExport('orders', config);
    assert.equal(harness.calls.reports[0].grouping, 'month');
    assert.equal(harness.calls.reports[0].customerId, 'buyer');
    assert.equal(harness.calls.reports[0].signal, signal);
    assert.deepEqual(plain(await harness.downloadPreparedExport(report, config)), { fileCount: 4, recordCount: 5, skippedCount: 0 });
    const archive = await unzipSaved(harness);
    assert.deepEqual(Object.keys(archive).sort(), ['export-manifest.csv', 'export-summary.txt', 'orders-2025-01.pdf', 'orders-2026-01.pdf', 'orders-2026-02.pdf', 'orders-undated.pdf']);
    assert.deepEqual(harness.calls.history.map(call => plain(call.rows)), [
      [['prior-year', 5]], [['jan-a', 10], ['jan-b', 15]], [['feb', 20]], [['undated', 1]],
    ]);
    assert.match(entryText(archive, 'orders-2026-01.pdf'), /jan-a.*jan-b/);
    assert.doesNotMatch(entryText(archive, 'orders-2026-01.pdf'), /feb/);
    assert.equal(entryText(archive, 'export-manifest.csv').split('\r\n').length, records.length + 1);
    assert.equal(harness.calls.invoice.length + harness.calls.expense.length, 0);
  });

  test('CSV downloads neutralize formulas and do not fetch branding or render PDFs', async () => {
    const harness = serviceHarness({ loadReport: async () => ({
      title: 'Orders', headers: ['Order', 'Amount'], records: [{ id: 'a', date: '', cells: ['=SUM(A1)', -10] }],
    }) });
    const config = options({ format: 'csv' });
    const report = await harness.prepareExport('orders', config);
    assert.equal(harness.calls.reports[0].grouping, undefined);
    assert.deepEqual(plain(await harness.downloadPreparedExport(report, config)), { fileCount: 1, recordCount: 1, skippedCount: 0 });
    assert.equal(harness.calls.saves.length, 1);
    assert.match(await harness.calls.saves[0].blob.text(), /"'=SUM\(A1\)","-10"/);
    assert.match(harness.calls.saves[0].filename, /\.csv$/);
    assert.equal(harness.calls.business.length + harness.calls.history.length + harness.calls.archives.length, 0);
  });

  test('empty or wholly locked reports do not save a file', async () => {
    for (const records of [[], [invoice('locked', { issuedBy: '' })]]) {
      const harness = serviceHarness({ lists: { '/api/invoices': records } });
      const config = options({ adminMode: false });
      await assert.rejects(harness.downloadPreparedExport(await harness.prepareExport('invoices', config), config), /No records|awaiting an admin stamp/);
      assert.equal(harness.calls.saves.length, 0);
    }
  });

  test('preparation cancellation after loading rejects without saving', async () => {
    const controller = new AbortController();
    const harness = serviceHarness({ get: async () => {
      controller.abort();
      return standardPage([invoice('a')], 1);
    } });
    await assert.rejects(harness.prepareExport('invoices', options({ signal: controller.signal })), isAbort);
    assert.equal(harness.calls.saves.length, 0);
  });

  for (const format of ['csv', 'pdf', 'zip']) {
    test(`${format}: already-cancelled downloads do not render or save`, async () => {
      const harness = serviceHarness({ lists: { '/api/invoices': [invoice('a')] } });
      const report = await harness.prepareExport('invoices', options());
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(harness.downloadPreparedExport(report, options({ format, signal: controller.signal })), isAbort);
      assert.equal(harness.calls.saves.length + harness.calls.invoice.length + harness.calls.history.length + harness.calls.business.length, 0);
    });
  }

  for (const kind of ['invoices', 'expenses', 'orders']) {
    test(`${kind}: cancellation during PDF generation saves no archive`, async () => {
      const controller = new AbortController();
      const cancelledPDF = async () => {
        controller.abort();
        return new File(['%PDF-cancelled'], 'cancelled.pdf', { type: 'application/pdf' });
      };
      const harness = serviceHarness({
        lists: { '/api/invoices': [invoice('a')], '/api/admin/expenses/history': [ledger('a', '2026-10-01')] },
        loadReport: async () => ({ title: 'Orders', headers: ['ID'], records: [{ id: 'a', date: '2026-10-01', cells: ['a'] }] }),
        invoicePDF: cancelledPDF, expensePDF: cancelledPDF, historyPDF: cancelledPDF,
      });
      const report = await harness.prepareExport(kind, options());
      await assert.rejects(harness.downloadPreparedExport(report, options({ signal: controller.signal })), isAbort);
      assert.equal(harness.calls.saves.length + harness.calls.archives.length, 0);
    });
  }

  test('cancellation after rendering, immediately before ZIP packaging, does not save', async () => {
    const controller = new AbortController();
    const harness = serviceHarness({ lists: { '/api/invoices': [invoice('a')] } });
    const report = await harness.prepareExport('invoices', options());
    await assert.rejects(harness.downloadPreparedExport(report, options({
      signal: controller.signal,
      onProgress: event => { if (event.phase === 'packaging') controller.abort(); },
    })), isAbort);
    assert.equal(harness.calls.saves.length, 0);
  });

  test('concurrent downloads are rejected without disrupting the first export', async () => {
    let started;
    let release;
    const rendering = new Promise(resolve => { started = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    const harness = serviceHarness({ lists: { '/api/invoices': [invoice('a')] }, invoicePDF: async () => {
      started();
      await gate;
      return new File(['%PDF-a'], 'a.pdf', { type: 'application/pdf' });
    } });
    const report = await harness.prepareExport('invoices', options());
    const first = harness.downloadPreparedExport(report, options());
    await rendering;
    try {
      await assert.rejects(harness.downloadPreparedExport(report, options()), /Another export is already running/);
      assert.equal(harness.calls.saves.length, 0);
    } finally {
      release();
      await first;
    }
    assert.equal(harness.calls.saves.length, 1);
  });
});

describe('export request helpers: cancellation and timeout forwarding', () => {
  test('live branding helpers forward the provided request options to both settings APIs', async () => {
    const calls = [];
    const cache = new Map();
    const { fetchLiveBusinessInfo, fetchLiveBankDetails } = loadVMModule('../src/context/BusinessContext.jsx', {
      unwrapApiRecord,
      PAYSTACK_INSTRUCTIONS, normalizePaymentInstructions,
      api: { get: async (path, request) => {
        calls.push({ path, request });
        return { success: true, data: path.endsWith('bank-details') ? { bankName: 'Test Bank' } : { businessName: 'Test Store' } };
      } },
      localStorage: { getItem: key => cache.get(key), setItem: (key, value) => cache.set(key, value) },
    }, ['fetchLiveBusinessInfo', 'fetchLiveBankDetails'], { endBefore: 'export const BusinessContext =' });
    const signal = new AbortController().signal;
    const request = { signal, timeout: 45000 };
    assert.equal((await fetchLiveBusinessInfo(request)).businessName, 'Test Store');
    assert.equal((await fetchLiveBankDetails(request)).bankName, 'Test Bank');
    assert.deepEqual(calls.map(call => call.path), ['/api/settings/store-location', '/api/settings/bank-details']);
    assert.ok(calls.every(call => call.request === request));
    assert.ok(cache.has('vinoff_business_info_v1'));
    assert.ok(cache.has('vinoff_bank_details_v1'));
  });

  for (const requireStamp of [true, false]) {
    test(`invoice request helper forwards signal and 45-second timeout with requireStamp=${requireStamp}`, async () => {
      const calls = [];
      const { fetchInvoiceForExport } = loadVMModule('../src/services/invoice/downloadAccess.js', {
        unwrapApiRecord,
        showModal: () => assert.fail('No stamp modal is expected'),
        api: { get: async (path, request) => {
          calls.push({ path, request });
          return { success: true, data: invoice('invoice /1') };
        } },
      }, ['fetchInvoiceForExport']);
      const signal = new AbortController().signal;
      await fetchInvoiceForExport('invoice /1', { requireStamp, signal, timeout: 45000 });
      const encodedPath = '/api/invoices/invoice%20%2F1';
      assert.deepEqual(calls.map(call => call.path), requireStamp ? [encodedPath, `${encodedPath}/download`] : [`${encodedPath}/download`]);
      assert.ok(calls.every(call => call.request.signal === signal && call.request.timeout === 45000));
    });
  }

  test('invoice request cancellation propagates from the protected download without a fallback request', async () => {
    const controller = new AbortController();
    const calls = [];
    const failure = new DOMException('Request cancelled', 'AbortError');
    const { fetchInvoiceForExport } = loadVMModule('../src/services/invoice/downloadAccess.js', {
      unwrapApiRecord,
      showModal: () => assert.fail('Cancellation is not a stamp failure'),
      api: { get: async (path, request) => {
        calls.push(path);
        assert.equal(request.signal, controller.signal);
        assert.equal(request.timeout, 45000);
        if (path.endsWith('/download')) {
          controller.abort();
          throw failure;
        }
        return { success: true, data: invoice('a') };
      } },
    }, ['fetchInvoiceForExport']);
    await assert.rejects(fetchInvoiceForExport('a', { signal: controller.signal, timeout: 45000 }), error => error === failure);
    assert.deepEqual(calls, ['/api/invoices/a', '/api/invoices/a/download']);
  });
});
