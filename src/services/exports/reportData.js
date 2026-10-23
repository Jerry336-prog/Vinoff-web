import api from '../api';
import { fetchAllExportRecords } from './fetchRecords';
import { exportDateKey, exportRangeParams, filterByExportRange } from '../../utils/exportRange';
import { unwrapApiRecord } from '../../utils/apiResponse';

const idOf = value => {
  if (value && typeof value === 'object') return idOf(value._id || value.id);
  return value == null ? '' : String(value);
};
const recordId = (record, source) => {
  const id = idOf(record);
  if (!id) throw new Error(`Cannot export ${source}: a record is missing its ID.`);
  return id;
};
const customerOf = record => idOf(record.customer) || idOf(record.customerId);
const dateOf = record => record.createdAt || record.date || '';
const nameOf = person => person?.name || [person?.firstName, person?.lastName].filter(Boolean).join(' ');
const buyerName = record => record.customerName || nameOf(record.customer);
const businessOf = person => person?.profile?.companyName || person?.businessName || '';
const numberOrBlank = value => value == null || value === '' || !Number.isFinite(Number(value)) ? '' : Number(value);
const cartonPriceOf = product => numberOrBlank(product.wholesalePrice ?? product.price ?? product.cartonPrice);
const row = (id, date, customerId, cells) => ({ id, date, customerId, cells: cells.map(value => value ?? '') });
const cleanName = name => String(name || '').replace(/\s*\((ctn|pieces|units)\)\s*$/i, '').trim();
const unitOf = item => item.isCarton === false ||
  /^(pieces|units|loose units)$/i.test(item.unitType || item.unit || '') ||
  /\((pieces|units)\)/i.test(item.name || item.description || '') ? 'units' : 'cartons';

const LIST_REPORTS = {
  orders: {
    path: '/api/orders', title: 'Sales and Order History',
    headers: ['Order Reference', 'Date', 'Customer ID', 'Customer', 'Email', 'Business', 'Item Lines', 'Quantity Ordered', 'Total Amount (NGN)', 'Payment Method', 'Payment Status', 'Order Status'],
    cells: order => [order.orderNumber || idOf(order), dateOf(order), customerOf(order), buyerName(order), order.customer?.email || order.customerEmail, businessOf(order.customer) || order.businessName,
      order.items?.length ?? 0, (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), numberOrBlank(order.totalAmount ?? order.total), order.paymentMethod, order.paymentStatus, order.status],
  },
  products: {
    path: '/api/admin/products', title: 'Product Catalog (Current Snapshot by Creation Date)',
    headers: ['Product ID', 'Created At', 'Product', 'Category', 'Description', 'Regular Price (NGN)', 'Wholesale Price (NGN)', 'Units per Carton', 'Carton Stock', 'Loose Unit Stock', 'Allow Cartons', 'Allow Pieces', 'Status'],
    cells: product => [idOf(product), dateOf(product), product.name, product.category, product.description, numberOrBlank(product.price), cartonPriceOf(product),
      numberOrBlank(product.unitsPerCarton ?? product.minimumQuantity ?? product.cartonQuantity), numberOrBlank(product.stock ?? product.inventoryCount), numberOrBlank(product.unitStock), product.allowCarton, product.allowPieces, product.status],
  },
  inventory: {
    path: '/api/admin/products', title: 'Inventory (Current Snapshot by Product Creation Date)',
    headers: ['Product ID', 'Created At', 'Product', 'Category', 'Carton Stock', 'Loose Unit Stock', 'Wholesale Price (NGN)', 'Status'],
    cells: product => [idOf(product), dateOf(product), product.name, product.category, numberOrBlank(product.stock ?? product.inventoryCount), numberOrBlank(product.unitStock), cartonPriceOf(product), product.status],
  },
  customers: {
    path: '/api/admin/users', title: 'Customer and User Accounts',
    headers: ['Customer ID', 'Registered At', 'Name', 'Business', 'Email', 'Phone', 'Role', 'Status', 'VIP Credit Partner', 'Outstanding Credit (NGN)'],
    customerId: idOf,
    cells: user => [idOf(user), dateOf(user), nameOf(user), businessOf(user), user.email, user.phone, user.role, user.accountStatus, user.isVipCreditPartner, numberOrBlank(user.outstandingCredit)],
  },
  'admin-activity': {
    path: '/api/admin/activity', title: 'Admin Activity and Audit Log',
    headers: ['Activity ID', 'Date', 'Actor', 'Actor ID', 'Actor Role', 'Action', 'Target Type', 'Target ID', 'Description'],
    cells: activity => [idOf(activity), dateOf(activity), nameOf(activity.actor), idOf(activity.actor), activity.actor?.role, activity.action, activity.targetType, idOf(activity.targetId), activity.description],
  },
  announcements: {
    path: '/api/admin/announcements', title: 'Announcements',
    headers: ['Announcement ID', 'Created At', 'Title', 'Message', 'Type', 'Audience', 'Target Customer ID', 'Target Customer', 'Status', 'Priority', 'Expires At', 'Created By', 'Action URL'],
    customerId: announcement => idOf(announcement.targetUser),
    cells: announcement => [idOf(announcement), dateOf(announcement), announcement.title, announcement.message, announcement.type, announcement.target, idOf(announcement.targetUser), nameOf(announcement.targetUser),
      announcement.status, announcement.priority, announcement.expiresAt, nameOf(announcement.createdBy), announcement.actionUrl],
  },
  notifications: {
    path: '/api/notifications', title: 'Notifications for Current Account',
    headers: ['Notification ID', 'Created At', 'Type', 'Title', 'Message', 'Read', 'Related User ID', 'Related User', 'Order Reference', 'Invoice Reference'],
    customerId: notification => idOf(notification.relatedUser),
    cells: notification => [idOf(notification), dateOf(notification), notification.type, notification.title, notification.message, Boolean(notification.isRead || notification.read), idOf(notification.relatedUser), nameOf(notification.relatedUser),
      notification.relatedOrder?.orderNumber || idOf(notification.relatedOrder), notification.relatedInvoice?.invoiceNumber || idOf(notification.relatedInvoice)],
  },
};

