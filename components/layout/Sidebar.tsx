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
  DollarSign, 
  Bell, 
  Settings, 
  ShieldAlert, 
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CalendarDays,
  Target
} from 'lucide-react';
import { useStore } from '@/lib/store';
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

export const navSections: NavSection[] = [
  {
    title: 'Nuro Core',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Projects', href: '/projects', icon: Briefcase },
      { label: 'Task Center', href: '/workcenter', icon: CheckSquare },
      { label: 'My Targets', href: '/targets', icon: Target },
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
      { label: 'Finance', href: '/finance', icon: DollarSign },
      { label: 'Team Chat', href: '/team-chat', icon: MessageSquare },
      { label: 'AI Assistant', href: '/chat', icon: BrainCircuit },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Account Settings', href: '/profile', icon: UserCircle },
      { label: 'User Management', href: '/admin', icon: Settings },
      { label: 'Targets Admin', href: '/targets/ceo', icon: Target },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, userProfile, theme, notifications, toggleSidebar } = useStore();
  const logoSrc = theme === 'light' ? '/logo-black.svg' : '/logo-white.svg';

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  return (
    <aside 
      className={cn(
        "h-screen border-r border-border-subtle dark:border-[#1e2030] flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 text-text-secondary dark:text-slate-300 bg-background-primary",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Sidebar toggle button sitting on the right border line */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background-secondary dark:bg-[#12131c] border border-border-subtle dark:border-[#1e2030] flex items-center justify-center shadow-md hover:scale-115 hover:border-accent-blue hover:text-accent-blue text-text-secondary dark:text-slate-400 z-50 transition-all duration-300 hover:shadow-[0_0_10px_rgba(var(--theme-color-rgb),0.4)] cursor-pointer"
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
          "h-16 flex items-center border-b border-border-subtle dark:border-[#1e2030]/60 overflow-hidden",
          sidebarCollapsed ? "justify-center px-0" : "px-6"
        )}
      >
        {sidebarCollapsed ? (
          <div className="w-9 h-9 relative overflow-hidden flex items-center justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={logoSrc} 
              alt="N" 
              className="h-9 max-w-none absolute left-0 top-0"
            />
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={logoSrc} 
            alt="Nurofin Logo" 
            className="h-9 w-auto block"
          />
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!sidebarCollapsed && (
              <div className="text-[10px] font-bold text-text-muted/80 dark:text-slate-500 uppercase tracking-widest px-3 pt-4 pb-1.5 select-none">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all group relative",
                    sidebarCollapsed ? "justify-center px-0 w-11 h-11 mx-auto" : "w-full",
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
                  
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-[13px] font-bold">{item.label}</span>
                  )}

                  {/* Notification Badges inside nav items */}
                  {item.label === 'Notifications' && unreadNotificationsCount > 0 && (
                    <span 
                      className={cn(
                        "flex-shrink-0 rounded-full text-2xs px-1.5 py-0.5 font-bold leading-none transition-transform duration-200 group-hover:scale-105",
                        sidebarCollapsed 
                          ? "absolute -top-1 -right-1 bg-accent-red text-white"
                          : isActive 
                            ? "bg-white text-[#3B82F6]" 
                            : "bg-accent-red/20 text-accent-red"
                      )}
                      style={isActive ? { color: 'var(--theme-color)' } : {}}
                    >
                      {unreadNotificationsCount}
                    </span>
                  )}

                  {/* Tooltip for Collapsed Sidebar */}
                  {sidebarCollapsed && (
                    <span className="absolute left-14 scale-0 group-hover:scale-100 transition-all rounded bg-background-secondary dark:bg-[#12131c] border border-border-subtle dark:border-[#1e2030] p-2 text-xs text-text-primary dark:text-white z-50 shadow-md font-sans whitespace-nowrap">
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
        <div className={cn("flex items-center gap-3", sidebarCollapsed ? "justify-center" : "justify-between")}>
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
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-text-primary dark:text-white truncate">{userProfile.name}</span>
                <span className="text-[10px] text-text-muted dark:text-slate-500">{userProfile.role ? userProfile.role.toUpperCase() : ''}</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button 
              onClick={handleLogout}
              className="text-text-secondary hover:text-accent-red dark:text-slate-400 dark:hover:text-accent-red p-1.5 rounded-md hover:bg-accent-red/10 transition-colors flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {sidebarCollapsed && (
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center text-text-secondary hover:text-accent-red dark:text-slate-400 dark:hover:text-accent-red p-1.5 rounded-md hover:bg-accent-red/10 transition-colors w-full"
            title="Logout"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </aside>
  );
}
