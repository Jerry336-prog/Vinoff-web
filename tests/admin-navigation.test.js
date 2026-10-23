import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_NAVIGATION, getAdminNavItem, getAdminNavGroup, getAdminNavBadgeCount, getAdminNavGroupBadgeCount, isAdminNavItemActive } from '../src/layouts/adminNavigation.js';

const leaves = ADMIN_NAVIGATION.flatMap(group => group.children || [group]);

test('all admin destinations remain reachable without duplicate navigation items', () => {
  const expected = [
    '/admin/dashboard', '/admin/orders', '/admin/invoices', '/admin/customers', '/admin/products', '/admin/inventory',
    '/admin/chats', '/admin/announcements', '/admin/notifications', '/admin/expenses', '/admin/analytics',
    '/admin/history/sales-orders', '/admin/inventory-history', '/admin/history/customer-accounts',
    '/admin/history/admin-activity', '/admin/activity', '/admin/guide', '/admin/settings', '/admin/profile',
    '/admin/access-control', '/admin/credit-approvals',
  ];
  assert.deepEqual(leaves.map(item => item.path).sort(), expected.sort());
  assert.equal(new Set(leaves.map(item => item.path)).size, leaves.length);
  assert.equal(ADMIN_NAVIGATION.filter(group => group.children).length, 6);
  assert.ok(ADMIN_NAVIGATION.every(group => !group.children || group.children.length <= 5));
});

test('detail pages keep their parent destination and group selected', () => {
  assert.equal(getAdminNavItem('/admin/invoices/invoice-1').name, 'Invoices');
  assert.equal(getAdminNavGroup('/admin/invoices/invoice-1').id, 'sales');
  assert.equal(getAdminNavItem('/admin/customers/customer-1').name, 'Customers');
  assert.equal(getAdminNavGroup('/admin/customers/customer-1').id, 'sales');
});

test('both inventory history routes select the same item without selecting current inventory', () => {
  const inventory = leaves.find(item => item.path === '/admin/inventory');
  for (const path of ['/admin/inventory-history', '/admin/history/inventory']) {
    assert.equal(getAdminNavItem(path).name, 'Inventory History');
    assert.equal(getAdminNavGroup(path).id, 'history');
    assert.equal(isAdminNavItemActive(inventory, path), false);
  }
});

test('dashboard is standalone and unknown or similar-prefix paths select nothing', () => {
  assert.equal(getAdminNavItem('/admin/dashboard').name, 'Dashboard');
  assert.equal(getAdminNavGroup('/admin/dashboard'), undefined);
  assert.equal(getAdminNavItem('/admin/orders-archive'), undefined);
  assert.equal(getAdminNavItem('/not-admin'), undefined);
});

test('groups retain unread counts while collapsed without double-counting notification categories', () => {
  const counts = { orders: 2, invoices: 3, customers: 1, products: 4, inventory: 5, chats: 7, notifications: 11, announcements: 4, expenses: 2 };
  assert.equal(getAdminNavGroupBadgeCount(ADMIN_NAVIGATION.find(group => group.id === 'sales'), counts), 6);
  assert.equal(getAdminNavGroupBadgeCount(ADMIN_NAVIGATION.find(group => group.id === 'catalog'), counts), 9);
  assert.equal(getAdminNavGroupBadgeCount(ADMIN_NAVIGATION.find(group => group.id === 'communication'), counts), 18);
  assert.equal(getAdminNavGroupBadgeCount(ADMIN_NAVIGATION.find(group => group.id === 'finance'), counts), 2);
  assert.equal(getAdminNavGroupBadgeCount(ADMIN_NAVIGATION.find(group => group.id === 'history'), counts), 0);
  assert.equal(getAdminNavBadgeCount(leaves.find(item => item.path === '/admin/chats'), counts), 7);
  assert.equal(getAdminNavBadgeCount(leaves.find(item => item.path === '/admin/inventory'), {}), 0);
});