async function loadCustomerHistory({ range, customerId, grouping, ...options }) {
  if (grouping !== undefined && !['day', 'month', 'year'].includes(grouping)) throw new Error('Choose a valid archive grouping.');
  const users = await fetchAllExportRecords('/api/admin/users', options);
  const orders = await fetchAllExportRecords('/api/orders', options);
  const usersById = new Map(users.map(user => [recordId(user, 'users'), user]));
  const stats = new Map();
  // Filter purchases before aggregating, never registrations or lifetime totals.
  for (const order of filterByExportRange(orders, range, dateOf)) {
    const id = customerOf(order);
    if (customerId && id !== String(customerId)) continue;
    const customerKey = id || `unidentified-order:${recordId(order, 'orders')}`;
    const date = dateOf(order);
    const day = grouping ? exportDateKey(date) : '';
    const bucket = day ? day.slice(0, grouping === 'day' ? 10 : grouping === 'year' ? 4 : 7) : 'undated';
    // ZIP records must contain bucket-local totals before the parent groups them.
    const key = grouping ? JSON.stringify([customerKey, grouping, bucket]) : customerKey;
    const user = usersById.get(id) || order.customer;
    const current = stats.get(key) || {
      id: key, customerId: id, user, name: nameOf(user) || buyerName(order), business: businessOf(user) || order.businessName,
      email: user?.email || order.customerEmail, phone: user?.phone || order.customerPhone,
      count: 0, cartons: 0, units: 0, spend: 0, date: '',
    };
    current.count++;
    current.spend += Number(order.totalAmount ?? order.total) || 0;
    for (const item of order.items || []) {
      current[unitOf(item) === 'units' ? 'units' : 'cartons'] += Number(item.quantity) || 0;
    }
    if (date && (!current.date || new Date(date) > new Date(current.date))) current.date = date;
    stats.set(key, current);
  }
  return {
    title: 'Customer Purchase History (Selected Period)',
    headers: ['Customer ID', 'Customer', 'Business', 'Email', 'Phone', 'Role', 'Orders in Period', 'Cartons Ordered', 'Loose Units Ordered', 'Spend in Period (NGN)', 'Last Order in Period'],
    records: [...stats.values()].sort((a, b) => b.spend - a.spend || a.id.localeCompare(b.id)).map(stat =>
      row(stat.id, stat.date, stat.customerId, [stat.customerId, stat.name, stat.business, stat.email, stat.phone, stat.user?.role, stat.count, stat.cartons, stat.units, stat.spend, stat.date])),
  };
}

