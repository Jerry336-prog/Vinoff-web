import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { canOpenAdminPage } from '../../utils/staffPermissions';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ChevronDown, History, LayoutGrid, MessageSquare, Settings, ShoppingBag, Warehouse } from 'lucide-react';
import { ADMIN_NAVIGATION, getAdminNavGroup, getAdminNavBadgeCount, getAdminNavGroupBadgeCount, isAdminNavItemActive } from '../../layouts/adminNavigation';

const groupIcons = { dashboard: LayoutGrid, sales: ShoppingBag, catalog: Warehouse, communication: MessageSquare, finance: BarChart3, history: History, administration: Settings };

function UnreadBadge({ count }) {
  if (count <= 0) return null;
  return <span aria-label={`${count} unread ${count === 1 ? 'update' : 'updates'}`} className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-brand-yellow-400/15 px-1.5 text-[10px] font-semibold tabular-nums text-brand-yellow-200">{count > 99 ? '99+' : count}</span>;
}

export default function AdminSidebarNavigation({ counts = {}, onNavigate }) {
  const { pathname } = useLocation();
  const { user } = useContext(AuthContext);
  const navigation = ADMIN_NAVIGATION.map(group => group.children ? { ...group, children: group.children.filter(item => canOpenAdminPage(user, item.path)) } : group).filter(group => group.children ? group.children.length : canOpenAdminPage(user, group.path));
  const activeGroup = getAdminNavGroup(pathname)?.id || null;
  const [openGroup, setOpenGroup] = useState(activeGroup);

  useEffect(() => {
    setOpenGroup(activeGroup);
  }, [pathname, activeGroup]);

  return (
    <nav aria-label="Admin navigation" className="admin-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
      <p className="admin-nav-caption px-3 pb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">Workspace</p>
      <ul className="admin-nav-groups space-y-1">
        {navigation.map(group => {
          const Icon = groupIcons[group.id];
          if (!group.children) {
            const selected = isAdminNavItemActive(group, pathname);
            return <li key={group.id}><Link to={group.path} onClick={onNavigate} aria-current={selected ? 'page' : undefined} className={`admin-nav-row flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-400 ${selected ? 'bg-brand-green-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}><Icon className={`h-[18px] w-[18px] shrink-0 ${selected ? 'text-white' : 'text-slate-500'}`} aria-hidden="true" /><span>{group.name}</span></Link></li>;
          }
          const expanded = openGroup === group.id;
          const selected = activeGroup === group.id;
          const badgeCount = getAdminNavGroupBadgeCount(group, counts);
          return (
            <li key={group.id}>
              <button type="button" aria-expanded={expanded} aria-controls={`admin-nav-${group.id}`} onClick={() => setOpenGroup(expanded ? null : group.id)} className={`admin-nav-row group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-400 ${selected ? 'bg-slate-800 text-white' : expanded ? 'bg-slate-800/60 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Icon className={`h-[18px] w-[18px] shrink-0 ${selected ? 'text-brand-green-400' : 'text-slate-500 group-hover:text-slate-300'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">{group.name}</span>
                <UnreadBadge count={badgeCount} />
                <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
              </button>
              <ul id={`admin-nav-${group.id}`} hidden={!expanded} className="admin-nav-children ml-5 mt-1 space-y-0.5 border-l border-slate-700/70 py-1 pl-3">
                {group.children.map(item => {
                  const active = isAdminNavItemActive(item, pathname);
                  return <li key={item.path}><Link to={item.path} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`admin-nav-child flex min-h-8 items-center justify-between gap-2 rounded-md px-2.5 py-1 text-xs leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-green-400 ${active ? 'bg-brand-green-700 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'}`}><span>{item.name}</span><UnreadBadge count={getAdminNavBadgeCount(item, counts)} /></Link></li>;
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
