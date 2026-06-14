import React, { useContext, useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, MessageSquare, 
  FileSpreadsheet, Users, Warehouse, LogOut, Bell, Menu, X, ArrowLeft
} from 'lucide-react';

export const AdminLayout = () => {
  const { user, logout, isAdmin, loading } = useContext(AuthContext);
  const { rooms } = useContext(ChatContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Security gate: only redirect AFTER Firebase has confirmed the auth state.
  // Without the loading check, this fires when user is null during initial load
  // and incorrectly kicks even valid admins back to /shop.
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/shop');
    }
  }, [loading, isAdmin, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: ShoppingBag },
    { name: 'Orders', path: '/admin/orders', icon: ClipboardList },
    { name: 'Chats', path: '/admin/chats', icon: MessageSquare, badge: true },
    { name: 'Invoices', path: '/admin/invoices', icon: FileSpreadsheet },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Inventory', path: '/admin/inventory', icon: Warehouse },
  ];

  const activeRoomsWithUnread = rooms.filter(r => r.unreadCount > 0);
  const unreadChatsCount = activeRoomsWithUnread.length;

  // Show spinner while Firebase resolves the session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Auth resolved but user is not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-6 bg-white rounded-2xl shadow-md border border-slate-200">
          <p className="text-red-500 font-bold text-lg mb-2">Access Denied</p>
          <p className="text-slate-600 text-sm mb-4">You do not have Administrator permissions.</p>
          <button 
            onClick={() => navigate('/shop')}
            className="px-4 py-2 bg-brand-green-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-green-700 transition"
          >
            Go to Shop Shelf
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800">
      
      {/* Sidebar for Desktop */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 transform md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header Logo */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-brand-yellow-500 to-brand-yellow-400 flex items-center justify-center text-slate-950 font-black text-base shadow">
              V
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                VINOFF <span className="text-brand-yellow-400">ADMIN</span>
              </span>
              <span className="text-[9px] text-brand-green-400 font-semibold tracking-wider block">
                Management Suite
              </span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = location.pathname === item.path;
            const isChatBadge = item.badge && unreadChatsCount > 0;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all group ${
                  isSelected 
                    ? 'bg-brand-green-600 text-white shadow-md' 
                    : 'hover:bg-slate-800/80 hover:text-white text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-5 h-5 transition-colors ${
                    isSelected ? 'text-brand-yellow-300' : 'text-slate-500 group-hover:text-brand-yellow-400'
                  }`} />
                  <span>{item.name}</span>
                </div>
                {isChatBadge && (
                  <span className="bg-brand-yellow-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                    {unreadChatsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Account Details */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 hover:text-red-400 rounded-lg text-slate-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
          <Link 
            to="/" 
            className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand-green-400 hover:text-brand-yellow-400 transition-colors border-t border-slate-800 pt-2.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Retail Outlet
          </Link>
        </div>
      </aside>

      {/* Main Panel Content Window */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top bar header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Admin Suite'}
            </h1>
          </div>

          <div className="flex items-center gap-4 relative">
            
            {/* Notification Bell Button */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <Bell className="w-5 h-5" />
              {unreadChatsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-yellow-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Notification Overlay Menu */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <h3 className="text-sm font-bold text-slate-800">System Notifications</h3>
                  <span className="text-[10px] bg-brand-green-100 text-brand-green-800 px-2 py-0.5 rounded-full font-bold">
                    {unreadChatsCount} New
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unreadChatsCount > 0 ? (
                    activeRoomsWithUnread.map(room => (
                      <Link
                        key={room.roomId}
                        to="/admin/chats"
                        onClick={() => {
                          setShowNotifications(false);
                        }}
                        className="block p-2 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                      >
                        <p className="text-xs font-bold text-slate-800 truncate">{room.businessName}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {room.lastMessage
                            ? (room.lastMessage.type === "system" ? "📢 Notice update" : room.lastMessage.text)
                            : (room.messages && room.messages.length > 0
                              ? (room.messages[room.messages.length - 1]?.type === "system" ? "📢 Notice update" : room.messages[room.messages.length - 1]?.text)
                              : "New notification")}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">No new message alerts.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8.5 h-8.5 rounded-full bg-brand-green-100 text-brand-green-800 flex items-center justify-center font-bold text-sm">
                AD
              </div>
              <span className="hidden sm:inline text-sm font-semibold text-slate-800">Admin Control</span>
            </div>

          </div>
        </header>

        {/* Dashboard Pages Mount */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
      
    </div>
  );
};

export default AdminLayout;
