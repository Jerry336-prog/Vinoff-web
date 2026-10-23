import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { exportDateKey, exportRangeParams, filterByExportRange, groupExportRecords } from '../src/utils/exportRange.js';
import { unwrapApiRecord } from '../src/utils/apiResponse.js';

const source = readFileSync(new URL('../src/services/exports/reportData.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export async function ', 'async function ');
const day = '2026-10-01T12:00:00.000Z';
const range = { startDate: '2026-10-01', endDate: '2026-10-01' };

function harness({ lists = {}, analytics, legacy = [], failure } = {}) {
  const calls = [];
  const context = {
    exportDateKey, exportRangeParams, filterByExportRange, unwrapApiRecord,
    fetchAllExportRecords: async (path, options) => {
      calls.push({ path, options });
      if (path === failure) throw new Error(`Failed source: ${path}`);
      assert.ok(Object.hasOwn(lists, path), `Unexpected list request: ${path}`);
      return lists[path];
    },
    api: { get: async (path, options) => {
      calls.push({ path, options });
      if (path === failure) throw new Error(`Failed source: ${path}`);
      assert.equal(path, '/api/admin/analytics');
      return analytics;
    } },
    localStorage: { getItem: key => {
      assert.equal(key, 'vinoff_restock_history');
      return typeof legacy === 'string' ? legacy : JSON.stringify(legacy);
    } },
  };
  vm.runInNewContext(`${source}\nglobalThis.load = loadReportData;`, context);
  return { calls, load: async (...args) => JSON.parse(JSON.stringify(await context.load(...args))) };
}

function cells(report, index = 0) {
  return Object.fromEntries(report.headers.map((header, column) => [header, report.records[index].cells[column]]));
}

function inventoryHarness({ orders = [], invoices = [], products = [], activities = [], ...options } = {}) {
  return harness({ ...options, lists: { '/api/orders': orders, '/api/invoices': invoices, '/api/admin/products': products, '/api/admin/activity': activities } });
}

test('list adapters use the all-records paginator without caps and preserve primitive cells and IDs', async () => {
  const fixtures = [
    ['orders', '/api/orders', { customer: { _id: 'buyer', firstName: 'Ada' }, totalAmount: 0, items: [{ quantity: 0 }] }],
    ['products', '/api/admin/products', { price: 3, wholesalePrice: 24, minimumQuantity: 8, stock: 0, allowPieces: false }],
    ['inventory', '/api/admin/products', { stock: 0, unitStock: 5 }],
    ['customers', '/api/admin/users', { firstName: 'Ada', role: 'customer', outstandingCredit: 0 }],
    ['admin-activity', '/api/admin/activity', { actor: { _id: 'admin', firstName: 'Admin' }, action: 'Changed stock' }],
    ['announcements', '/api/admin/announcements', { title: 'Notice', targetUser: { _id: 'buyer' } }],
    ['notifications', '/api/notifications', { title: 'Notice', read: true, relatedOrder: { _id: 'o', orderNumber: 'ORD-1' } }],
  ];
  for (const [kind, path, extra] of fixtures) {
    const records = Array.from({ length: 175 }, (_, index) => ({ _id: `${kind}-${index}`, createdAt: day, ...extra }));
    const { load, calls } = harness({ lists: { [path]: records } });
    const signal = new AbortController().signal;
    const onProgress = () => {};
    const report = await load(kind, { signal, onProgress });
    assert.equal(report.records.length, 175);
    assert.equal(report.records[174].id, `${kind}-174`);
    assert.equal(report.records[0].date, day);
    assert.equal(calls[0].path, path);
    assert.equal(calls[0].options.signal, signal);
    assert.equal(calls[0].options.onProgress, onProgress);
    assert.equal(calls[0].options.params, undefined);
    for (const record of report.records) {
      assert.equal(record.cells.length, report.headers.length);
      assert.ok(record.cells.every(value => ['string', 'number', 'boolean'].includes(typeof value)));
    }
  }
});

test('orders use inclusive Lagos days and exact IDs for populated and unpopulated customers', async () => {
  const { load } = harness({ lists: { '/api/orders': [
    { _id: 'before', createdAt: '2026-09-30T22:59:59.999Z', customer: 'buyer' },
    { _id: 'start', createdAt: '2026-09-30T23:00:00.000Z', customer: { _id: 'buyer', name: 'Same Name' } },
    { _id: 'end', createdAt: '2026-10-01T22:59:59.999Z', customer: 'buyer' },
    { _id: 'after', createdAt: '2026-10-01T23:00:00.000Z', customerId: 'buyer' },
    { _id: 'other', createdAt: day, customer: { _id: 'other', name: 'Same Name' } },
    { _id: 'undated', customer: 'buyer' },
  ] } });
  assert.deepEqual((await load('orders', { range, customerId: 'buyer' })).records.map(record => record.id), ['start', 'end']);
  assert.equal((await load('orders')).records.find(record => record.id === 'undated').date, '');
});

test('products and inventory are current snapshots filtered by createdAt, not updatedAt', async () => {
  const { load } = harness({ lists: { '/api/admin/products': [
    { _id: 'old', createdAt: '2025-01-01T00:00:00Z', updatedAt: day, stock: 100 },
    { _id: 'new', createdAt: day, updatedAt: '2026-10-22T00:00:00Z', stock: 12, unitStock: 0 },
  ] } });
  for (const kind of ['products', 'inventory']) {
    const report = await load(kind, { range });
    assert.deepEqual(report.records.map(record => record.id), ['new']);
    assert.equal(cells(report)['Carton Stock'], 12);
    assert.equal(cells(report)['Loose Unit Stock'], 0);
    assert.match(report.title, /Current Snapshot/);
  }
});

test('all product sources use the authenticated admin route and include inactive snapshots', async () => {
  const products = [
    { _id: 'active', name: 'Active product', createdAt: day, status: 'active' },
    { _id: 'inactive', name: 'Inactive product', createdAt: day, status: 'inactive' },
  ];
  const publicProducts = products.filter(product => product.status === 'active');
  const { load, calls } = harness({ lists: { '/api/admin/products': products, '/api/products': publicProducts } });
  for (const kind of ['products', 'inventory']) {
    const report = await load(kind, { range });
    assert.deepEqual(report.records.map(record => record.id), ['active', 'inactive']);
    assert.equal(cells(report, 1).Status, 'inactive');
  }
  assert.ok(calls.every(call => call.path === '/api/admin/products'));
  const history = inventoryHarness({
    products,
    orders: [{ _id: 'o', customer: 'buyer', createdAt: day, items: [{ product: 'inactive', quantity: 1 }] }],
  });
  const report = await history.load('inventory-history');
  assert.equal(cells(report).Product, 'Inactive product');
  assert.ok(history.calls.some(call => call.path === '/api/admin/products'));
  assert.ok(history.calls.every(call => call.path !== '/api/products'));
});

test('product snapshots use model stock fields and wholesale-before-regular price precedence without losing zeros', async () => {
  const { load } = harness({ lists: { '/api/admin/products': [
    { _id: 'primary', createdAt: day, stock: 0, inventoryCount: 99, unitStock: 0, price: 12, wholesalePrice: 120, cartonPrice: 999, minimumQuantity: 10 },
    { _id: 'zero', createdAt: day, stock: 1, unitStock: 2, price: 12, wholesalePrice: 0, cartonPrice: 999 },
    { _id: 'regular-fallback', createdAt: day, stock: 3, unitStock: 4, price: 12, cartonPrice: 999 },
  ] } });
  for (const kind of ['products', 'inventory']) {
    const report = await load(kind);
    assert.equal(cells(report)['Carton Stock'], 0);
    assert.equal(cells(report)['Loose Unit Stock'], 0);
    assert.equal(cells(report)['Wholesale Price (NGN)'], 120);
    assert.equal(cells(report, 1)['Wholesale Price (NGN)'], 0);
    assert.equal(cells(report, 2)['Wholesale Price (NGN)'], 12);
    if (kind === 'products') {
      assert.equal(cells(report)['Regular Price (NGN)'], 12);
      assert.equal(cells(report)['Units per Carton'], 10);
    }
  }
});

test('customer directory filters by user ID rather than duplicate display names', async () => {
  const { load } = harness({ lists: { '/api/admin/users': [
    { _id: 'a', name: 'Same', createdAt: day }, { _id: 'b', name: 'Same', createdAt: day },
  ] } });
  assert.deepEqual((await load('customers', { customerId: 'b' })).records.map(record => record.id), ['b']);
});

test('customer history recomputes purchases within range regardless of registration, separating cartons and units', async () => {
  const { load } = harness({ lists: {
    '/api/admin/users': [
      { _id: 'a', name: 'Same Name', createdAt: '2020-01-01T00:00:00Z', profile: { companyName: 'Outlet' } },
      { _id: 'b', name: 'Same Name', createdAt: day },
      { _id: 'no-purchases', createdAt: day },
    ],
    '/api/orders': [
      { _id: 'old', customer: 'a', createdAt: '2025-01-01T00:00:00Z', totalAmount: 100000, items: [{ quantity: 50 }] },
      { _id: 'in-range', customer: { _id: 'a' }, createdAt: day, totalAmount: '100', items: [{ quantity: '3' }, { quantity: '4', isCarton: false }] },
      { _id: 'in-range-2', customerId: 'a', createdAt: '2026-10-01T20:00:00Z', totalAmount: 0, items: [{ quantity: 0 }] },
      { _id: 'other', customer: 'b', createdAt: day, totalAmount: 200 },
      { _id: 'future', customer: 'a', createdAt: '2026-10-02T12:00:00Z', totalAmount: 300 },
    ],
  } });
  const report = await load('customer-history', { range, customerId: 'a' });
  assert.equal(report.records.length, 1);
  assert.equal(report.records[0].customerId, 'a');
  assert.equal(report.records[0].date, '2026-10-01T20:00:00Z');
  assert.equal(cells(report)['Spend in Period (NGN)'], 100);
  assert.equal(cells(report)['Orders in Period'], 2);
  assert.equal(cells(report)['Cartons Ordered'], 3);
  assert.equal(cells(report)['Loose Units Ordered'], 4);
  assert.equal(cells(report).Business, 'Outlet');
  assert.equal(filterByExportRange(report.records, range).length, 1);
});

test('customer history never merges unidentified customers by name or email', async () => {
  const { load } = harness({ lists: { '/api/admin/users': [], '/api/orders': [
    { _id: 'a', customerName: 'Same', customerEmail: 'same@example.com', createdAt: day, totalAmount: 10 },
    { _id: 'b', customerName: 'Same', customerEmail: 'same@example.com', createdAt: day, totalAmount: 20 },
  ] } });
  const report = await load('customer-history');
  assert.equal(report.records.length, 2);
  assert.ok(report.records.every(record => record.customerId === ''));
  assert.equal((await load('customer-history', { customerId: 'same@example.com' })).records.length, 0);
});

test('customer history aggregates each Lagos ZIP bucket before parent grouping without changing ungrouped totals', async () => {
  const purchases = [
    ['december', '2025-12-31T22:59:59.999Z', 10],
    ['january-start', '2025-12-31T23:00:00.000Z', 20],
    ['january', '2026-01-15T12:00:00Z', 30],
    ['february-start', '2026-01-31T23:00:00.000Z', 40],
    ['february-same-day', '2026-02-01T10:00:00Z', 50],
    ['february-next-day', '2026-02-02T10:00:00Z', 60],
  ];
  const { load, calls } = harness({ lists: {
    '/api/admin/users': [{ _id: 'buyer', name: 'Same Name', createdAt: '2020-01-01T00:00:00Z' }, { _id: 'other', name: 'Same Name' }],
    '/api/orders': [
      ...purchases.map(([id, createdAt, totalAmount]) => ({ _id: id, createdAt, totalAmount, customer: 'buyer', items: [{ quantity: 2 }, { quantity: 3, isCarton: false }] })),
      { _id: 'undated', customer: 'buyer', totalAmount: 5 },
      { _id: 'other', customer: 'other', createdAt: '2026-02-01T12:00:00Z', totalAmount: 999 },
    ],
  } });
  const selectedRange = { startDate: '2025-12-31', endDate: '2026-02-02' };
  const expectations = {
    month: { '2025-12': [10, 1], '2026-01': [50, 2], '2026-02': [150, 3] },
    day: { '2025-12-31': [10, 1], '2026-01-01': [20, 1], '2026-01-15': [30, 1], '2026-02-01': [90, 2], '2026-02-02': [60, 1] },
    year: { 2025: [10, 1], 2026: [200, 5] },
  };
  for (const [grouping, expected] of Object.entries(expectations)) {
    const report = await load('customer-history', { grouping, range: selectedRange, customerId: 'buyer' });
    const groups = groupExportRecords(report.records, grouping);
    assert.deepEqual(groups.map(([key]) => key), Object.keys(expected));
    assert.equal(new Set(report.records.map(record => record.id)).size, report.records.length);
    for (const [key, records] of groups) {
      assert.equal(records.length, 1);
      const data = cells(report, report.records.indexOf(records[0]));
      const [spend, orderCount] = expected[key];
      assert.equal(records[0].customerId, 'buyer');
      assert.equal(data['Spend in Period (NGN)'], spend);
      assert.equal(data['Orders in Period'], orderCount);
      assert.equal(data['Cartons Ordered'], orderCount * 2);
      assert.equal(data['Loose Units Ordered'], orderCount * 3);
    }
    assert.deepEqual(report, await load('customer-history', { grouping, range: selectedRange, customerId: 'buyer' }));
  }
  const ungrouped = await load('customer-history', { range: selectedRange, customerId: 'buyer' });
  assert.equal(ungrouped.records.length, 1);
  assert.equal(ungrouped.records[0].id, 'buyer');
  assert.equal(ungrouped.records[0].date, '2026-02-02T10:00:00Z');
  assert.equal(cells(ungrouped)['Spend in Period (NGN)'], 210);
  assert.equal(cells(ungrouped)['Orders in Period'], 6);
  const allDates = await load('customer-history', { customerId: 'buyer' });
  assert.equal(allDates.records.length, 1);
  assert.equal(cells(allDates)['Spend in Period (NGN)'], 215);
  const groupedAll = await load('customer-history', { grouping: 'month' });
  const allGroups = new Map(groupExportRecords(groupedAll.records, 'month'));
  assert.equal(allGroups.get('2026-02').length, 2);
  assert.equal(allGroups.get('undated').length, 1);
  assert.equal(allGroups.get('undated')[0].date, '');
  assert.ok(calls.every(call => call.options.grouping === undefined && call.options.range === undefined));
  await assert.rejects(load('customer-history', { grouping: 'quarter' }), /valid archive grouping/);
});

test('grouping does not aggregate ordinary report rows', async () => {
  const { load } = harness({ lists: { '/api/orders': [
    { _id: 'a', createdAt: day, customer: 'buyer', totalAmount: 10 },
    { _id: 'b', createdAt: day, customer: 'buyer', totalAmount: 20 },
  ] } });
  assert.deepEqual(await load('orders', { grouping: 'month' }), await load('orders'));
});

test('inventory history skips linked invoices and free-text invoice lines, carries order/invoice customer IDs', async () => {
  const { load, calls } = inventoryHarness({
    orders: [{ _id: 'o', customer: { _id: 'buyer' }, status: 'Cancelled', createdAt: day,
      items: [{ product: 'p', quantity: 2, previousStock: 10, newStock: 8 }] }],
    invoices: [
      { _id: 'linked', order: { _id: 'o' }, customer: 'buyer', items: [{ product: 'p', quantity: 2 }] },
      { _id: 'standalone', customer: 'buyer', createdAt: day, items: [{ product: 'p', quantity: 3, unitType: 'pieces' }, { description: 'Product', quantity: 99 }] },
      { _id: 'other', customerId: 'other', createdAt: day, items: [{ product: 'p', quantity: 1 }] },
    ], products: [{ _id: 'p', name: 'Product', stock: 100 }],
    activities: [{ _id: 'restock', createdAt: day, targetId: 'p', metadata: { stockDelta: 5, previousStock: 3, newStock: 8 } }],
  });
  const report = await load('inventory-history', { range, customerId: 'buyer' });
  assert.equal(report.records.length, 2);
  assert.ok(report.records.every(record => record.customerId === 'buyer'));
  const order = cells(report, report.records.findIndex(record => record.id.startsWith('deduction-order')));
  assert.equal(order['Stock Before (Recorded)'], 10);
  assert.equal(order['Stock After (Recorded)'], 8);
  const invoice = cells(report, report.records.findIndex(record => record.id.startsWith('deduction-invoice')));
  assert.equal(invoice.Unit, 'units');
  assert.equal(invoice['Stock Before (Recorded)'], '');
  assert.equal(invoice['Stock After (Recorded)'], '');
  assert.match(invoice.Evidence, /unverified/);
  assert.equal(calls.find(call => call.path === '/api/admin/activity').options.params.targetType, 'Product');
  const all = await load('inventory-history');
  assert.equal(all.records.length, 4);
  assert.equal(all.records.find(record => record.id.startsWith('activity-')).customerId, '');
});

test('inventory history prefers backend snapshots, dedupes legacy mirrors across minute boundaries, and retains distinct backend events', async () => {
  const { load } = inventoryHarness({
    products: [{ _id: 'p', name: 'Product' }],
    activities: [
      { _id: 'a1', createdAt: '2026-10-01T12:00:59Z', targetId: 'p', metadata: { stockDelta: 5, previousStock: 10, newStock: 15, unitStockDelta: 2, previousUnitStock: 0, newUnitStock: 2 } },
      { _id: 'a2', createdAt: '2026-10-01T12:00:59Z', targetId: 'p', metadata: { stockDelta: 5, previousStock: 15, newStock: 20 } },
    ],
    legacy: [
      { id: 'mirror', productName: 'Product', timestamp: '2026-10-01T12:01:00Z', change: 5, previousStock: 10, newStock: 15 },
      { productName: 'Product', timestamp: '2026-10-01T14:00:00Z', change: 3, unitType: 'loose units' },
      { productName: 'Product', timestamp: '2026-10-01T14:00:00Z', change: 3, unitType: 'loose units' },
      { id: 'undated', productName: 'Product', change: 1 },
    ],
  });
  const report = await load('inventory-history');
  assert.equal(report.records.length, 5);
  assert.equal(report.records.filter(record => record.id.startsWith('activity-')).length, 3);
  assert.equal(report.records.filter(record => record.id.startsWith('legacy-')).length, 2);
  assert.equal(report.records.find(record => record.id === 'legacy-restock-undated').date, '');
  assert.deepEqual(report, await load('inventory-history'));
  assert.equal((await load('inventory-history', { range })).records.length, 4);
});

test('malformed local history and failed remote sources fail instead of producing partial reports', async () => {
  await assert.rejects(inventoryHarness({ legacy: '{broken' }).load('inventory-history'), /legacy local restock history could not be read/);
  await assert.rejects(inventoryHarness({ legacy: '{}' }).load('inventory-history'), /not a list/);
  for (const failure of ['/api/orders', '/api/invoices', '/api/admin/products', '/api/admin/activity']) {
    await assert.rejects(inventoryHarness({ failure }).load('inventory-history'), /Failed source/);
  }
  for (const failure of ['/api/admin/users', '/api/orders']) {
    const { load } = harness({ failure, lists: { '/api/admin/users': [], '/api/orders': [] } });
    await assert.rejects(load('customer-history'), /Failed source/);
  }
  await assert.rejects(harness({ failure: '/api/notifications' }).load('notifications'), /Failed source/);
});

test('analytics requests period=all and exports the full dated daily timeline, never recentVisits', async () => {
  const { load, calls } = harness({ analytics: { success: true, data: {
    timeline: Array.from({ length: 100 }, (_, index) => ({ date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), views: index, visitors: index + 1 })),
    recentVisits: [{ id: 'recent-only', createdAt: day, pageViewsCount: 999999 }],
  } } });
  const signal = new AbortController().signal;
  const progress = [];
  const report = await load('analytics', { signal, onProgress: value => progress.push(value) });
  assert.equal(report.records.length, 100);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.params.period, 'all');
  assert.equal(calls[0].options.signal, signal);
  assert.equal(cells(report)['Page Views'], 0);
  assert.equal(progress[0].total, 100);
  assert.equal((await load('analytics', { range: { startDate: '2026-01-01', endDate: '2026-01-31' } })).records.length, 31);
});

