'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  Calendar, 
  Users, 
  CheckSquare, 
  Briefcase, 
  FolderOpen, 
  IndianRupee, 
  Bell, 
  Settings, 
  ShieldAlert, 
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CalendarDays,
  Target,
  Building2,
  CalendarClock,
  TrendingUp,
  Lightbulb,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMeetingBadge } from '@/components/meetings/MeetingWidgets';
import { cn } from '@/utils/cn';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const getNavSections = (isAdmin: boolean, userProfile: any): NavSection[] => [
  {
    title: 'Nuro Core',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Departments', href: '/departments', icon: Building2 },
      // Runway holds salaries and capital: shown to the CEO only (the API refuses everyone else too).
      ...((userProfile?.role || '').toLowerCase() === 'ceo' ? [{ label: 'Runway', href: '/runway', icon: TrendingUp }] : []),
      { label: 'Deadlines', href: '/deadlines', icon: CalendarClock },
      { label: 'Projects', href: '/projects', icon: Briefcase },
      { label: 'Task Center', href: '/workcenter', icon: CheckSquare },
      { label: 'Product Features', href: '/features', icon: Lightbulb },
      { label: 'Targets & Performance', href: '/targets', icon: Target },
    ]
  },
  {
    title: 'Operations Hub',
    items: [
      { label: 'Operations Calendar', href: '/planner', icon: CalendarDays },
      { label: 'Meetings', href: '/meetings', icon: Users },
      { label: 'Document Hub', href: '/documents', icon: FolderOpen },
      { label: 'Issue Center', href: '/issues', icon: ShieldAlert },
    ]
  },
  {
    title: 'System Control',
    items: [
      ...(isAdmin || userProfile?.can_view_finance ? [{ label: 'Finance', href: '/finance', icon: IndianRupee }] : []),
      { label: 'Team Chat', href: '/team-chat', icon: MessageSquare },
      { label: 'AI Assistant', href: '/chat', icon: BrainCircuit },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Account Settings', href: '/profile', icon: UserCircle },
      { label: 'User Management', href: '/admin', icon: Settings },

    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    sidebarCollapsed, 
    mobileSidebarOpen, 
    setMobileSidebarOpen, 
    userProfile, 
    theme, 
    notifications, 
    toggleSidebar 
  } = useStore();
  const logoSrc = theme === 'light' ? '/logo-black.svg' : '/logo-white.svg';

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const meetingBadge = useMeetingBadge();
  const isAdmin = userProfile && ['super_admin', 'ceo'].includes(userProfile.role);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "h-screen border-r border-border-subtle dark:border-[#1e2030] flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 text-text-secondary dark:text-slate-300 bg-background-primary shadow-2xl md:shadow-none",
          // Desktop Widths
          sidebarCollapsed ? "md:w-16" : "md:w-64",
          // Mobile Width & Drawer positioning
          "w-72 max-w-[85vw]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Desktop Sidebar toggle button sitting on the right border line */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-background-secondary dark:bg-[#12131c] border border-border-subtle dark:border-[#1e2030] items-center justify-center shadow-md hover:scale-115 hover:border-accent-blue hover:text-accent-blue text-text-secondary dark:text-slate-400 z-50 transition-all duration-300 hover:shadow-[0_0_10px_rgba(var(--theme-color-rgb),0.4)] cursor-pointer"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 transition-transform duration-200" />
          )}
        </button>

        {/* Brand Logo Container */}
        <div 
          className={cn(
            "h-16 flex items-center justify-between border-b border-border-subtle dark:border-[#1e2030]/60 overflow-hidden px-4 md:px-6",
            sidebarCollapsed ? "md:justify-center md:px-0" : "md:px-6"
          )}
        >
          {sidebarCollapsed ? (
            <>
              {/* Desktop Collapsed Icon */}
              <div className="hidden md:flex w-9 h-9 relative overflow-hidden items-center justify-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={logoSrc} 
                  alt="N" 
                  className="h-9 max-w-none absolute left-0 top-0"
                />
              </div>
              {/* Mobile Drawer Logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={logoSrc} 
                alt="Nurofin Logo" 
                className="h-9 w-auto block md:hidden"
              />
            </>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={logoSrc} 
              alt="Nurofin Logo" 
              className="h-9 w-auto block"
            />
          )}

          {/* Close button on Mobile */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary md:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {getNavSections(isAdmin, userProfile).map((section) => (
          <div key={section.title} className="space-y-1">
            <div className={cn(
              "text-[10px] font-bold text-text-muted/80 dark:text-slate-500 uppercase tracking-widest px-3 pt-4 pb-1.5 select-none",
              sidebarCollapsed && "md:hidden"
            )}>
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all group relative w-full",
                    sidebarCollapsed && "md:justify-center md:px-0 md:w-11 md:h-11 md:mx-auto",
                    isActive 
                      ? "text-white shadow-md shadow-accent-blue/10 dark:shadow-accent-blue/5" 
                      : "text-text-secondary hover:bg-slate-100/70 dark:hover:bg-white/[0.03] hover:text-text-primary dark:text-slate-400 dark:hover:text-white"
                  )}
                  style={isActive ? { backgroundColor: 'var(--theme-color)' } : {}}
                >
                  <div 
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                      isActive 
                        ? "bg-white/20" 
                        : "bg-slate-100/80 dark:bg-[#1c1d29] group-hover:bg-slate-200/80 dark:group-hover:bg-slate-800"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5",
                      isActive ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                    )} />
                  </div>
                  
                  <span className={cn(
                    "truncate flex-1 text-[13px] font-bold",
                    sidebarCollapsed && "md:hidden"
                  )}>
                    {item.label}
                  </span>

                  {/* Notification Badges inside nav items */}
                  {item.label === 'Notifications' && unreadNotificationsCount > 0 && (
                    <span 
                      className={cn(
                        "flex-shrink-0 rounded-full text-2xs px-1.5 py-0.5 font-bold leading-none transition-transform duration-200 group-hover:scale-105",
                        sidebarCollapsed 
                          ? "md:absolute md:-top-1 md:-right-1 bg-accent-red text-white"
                          : isActive 
                            ? "bg-white text-[#3B82F6]" 
                            : "bg-accent-red/20 text-accent-red"
                      )}
                      style={isActive ? { color: 'var(--theme-color)' } : {}}
                    >
                      {unreadNotificationsCount}
                    </span>
                  )}

                  {/* Meetings left today; pulses when one starts within 15 minutes */}
                  {item.label === 'Meetings' && meetingBadge.count > 0 && (
                    <span title={`${meetingBadge.count} meeting${meetingBadge.count === 1 ? '' : 's'} left today`}
                      className={cn(
                        "flex-shrink-0 rounded-full text-2xs px-1.5 py-0.5 font-bold leading-none",
                        sidebarCollapsed 
                          ? "md:absolute md:-top-1 md:-right-1 bg-accent-blue text-white" 
                          : isActive 
                            ? "bg-white text-[#3B82F6]" 
                            : "bg-accent-blue/15 text-accent-blue",
                        meetingBadge.soon && "animate-pulse"
                      )}>
                      {meetingBadge.count}
                    </span>
                  )}

                  {/* Tooltip for Collapsed Sidebar on Desktop */}
                  {sidebarCollapsed && (
                    <span className="hidden md:block absolute left-14 scale-0 group-hover:scale-100 transition-all rounded bg-background-secondary dark:bg-[#12131c] border border-border-subtle dark:border-[#1e2030] p-2 text-xs text-text-primary dark:text-white z-50 shadow-md font-sans whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-border-subtle dark:border-[#1e2030]/60 flex flex-col gap-2">
        <div className={cn("flex items-center gap-3 w-full", sidebarCollapsed ? "justify-between md:justify-center" : "justify-between")}>
          <div className="flex items-center gap-3 min-w-0">
            {userProfile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={userProfile.avatar} 
                alt="User Avatar"
                className="w-8 h-8 rounded-full object-cover border border-border-subtle dark:border-[#1e2030]/80 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs border border-border-subtle dark:border-[#1e2030]/80 flex-shrink-0">
                {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className={cn("flex flex-col min-w-0", sidebarCollapsed && "md:hidden")}>
              <span className="text-xs font-semibold text-text-primary dark:text-white truncate">{userProfile.name}</span>
              <span className="text-[10px] text-text-muted dark:text-slate-500">{userProfile.role ? userProfile.role.toUpperCase() : ''}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className={cn(
              "text-text-secondary hover:text-accent-red dark:text-slate-400 dark:hover:text-accent-red p-1.5 rounded-md hover:bg-accent-red/10 transition-colors flex-shrink-0",
              sidebarCollapsed && "md:hidden"
            )}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {sidebarCollapsed && (
          <button 
            onClick={handleLogout}
            className="hidden md:flex items-center justify-center text-text-secondary hover:text-accent-red dark:text-slate-400 dark:hover:text-accent-red p-1.5 rounded-md hover:bg-accent-red/10 transition-colors w-full"
            title="Logout"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </aside>
  </>
);
}
