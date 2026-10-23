import { useContext, useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { NotificationContext } from '../context/NotificationContext';
import Avatar from '../components/ui/Avatar';
import AnnouncementModal from '../components/ui/AnnouncementModal';
import AdminSidebarNavigation from '../components/admin/AdminSidebarNavigation';
import CreditApprovalPopup from '../components/admin/CreditApprovalPopup';
import { canOpenAdminPage, getAdminLandingPath, isSuperAdminUser } from '../utils/staffPermissions';
import { getAdminNavItem } from './adminNavigation';
import { getInitials } from '../utils/avatar';
import { 
  LogOut, Bell, Menu, X, ArrowLeft
} from 'lucide-react';

export const AdminLayout = () => {
  const { user, logout, isAdmin, loading } = useContext(AuthContext);
  const { rooms } = useContext(ChatContext);
  const { notifications, markAllAsRead, markAsRead } = useContext(NotificationContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);
  const menuToggleRef = useRef(null);
  const sidebarCloseRef = useRef(null);
  const wasMobileSidebarOpen = useRef(false);

  const closeMobileSidebar = () => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (isDesktop) {
      wasMobileSidebarOpen.current = false;
      return;
    }
    if (sidebarOpen) sidebarCloseRef.current?.focus();
    else if (wasMobileSidebarOpen.current) menuToggleRef.current?.focus();
    wasMobileSidebarOpen.current = sidebarOpen;
  }, [sidebarOpen, isDesktop]);

  // Auto-close sidebar on mobile/tablet view when navigating
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Set default sidebar state based on screen width on initial load
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
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
    approvals: unreadSystemNotifs.filter(item => item.type === 'CREDIT_LIMIT_REQUESTED').length,
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

  // Auto-clear category notifications when the admin is actively viewing that tab
  useEffect(() => {
    if (loading || !isAdmin || !user || !notifications.length) return;
    const currentPath = location.pathname;

    const notifsToClear = notifications.filter((n) => {
      if (n.isRead || n.read) return false;
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
  }, [location.pathname, notifications, markAsRead, user, isAdmin, loading]);

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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-6 bg-white rounded-2xl shadow-md border border-slate-200">
          <p className="text-red-500 font-bold text-lg mb-2">Access Denied</p>
          <p className="text-slate-600 text-sm mb-4">You do not have Administrator permissions.</p>
          <button onClick={() => navigate('/shop')} className="px-4 py-2 bg-brand-green-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-green-700 transition">Go to Shop Shelf</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-slate-100 overflow-hidden text-slate-800 print:h-auto print:overflow-visible print:bg-white relative">
      <div className="absolute z-[70]"><AnnouncementModal /></div>
      
      {/* Mobile/Tablet Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-slate-950/60 z-50 lg:hidden"
        />
      )}

      {/* Sidebar for Desktop, Tablet, and Mobile */}
      <aside 
        id="admin-sidebar"
        aria-label="Admin sidebar"
        role={!isDesktop ? 'dialog' : undefined}
        aria-modal={!isDesktop && sidebarOpen ? true : undefined}
        aria-hidden={!sidebarOpen || undefined}
        inert={!sidebarOpen || undefined}
        onKeyDown={event => {
          if (isDesktop) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            closeMobileSidebar();
          }
          if (event.key === 'Tab') {
            const controls = [...event.currentTarget.querySelectorAll('a[href], button:not(:disabled)')].filter(element => element.getClientRects().length > 0);
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}
        className={`admin-sidebar fixed inset-y-0 left-0 z-[60] w-64 shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 transition-transform duration-200 motion-reduce:transition-none transform lg:relative lg:translate-x-0 print:hidden flex flex-col shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header Logo */}
        <div className="admin-sidebar-header flex items-center justify-between h-16 px-5 bg-slate-950 border-b border-slate-800 shrink-0">
          <Link to={getAdminLandingPath(user)} onClick={closeMobileSidebar} className="flex items-center gap-3 min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green-400">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-1 shadow-sm shrink-0 ring-2 ring-white/20">
              <img src="/VinoffLogo.webp" alt="Vinoff Logo" className="w-7 h-7 object-contain" />
            </div>
            <div className="truncate">
              <span className="font-bold text-sm tracking-tight text-white block">
                VINOFF <span className="text-brand-yellow-400">ADMIN</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Management Suite
              </span>
            </div>
          </Link>
          
          <button 
            ref={sidebarCloseRef}
            onClick={closeMobileSidebar}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Close Sidebar"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AdminSidebarNavigation counts={{ ...tabCounts, chats: unreadChatRoomsCount, notifications: unreadNotifsCount }} onNavigate={closeMobileSidebar} />

        {/* Sidebar Footer Account Details */}
        <div className="admin-sidebar-footer shrink-0 px-4 py-3 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <Link to="/admin/profile" onClick={closeMobileSidebar} className="flex items-center gap-2.5 min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-400" aria-label="View your admin profile">
              <Avatar
                src={user?.avatarUrl}
                alt={user?.name || "Admin"}
                size={32}
                fallback={getInitials(user, "AD")}
                className="rounded-xl bg-brand-green-100 text-brand-green-800 shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </Link>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 hover:text-red-400 rounded-lg text-slate-500 transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
          <Link 
            to="/" 
            className="admin-sidebar-store-link mt-2 flex items-center gap-2 text-[11px] text-slate-400 hover:text-white transition-colors border-t border-slate-800 pt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            View Store
          </Link>
        </div>
      </aside>

      {/* Main Panel Content Window */}
      <div inert={sidebarOpen && !isDesktop || undefined} className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        
        {/* Top bar header */}
        <header className="relative h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 sm:px-6 z-30 print:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <button 
              ref={menuToggleRef}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
              className="shrink-0 p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer lg:hidden"
              title="Toggle Menu"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Page Title — shows current section name */}
            <h1 title={getAdminNavItem(location.pathname)?.name} className="min-w-0 truncate text-sm sm:text-lg font-bold text-slate-800 tracking-tight">
              {getAdminNavItem(location.pathname)?.name || 'Admin Suite'}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4 relative">
            
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
                          to={notif.type.startsWith('CREDIT_LIMIT_') ? '/admin/credit-approvals' : '/admin/notifications'}
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
        <main className={`min-h-0 flex-1 p-3.5 sm:p-6 md:p-8 print:p-0 print:overflow-visible ${location.pathname === '/admin/guide' ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto'}`}>
          {canOpenAdminPage(user, location.pathname) ? <Outlet /> : <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6"><h1 className="text-lg font-semibold text-slate-900">Permission Required</h1><p className="mt-2 text-sm text-slate-500">The super admin has not granted your account access to this section. Choose an available section in the sidebar or request access.</p><Link to="/admin/guide" className="mt-4 inline-block text-sm font-semibold text-brand-green-700">Open Operating Guide</Link></div>}
          {isSuperAdminUser(user) && <CreditApprovalPopup />}
        </main>
      </div>
      
    </div>
  );
};

export default AdminLayout;
