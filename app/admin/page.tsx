'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import { 
  Shield, 
  Users, 
  Key, 
  Briefcase, 
  Lock, 
  UserPlus, 
  UserCheck,
  Edit,
  Trash2, 
  Search, 
  Filter, 
  Check, 
  Github, 
  Linkedin, 
  Phone, 
  Mail, 
  FolderPlus,
  Loader2,
  AlertCircle,
  Plus,
  Compass,
  Database,
  Sliders,
  Settings,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Activity,
  TrendingUp,
  Cpu,
  Archive,
  Clock,
  UserX
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { usersService, DepartmentData, RoleData } from '@/services/users';
import { UserProfile as User } from '@/types';
import { useStore } from '@/lib/store';

// Permissions list metadata with high-tech badge markers
const ALL_PERMISSIONS = [
  { 
    key: 'read_finance', 
    label: 'View Budgets', 
    desc: 'Read enterprise ledger, financial projections, and vendor statements.', 
    color: '#06b6d4', 
    badge: 'Financial Read',
    gradient: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/25'
  },
  { 
    key: 'write_finance', 
    label: 'Approve Finance', 
    desc: 'Authorize payouts, allocate quarterly budgets, adjust billing tiers.', 
    color: '#3b82f6', 
    badge: 'Financial Write',
    gradient: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/25'
  },
  { 
    key: 'edit_tasks', 
    label: 'Manage Tasks', 
    desc: 'Create, assign, schedule, and override workflow items and sprints.', 
    color: '#6366f1', 
    badge: 'Operations',
    gradient: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/25'
  },
  { 
    key: 'access_ai', 
    label: 'AI Copilot RAG', 
    desc: 'Query company document vaults and vector databases using AI chat.', 
    color: '#a855f7', 
    badge: 'AI & Data',
    gradient: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/25'
  },
  { 
    key: 'manage_users', 
    label: 'Admin Privileges', 
    desc: 'Full read/write capability to provision employees and modify role ACLs.', 
    color: '#f43f5e', 
    badge: 'Root Access',
    gradient: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/25'
  },
];

