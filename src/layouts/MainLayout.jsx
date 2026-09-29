import React, { useContext, useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { ChatContext } from "../context/ChatContext";
import { NotificationContext } from "../context/NotificationContext";
import { formatCurrency } from "../utils/formatCurrency";
import ProfileDrawer from "../components/profile/ProfileDrawer";
import Avatar from "../components/ui/Avatar";
import AnnouncementModal from "../components/ui/AnnouncementModal";
import { getInitials } from "../utils/avatar";
import {
  ShoppingCart,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Bell,
  Settings,
  Package,
  ArrowLeft,
} from "lucide-react";

export const MainLayout = () => {
  const { user, logout, isAdmin } = useContext(AuthContext);
  const { cartCount, subtotal } = useContext(CartContext);
  const { activeRoom, rooms } = useContext(ChatContext);
  const { unreadCount: unreadNotifications } = useContext(NotificationContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  // Check if profile was requested via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("profile") === "open") {
      setProfileDrawerOpen(true);
    }
  }, [location.search]);

  // Auto-close mobile menu drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Check if room has unread messages
  const hasUnread = activeRoom?.unreadCount > 0 || rooms.some((room) => room.unreadCount > 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <AnnouncementModal />
      {/* Slide-out Profile Sheet */}
      <ProfileDrawer 
        isOpen={profileDrawerOpen} 
        onClose={() => {
          setProfileDrawerOpen(false);
          // If query param was present, remove it cleanly
          if (location.search.includes("profile=open")) {
            navigate(location.pathname, { replace: true });
          }
        }} 
      />

      {/* Top Banner Alert */}
      <div className="bg-brand-green-900 text-brand-yellow-400 py-1.5 px-4 text-xs font-semibold tracking-wider text-center flex items-center justify-center gap-1.5 shadow-sm">
        <span className="flex items-center justify-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-brand-yellow-400" />
          <span>WHOLESALE-ONLY PLATFORM | BULK PACKAGING & DIRECT DELIVERY</span>
        </span>
      </div>

      {/* Main Header Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3">
                <img src="/VinoffLogo.png" alt="Vinoff Logo" className="w-12 h-12 md:w-14 md:h-14 object-contain shrink-0" />
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

            {/* Desktop Navigation Linkages (No Dashboard for customers) */}
            <nav className="hidden lg:flex space-x-6 text-sm font-semibold">
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
                Catalog
              </Link>
              {user && (
                <>
                  <Link
                    to="/orders"
                    className={`transition-colors ${isActive("/orders") ? "text-brand-green-700 border-b-2 border-brand-green-600 pb-1" : "text-slate-600 hover:text-brand-green-700"}`}
                  >
                    My Orders
                  </Link>
                  <Link
                    to="/invoices"
                    className={`transition-colors ${isActive("/invoices") ? "text-brand-green-700 border-b-2 border-brand-green-600 pb-1" : "text-slate-600 hover:text-brand-green-700"}`}
                  >
                    Invoices
                  </Link>
                  <Link
                    to="/chat"
                    className={`relative flex items-center gap-1 transition-colors ${isActive("/chat") ? "text-brand-green-700 border-b-2 border-brand-green-600 pb-1" : "text-slate-600 hover:text-brand-green-700"}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Support</span>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white animate-pulse-ring" />
                    )}
                  </Link>
                </>
              )}
            </nav>

            {/* Right Buttons / Actions */}
            <div className="hidden md:flex items-center gap-3">
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Admin Console
                </Link>
              )}

              {user && (
                <Link
                  to="/notifications"
                  title="Notifications"
                  className="relative p-2 text-slate-600 hover:text-brand-green-700 bg-slate-100 hover:bg-brand-green-50 rounded-xl transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-yellow-500 text-slate-950 text-[10px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              )}

              {/* Shopping Cart Indicator */}
              <Link
                to="/cart"
                className="relative p-2 text-slate-600 hover:text-brand-green-700 bg-slate-100 hover:bg-brand-green-50 rounded-xl transition-all flex items-center gap-1.5 group"
              >
                <ShoppingCart className="w-5 h-5 group-hover:scale-105 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-brand-green-600 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                  <button 
                    onClick={() => setProfileDrawerOpen(true)}
                    className="text-right hover:opacity-80 transition group cursor-pointer"
                  >
                    <p className="text-xs font-bold text-slate-800 group-hover:text-brand-green-700 transition-colors">
                      {user.name}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      {user.businessName || "Wholesale Buyer"}
                    </p>
                  </button>
                  <button
                    onClick={() => setProfileDrawerOpen(true)}
                    className="p-1 text-slate-600 hover:text-brand-green-700 bg-slate-100 hover:bg-brand-green-50 rounded-xl transition cursor-pointer"
                    title="Account Profile Drawer"
                  >
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.name || "Account profile"}
                      size={32}
                      fallback={getInitials(user, "WB")}
                      className="rounded-xl border border-white shadow-sm bg-brand-green-50 text-brand-green-800"
                    />
                  </button>
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

        {/* Mobile Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fade-in">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive("/") ? "bg-brand-green-50 text-brand-green-700 font-bold" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Home
            </Link>
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive("/shop") ? "bg-brand-green-50 text-brand-green-700 font-bold" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Catalog
            </Link>
            {user && (
              <>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive("/orders") ? "bg-brand-green-50 text-brand-green-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  My Orders
                </Link>
                <Link
                  to="/invoices"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive("/invoices") ? "bg-brand-green-50 text-brand-green-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Invoices
                </Link>
                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive("/notifications") ? "bg-brand-green-50 text-brand-green-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>Notifications</span>
                  {unreadNotifications > 0 && (
                    <span className="bg-brand-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileDrawerOpen(true);
                  }}
                  className="w-full text-left block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Account Profile
                </button>
                <Link
                  to="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive("/chat") ? "bg-brand-green-50 text-brand-green-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>Support Chat</span>
                  {hasUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl bg-amber-50 text-amber-800 text-sm font-bold border border-amber-200 mt-2"
              >
                Admin Console
              </Link>
            )}

            <div className="border-t border-slate-100 pt-3 mt-2">
              {user ? (
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.name || "Account profile"}
                      size={36}
                      fallback={getInitials(user, "WB")}
                      className="rounded-xl border border-white shadow-sm bg-brand-green-50 text-brand-green-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                        {user.businessName || "Wholesale Buyer"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-1.5 text-red-600 text-xs font-bold hover:bg-red-50 p-2 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-slate-700 hover:bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center bg-brand-green-600 hover:bg-brand-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs"
                  >
                    Register Business
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
                Wire payments transfer slips proof must be submitted in
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
