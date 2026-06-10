import React, { useContext } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AuthContext } from '../context/AuthContext';

// Customer Pages
import Home from '../pages/home/Home';
import Shop from '../pages/shop/Shop';
import ProductDetails from '../pages/product/ProductDetails';
import Cart from '../pages/cart/Cart';
import Checkout from '../pages/checkout/Checkout';
import ChatPage from '../pages/chat/ChatPage';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminOrders from '../pages/admin/Orders';
import AdminChats from '../pages/admin/Chats';
import InvoiceList from '../modules/invoice/pages/InvoiceList';
import InvoiceDetails from '../modules/invoice/pages/InvoiceDetails';
import AdminCustomers from '../pages/admin/Customers';
import AdminInventory from '../pages/admin/Inventory';

/**
 * ProtectedGate — requires the user to be signed in.
 * Reads from AuthContext (Firebase Auth) — NOT localStorage.
 * Waits for the auth state to finish loading before deciding
 * to redirect, so a page refresh doesn't flash the login screen.
 */
const ProtectedGate = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    // Firebase is still resolving the auth session — hold render
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
 * AdminGate — requires the user to be signed in AND have role === "admin".
 * Non-admin users are sent back to the home page.
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
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return children;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
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
      }
    ]
  },
  {
    path: '/admin',
    element: <AdminGate><AdminLayout /></AdminGate>,
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
        element: <InvoiceList />
      },
      {
        path: 'invoices/:id',
        element: <InvoiceDetails />
      },
      {
        path: 'customers',
        element: <AdminCustomers />
      },
      {
        path: 'inventory',
        element: <AdminInventory />
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
