import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PERMISSION_GROUPS, hasStaffPermission, isSuperAdminUser, canOpenAdminPage, getAdminLandingPath } from '../src/utils/staffPermissions.js';
import { PAYSTACK_INSTRUCTIONS, normalizePaymentInstructions } from '../src/utils/paymentInstructions.js';

test('ordinary admins are not super admins and permissions default to deny', () => {
  assert.equal(isSuperAdminUser({ role: 'admin' }), false);
  assert.equal(hasStaffPermission({ role: 'admin' }, 'customers.manage'), false);
  assert.equal(hasStaffPermission({ role: 'customer', staffPermissions: ['customers.manage'] }, 'customers.manage'), false);
  assert.equal(hasStaffPermission({ role: 'superadmin' }, 'settings.manage'), true);
});

test('staff page access follows specific permissions without granting super-admin controls', () => {
  const staff = { role: 'admin', staffPermissions: ['invoices.view', 'inventory.manage', 'credit.request'] };
  assert.equal(canOpenAdminPage(staff, '/admin/invoices/invoice-1'), true);
  assert.equal(canOpenAdminPage(staff, '/admin/inventory'), true);
  assert.equal(canOpenAdminPage(staff, '/admin/orders'), false);
  assert.equal(canOpenAdminPage(staff, '/admin/access-control'), false);
  assert.equal(canOpenAdminPage(staff, '/admin/credit-approvals'), true);
  assert.equal(canOpenAdminPage(staff, '/admin/guide'), true);
  assert.equal(getAdminLandingPath(staff), '/admin/invoices');
  assert.equal(getAdminLandingPath({ role: 'admin' }), '/admin/guide');
  assert.equal(new Set(PERMISSION_GROUPS.flatMap(group => group.options.map(([key]) => key))).size, 16);
});

test('legacy payment instructions migrate without destroying unrelated custom notes', () => {
  for (const value of ['', 'Wire payments transfer slips proof must be submitted in support chats to begin packing and logistics.', 'Please upload your transaction receipt in chat.', 'Please use your Order # or Invoice # as the transfer payment narration.']) assert.equal(normalizePaymentInstructions(value), PAYSTACK_INSTRUCTIONS);
  assert.equal(normalizePaymentInstructions('Deliveries leave the warehouse Monday to Friday.'), 'Deliveries leave the warehouse Monday to Friday.');
});

test('invoice PDFs direct customers to Paystack and no longer render direct bank-account payment instructions', () => {
  const source = readFileSync(new URL('../src/utils/generatePDF.js', import.meta.url), 'utf8');
  assert.ok(source.includes('Secure Payment with Paystack'));
  assert.ok(!source.includes('Payment Instructions (Bank Transfer)'));
  assert.ok(!source.includes('Account Number:'));
});
