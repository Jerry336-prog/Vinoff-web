export const ADMIN_NAVIGATION = [
  { id: 'dashboard', name: 'Dashboard', path: '/admin/dashboard' },
  {
    id: 'sales', name: 'Sales & Customers',
    children: [
      { name: 'Orders', path: '/admin/orders', tabKey: 'orders' },
      { name: 'Invoices', path: '/admin/invoices', tabKey: 'invoices' },
      { name: 'Customers', path: '/admin/customers', tabKey: 'customers' },
    ],
  },
  {
    id: 'catalog', name: 'Catalog & Stock',
    children: [
      { name: 'Products', path: '/admin/products', tabKey: 'products' },
      { name: 'Inventory', path: '/admin/inventory', tabKey: 'inventory' },
    ],
  },
  {
    id: 'communication', name: 'Communication',
    children: [
      { name: 'Chats', path: '/admin/chats', badgeKey: 'chats' },
      { name: 'Announcements', path: '/admin/announcements', tabKey: 'announcements' },
      { name: 'Notifications', path: '/admin/notifications', badgeKey: 'notifications' },
    ],
  },
  {
    id: 'finance', name: 'Finance & Insights',
    children: [
      { name: 'Expense Tracker', path: '/admin/expenses', tabKey: 'expenses' },
      { name: 'Traffic Analytics', path: '/admin/analytics' },
    ],
  },
  {
    id: 'history', name: 'History & Audit',
    children: [
      { name: 'Sales & Order History', path: '/admin/history/sales-orders' },
      { name: 'Inventory History', path: '/admin/inventory-history', aliases: ['/admin/history/inventory'] },
      { name: 'Customer Account History', path: '/admin/history/customer-accounts' },
      { name: 'Admin Activity History', path: '/admin/history/admin-activity' },
      { name: 'Activity Log', path: '/admin/activity' },
    ],
  },
  {
    id: 'administration', name: 'Administration',
    children: [
      { name: 'Operating Guide', path: '/admin/guide' },
      { name: 'Staff Permissions', path: '/admin/access-control' },
      { name: 'Credit Approvals', path: '/admin/credit-approvals', tabKey: 'approvals' },
      { name: 'Settings', path: '/admin/settings' },
      { name: 'Profile', path: '/admin/profile' },
    ],
  },
];

export const isAdminNavItemActive = (item, pathname) => [item.path, ...(item.aliases || [])]
  .some(path => path && (pathname === path || pathname.startsWith(`${path}/`)));

export const getAdminNavGroup = pathname => ADMIN_NAVIGATION
  .find(group => group.children?.some(item => isAdminNavItemActive(item, pathname)));

export const getAdminNavItem = pathname => ADMIN_NAVIGATION
  .flatMap(group => group.children || [group])
  .find(item => isAdminNavItemActive(item, pathname));

export const getAdminNavBadgeCount = (item, counts) => Number(counts[item.badgeKey || item.tabKey] || 0);

export const getAdminNavGroupBadgeCount = (group, counts) => group.id === 'communication'
  ? Number(counts.chats || 0) + Number(counts.notifications || 0)
  : (group.children || []).reduce((total, item) => total + getAdminNavBadgeCount(item, counts), 0);
