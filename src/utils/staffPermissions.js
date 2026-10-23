export const PERMISSION_GROUPS = [
  { title: 'Overview', options: [['dashboard.view', 'View dashboard']] },
  { title: 'Sales', options: [['orders.view', 'View orders'], ['orders.manage', 'Update orders'], ['invoices.view', 'View and download invoices'], ['invoices.manage', 'Create, edit, stamp and delete invoices']] },
  { title: 'Customers & Credit', options: [['customers.view', 'View customers'], ['customers.manage', 'Manage customer status and VIP access'], ['credit.request', 'Request credit-limit changes (super-admin approval required)']] },
  { title: 'Catalog & Stock', options: [['products.manage', 'Manage products and prices'], ['inventory.manage', 'Adjust stock and restock']] },
  { title: 'Communication', options: [['chats.manage', 'Manage customer chats'], ['announcements.manage', 'Manage announcements']] },
  { title: 'Finance & Administration', options: [['expenses.manage', 'Manage expense ledgers'], ['analytics.view', 'View traffic analytics'], ['activity.view', 'View audit history'], ['settings.manage', 'Manage business settings']] },
];

export const isSuperAdminUser = user => ['superadmin', 'super_admin'].includes(user?.role);
export const hasStaffPermission = (user, permission) => isSuperAdminUser(user) ||
  (['admin', 'subAdmin'].includes(user?.role) && Array.isArray(user.staffPermissions) && user.staffPermissions.includes(permission));

export const adminPagePermission = path => {
  if (path.startsWith('/admin/access-control')) return 'superadmin';
  if (path.startsWith('/admin/credit-approvals')) return null;
  if (path.startsWith('/admin/dashboard')) return 'dashboard.view';
  if (path.startsWith('/admin/orders') || path.startsWith('/admin/history/sales-orders')) return 'orders.view';
  if (path.startsWith('/admin/invoices')) return 'invoices.view';
  if (path.startsWith('/admin/customers') || path.startsWith('/admin/history/customer')) return 'customers.view';
  if (path.startsWith('/admin/products')) return 'products.manage';
  if (path.startsWith('/admin/inventory') || path.startsWith('/admin/history/inventory')) return 'inventory.manage';
  if (path.startsWith('/admin/chats')) return 'chats.manage';
  if (path.startsWith('/admin/announcements')) return 'announcements.manage';
  if (path.startsWith('/admin/expenses')) return 'expenses.manage';
  if (path.startsWith('/admin/analytics')) return 'analytics.view';
  if (path.startsWith('/admin/activity') || path.startsWith('/admin/history/admin-activity')) return 'activity.view';
  if (path.startsWith('/admin/settings')) return 'settings.manage';
  return null;
};

export const canOpenAdminPage = (user, path) => {
  const permission = adminPagePermission(path);
  return permission === 'superadmin' ? isSuperAdminUser(user) : !permission || hasStaffPermission(user, permission);
};

export const getAdminLandingPath = user => ['/admin/dashboard', '/admin/orders', '/admin/invoices', '/admin/customers', '/admin/products', '/admin/inventory', '/admin/chats', '/admin/expenses', '/admin/analytics', '/admin/guide'].find(path => canOpenAdminPage(user, path));