test('analytics sends inclusive Lagos server bounds with period=all and preserves the backend ISO day', async () => {
  const date = '2026-09-30T23:00:00.000Z';
  const { load, calls } = harness({ analytics: { data: { timeline: [
    { date: '2026-09-29T23:00:00.000Z', views: 99, visitors: 9 },
    { date, views: 20, visitors: 10, label: '10/1' },
  ] } } });
  const report = await load('analytics', { range });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].options.params)), {
    period: 'all', startDate: '2026-10-01T00:00:00.000+01:00', endDate: '2026-10-01T23:59:59.999+01:00',
  });
  assert.equal(report.records.length, 1);
  assert.equal(report.records[0].date, date);
  assert.equal(cells(report)['Page Views'], 20);
});

test('analytics rejects the actual yearless backend shape rather than guessing or falling back to latest 30 visits', async () => {
  const { load } = harness({ analytics: { data: { timeline: [{ label: '10/1', views: 45, visitors: 12 }], recentVisits: [{ createdAt: day }] } } });
  await assert.rejects(load('analytics'), /full ISO date \(including year\)/);
  await assert.rejects(harness({ analytics: { data: {} } }).load('analytics'), /full daily timeline/);
  await assert.rejects(harness({ failure: '/api/admin/analytics' }).load('analytics'), /Failed source/);
  assert.equal((await harness({ analytics: { data: { timeline: [] } } }).load('analytics')).records.length, 0);
});

test('unsupported reports and missing record IDs fail clearly, and already-aborted loads make no request', async () => {
  const { load, calls } = harness();
  await assert.rejects(load('invoices'), /Unsupported export report kind/);
  await assert.rejects(load('toString'), /Unsupported export report kind/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(load('analytics', { signal: controller.signal }), error => error.name === 'AbortError');
  assert.equal(calls.length, 0);
  await assert.rejects(harness({ lists: { '/api/orders': [{ createdAt: day }] } }).load('orders'), /missing its ID/);
});
