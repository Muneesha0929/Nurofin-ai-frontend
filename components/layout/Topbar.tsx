'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Menu, Sun, Moon, RefreshCw, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import NotificationShade from '@/components/notifications/NotificationShade';

export default function Topbar() {
  const pathname = usePathname();
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    toggleMobileSidebar,
    searchQuery, 
    setSearchQuery, 
    notifications, 
    aiStatus,
    theme,
    setTheme,
    liveSyncConnected,
    triggerInPlaceRefresh
  } = useStore();

  const [timeString, setTimeString] = useState('');
  const [shadeOpen, setShadeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Digital Clock synchronize
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadCount = unreadNotifications.length;

  // Format Pathname to Page Header Title
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Executive Dashboard';
    if (pathname === '/departments') return 'Departments & Quarter Targets';
    if (pathname === '/deadlines') return 'Deadlines';
    if (pathname === '/projects') return 'Projects & Initiatives';
    if (pathname === '/tasks' || pathname === '/workcenter') return 'Task Center / Execution Hub';
    if (pathname === '/features') return 'Product Features';
    if (pathname === '/planner') return 'Executive Planner';
    if (pathname === '/meetings') return 'Meeting Operations';
    if (pathname === '/knowledge') return 'Document Hub';
    if (pathname === '/issues') return 'Issue Center';
    if (pathname === '/finance') return 'Financial Operations';
    if (pathname === '/chat') return 'Executive AI Assistant';
    if (pathname === '/notifications') return 'Notification Timeline';
    if (pathname === '/profile') return 'Account Settings';
    if (pathname === '/admin') return 'System Administration';
    if (pathname === '/login') return 'Nurofin Gateway';
    return 'Nurofin EOS';
  };

  return (
    <header 
      className="h-16 border-b border-border-subtle bg-background-secondary/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 w-full transition-all duration-300"
    >
      {/* Left Area: Menu toggle and Page Header Title */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button 
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              toggleMobileSidebar();
            } else {
              toggleSidebar();
            }
          }} 
          className="text-text-secondary hover:text-text-primary focus:outline-none p-1.5 hover:bg-surface-hover rounded-md transition-colors shrink-0 cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-sans font-bold text-sm sm:text-base text-text-primary tracking-wide truncate max-w-[170px] sm:max-w-xs md:max-w-none">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center/Right Search Bar */}
      <div className="flex-1 max-w-md mx-4 md:mx-6 md:block hidden">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search department, person, date, or task..."
            className="w-full h-9 bg-background-primary border border-border-subtle rounded-md pl-10 pr-8 text-xs text-text-primary placeholder-text-muted focus:border-accent-blue transition-colors font-sans"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Area: Live Sync, Refresh, Clock, Theme, Bell */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Live Sync Indicator */}
        <div
          className="items-center gap-1.5 md:flex hidden bg-background-primary px-2.5 py-1.5 rounded-full border border-border-subtle text-[11px] font-medium"
          title={liveSyncConnected ? 'Real-time live updates active' : 'Live sync reconnecting'}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              liveSyncConnected ? "bg-accent-green" : "bg-accent-orange animate-pulse"
            )}
          />
          <span className="text-text-secondary font-sans">
            {liveSyncConnected ? 'Live' : 'Sync'}
          </span>
        </div>

        {/* In-Place Refresh Button (preserves current page, tab, and open drawer) */}
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            triggerInPlaceRefresh();
            setTimeout(() => setRefreshing(false), 600);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md border border-border-subtle bg-background-primary transition-colors cursor-pointer"
          aria-label="Refresh current view"
          title="Refresh data on this page without leaving"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-accent-blue")} />
          <span className="hidden lg:inline">Refresh</span>
        </button>

        {/* AI Assistant Ready dot */}
        <div className="items-center gap-2 xl:flex hidden bg-background-primary px-3 py-1.5 rounded-full border border-border-subtle text-2xs font-medium">
          <span 
            className={cn(
              "w-2 h-2 rounded-full",
              aiStatus === 'idle' ? "bg-accent-green" : "bg-accent-orange animate-pulse"
            )}
          />
          <span className="text-text-secondary font-sans">
            AI: {aiStatus === 'idle' ? 'Ready' : aiStatus === 'analyzing' ? 'Analyzing' : 'Thinking'}
          </span>
        </div>

        {/* Live digital clock */}
        <div className="font-mono text-xs text-text-secondary bg-background-primary px-3 py-1.5 rounded-md border border-border-subtle tracking-wider md:block hidden">
          {timeString}
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
          aria-label="Toggle Appearance Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell Button with Smartphone-style Pull-Down Shade */}
        <div className="relative">
          <button
            onClick={() => setShadeOpen(!shadeOpen)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors relative cursor-pointer"
            aria-label="Toggle Notification center"
            title="Open Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-background-secondary animate-in zoom-in-75">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Smartphone-Style Notification Shade */}
        <NotificationShade
          isOpen={shadeOpen}
          onClose={() => setShadeOpen(false)}
        />
      </div>
    </header>
  );
}
