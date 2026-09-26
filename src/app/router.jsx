import React, { useContext } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AuthContext } from '../context/AuthContext';
import RouteErrorBoundary from '../components/ui/RouteErrorBoundary';

// Customer & Public Pages
import Home from '../pages/home/Home';
import Shop from '../pages/shop/Shop';
import ProductDetails from '../pages/product/ProductDetails';
import Cart from '../pages/cart/Cart';
import Checkout from '../pages/checkout/Checkout';
import ChatPage from '../pages/chat/ChatPage';
import OrdersList from '../pages/orders/OrdersList';
import OrderDetails from '../pages/orders/OrderDetails';
import CustomerInvoices from '../pages/invoices/CustomerInvoices';
import CustomerInvoiceDetails from '../pages/invoices/CustomerInvoiceDetails';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import Settings from '../pages/settings/Settings';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminOrders from '../pages/admin/Orders';
import AdminChats from '../pages/admin/Chats';
import { Invoices as AdminInvoices } from '../pages/admin/Invoices';
import AdminCustomers from '../pages/admin/Customers';
import AdminCustomerDetail from '../pages/admin/CustomerDetail';
import AdminInventory from '../pages/admin/Inventory';
import AdminInventoryHistory from '../pages/admin/InventoryHistory';
import SalesOrderHistory from '../pages/admin/SalesOrderHistory';
import AdminActivityHistory from '../pages/admin/AdminActivityHistory';
import CustomerAccountHistory from '../pages/admin/CustomerAccountHistory';
import AdminActivity from '../pages/admin/Activity';
import AdminProfile from '../pages/admin/AdminProfile';
import ExpenseTracker from '../pages/admin/ExpenseTracker';
import AdminAnnouncements from '../pages/admin/AdminAnnouncements';

/**
 * ProtectedGate — requires the user to be signed in.
 * Reads from AuthContext (Express JWT auth session).
 */
const ProtectedGate = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * AdminGate — requires the user to be signed in AND have role === 'admin' | 'subAdmin' | 'super_admin'.
 */
const AdminGate = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  const isAdminRole =
    user.role === 'admin' ||
    user.role === 'subAdmin' ||
    user.role === 'superadmin' ||
    user.role === 'super_admin';

  if (!isAdminRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'shop',
        element: <Shop />
      },
      {
        path: 'product/:id',
        element: <ProductDetails />
      },
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'register',
        element: <Register />
      },
      {
        path: 'cart',
        element: <ProtectedGate><Cart /></ProtectedGate>
      },
      {
        path: 'checkout',
        element: <ProtectedGate><Checkout /></ProtectedGate>
      },
      {
        path: 'chat',
        element: <ProtectedGate><ChatPage /></ProtectedGate>
      },
      {
        path: 'dashboard',
        element: <Navigate to="/shop" replace />
      },
      {
        path: 'orders',
        element: <ProtectedGate><OrdersList /></ProtectedGate>
      },
      {
        path: 'orders/:id',
        element: <ProtectedGate><OrderDetails /></ProtectedGate>
      },
      {
        path: 'invoices',
        element: <ProtectedGate><CustomerInvoices /></ProtectedGate>
      },
      {
        path: 'invoices/:id',
        element: <ProtectedGate><CustomerInvoiceDetails /></ProtectedGate>
      },
      {
        path: 'profile',
        element: <Navigate to="/shop?profile=open" replace />
      },
      {
        path: 'notifications',
        element: <ProtectedGate><NotificationsPage /></ProtectedGate>
      },
      {
        path: 'settings',
        element: <ProtectedGate><Settings /></ProtectedGate>
      }
    ]
  },
  {
    path: '/admin',
    element: <AdminGate><AdminLayout /></AdminGate>,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />
      },
      {
        path: 'products',
        element: <AdminProducts />
      },
      {
        path: 'orders',
        element: <AdminOrders />
      },
      {
        path: 'chats',
        element: <AdminChats />
      },
      {
        path: 'invoices',
        element: <AdminInvoices />
      },
      {
        path: 'invoices/:id',
        element: <CustomerInvoiceDetails />
      },
      {
        path: 'customers',
        element: <AdminCustomers />
      },
      {
        path: 'customers/:id',
        element: <AdminCustomerDetail />
      },
      {
        path: 'inventory',
        element: <AdminInventory />
      },
      {
        path: 'inventory-history',
        element: <AdminInventoryHistory />
      },
      {
        path: 'expenses',
        element: <ExpenseTracker />
      },
      {
        path: 'announcements',
        element: <AdminAnnouncements />
      },
      {
        path: 'history/inventory',
        element: <AdminInventoryHistory />
      },
      {
        path: 'history/sales-orders',
        element: <SalesOrderHistory />
      },
      {
        path: 'history/admin-activity',
        element: <AdminActivityHistory />
      },
      {
        path: 'history/customer-accounts',
        element: <CustomerAccountHistory />
      },
      {
        path: 'activity',
        element: <AdminActivity />
      },
      {
        path: 'notifications',
        element: <NotificationsPage />
      },
      {
        path: 'profile',
        element: <AdminProfile />
      },
      {
        path: '',
        element: <Navigate to="/admin/dashboard" replace />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

export default router;
