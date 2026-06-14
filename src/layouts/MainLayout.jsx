import React, { useContext, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { ChatContext } from "../context/ChatContext";
import { formatCurrency } from "../utils/formatCurrency";
import {
  ShoppingCart,
  MessageSquare,
  LogOut,
  User,
  Menu,
  X,
  ShieldAlert,
} from "lucide-react";

export const MainLayout = () => {
  const { user, logout, isAdmin } = useContext(AuthContext);
  const { cartCount, subtotal } = useContext(CartContext);
  const { activeRoom } = useContext(ChatContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Check if room has unread messages
  const hasUnread = activeRoom?.unreadCount > 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      {/* Top Banner Alert for Wholesale Minimum Limit */}
      <div className="bg-brand-green-900 text-brand-yellow-400 py-1.5 px-4 text-xs font-semibold tracking-wider text-center flex items-center justify-center gap-1.5 shadow-sm">
        <span>
          📦 wholesale-ONLY PLATFORM | MINIMUM ORDER VALUE:{" "}
          {formatCurrency(100000)}
        </span>
      </div>

      {/* Main Header Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-green-700 to-brand-green-500 flex items-center justify-center text-brand-yellow-400 font-extrabold text-xl shadow-md tracking-wider">
                  V
                </div>
                <div>
                  <span className="font-bold text-lg tracking-tight text-brand-green-950 block leading-tight">
                    VINOFF{" "}
                    <span className="text-brand-green-600">WHOLESALES</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase block -mt-0.5">
                    Toiletries & Household
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Linkages */}
            <nav className="hidden md:flex space-x-8 text-sm font-semibold">
              <Link
                to="/"
                className={`transition-colors ${isActive("/") ? "text-brand-green-700 border-b-2 border-brand-green-600 pb-1" : "text-slate-600 hover:text-brand-green-700"}`}
              >
                Home
              </Link>
              <Link
                to="/shop"
                className={`transition-colors ${isActive("/shop") ? "text-brand-green-700 border-b-2 border-brand-green-600 pb-1" : "text-slate-600 hover:text-brand-green-700"}`}
              >
                Product Shelf
              </Link>
              {user && (
                <Link
                  to="/chat"
                  className={`relative flex items-center gap-1 transition-colors ${isActive("/chat") ? "text-brand-green-700 border-b-2 border-brand-green-600 pb-1" : "text-slate-600 hover:text-brand-green-700"}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Support Chat</span>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white animate-pulse-ring" />
                  )}
                </Link>
              )}
            </nav>

            {/* Right Buttons / Actions */}
            <div className="hidden md:flex items-center gap-4">
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Admin Console
                </Link>
              )}

              {/* Shopping Cart Indicator */}
              <Link
                to="/cart"
                className="relative p-2 text-slate-600 hover:text-brand-green-700 bg-slate-100 hover:bg-brand-green-50 rounded-xl transition-all flex items-center gap-1.5 group"
              >
                <ShoppingCart className="w-5 h-5 group-hover:scale-105 transition-transform" />
                {cartCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 bg-brand-green-600 text-white text-xs font-bold w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {cartCount}
                  </span>
                ) : null}
              </Link>

              {user ? (
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-800">
                      {user.name}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">
                      {user.businessName}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/login"
                    className="text-slate-600 hover:text-brand-green-700 text-sm font-semibold px-3 py-2 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-brand-green-600 hover:bg-brand-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Register Business
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Action */}
            <div className="md:hidden flex items-center gap-2">
              <Link
                to="/cart"
                className="relative p-2 text-slate-600 hover:text-brand-green-700 bg-slate-100 rounded-lg transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-green-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2.5">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive("/") ? "bg-brand-green-50 text-brand-green-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Home
            </Link>
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive("/shop") ? "bg-brand-green-50 text-brand-green-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Product Shelf
            </Link>
            {user && (
              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive("/chat") ? "bg-brand-green-50 text-brand-green-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                Support Chat {hasUnread && "(New messages)"}
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-base font-semibold"
              >
                Admin Console
              </Link>
            )}

            <div className="border-t border-slate-100 pt-3">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {user.businessName}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-1.5 text-red-600 text-sm font-semibold hover:bg-red-50 p-2 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 px-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-slate-600 hover:bg-slate-50 border border-slate-200 py-2.5 rounded-lg text-sm font-semibold"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center bg-brand-green-600 hover:bg-brand-green-700 text-white py-2.5 rounded-lg text-sm font-semibold"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-tight">
                VINOFF <span className="text-brand-green-400">WHOLESALES</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase block mt-1">
                Professional B2B supplier for toiletries & household
                sanitization products
              </span>
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
                Quick Navigation
              </h4>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <Link to="/" className="hover:text-white transition-colors">
                    Home Landing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop"
                    className="hover:text-white transition-colors"
                  >
                    Product Shelf
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cart"
                    className="hover:text-white transition-colors"
                  >
                    My Carton Cart
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
                Wholesale T&C
              </h4>
              <p className="text-xs leading-relaxed text-slate-500">
                Minimum billing order value of {formatCurrency(150)} required.
                Wire payments and GTB transfer slips must be submitted in
                support chats to begin packing and logistics.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Vinoff Wholesales Ltd. All rights
            reserved. Designed for Premium Commercial Distribution.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