function legacyRestocks() {
  if (typeof localStorage === 'undefined') return [];
  let records;
  try {
    records = JSON.parse(localStorage.getItem('vinoff_restock_history') || '[]');
  } catch (cause) {
    throw new Error('Cannot export inventory history: legacy local restock history could not be read.', { cause });
  }
  if (!Array.isArray(records)) throw new Error('Cannot export inventory history: legacy local restock history is not a list.');
  return records;
}

async function loadInventoryHistory(options) {
  const orders = await fetchAllExportRecords('/api/orders', options);
  const invoices = await fetchAllExportRecords('/api/invoices', options);
  const products = await fetchAllExportRecords('/api/admin/products', options);
  const activities = await fetchAllExportRecords('/api/admin/activity', { ...options, params: { targetType: 'Product' } });
  const byId = new Map(products.map(product => [recordId(product, 'products'), product]));
  const byName = new Map();
  for (const product of products) {
    const key = cleanName(product.name).toLowerCase();
    // A legacy name is usable only when it identifies one product unambiguously.
    byName.set(key, byName.has(key) ? null : product);
  }
  const movements = [];
  const add = movement => movements.push({ customerId: '', ...movement });
  const productFor = (id, name) => byId.get(id) || (!id ? byName.get(cleanName(name).toLowerCase()) : null);
  const invoiceByOrder = new Map(invoices.filter(invoice => idOf(invoice.order)).map(invoice => [idOf(invoice.order), invoice]));
  for (const [source, records] of [['order', orders], ['invoice', invoices]]) {
    for (const record of records) {
      if (source === 'invoice' && idOf(record.order)) continue;
      const id = recordId(record, source);
      const linkedInvoice = source === 'order' ? invoiceByOrder.get(id) : record;
      const reference = record.orderNumber || record.invoiceNumber || id;
      for (const [index, item] of (record.items || []).entries()) {
        const productId = idOf(item.product) || idOf(item.productId);
        // Free-text custom invoice lines do not deduct stock in the backend.
        if (source === 'invoice' && !productId) continue;
        const quantity = numberOrBlank(item.quantity);
        if (quantity === '' || quantity < 0) throw new Error(`Cannot export inventory history: invalid quantity on ${source} ${id}.`);
        if (!quantity) continue;
        const productName = cleanName(item.name || item.description);
        const product = productFor(productId, productName);
        add({
          id: `deduction-${source}-${id}-${idOf(item) || index}`, date: dateOf(record), customerId: customerOf(record) || customerOf(linkedInvoice || {}),
          productId: productId || idOf(product), productName: productName || product?.name || '', category: product?.category || item.category,
          change: -quantity, unit: unitOf(item), before: numberOrBlank(item.previousStock), after: numberOrBlank(item.newStock), actor: buyerName(record),
          reference, invoice: linkedInvoice?.invoiceNumber || '', notes: record.notes,
          evidence: source === 'invoice' && (item.previousStock == null || item.newStock == null) ? 'Invoice items (deduction unverified)' : `${source === 'order' ? 'Order' : 'Invoice'} items`,
        });
      }
    }
  }
  const backendRestocks = [];
  for (const activity of activities) {
    const meta = activity.metadata || {};
    const productId = idOf(meta.productId) || idOf(activity.targetId);
    const product = productFor(productId, meta.productName);
    for (const [field, unit, before, after] of [
      ['stockDelta', 'cartons', 'previousStock', 'newStock'],
      ['unitStockDelta', 'units', 'previousUnitStock', 'newUnitStock'],
    ]) {
      const change = numberOrBlank(meta[field]);
      if (change === '' || change === 0) continue;
      const movement = {
        id: `activity-${recordId(activity, 'activity')}-${field}`, date: dateOf(activity), customerId: '', productId,
        productName: meta.productName || product?.name || '', category: meta.category || product?.category,
        change, unit, before: numberOrBlank(meta[before]), after: numberOrBlank(meta[after]), actor: nameOf(activity.actor),
        reference: idOf(activity), notes: activity.description, evidence: 'Backend activity log',
      };
      backendRestocks.push(movement);
      add(movement);
    }
  }
  const matchedBackend = new Set();
  const seenLegacy = new Set();
  for (const legacy of legacyRestocks()) {
    const change = numberOrBlank(legacy.change);
    if (change === '' || change === 0) continue;
    const rawProductId = idOf(legacy.productId);
    const product = productFor(rawProductId, legacy.productName);
    const productId = rawProductId || idOf(product);
    const date = legacy.timestamp || dateOf(legacy);
    const unit = unitOf(legacy);
    const before = numberOrBlank(legacy.previousStock);
    const after = numberOrBlank(legacy.newStock);
    const id = idOf(legacy) || JSON.stringify([productId, legacy.productName, date, unit, change, before, after, legacy.actorName]);
    if (seenLegacy.has(id)) continue;
    seenLegacy.add(id);
    // Match local mirrors one-to-one; distinct backend events must never collapse.
    const match = backendRestocks.find(movement => !matchedBackend.has(movement.id) && productId && movement.productId === productId &&
      movement.unit === unit && movement.change === change && date && movement.date &&
      Math.abs(new Date(movement.date) - new Date(date)) <= 60000 &&
      (before === '' || movement.before === '' || before === movement.before) &&
      (after === '' || movement.after === '' || after === movement.after));
    if (match) {
      matchedBackend.add(match.id);
      continue;
    }
    add({ id: `legacy-restock-${id}`, date, productId, productName: product?.name || legacy.productName || '', category: product?.category || legacy.category,
      change, unit, before, after, actor: legacy.actorName, reference: legacy.orderRef, notes: legacy.notes, evidence: 'Legacy local restock' });
  }
  return {
    title: 'Inventory Stock Movement History',
    headers: ['Date', 'Product ID', 'Product', 'Category', 'Movement', 'Quantity Change', 'Unit', 'Stock Before (Recorded)', 'Stock After (Recorded)', 'Customer ID', 'Actor / Customer', 'Order / Activity Reference', 'Invoice Reference', 'Evidence', 'Notes'],
    records: movements.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) || a.id.localeCompare(b.id)).map(movement =>
      row(movement.id, movement.date, movement.customerId, [movement.date, movement.productId, movement.productName, movement.category, movement.change > 0 ? 'Restock' : 'Deduction',
        movement.change, movement.unit, movement.before, movement.after, movement.customerId, movement.actor, movement.reference, movement.invoice, movement.evidence, movement.notes])),
  };
}