// Department Colors mapping for high-end aesthetic visual cues
const DEPARTMENT_COLORS: { [key: string]: { border: string; bg: string; text: string; dot: string } } = {
  "Executive Board": { border: "border-amber-500/20", bg: "bg-amber-500/[0.04]", text: "text-amber-500 dark:text-amber-400", dot: "bg-amber-500" },
  "Human Resources (HR)": { border: "border-purple-500/20", bg: "bg-purple-500/[0.04]", text: "text-purple-500 dark:text-purple-400", dot: "bg-purple-500" },
  "Finance & Accounts": { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", text: "text-emerald-500 dark:text-emerald-400", dot: "bg-emerald-500" },
  "Technology": { border: "border-blue-500/20", bg: "bg-blue-500/[0.04]", text: "text-blue-500 dark:text-blue-400", dot: "bg-blue-500" },
  "Product": { border: "border-sky-500/20", bg: "bg-sky-500/[0.04]", text: "text-sky-500 dark:text-sky-400", dot: "bg-sky-500" },
  "Project Management": { border: "border-cyan-500/20", bg: "bg-cyan-500/[0.04]", text: "text-cyan-500 dark:text-cyan-400", dot: "bg-cyan-500" },
  "Sales": { border: "border-orange-500/20", bg: "bg-orange-500/[0.04]", text: "text-orange-500 dark:text-orange-400", dot: "bg-orange-500" },
  "Marketing": { border: "border-pink-500/20", bg: "bg-pink-500/[0.04]", text: "text-pink-500 dark:text-pink-400", dot: "bg-pink-500" },
  "Customer Success & Support": { border: "border-teal-500/20", bg: "bg-teal-500/[0.04]", text: "text-teal-500 dark:text-teal-400", dot: "bg-teal-500" },
  "Legal & Compliance": { border: "border-red-500/20", bg: "bg-red-500/[0.04]", text: "text-red-500 dark:text-red-400", dot: "bg-red-500" },
  "Operations": { border: "border-indigo-500/20", bg: "bg-indigo-500/[0.04]", text: "text-indigo-500 dark:text-indigo-400", dot: "bg-indigo-500" },
  "Data & Analytics": { border: "border-fuchsia-500/20", bg: "bg-fuchsia-500/[0.04]", text: "text-fuchsia-500 dark:text-fuchsia-400", dot: "bg-fuchsia-500" },
  "Interns & Trainees": { border: "border-slate-500/20", bg: "bg-slate-500/[0.04]", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-500" },
  "Default": { border: "border-slate-500/20", bg: "bg-slate-500/[0.02]", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-500" }
};

// Robust Avatar component to handle missing/broken URLs gracefully
function UserAvatar({ src, name }: { src: string; name: string }) {
  const [error, setError] = useState(false);
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (error || !src) {
    return (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center text-white text-[10px] font-bold shadow-sm select-none">
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={src} 
      alt={name} 
      onError={() => setError(true)} 
      className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/5 shadow-sm"
    />
  );
}

export default function AdminPanelPage() {
  const { userProfile } = useStore();
  const isCEO = userProfile.role === 'CEO' || userProfile.role === 'ceo';

  // State variables
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Modal open states
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState<boolean>(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);

  // Form states
  const [newUser, setNewUser] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    department: '',
    role: '',
    phone: '',
    github: '',
    linkedin: '',
    profile_picture: ''
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({ can_view_finance: false,
    full_name: '',
    username: '',
    email: '',
    password: '',
    department: '',
    role: '',
    phone: '',
    github: '',
    linkedin: '',
    profile_picture: ''
  });
  
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [targetDeptIdForRole, setTargetDeptIdForRole] = useState<number | null>(null);
  
  // Active selection in accordion
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    fetchData();
  }, [isCEO]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await usersService.getUsers();
      const fetchedDepts = await usersService.getDepartments();
      
      setUsers(fetchedUsers);
      setDepartments(fetchedDepts);
      
      if (isCEO) {
        try {
          const fetchedDeleted = await usersService.getDeletedUsers();
          setDeletedUsers(fetchedDeleted);
        } catch {
          setDeletedUsers([]);
        }
      }
      
      if (fetchedDepts.length > 0) {
        setActiveDeptId(fetchedDepts[0].id);
        if (fetchedDepts[0].roles.length > 0) {
          setActiveRoleId(fetchedDepts[0].roles[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the backend API.');
    } finally {
      setLoading(false);
    }
  };

  // Toast notifier helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle user active status
  const handleToggleStatus = async (user: User) => {
    try {
      const updatedStatus = !user.is_active;
      await usersService.updateUser(user.id, { is_active: updatedStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: updatedStatus } : u));
      showToast(`User status set to ${updatedStatus ? 'Active' : 'Suspended'}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user ${userName}?`)) return;
    try {
      await usersService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`User ${userName} deleted successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user.', 'error');
    }
  };

  // Create User submit handler
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.full_name || !newUser.username || !newUser.email || !newUser.password || !newUser.department || !newUser.role) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    try {
      await usersService.createUser({
        full_name: newUser.full_name,
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        department: newUser.department,
        role: newUser.role,
        phone: newUser.phone || undefined,
        github: newUser.github || undefined,
        linkedin: newUser.linkedin || undefined,
        profile_picture: newUser.profile_picture || undefined
      });
      
      showToast(`Registered employee ${newUser.full_name}.`);
      setIsUserModalOpen(false);
      // Reset form
      setNewUser({
        full_name: '',
        username: '',
        email: '',
        password: '',
        department: '',
        role: '',
        phone: '',
        github: '',
        linkedin: '',
        profile_picture: ''
      });
      // Refresh user listing
      const updatedUsers = await usersService.getUsers();
      setUsers(updatedUsers);
    } catch (err: any) {
      showToast(err.message || 'Failed to register employee.', 'error');
    }
  };

  // Start edit flow
  const handleStartEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditUserForm({ can_view_finance: user.can_view_finance,
      full_name: user.name,
      username: user.username || '',
      email: user.email,
      password: '', // optional
      department: user.department || '',
      role: user.role || '',
      phone: user.phone || '',
      github: user.github || '',
      linkedin: user.linkedin || '',
      profile_picture: user.avatar || ''
    });
    setIsEditUserModalOpen(true);
  };

  // Edit User submit handler
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId || !editUserForm.full_name || !editUserForm.username || !editUserForm.email || !editUserForm.department || !editUserForm.role) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    try {
      const updatePayload: any = {
        full_name: editUserForm.full_name,
        username: editUserForm.username,
        email: editUserForm.email,
        department: editUserForm.department,
        role: editUserForm.role,
        phone: editUserForm.phone || null,
        github: editUserForm.github || null,
        linkedin: editUserForm.linkedin || null,
        profile_picture: editUserForm.profile_picture || null
      };
      
      if (editUserForm.password) {
        updatePayload.password = editUserForm.password;
      }

      await usersService.updateUser(editingUserId, updatePayload);
      showToast(`Updated employee details for ${editUserForm.full_name}.`);
      setIsEditUserModalOpen(false);
      setEditingUserId(null);
      
      // Refresh user listing
      const updatedUsers = await usersService.getUsers();
      setUsers(updatedUsers);
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee details.', 'error');
    }
  };

  // Create Department submit handler
  const handleCreateDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const dept = await usersService.createDepartment(newDeptName.trim());
      setDepartments(prev => [...prev, { ...dept, roles: [] }]);
      showToast(`Department "${newDeptName}" created.`);
      setNewDeptName('');
      setIsDeptModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create department.', 'error');
    }
  };

  // Create Role submit handler
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeptIdForRole || !newRoleName.trim()) return;

    try {
      const role = await usersService.createRole(targetDeptIdForRole, newRoleName.trim());
      setDepartments(prev => prev.map(d => {
        if (d.id === targetDeptIdForRole) {
          return { ...d, roles: [...d.roles, role] };
        }
        return d;
      }));
      showToast(`Role "${newRoleName}" added.`);
      setNewRoleName('');
      setTargetDeptIdForRole(null);
      setIsRoleModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create role.', 'error');
    }
  };

  // Delete custom department
  const handleDeleteDept = async (deptId: number, deptName: string) => {
    if (!confirm(`Are you sure you want to delete department "${deptName}"? This will delete all its roles.`)) return;
    try {
      await usersService.deleteDepartment(deptId);
      setDepartments(prev => prev.filter(d => d.id !== deptId));
      showToast(`Department "${deptName}" removed.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete department.', 'error');
    }
  };

  // Delete custom role
  const handleDeleteRole = async (deptId: number, roleId: number, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) return;
    try {
      await usersService.deleteRole(deptId, roleId);
      setDepartments(prev => prev.map(d => {
        if (d.id === deptId) {
          return { ...d, roles: d.roles.filter(r => r.id !== roleId) };
        }
        return d;
      }));
      showToast(`Role "${roleName}" removed.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role.', 'error');
    }
  };

  // Toggle permission keys for a role
  const handlePermissionToggle = async (deptId: number, role: RoleData, permKey: string) => {
    const hasPerm = role.permissions.includes(permKey);
    const updatedPerms = hasPerm 
      ? role.permissions.filter(p => p !== permKey) 
      : [...role.permissions, permKey];

    try {
      await usersService.updateRolePermissions(deptId, role.id, updatedPerms);
      
      // Update local state
      setDepartments(prev => prev.map(d => {
        if (d.id === deptId) {
          return {
            ...d,
            roles: d.roles.map(r => r.id === role.id ? { ...r, permissions: updatedPerms } : r)
          };
        }
        return d;
      }));
      
      showToast(`Role permissions synchronised successfully`);
    } catch (err: any) {
      showToast('Failed to update role permissions.', 'error');
    }
  };

  const activeDepartmentObject = departments.find(d => d.id === activeDeptId);
  const activeRoleObject = activeDepartmentObject?.roles.find(r => r.id === activeRoleId);

  const formRolesOptions = departments.find(d => d.name === newUser.department)?.roles || [];

  const ceoUser = users.find(u => u.role === 'CEO' || u.role === 'ceo' || u.email === 'vincent@nurofin.com');

  const filteredUsers = users.filter(u => {
    if (u.role === 'CEO' || u.role === 'ceo' || u.email === 'vincent@nurofin.com') return false;

    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDeptFilter === 'all' || u.department === selectedDeptFilter;
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  const getDeptColorClasses = (deptName: string) => {
    return DEPARTMENT_COLORS[deptName] || DEPARTMENT_COLORS["Default"];
  };

  const activeUsersCount = users.filter(u => u.is_active).length;
  const totalRolesCount = departments.reduce((acc, d) => acc + d.roles.length, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-text-primary px-4 md:px-8 py-6 pb-20">
      {/* Custom CSS overrides for compact, modern layout */}
      <style>{`
        .toggle-switch-slider {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .custom-scroll-thin::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scroll-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 99px;
        }
        .custom-scroll-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.2);
        }
        /* Make table cell content align perfectly vertical */
        .align-middle td {
          vertical-align: middle;
        }
      `}</style>

      {/* Floating Modern Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 transform scale-100",
          toast.type === 'success' 
            ? "bg-slate-900/95 dark:bg-[#07080f]/95 border-emerald-500/20 text-emerald-300 backdrop-blur-xl" 
            : "bg-slate-900/95 dark:bg-[#07080f]/95 border-rose-500/20 text-rose-300 backdrop-blur-xl"
        )}>
          <div className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center",
            toast.type === 'success' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          )}>
            {toast.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          </div>
          <span className="text-3xs font-bold tracking-wide uppercase">{toast.message}</span>
        </div>
      )}

      {/* Modern Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-background-secondary border border-slate-200/40 dark:border-white/[0.02] rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold tracking-tight">USER MANAGEMENT</h2>
            <p className="text-3xs text-text-secondary leading-relaxed max-w-xl font-medium">
              Manage enterprise directories, provision team layers, and configure security roles with immediate database synchronisation.
            </p>
          </div>
        </div>
        
        {isCEO && (
          <button 
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-3xs font-extrabold uppercase tracking-wide rounded-xl shadow-sm hover:shadow active:scale-95 transition-all duration-150"
          >
            <UserPlus className="w-3.5 h-3.5" /> Provision Employee
          </button>
        )}
      </div>

      {/* Small live metrics indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="px-4 py-3 border border-slate-250/40 dark:border-white/[0.015] bg-[#fafafa]/50 dark:bg-[#12131c]/10 rounded-xl flex items-center justify-between">
          <span className="text-3xs font-extrabold tracking-wider text-text-secondary uppercase">Active Users</span>
          <span className="text-xs font-black text-blue-500">{activeUsersCount} / {users.length}</span>
        </div>
        <div className="px-4 py-3 border border-slate-250/40 dark:border-white/[0.015] bg-[#fafafa]/50 dark:bg-[#12131c]/10 rounded-xl flex items-center justify-between">
          <span className="text-3xs font-extrabold tracking-wider text-text-secondary uppercase">Departments</span>
          <span className="text-xs font-black text-indigo-500">{departments.length}</span>
        </div>
        <div className="px-4 py-3 border border-slate-250/40 dark:border-white/[0.015] bg-[#fafafa]/50 dark:bg-[#12131c]/10 rounded-xl flex items-center justify-between">
          <span className="text-3xs font-extrabold tracking-wider text-text-secondary uppercase">Roles</span>
          <span className="text-xs font-black text-purple-500">{totalRolesCount}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
          <span className="text-[9px] text-text-secondary font-extrabold tracking-widest uppercase">Connecting to Database...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-500/5 border border-rose-500/15 rounded-2xl p-8 text-center text-rose-450 max-w-md mx-auto space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto text-rose-500/60" />
          <p className="text-2xs font-bold leading-relaxed">{error}</p>
          <button onClick={fetchData} className="px-5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-2xs font-extrabold transition-all cursor-pointer">
            Re-init Connection
          </button>
        </div>
      ) : (
        <Tabs defaultValue="users" className="w-full space-y-5">
          <div className="flex justify-start">
            <TabsList className="bg-slate-100 dark:bg-[#11121d]/85 p-1 rounded-xl border border-slate-200/50 dark:border-white/[0.02] flex gap-1 shadow-inner">
              <TabsTrigger 
                value="users" 
                className="px-5 py-2 text-3xs font-extrabold tracking-wider uppercase rounded-lg text-text-secondary data-[state=active]:bg-white dark:data-[state=active]:bg-[#181928] data-[state=active]:text-blue-500 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" /> EMPLOYEES
              </TabsTrigger>
              <TabsTrigger 
                value="departments" 
                className="px-5 py-2 text-3xs font-extrabold tracking-wider uppercase rounded-lg text-text-secondary data-[state=active]:bg-white dark:data-[state=active]:bg-[#181928] data-[state=active]:text-blue-500 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" /> DEPRTMENTS & ROLES
              </TabsTrigger>
              <TabsTrigger 
                value="previous" 
                className="px-5 py-2 text-3xs font-extrabold tracking-wider uppercase rounded-lg text-text-secondary data-[state=active]:bg-white dark:data-[state=active]:bg-[#181928] data-[state=active]:text-rose-500 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" /> PREVIOUS EMPLOYEES
                {deletedUsers.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-md text-[8px] font-black">
                    {deletedUsers.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Directory Panel */}
          <TabsContent value="users" className="space-y-4 animate-in fade-in duration-200">
            {/* CEO Executive Spotlight Card */}
            {ceoUser && (
              <div className="bg-gradient-to-r from-amber-500/[0.04] via-[#fafafa] to-[#fafafa] dark:via-[#12131c]/20 dark:to-[#12131c]/10 border border-amber-550/20 dark:border-amber-500/10 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
                {/* Amber glow effect */}
                <div className="absolute -left-16 -top-16 w-32 h-32 bg-amber-500/5 rounded-full filter blur-xl pointer-events-none" />
                
                <div className="flex items-center gap-4 min-w-0 z-10">
                  <div className="relative">
                    <UserAvatar src={ceoUser.avatar} name={ceoUser.name} />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-background-secondary rounded-full flex items-center justify-center text-white" title="Root Admin">
                      <Key className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">CHIEF EXECUTIVE OFFICER</span>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 bg-amber-500/10 border border-amber-550/20 text-amber-500 rounded-md">SUPER ADMIN</span>
                    </div>
                    <h3 className="text-sm font-black text-text-primary leading-tight truncate">{ceoUser.name}</h3>
                    <p className="text-[10px] text-text-muted font-bold leading-none">@{ceoUser.username || 'vincent_ceo'}</p>
                  </div>
                </div>

                {/* Contact & Networks */}
                <div className="flex flex-col sm:flex-row md:items-center gap-4 md:gap-8 z-10">
                  <div className="space-y-1 text-2xs font-semibold text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span>{ceoUser.email}</span>
                    </div>
                    {ceoUser.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                        <span>{ceoUser.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {ceoUser.github && (
                      <a href={ceoUser.github} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.04] text-text-secondary hover:text-text-primary transition-all">
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {ceoUser.linkedin && (
                      <a href={ceoUser.linkedin} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.04] text-text-secondary hover:text-text-primary transition-all">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    
                    {isCEO && (
                      <button
                        onClick={() => handleStartEditUser(ceoUser)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-550 hover:text-amber-450 dark:text-amber-400 dark:hover:text-amber-300 border border-amber-500/25 rounded-xl text-3xs font-extrabold uppercase tracking-wider transition-all ml-2 active:scale-95 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-[#fafafa] dark:bg-[#12131c]/30 border border-slate-200/50 dark:border-white/[0.02] rounded-xl shadow-inner">
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-muted" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter name, email, credentials..." 
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0c0d15]/50 border border-slate-250 dark:border-white/[0.03] hover:border-blue-500/25 rounded-lg text-2xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-250"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full lg:w-auto">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest">Filters</span>
                </div>
                
                {/* Department Filter */}
                <select 
                  value={selectedDeptFilter}
                  onChange={(e) => {
                    setSelectedDeptFilter(e.target.value);
                    setSelectedRoleFilter('all');
                  }}
                  className="w-full sm:w-44 bg-white dark:bg-[#0c0d15]/50 border border-slate-250 dark:border-white/[0.03] rounded-lg py-1.5 px-2.5 text-2xs font-bold text-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>

                {/* Role Filter */}
                <select 
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="w-full sm:w-44 bg-white dark:bg-[#0c0d15]/50 border border-slate-250 dark:border-white/[0.03] rounded-lg py-1.5 px-2.5 text-2xs font-bold text-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">All Roles</option>
                  {departments
                    .filter(d => selectedDeptFilter === 'all' || d.name === selectedDeptFilter)
                    .flatMap(d => d.roles)
                    .map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))
                  }
                </select>

                {(searchQuery || selectedDeptFilter !== 'all' || selectedRoleFilter !== 'all') && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDeptFilter('all');
                      setSelectedRoleFilter('all');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider text-rose-500 hover:text-rose-400 bg-rose-500/5 rounded-lg border border-rose-500/10 hover:bg-rose-500/10 transition-all ml-auto sm:ml-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Clean Structured Table List */}
            <div className="bg-background-secondary border border-slate-200/50 dark:border-white/[0.02] rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-white/[0.005]">
                  <TableRow className="border-slate-200/40 dark:border-white/[0.02] hover:bg-transparent">
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 pl-5 w-[25%]">Employee</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[25%]">Contact Info</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[15%]">Department</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[15%]">Security Role</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[10%]">Profiles</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[10%] pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="align-middle">
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-text-secondary text-2xs font-semibold">
                        No employees found matching the active search parameters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => {
                      const deptColors = getDeptColorClasses(u.department || '');
                      return (
                        <TableRow 
                          key={u.id} 
                          className="hover:bg-slate-50/50 dark:hover:bg-white/[0.008] border-slate-200/30 dark:border-white/[0.015] transition-colors duration-150"
                        >
                          {/* Col 1: Avatar + Name */}
                          <TableCell className="py-2.5 pl-5">
                            <div className="flex items-center gap-3">
                              <UserAvatar src={u.avatar} name={u.name} />
                              <div className="flex flex-col min-w-0">
                                <span className="text-2xs font-bold text-text-primary truncate">{u.name}</span>
                                <span className="text-[10px] text-text-muted font-bold truncate">@{u.username || 'user'}</span>
                              </div>
                            </div>
                          </TableCell>
                          
                          {/* Col 2: Contact stacked compactly */}
                          <TableCell className="py-2.5">
                            <div className="flex flex-col gap-0.5 text-2xs font-semibold text-text-secondary">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Mail className="w-3 h-3 text-text-muted flex-shrink-0" />
                                <span className="truncate">{u.email}</span>
                              </div>
                              {u.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-text-muted flex-shrink-0" />
                                  <span>{u.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Col 3: Department badge */}
                          <TableCell className="py-2.5">
                            <div className={cn(
                              "px-2.5 py-1 border rounded-lg text-[9px] uppercase tracking-wider font-black inline-flex items-center gap-1 shadow-sm",
                              deptColors.border,
                              deptColors.bg,
                              deptColors.text
                            )}>
                              <span className={cn("w-1 h-1 rounded-full", deptColors.dot)} />
                              {u.department || 'General'}
                            </div>
                          </TableCell>

                          {/* Col 4: Role badge */}
                          <TableCell className="py-2.5">
                            <span className={cn(
                              "text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 shadow-sm",
                              u.role === 'CEO' || u.role === 'ceo' 
                                ? "text-amber-500 bg-amber-500/[0.04] border-amber-550/20" 
                                : "text-blue-500 bg-blue-500/[0.04] border-blue-550/20"
                            )}>
                              {u.role ? u.role.toUpperCase() : 'MEMBER'}
                            </span>
                          </TableCell>

                          {/* Col 5: Social Profiles */}
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-1.5">
                              {u.github ? (
                                <a href={u.github} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.03] text-text-secondary hover:text-text-primary transition-all">
                                  <Github className="w-3.5 h-3.5" />
                                </a>
                              ) : null}
                              {u.linkedin ? (
                                <a href={u.linkedin} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.03] text-text-secondary hover:text-text-primary transition-all">
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                              ) : null}
                              {!u.github && !u.linkedin && <span className="text-[10px] text-text-muted">-</span>}
                            </div>
                          </TableCell>

                          {/* Col 6: Dynamic Switch Status Toggle & Delete */}
                          <TableCell className="py-2.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              {/* Status indicator text */}
                              <span className={cn(
                                "text-[9px] uppercase tracking-wider font-extrabold",
                                u.is_active ? "text-emerald-500" : "text-rose-500"
                              )}>
                                {u.is_active ? 'Active' : 'Suspended'}
                              </span>

                              {/* Switch control toggle status */}
                              <button 
                                type="button"
                                disabled={!isCEO}
                                onClick={() => handleToggleStatus(u)}
                                className={cn(
                                  "w-8 h-4.5 rounded-full relative transition-all duration-300 ease-in-out focus:outline-none flex-shrink-0",
                                  isCEO ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                                  u.is_active ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-inner" : "bg-slate-200 dark:bg-white/[0.03]"
                                )}
                              >
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 shadow-sm toggle-switch-slider",
                                  u.is_active ? "left-[14px]" : "left-0.5"
                                )} />
                              </button>

                              {isCEO && (
                                <>
                                  {/* Edit Action */}
                                  <button
                                    onClick={() => handleStartEditUser(u)}
                                    className="p-1.5 border border-slate-205 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all text-text-secondary hover:text-text-primary active:scale-90"
                                    title="Edit Employee"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Trash deletion */}
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    disabled={u.email === 'vincent@nurofin.com'}
                                    className={cn(
                                      "p-1.5 border rounded-lg transition-all active:scale-90",
                                      u.email === 'vincent@nurofin.com' 
                                        ? "opacity-20 cursor-not-allowed border-transparent text-text-muted" 
                                        : "text-rose-500 hover:bg-rose-500/5 border-rose-500/15"
                                    )}
                                    title="Remove User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Department & Role Panel */}
          <TabsContent value="departments" className="animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Department Selector Sidebar */}
              <div className="p-5 bg-gradient-to-b from-white/[0.02] to-transparent dark:from-[#131422]/15 dark:to-transparent border border-white/5 dark:border-white/[0.01] rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/[0.03] pb-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4.5 h-4.5 text-blue-500" />
                    <span className="text-2xs font-extrabold uppercase tracking-widest text-text-secondary">Departments</span>
                  </div>
                  {isCEO && (
                    <button 
                      onClick={() => setIsDeptModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-550 hover:text-blue-450 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-500/25 rounded-xl text-[10px] font-extrabold transition-all duration-300"
                    >
                      <Plus className="w-3 h-3" /> ADD DEPARTMENT
                    </button>
                  )}
                </div>
                
                <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1 custom-scroll-thin">
                  {departments.map((dept) => {
                    const deptColor = getDeptColorClasses(dept.name);
                    const isSelected = activeDeptId === dept.id;
                    return (
                      <div 
                        key={dept.id}
                        onClick={() => {
                          setActiveDeptId(dept.id);
                          if (dept.roles.length > 0) {
                            setActiveRoleId(dept.roles[0].id);
                          } else {
                            setActiveRoleId(null);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3.5 text-xs font-bold rounded-2xl cursor-pointer border transition-all duration-350 select-none relative group",
                          isSelected 
                            ? "bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 border-blue-500/25 dark:border-blue-500/15 text-blue-500 dark:text-blue-400 shadow-md" 
                            : "border-transparent text-text-secondary hover:bg-slate-100 dark:hover:bg-white/[0.015] hover:text-text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", deptColor.dot)} />
                          <span className="truncate">{dept.name}</span>
                          {dept.is_custom && (
                            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-md">Custom</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] bg-slate-100 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.04] px-2 py-0.5 rounded-lg font-bold text-text-secondary">
                            {dept.roles.length}
                          </span>
                          {dept.is_custom && isCEO && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDept(dept.id, dept.name);
                              }}
                              className="p-1 text-rose-500 hover:text-rose-450 hover:bg-rose-500/5 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Roles matrix and permissions configuration panel */}
              <div className="lg:col-span-2 space-y-6">
                {activeDepartmentObject ? (
                  <div className="p-6 bg-gradient-to-b from-white/[0.01] to-transparent dark:from-[#131422]/15 dark:to-transparent border border-white/5 dark:border-white/[0.01] rounded-3xl shadow-xl space-y-6">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/50 dark:border-white/[0.03]">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-extrabold text-blue-500">Security Sector</span>
                        <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2 mt-0.5">
                          <Briefcase className="w-4.5 h-4.5 text-text-muted" /> {activeDepartmentObject.name}
                        </h3>
                      </div>
                      {isCEO && (
                        <button 
                          onClick={() => {
                            setTargetDeptIdForRole(activeDepartmentObject.id);
                            setIsRoleModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.04] rounded-xl text-2xs font-extrabold transition-all text-text-primary hover:-translate-y-0.5 duration-355 cursor-pointer shadow-sm active:translate-y-0"
                        >
                          <Plus className="w-4 h-4 text-blue-500" /> ADD NEW ROLE
                        </button>
                      )}
                    </div>

                    {activeDepartmentObject.roles.length === 0 ? (
                      <div className="py-24 text-center text-text-secondary text-2xs space-y-4">
                        <div className="w-12 h-12 bg-white/[0.005] border border-border-subtle rounded-2xl flex items-center justify-center mx-auto">
                          <Lock className="w-5 h-5 text-text-muted animate-pulse" />
                        </div>
                        <p className="max-w-xs mx-auto font-bold tracking-wide">No job titles mapped to this sector. Add a new department role above to configure credentials.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Dynamic Roles selector column with spotlight indicators */}
                        <div className="space-y-1.5 h-[370px] overflow-y-auto pr-2 custom-scroll-thin md:border-r border-slate-200/50 dark:border-white/[0.03]">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted block px-2 mb-2">Role Title</span>
                          {activeDepartmentObject.roles.map((role) => {
                            const isSelected = activeRoleId === role.id;
                            return (
                              <div 
                                key={role.id}
                                onClick={() => setActiveRoleId(role.id)}
                                className={cn(
                                  "flex items-center justify-between p-3.5 text-2xs font-extrabold rounded-2xl cursor-pointer transition-all duration-300 border relative group",
                                  isSelected 
                                    ? "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/25 dark:border-blue-500/15 text-blue-500 dark:text-blue-400" 
                                    : "border-transparent text-text-secondary hover:bg-slate-100 dark:hover:bg-white/[0.015] hover:text-text-primary"
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-md" />
                                )}
                                <div className="truncate min-w-0 flex items-center gap-2">
                                  <span className="truncate">{role.name}</span>
                                  {role.is_custom && (
                                    <span className="text-[8px] bg-amber-400/10 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-md font-extrabold flex-shrink-0">Custom</span>
                                  )}
                                </div>
                                {role.is_custom && isCEO && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteRole(activeDepartmentObject.id, role.id, role.name);
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-450 hover:bg-rose-500/5 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* High-Tech Switch board */}
                        <div className="md:col-span-2 space-y-5">
                          {activeRoleObject ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] uppercase tracking-widest font-extrabold text-text-muted">Access permissions schema</span>
                                  <h4 className="text-xs font-extrabold text-text-primary flex items-center gap-2">
                                    <Key className="w-4.5 h-4.5 text-blue-500" /> ACL Rules: {activeRoleObject.name}
                                  </h4>
                                </div>
                                <span className="text-[8px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-lg">
                                  {activeRoleObject.permissions.length} Enabled
                                </span>
                              </div>

                              <div className="space-y-3 h-[320px] overflow-y-auto pr-1 custom-scroll-thin">
                                {ALL_PERMISSIONS.map((perm) => {
                                  const hasAccess = activeRoleObject.permissions.includes(perm.key);
                                  return (
                                    <div 
                                      key={perm.key} 
                                      className={cn(
                                        "flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.005] border rounded-2xl transition-all duration-300 relative overflow-hidden group",
                                        hasAccess 
                                          ? "border-blue-500/25 bg-blue-500/[0.008] dark:bg-blue-500/[0.015]" 
                                          : "border-slate-200/50 dark:border-white/[0.015]"
                                      )}
                                    >
                                      {hasAccess && (
                                        <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/5 rounded-full filter blur-xl pointer-events-none" />
                                      )}

                                      <div className="flex items-center gap-4 min-w-0 pr-4 z-10">
                                        <div className={cn(
                                          "w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0 shadow-md",
                                          perm.gradient
                                        )}>
                                          <Lock className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="flex flex-col min-w-0 gap-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-2xs font-extrabold text-text-primary">{perm.label}</span>
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-200/50 dark:bg-white/5 border border-slate-300/40 dark:border-white/10 text-text-secondary rounded-md">
                                              {perm.badge}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-text-muted leading-tight font-medium max-w-sm">
                                            {perm.desc}
                                          </span>
                                        </div>
                                      </div>

                                      <button 
                                        type="button"
                                        disabled={!isCEO}
                                        onClick={() => handlePermissionToggle(activeDepartmentObject.id, activeRoleObject, perm.key)}
                                        className={cn(
                                          "w-11 h-6 rounded-full relative transition-all duration-355 ease-in-out focus:outline-none flex-shrink-0 shadow-inner",
                                          isCEO ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                                          hasAccess ? "bg-gradient-to-r from-blue-500 to-indigo-650 switch-glow" : "bg-slate-200 dark:bg-white/[0.03]"
                                        )}
                                      >
                                        <div className={cn(
                                          "w-5 h-5 rounded-full bg-white absolute top-0.5 shadow-md toggle-switch-slider flex items-center justify-center",
                                          hasAccess ? "left-[21px]" : "left-0.5"
                                        )}>
                                          {hasAccess && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                        </div>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-text-secondary text-2xs py-10 font-bold">
                              Choose a role title to construct custom security policies.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-secondary text-2xs border border-dashed border-slate-200/50 dark:border-white/[0.02] rounded-3xl">
                    Select a department to view permissions.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
               Previous Employees (Archive) Panel
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="previous" className="space-y-4 animate-in fade-in duration-200">

            {/* Header banner */}
            <div className="flex items-center justify-between p-4 bg-rose-500/[0.03] border border-rose-500/10 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center">
                  <Archive className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500">Employee Archive</p>
                  <p className="text-2xs text-text-secondary font-medium">
                    {deletedUsers.length} former employee{deletedUsers.length !== 1 ? 's' : ''} — records preserved for compliance and audit trails.
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                <span className="text-[10px] font-extrabold text-rose-500">{deletedUsers.length} ARCHIVED</span>
              </div>
            </div>

            {/* Archive Table */}
            <div className="bg-background-secondary border border-slate-200/50 dark:border-white/[0.02] rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-rose-500/[0.02]">
                  <TableRow className="border-slate-200/40 dark:border-white/[0.02] hover:bg-transparent">
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 pl-5 w-[28%]">Former Employee</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[22%]">Contact</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[18%]">Department</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[14%]">Role</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[10%]">Joined</TableHead>
                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary py-3 w-[13%] pr-5 text-right">Removed On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3 text-text-secondary">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.02] flex items-center justify-center">
                            <UserX className="w-5 h-5 text-text-muted" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-2xs font-bold">No archived employees</p>
                            <p className="text-[10px] text-text-muted">Deleted employees will appear here.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    deletedUsers.map((u) => {
                      const deptColors = getDeptColorClasses(u.department || '');
                      const joinedDate = u.joined_at
                        ? new Date(u.joined_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';
                      const deletedDate = u.deleted_at
                        ? new Date(u.deleted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';
                      return (
                        <TableRow
                          key={u.id}
                          className="hover:bg-rose-500/[0.015] border-slate-200/30 dark:border-white/[0.015] transition-colors duration-150 opacity-75 hover:opacity-100"
                        >
                          {/* Col 1: Avatar + Name */}
                          <TableCell className="py-3 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <UserAvatar src={u.avatar} name={u.name} />
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500/80 border-2 border-background-secondary rounded-full flex items-center justify-center">
                                  <Archive className="w-1.5 h-1.5 text-white" />
                                </span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-2xs font-bold text-text-primary truncate">{u.name}</span>
                                <span className="text-[10px] text-text-muted font-bold truncate">@{u.username || 'unknown'}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Col 2: Contact */}
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-0.5 text-2xs font-semibold text-text-secondary">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Mail className="w-3 h-3 text-text-muted flex-shrink-0" />
                                <span className="truncate">{u.email}</span>
                              </div>
                              {u.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-text-muted flex-shrink-0" />
                                  <span>{u.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Col 3: Department */}
                          <TableCell className="py-3">
                            {u.department ? (
                              <div className={cn(
                                "px-2.5 py-1 border rounded-lg text-[9px] uppercase tracking-wider font-black inline-flex items-center gap-1 shadow-sm",
                                deptColors.border,
                                deptColors.bg,
                                deptColors.text
                              )}>
                                <span className={cn("w-1 h-1 rounded-full", deptColors.dot)} />
                                {u.department}
                              </div>
                            ) : (
                              <span className="text-[10px] text-text-muted">—</span>
                            )}
                          </TableCell>

                          {/* Col 4: Role */}
                          <TableCell className="py-3">
                            <span className="text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 shadow-sm text-slate-500 bg-slate-500/[0.04] border-slate-400/20">
                              {u.role ? u.role.toUpperCase() : 'MEMBER'}
                            </span>
                          </TableCell>

                          {/* Col 5: Joined date */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1 text-[10px] text-text-muted font-semibold">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              {joinedDate}
                            </div>
                          </TableCell>

                          {/* Col 6: Removed on */}
                          <TableCell className="py-3 pr-5 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-500/70">Removed</span>
                              <span className="text-[10px] text-rose-500 font-bold">{deletedDate}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

        </Tabs>
      )}


      {/* Modal 1: Add User Form */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-xl bg-slate-900/90 dark:bg-[#07080f]/95 border border-white/5 shadow-2xl backdrop-blur-2xl rounded-3xl text-white">
          <DialogHeader className="border-b border-white/5 pb-4">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5 text-blue-500" /> Provision Corporate Employee
            </DialogTitle>
            <DialogDescription className="text-2xs text-slate-400">
              Establish their professional credentials, credentials hash, department, and permissions level.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUserSubmit} className="space-y-5 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1 custom-scroll-thin">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Full Name *</label>
                <input 
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="e.g. Vincent N."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Username *</label>
                <input 
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  placeholder="e.g. vincent_ceo"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Email Address *</label>
                <input 
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="name@nurofin.com"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Password *</label>
                <input 
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Department *</label>
                <select 
                  required
                  value={newUser.department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value, role: '' }))}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-2xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                >
                  <option value="" className="bg-[#07080f]">Select Department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name} className="bg-[#07080f] text-white">{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Role *</label>
                <select 
                  required
                  disabled={!newUser.department}
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/5 disabled:opacity-30 rounded-xl px-3 py-2.5 text-2xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                >
                  <option value="" className="bg-[#07080f]">Select Role...</option>
                  {formRolesOptions.map(r => (
                    <option key={r.id} value={r.name} className="bg-[#07080f] text-white">{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Phone Number</label>
                <input 
                  type="text"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Profile Picture */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Avatar URL</label>
                <input 
                  type="text"
                  value={newUser.profile_picture}
                  onChange={(e) => setNewUser(prev => ({ ...prev, profile_picture: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* GitHub */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">GitHub Profile</label>
                <input 
                  type="text"
                  value={newUser.github}
                  onChange={(e) => setNewUser(prev => ({ ...prev, github: e.target.value }))}
                  placeholder="https://github.com/username"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              
                <div className="space-y-1.5 flex flex-col justify-center">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Finance Access</label>
                  <label className="flex items-center gap-2 text-2xs text-white cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editUserForm.can_view_finance || false}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, can_view_finance: e.target.checked }))}
                      className="rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500/20"
                    />
                    Allow viewing Finance module
                  </label>
                </div>

                {/* LinkedIn */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">LinkedIn Profile</label>
                <input 
                  type="text"
                  value={newUser.linkedin}
                  onChange={(e) => setNewUser(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-white/5 gap-2">
              <button 
                type="button" 
                onClick={() => setIsUserModalOpen(false)}
                className="px-5 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-2xs font-bold transition-all text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 text-white text-2xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Register Employee
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 1.5: Edit User Form */}
      <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
        <DialogContent className="max-w-xl bg-slate-900/90 dark:bg-[#07080f]/95 border border-white/5 shadow-2xl backdrop-blur-2xl rounded-3xl text-white">
          <DialogHeader className="border-b border-white/5 pb-4">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-white">
              <Edit className="w-5 h-5 text-blue-500" /> Edit Corporate Employee
            </DialogTitle>
            <DialogDescription className="text-2xs text-slate-400">
              Update credentials, department layer, phone contact or networks. Password is optional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditUserSubmit} className="space-y-5 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1 custom-scroll-thin">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Full Name *</label>
                <input 
                  type="text"
                  required
                  value={editUserForm.full_name}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="e.g. Vincent N."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Username *</label>
                <input 
                  type="text"
                  required
                  value={editUserForm.username}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  placeholder="e.g. vincent_ceo"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Email Address *</label>
                <input 
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="name@nurofin.com"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">New Password (leave empty to keep current)</label>
                <input 
                  type="password"
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Department *</label>
                <select 
                  required
                  value={editUserForm.department}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, department: e.target.value, role: '' }))}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-2xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                >
                  <option value="" className="bg-[#07080f]">Select Department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name} className="bg-[#07080f] text-white">{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Role *</label>
                <select 
                  required
                  disabled={!editUserForm.department}
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/5 disabled:opacity-30 rounded-xl px-3 py-2.5 text-2xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                >
                  <option value="">Select Role...</option>
                  {(departments.find(d => d.name === editUserForm.department)?.roles || []).map(r => (
                    <option key={r.id} value={r.name} className="bg-[#07080f] text-white">{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Phone Number</label>
                <input 
                  type="text"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* Profile Picture */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Avatar URL</label>
                <input 
                  type="text"
                  value={editUserForm.profile_picture}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, profile_picture: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              {/* GitHub */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">GitHub Profile</label>
                <input 
                  type="text"
                  value={editUserForm.github}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, github: e.target.value }))}
                  placeholder="https://github.com/username"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>

              
                <div className="space-y-1.5 flex flex-col justify-center">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Finance Access</label>
                  <label className="flex items-center gap-2 text-2xs text-white cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editUserForm.can_view_finance || false}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, can_view_finance: e.target.checked }))}
                      className="rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500/20"
                    />
                    Allow viewing Finance module
                  </label>
                </div>

                {/* LinkedIn */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">LinkedIn Profile</label>
                <input 
                  type="text"
                  value={editUserForm.linkedin}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-white/5 gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsEditUserModalOpen(false);
                  setEditingUserId(null);
                }}
                className="px-5 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-2xs font-bold transition-all text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 text-white text-2xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Create Department */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="max-w-md bg-slate-900/90 dark:bg-[#07080f]/95 border border-white/5 shadow-2xl backdrop-blur-2xl rounded-3xl text-white">
          <DialogHeader className="border-b border-white/5 pb-4">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-white">
              <FolderPlus className="w-5 h-5 text-blue-500" /> Create Custom Department
            </DialogTitle>
            <DialogDescription className="text-2xs text-slate-400">
              Establish a new organization department structure.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDeptSubmit} className="space-y-5 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Department Name</label>
              <input 
                type="text"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Research & Innovation"
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button 
                type="button" 
                onClick={() => setIsDeptModalOpen(false)}
                className="px-5 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-2xs font-bold transition-all text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 text-white text-2xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Create Department
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Create Role */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-md bg-slate-900/90 dark:bg-[#07080f]/95 border border-white/5 shadow-2xl backdrop-blur-2xl rounded-3xl text-white">
          <DialogHeader className="border-b border-white/5 pb-4">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-white">
              <Plus className="w-5 h-5 text-blue-500" /> Create Department Role
            </DialogTitle>
            <DialogDescription className="text-2xs text-slate-400">
              Establish a new job title role within the active department.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoleSubmit} className="space-y-5 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Role Name</label>
              <input 
                type="text"
                required
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Lead Research Analyst"
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-2xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-[#07080f] transition-all"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setNewRoleName('');
                }}
                className="px-5 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-2xs font-bold transition-all text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 text-white text-2xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Create Role
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
