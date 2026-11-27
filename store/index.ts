import { create } from 'zustand';
import { 
  UserProfile, 
  Project, 
  Task, 
  Meeting, 
  Issue, 
  FinanceRecord, 
  NotificationItem,
  TaskStatus,
  TaskPriority,
  IssueStatus,
  IssueSeverity
} from '../types';

interface AppState {
  // Navigation & Shell
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  theme: 'dark' | 'light';
  themeColor: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'custom';
  customColor: string;
  searchQuery: string;
  activeTab: string;
  aiStatus: 'idle' | 'analyzing' | 'thinking';
  selectedProvider: string;
  selectedModel: string;
  inspectMode: 'drawer' | 'dropdown';
  liveSyncConnected: boolean;
  refreshTrigger: number;
  
  // App Entities
  userProfile: UserProfile;
  notifications: NotificationItem[];
  projects: Project[];
  tasks: Task[];
  meetings: Meeting[];
  issues: Issue[];
  financeRecords: FinanceRecord[];

  // Mutators
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setThemeColor: (color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'custom') => void;
  setCustomColor: (hex: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: string) => void;
  setAiStatus: (status: 'idle' | 'analyzing' | 'thinking') => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setInspectMode: (mode: 'drawer' | 'dropdown') => void;
  setLiveSyncConnected: (connected: boolean) => void;
  triggerInPlaceRefresh: () => void;
  
  // User Profile Actions
  updateUserProfile: (profile: Partial<UserProfile>) => void;

  // Notification Actions
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'read' | 'time'>) => void;
  setNotifications: (notifications: NotificationItem[]) => void;

  // Project Actions
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setProjects: (projects: Project[]) => void;

  // Task Actions
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  changeTaskStatus: (id: string, status: TaskStatus) => void;
  setTasks: (tasks: Task[]) => void;

  // Meeting Actions
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  setMeetings: (meetings: Meeting[]) => void;

  // Issue Actions
  addIssue: (issue: Issue) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  setIssues: (issues: Issue[]) => void;

  // Finance Actions
  addFinanceRecord: (record: FinanceRecord) => void;
  setFinanceRecords: (records: FinanceRecord[]) => void;
}

export const useStore = create<AppState>((set) => ({
  // Navigation & Shell Defaults
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  theme: 'light',
  themeColor: 'blue',
  customColor: '#10B981',
  searchQuery: '',
  activeTab: 'dashboard',
  aiStatus: 'idle',
  selectedProvider: 'openrouter',
  selectedModel: 'openai/gpt-oss-20b:free',
  inspectMode: 'drawer',
  liveSyncConnected: false,
  refreshTrigger: 0,

  // Initial empty User Profile
  userProfile: {
    id: '',
    name: '',
    email: '',
    avatar: '',
    role: '',
    department: '',
    skills: [],
    github: '',
    linkedin: '',
    phone: '',
  },

  // Notifications
  notifications: [],

  // Mock Projects
  projects: [],

  // Mock Tasks (Task Center)
  tasks: [],

  // Mock Meetings
  meetings: [],

  // Issues
  issues: [],

  // Finance Records
  financeRecords: [],

  // Shell State Mutators
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setTheme: (theme) => {
    set((state) => {
      const userId = state.userProfile.id;
      if (typeof window !== 'undefined') {
        localStorage.setItem(userId ? `nurofin-theme:${userId}` : 'nurofin-theme', theme);
      }
      return { theme };
    });
  },
  setThemeColor: (themeColor) => {
    set((state) => {
      const userId = state.userProfile.id;
      if (typeof window !== 'undefined') {
        localStorage.setItem(userId ? `nurofin-theme-color:${userId}` : 'nurofin-theme-color', themeColor);
      }
      return { themeColor };
    });
  },
  setCustomColor: (customColor) => {
    set((state) => {
      const userId = state.userProfile.id;
      if (typeof window !== 'undefined') {
        localStorage.setItem(userId ? `nurofin-custom-color:${userId}` : 'nurofin-custom-color', customColor);
      }
      return { customColor };
    });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setAiStatus: (status) => set({ aiStatus: status }),
  setSelectedProvider: (provider: string) => set({ selectedProvider: provider }),
  setSelectedModel: (model: string) => set({ selectedModel: model }),
  setInspectMode: (inspectMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nurofin-inspect-mode', inspectMode);
    }
    set({ inspectMode });
  },
  setLiveSyncConnected: (liveSyncConnected) => set({ liveSyncConnected }),
  triggerInPlaceRefresh: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:refresh'));
    }
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }));
  },

  // User Actions
  updateUserProfile: (profile) => set((state) => ({
    userProfile: { ...state.userProfile, ...profile }
  })),

  // Notification Actions
  markNotificationAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllNotificationsAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
  addNotification: (notif) => set((state) => ({
    notifications: [
      {
        ...notif,
        id: `notif-${Date.now()}`,
        read: false,
        time: 'Just now',
      },
      ...state.notifications
    ]
  })),
  setNotifications: (notifications) => set({ notifications }),

  // Project Actions
  addProject: (project) => set((state) => ({
    projects: [...state.projects, project]
  })),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  setProjects: (projects) => set({ projects }),

  // Task Actions
  addTask: (task) => set((state) => ({
    tasks: [task, ...state.tasks]
  })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id)
  })),
  changeTaskStatus: (id, status) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t)
  })),
  setTasks: (tasks) => set({ tasks }),

  // Meeting Actions
  addMeeting: (meeting) => set((state) => ({
    meetings: [...state.meetings, meeting]
  })),
  updateMeeting: (id, updates) => set((state) => ({
    meetings: state.meetings.map(m => m.id === id ? { ...m, ...updates } : m)
  })),
  setMeetings: (meetings) => set({ meetings }),

  // Issue Actions
  addIssue: (issue) => set((state) => ({
    issues: [issue, ...state.issues]
  })),
  updateIssue: (id, updates) => set((state) => ({
    issues: state.issues.map(i => i.id === id ? { ...i, ...updates } : i)
  })),
  setIssues: (issues) => set({ issues }),

  // Finance Actions
  addFinanceRecord: (record) => set((state) => ({
    financeRecords: [...state.financeRecords, record]
  })),
  setFinanceRecords: (financeRecords) => set({ financeRecords }),
}));
