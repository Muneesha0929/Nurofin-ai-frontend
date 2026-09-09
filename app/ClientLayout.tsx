'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import GlobalChat from '@/components/layout/GlobalChat';
import GlobalAssignmentPopup from '@/components/layout/GlobalAssignmentPopup';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { notificationsService } from '@/services/notifications';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    sidebarCollapsed, 
    theme, 
    setTheme, 
    updateUserProfile,
    userProfile,
    themeColor,
    setThemeColor,
    customColor,
    setCustomColor
  } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [isMounted, setIsMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Intercept all 401 Unauthorized API responses globally to redirect to login
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401 && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Auth Guard & User Profile loader: Redirect to login if no token is found, fetch me details if exists
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    
    if (isLoginPage) {
      if (token) {
        authService.getMe()
          .then((user) => {
            updateUserProfile({
              id: String(user.id),
              name: user.full_name || "User",
              email: user.email,
              role: user.role || "Member",
              department: user.department || "General",
              phone: user.phone || "",
              github: user.github || "",
              linkedin: user.linkedin || "",
              avatar: user.profile_picture || ""
            });
            router.replace('/dashboard');
          })
          .catch(() => {
            localStorage.removeItem('auth_token');
            setCheckingAuth(false);
          });
      } else {
        setCheckingAuth(false);
      }
      return;
    }

    if (token) {
      authService.getMe()
        .then((user) => {
          updateUserProfile({
            id: String(user.id),
            name: user.full_name || "User",
            email: user.email,
            role: user.role || "Member",
            department: user.department || "General",
            phone: user.phone || "",
            github: user.github || "",
            linkedin: user.linkedin || "",
            avatar: user.profile_picture || ""
          });
          setCheckingAuth(false);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          setCheckingAuth(false);
          router.replace('/login');
        });
    } else {
      setCheckingAuth(false);
      router.replace('/login');
    }
  }, [isLoginPage, router, updateUserProfile]);

  // Instantiate React Query client
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }));

  // Read persisted theme settings on mount (sync call to prevent FOUC)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    let userId = '';
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          userId = String(payload.sub || '');
        }
      } catch (e) {}
    }

    if (userId) {
      const savedTheme = localStorage.getItem(`nurofin-theme:${userId}`) as 'dark' | 'light' | null;
      if (savedTheme) setTheme(savedTheme);
      
      const savedThemeColor = localStorage.getItem(`nurofin-theme-color:${userId}`) as any;
      if (savedThemeColor) setThemeColor(savedThemeColor);
      
      const savedCustomColor = localStorage.getItem(`nurofin-custom-color:${userId}`);
      if (savedCustomColor) setCustomColor(savedCustomColor);
    } else {
      const savedTheme = localStorage.getItem('nurofin-theme') as 'dark' | 'light' | null;
      if (savedTheme) setTheme(savedTheme);
      
      const savedThemeColor = localStorage.getItem('nurofin-theme-color') as any;
      if (savedThemeColor) setThemeColor(savedThemeColor);
      
      const savedCustomColor = localStorage.getItem('nurofin-custom-color');
      if (savedCustomColor) setCustomColor(savedCustomColor);
    }
  }, [setTheme, setThemeColor, setCustomColor]);

  // Fetch notifications from backend on mount and poll every 30 seconds
  const { setNotifications } = useStore();
  useEffect(() => {
    if (!localStorage.getItem('auth_token')) return;
    let active = true;
    const fetchNotifs = async () => {
      try {
        const data = await notificationsService.getNotifications();
        if (active && data.length > 0) {
          setNotifications(data);
        }
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [setNotifications]);

  // Load user settings when user profile is loaded or changes dynamically
  useEffect(() => {
    const userId = userProfile.id;
    if (userId) {
      const savedTheme = localStorage.getItem(`nurofin-theme:${userId}`) as 'dark' | 'light' | null;
      if (savedTheme) setTheme(savedTheme);
      
      const savedThemeColor = localStorage.getItem(`nurofin-theme-color:${userId}`) as any;
      if (savedThemeColor) setThemeColor(savedThemeColor);
      
      const savedCustomColor = localStorage.getItem(`nurofin-custom-color:${userId}`);
      if (savedCustomColor) setCustomColor(savedCustomColor);
    }
  }, [userProfile.id, setTheme, setThemeColor, setCustomColor]);

  // Synchronize dynamic theme state to HTML document class list
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Synchronize dynamic theme color state to CSS variables
  useEffect(() => {
    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
    };

    const colors = {
      blue: { primary: '#3B82F6', hover: '#2563EB', rgb: '59, 130, 246' },
      green: { primary: '#10B981', hover: '#059669', rgb: '16, 185, 129' },
      purple: { primary: '#8B5CF6', hover: '#7C3AED', rgb: '139, 92, 246' },
      orange: { primary: '#F59E0B', hover: '#D97706', rgb: '245, 158, 11' },
      red: { primary: '#EF4444', hover: '#DC2626', rgb: '239, 68, 68' }
    };

    let selected = colors[themeColor as keyof typeof colors];
    if (themeColor === 'custom' && customColor) {
      const rgb = hexToRgb(customColor) || '59, 130, 246';
      selected = { primary: customColor, hover: customColor, rgb };
    }

    if (selected) {
      const root = document.documentElement;
      root.style.setProperty('--theme-color', selected.primary);
      root.style.setProperty('--theme-color-hover', selected.hover);
      root.style.setProperty('--theme-color-rgb', selected.rgb);
    }
  }, [themeColor, customColor]);

  // If we are on the login page, render full viewport without sidebar/topbar shell
  if (isLoginPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background-primary text-text-primary relative overflow-hidden">
          {children}
        </div>
      </QueryClientProvider>
    );
  }

  // Guard protected pages until client is mounted and authentication is verified
  if (!isMounted || checkingAuth) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background-primary flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-8 h-8 border-4 border-solid rounded-full animate-spin" 
              style={{ borderColor: 'var(--theme-color, #3B82F6)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm text-text-secondary">Authenticating...</p>
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background-primary text-text-primary font-sans flex relative">
        {/* Fixed Animated Grid & Glow Backdrop */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Soft animated glowing background blobs */}
          <div className="absolute top-[-10vw] left-[-10vw] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(var(--theme-color-rgb),0.28)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(var(--theme-color-rgb),0.38)_0%,transparent_70%)] animate-float-slow" />
          <div className="absolute bottom-[-15vw] right-[-10vw] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(var(--theme-color-rgb),0.22)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(var(--theme-color-rgb),0.30)_0%,transparent_70%)] animate-float-medium" />
          <div className="absolute top-[25vw] right-[15vw] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(var(--theme-color-rgb),0.15)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(var(--theme-color-rgb),0.22)_0%,transparent_70%)] animate-float-fast" />
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35] transition-opacity duration-300" 
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(var(--theme-color-rgb), 0.22) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(var(--theme-color-rgb), 0.22) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px'
            }}
          />
        </div>

        {/* Permanent Sidebar */}
        <Sidebar />

        {/* Unified Content Frame */}
        <div 
          className={cn(
            "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 relative z-10",
            sidebarCollapsed ? "pl-16" : "pl-64"
          )}
        >
          {/* Top Navigation */}
          <Topbar />

          {/* Core Content Area */}
          <main className="flex-1 min-w-0 pt-[5.5rem] p-6 overflow-y-auto overflow-x-auto scrollbar-thin min-h-screen">
            {children}
          </main>
          {/* Floating AI Helper overlay */}
          <GlobalChat />
          <GlobalAssignmentPopup />
        </div>
      </div>
    </QueryClientProvider>
  );
}