async function loadAnalytics({ range, signal, onProgress }) {
  const payload = unwrapApiRecord(await api.get('/api/admin/analytics', { params: { period: 'all', ...exportRangeParams(range) }, signal }));
  if (!Array.isArray(payload?.timeline)) throw new Error('Cannot export analytics: the server did not return the full daily timeline.');
  const records = payload.timeline.map(point => {
    const date = point.date || point.createdAt || point.day || '';
    // M/D labels in the current backend omit the year. Never infer it from recentVisits.
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(date) || !Number.isFinite(Date.parse(date))) {
      throw new Error('Cannot export analytics: daily timeline points need a full ISO date (including year). The server currently returns undated M/D labels; recentVisits is capped at 30 and cannot supply a complete export.');
    }
    return row(`analytics-${date}`, date, '', [date, numberOrBlank(point.views), numberOrBlank(point.visitors)]);
  });
  onProgress?.({ phase: 'loading', completed: records.length, total: records.length, message: `Loaded ${records.length} daily analytics records.` });
  return { title: 'Daily Traffic Analytics', headers: ['Date', 'Page Views', 'Unique Visitors'], records };
}

export async function loadReportData(kind, { range, customerId = '', grouping, signal, onProgress } = {}) {
  signal?.throwIfAborted();
  const options = { signal, onProgress };
  let report;
  if (kind === 'customer-history') report = await loadCustomerHistory({ ...options, range, customerId, grouping });
  else if (kind === 'inventory-history') report = await loadInventoryHistory(options);
  else if (kind === 'analytics') report = await loadAnalytics({ ...options, range });
  else {
    const config = LIST_REPORTS[kind];
    if (!config || !Object.hasOwn(LIST_REPORTS, kind)) throw new Error(`Unsupported export report kind: ${kind}`);
    const records = await fetchAllExportRecords(config.path, options);
    report = { title: config.title, headers: config.headers, records: records.map(record =>
      row(recordId(record, kind), dateOf(record), config.customerId?.(record) || customerOf(record), config.cells(record))) };
  }
  signal?.throwIfAborted();
  report.records = filterByExportRange(report.records, range).filter(record => !customerId || record.customerId === String(customerId));
  return report;
}
