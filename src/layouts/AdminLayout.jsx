import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { NotificationContext } from '../context/NotificationContext';
import Avatar from '../components/ui/Avatar';
import AnnouncementModal from '../components/ui/AnnouncementModal';
import { getInitials } from '../utils/avatar';
import { 
  LayoutGrid, ShoppingBag, ClipboardList, MessageSquare, 
  FileSpreadsheet, Users, Warehouse, History, LogOut, Bell, Menu, X, ArrowLeft, UserCircle2, ChevronDown, Wallet, Megaphone, Settings, BarChart3
} from 'lucide-react';

export const AdminLayout = () => {
  const { user, logout, isAdmin, loading } = useContext(AuthContext);
  const { rooms } = useContext(ChatContext);
  const { notifications, unreadCount: unreadNotifs, markAllAsRead, markAsRead } = useContext(NotificationContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const isHistoryActive =
    location.pathname.startsWith('/admin/history') ||
    location.pathname === '/admin/inventory-history';

  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(isHistoryActive);

  useEffect(() => {
    if (isHistoryActive) {
      setHistoryDropdownOpen(true);
    }
  }, [isHistoryActive]);

  // Auto-close sidebar on mobile/tablet view when navigating
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Set default sidebar state based on screen width on initial load
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  // Security gate: only redirect AFTER auth has resolved
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/shop');
    }
  }, [loading, isAdmin, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const activeRoomsWithUnread = rooms.filter(r => (r.unreadCount || 0) > 0);
  const unreadChatRoomsCount = activeRoomsWithUnread.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
  const unreadSystemNotifs = notifications.filter(n => !(n.isRead || n.read));
  const unreadNotifsCount = unreadSystemNotifs.length;
  const unreadTotalCount = unreadChatRoomsCount + unreadNotifsCount;

  // Track unread updates per sidebar category
  const tabCounts = {
    products: 0,
    orders: 0,
    invoices: 0,
    customers: 0,
    inventory: 0,
    announcements: 0,
    expenses: 0,
  };

  unreadSystemNotifs.forEach((n) => {
    const t = (n.type || '').toUpperCase();
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();

    if (t.includes('PRODUCT') || title.includes('product') || msg.includes('product')) {
      tabCounts.products++;
    } else if (t.includes('ORDER') || Boolean(n.relatedOrder) || title.includes('order')) {
      tabCounts.orders++;
    } else if (
      t.includes('INVOICE') ||
      t.includes('PAYMENT') ||
      Boolean(n.relatedInvoice) ||
      title.includes('invoice') ||
      title.includes('payment')
    ) {
      tabCounts.invoices++;
    } else if (
      t.includes('CUSTOMER') ||
      t.includes('USER') ||
      title.includes('customer') ||
      msg.includes('registered')
    ) {
      tabCounts.customers++;
    } else if (
      t.includes('INVENTORY') ||
      t.includes('STOCK') ||
      title.includes('stock') ||
      title.includes('inventory')
    ) {
      tabCounts.inventory++;
    } else if (t.includes('ANNOUNCEMENT') || title.includes('announcement')) {
      tabCounts.announcements++;
    } else if (t.includes('EXPENSE') || title.includes('expense')) {
      tabCounts.expenses++;
    }
  });

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutGrid },
    { name: 'Products', path: '/admin/products', icon: ShoppingBag, tabKey: 'products' },
    { name: 'Orders', path: '/admin/orders', icon: ClipboardList, tabKey: 'orders' },
    { name: 'Chats', path: '/admin/chats', icon: MessageSquare, badge: true },
    { name: 'Invoices', path: '/admin/invoices', icon: FileSpreadsheet, tabKey: 'invoices' },
    { name: 'Customers', path: '/admin/customers', icon: Users, tabKey: 'customers' },
    { name: 'Inventory', path: '/admin/inventory', icon: Warehouse, tabKey: 'inventory' },
    { name: 'Inventory History', path: '/admin/inventory-history', icon: History },
    { name: 'Expense Tracker', path: '/admin/expenses', icon: Wallet, tabKey: 'expenses' },
    { name: 'Traffic Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Announcements', path: '/admin/announcements', icon: Megaphone, tabKey: 'announcements' },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell, notifBadge: true },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
    { name: 'Profile', path: '/admin/profile', icon: UserCircle2 },
  ];

  // Show spinner while auth session is loading
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

  // Auto-clear category notifications when the admin is actively viewing that tab
  useEffect(() => {
    if (!user || !unreadSystemNotifs.length) return;
    const currentPath = location.pathname;

    const notifsToClear = unreadSystemNotifs.filter((n) => {
      const t = (n.type || '').toUpperCase();
      const title = (n.title || '').toLowerCase();
      const msg = (n.message || '').toLowerCase();

      if (currentPath.startsWith('/admin/products') && (t.includes('PRODUCT') || title.includes('product') || msg.includes('product'))) {
        return true;
      }
      if (currentPath.startsWith('/admin/orders') && (t.includes('ORDER') || Boolean(n.relatedOrder) || title.includes('order'))) {
        return true;
      }
      if (currentPath.startsWith('/admin/invoices') && (t.includes('INVOICE') || t.includes('PAYMENT') || Boolean(n.relatedInvoice) || title.includes('invoice') || title.includes('payment'))) {
        return true;
      }
      if (currentPath.startsWith('/admin/customers') && (t.includes('CUSTOMER') || t.includes('USER') || title.includes('customer') || msg.includes('registered'))) {
        return true;
      }
      if (currentPath.startsWith('/admin/inventory') && (t.includes('INVENTORY') || t.includes('STOCK') || title.includes('stock') || title.includes('inventory'))) {
        return true;
      }
      if (currentPath.startsWith('/admin/announcements') && (t.includes('ANNOUNCEMENT') || title.includes('announcement'))) {
        return true;
      }
      if (currentPath.startsWith('/admin/expenses') && (t.includes('EXPENSE') || title.includes('expense'))) {
        return true;
      }
      return false;
    });

    if (notifsToClear.length > 0) {
      notifsToClear.forEach((n) => {
        markAsRead(n._id);
      });
    }
  }, [location.pathname, unreadSystemNotifs, markAsRead, user]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800 print:h-auto print:overflow-visible print:bg-white relative">
      <AnnouncementModal />
      
      {/* Mobile/Tablet Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar for Desktop, Tablet, and Mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 transform lg:relative lg:translate-x-0 print:hidden flex flex-col shadow-2xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header Logo */}
        <div className="flex items-center justify-between h-16 px-5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-1 shadow-sm shrink-0 ring-2 ring-white/20">
              <img src="/VinoffLogo.png" alt="Vinoff Logo" className="w-7 h-7 object-contain" />
            </div>
            <div className="truncate">
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
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Close Sidebar"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.isDropdown) {
              const isParentActive = isHistoryActive;
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold tracking-wide transition-all group ${
                      isParentActive
                        ? 'bg-slate-800 text-brand-yellow-400 rounded-xl font-bold'
                        : 'hover:bg-slate-800/80 hover:text-white text-slate-400 rounded-xl'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <item.icon className={`w-5 h-5 transition-colors ${
                        isParentActive ? 'text-brand-yellow-400' : 'text-slate-500 group-hover:text-brand-yellow-400'
                      }`} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        historyDropdownOpen ? 'rotate-180 text-brand-yellow-400' : ''
                      }`}
                    />
                  </button>

                  {historyDropdownOpen && (
                    <div className="pl-7 pr-2 py-1.5 space-y-1 bg-slate-950/60 rounded-2xl border border-slate-800/50">
                      {item.subItems.map((sub) => {
                        const isSubSelected =
                          location.pathname === sub.path ||
                          (sub.path === '/admin/history/inventory' && location.pathname === '/admin/inventory-history');
                        return (
                          <Link
                            key={sub.name}
                            to={sub.path}
                            className={`block px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                              isSubSelected
                                ? 'bg-brand-green-600 text-white font-bold shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                          >
                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon;
            const isSelected = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const isChatBadge = item.badge && unreadChatRoomsCount > 0;
            const isNotifBadge = item.notifBadge && unreadTotalCount > 0;
            const tabBadgeCount = item.tabKey ? (tabCounts[item.tabKey] || 0) : 0;
            const isTabBadge = tabBadgeCount > 0;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 text-sm font-semibold tracking-wide transition-all group ${
                  isSelected 
                    ? 'bg-brand-green-600 text-white shadow-md rounded-2xl font-bold' 
                    : 'hover:bg-slate-800/80 hover:text-white text-slate-400 rounded-xl'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 transition-colors ${
                    isSelected ? 'text-white' : 'text-slate-500 group-hover:text-brand-yellow-400'
                  }`} />
                  <span className="truncate">{item.name}</span>
                </div>
                {isChatBadge && (
                  <span className="bg-brand-yellow-400 text-slate-950 text-[10px] font-bold min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full animate-bounce shrink-0 shadow-sm">
                    {unreadChatRoomsCount}
                  </span>
                )}
                {isNotifBadge && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full animate-pulse shrink-0 shadow-sm">
                    {unreadTotalCount}
                  </span>
                )}
                {isTabBadge && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full animate-pulse shrink-0 shadow-sm">
                    {tabBadgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Account Details */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                src={user?.avatarUrl}
                alt={user?.name || "Admin"}
                size={32}
                fallback={getInitials(user, "AD")}
                className="rounded-xl bg-brand-green-100 text-brand-green-800 shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        
        {/* Top bar header */}
        <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-50 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer lg:hidden"
              title="Toggle Menu"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Page Title — shows current section name */}
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {menuItems.find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))?.name || 'Admin Suite'}
            </h1>
          </div>

          <div className="flex items-center gap-4 relative">
            
            {/* Notification Bell Button */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadTotalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-yellow-500 text-slate-950 text-[10px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none">
                  {unreadTotalCount > 9 ? "9+" : unreadTotalCount}
                </span>
              )}
            </button>

            {/* Notification Overlay Menu */}
            {showNotifications && (
              <div ref={notifRef} className="absolute right-0 top-14 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-scale-up origin-top-right">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800">System Alerts</h3>
                    {unreadTotalCount > 0 && (
                      <span className="bg-brand-green-100 text-brand-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {unreadTotalCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadNotifsCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-[10px] font-bold text-brand-green-700 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-700 transition cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="max-h-[350px] overflow-y-auto p-2">
                  {unreadTotalCount > 0 ? (
                    <div className="space-y-1">
                      {/* Unread Chat Rooms */}
                      {activeRoomsWithUnread.map(room => (
                        <Link
                          key={room.roomId}
                          to={`/admin/chats?room=${room.roomId}`}
                          onClick={() => setShowNotifications(false)}
                          className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 group"
                        >
                          <Avatar
                            src={room.avatarUrl}
                            alt={room.customerName || room.businessName || "Customer"}
                            size={32}
                            fallback={getInitials(room, "C")}
                            className="bg-brand-yellow-100 text-brand-yellow-800 shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{room.businessName}</p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {room.lastMessage
                                ? (room.lastMessage.type === "system" ? "Action required on order" : room.lastMessage.text)
                                : (room.messages && room.messages.length > 0
                                  ? (room.messages[room.messages.length - 1]?.type === "system" ? "Action required on order" : room.messages[room.messages.length - 1]?.text)
                                  : "You have a new message")}
                            </p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-brand-green-500 mt-1 shrink-0"></div>
                        </Link>
                      ))}

                      {/* Unread System Notifications */}
                      {unreadSystemNotifs.map((notif) => (
                        <Link
                          key={notif._id}
                          to="/admin/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-brand-green-100 text-brand-green-800 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{notif.title}</p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{notif.message}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-5 h-5 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">All caught up!</p>
                      <p className="text-xs text-slate-500 mt-1">No new alerts or messages.</p>
                    </div>
                  )}
                </div>
                
                {unreadTotalCount > 0 && (
                  <div className="border-t border-slate-100 p-2 flex items-center justify-between">
                    <Link
                      to="/admin/chats"
                      onClick={() => setShowNotifications(false)}
                      className="text-center py-2 px-3 text-xs font-bold text-brand-green-700 hover:bg-brand-green-50 rounded-xl transition-colors flex-1"
                    >
                      View All Messages
                    </Link>
                    <Link
                      to="/admin/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-center py-2 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex-1"
                    >
                      All Notifications
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Link
              to="/admin/profile"
              className="flex items-center gap-2 pl-3 border-l border-slate-200 group cursor-pointer"
              title="View Admin Profile"
            >
              <Avatar
                src={user?.avatarUrl}
                alt={user?.name || "Admin"}
                size={34}
                fallback={getInitials(user, "AD")}
                className="rounded-full bg-brand-green-100 text-brand-green-800 border border-brand-green-100 group-hover:ring-2 group-hover:ring-brand-green-400 transition"
              />
              <span className="hidden sm:inline text-sm font-semibold text-slate-800 group-hover:text-brand-green-700 transition">
                {user?.name || "Admin Control"}
              </span>
            </Link>

          </div>
        </header>

        {/* Dashboard Pages Mount */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
      
    </div>
  );
};

export default AdminLayout;
