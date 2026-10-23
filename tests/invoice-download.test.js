import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/services/invoice/downloadAccess.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replaceAll('export const ', 'const ');

function harness(get) {
  const modals = [];
  const context = { api: { get }, unwrapApiRecord: value => value.data || value, showModal: async options => { modals.push(options); } };
  vm.runInNewContext(`${source}\nglobalThis.exports = { fetchInvoiceForExport, isInvoiceStampRequiredError, showInvoiceStampNotice };`, context);
  return { ...context.exports, modals };
}

test('cached invoice objects are refreshed through the protected download endpoint', async () => {
  const calls = [];
  const { fetchInvoiceForExport } = harness(async url => { calls.push(url); return { data: { issuedBy: 'New Admin' } }; });
  const data = await fetchInvoiceForExport({ _id: 'invoice-1', issuedBy: 'Old cached stamp' });
  assert.equal(data.issuedBy, 'New Admin');
  assert.deepEqual(calls, ['/api/invoices/invoice-1', '/api/invoices/invoice-1/download']);
});

test('stamp rejection never falls back to the unprotected invoice viewer', async () => {
  const denied = Object.assign(new Error('Admin stamp required'), { status: 403, data: { error: { code: 'INVOICE_NOT_STAMPED' } } });
  const calls = [];
  const { fetchInvoiceForExport, isInvoiceStampRequiredError } = harness(async url => {
    calls.push(url);
    if (url.endsWith('/download')) throw denied;
    return { data: { issuedBy: 'Admin' } };
  });
  await assert.rejects(fetchInvoiceForExport('invoice-1'), error => error === denied);
  assert.equal(isInvoiceStampRequiredError(denied), true);
  assert.equal(calls.length, 2);
});

test('customer view blocks an unstamped record even if an older backend would allow admin download', async () => {
  const calls = [];
  const { fetchInvoiceForExport } = harness(async url => {
    calls.push(url);
    if (url.endsWith('/download')) assert.fail('Unstamped invoice must never reach PDF generation');
    return { data: { issuedBy: '', createdBy: { name: 'An Admin' }, status: 'Paid' } };
  });
  await assert.rejects(fetchInvoiceForExport({ _id: 'invoice-1', issuedBy: 'Stale local stamp' }), error => error.data.error.code === 'INVOICE_NOT_STAMPED');
  assert.equal(calls.length, 1);
});

test('customer view enables export after the authoritative stamp changes', async () => {
  let stamp = '';
  const { fetchInvoiceForExport } = harness(async () => ({ data: { issuedBy: stamp } }));
  await assert.rejects(fetchInvoiceForExport('invoice-1'), /stamp required/);
  stamp = 'Approving Admin';
  assert.equal((await fetchInvoiceForExport('invoice-1')).issuedBy, stamp);
});

test('admin export explicitly allows reviewing an unstamped invoice', async () => {
  const calls = [];
  const { fetchInvoiceForExport } = harness(async url => { calls.push(url); return { data: { issuedBy: '' } }; });
  await fetchInvoiceForExport('invoice-1', { requireStamp: false });
  assert.deepEqual(calls, ['/api/invoices/invoice-1/download']);
});

test('cached PDF data without a real invoice ID cannot be exported', async () => {
  const { fetchInvoiceForExport } = harness(() => assert.fail('Must not request an unidentified invoice'));
  await assert.rejects(fetchInvoiceForExport({ issuedBy: 'Cached stamp' }), /invoice ID is required/);
});

test('stamp notice uses the in-app warning modal', async () => {
  const { showInvoiceStampNotice, modals } = harness(async () => null);
  await showInvoiceStampNotice();
  assert.equal(modals[0].title, 'Admin Stamp Required');
  assert.equal(modals[0].tone, 'warning');
  assert.match(modals[0].message, /has not been stamped by an admin/);
});
