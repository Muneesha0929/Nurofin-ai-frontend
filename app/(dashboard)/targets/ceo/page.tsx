'use client';

import React, { useEffect, useState } from 'react';
import targetService, { Target, TargetCreate, TargetScoreUpdate, TargetPermissionCreate } from '@/services/targetService';
import { usersService } from '@/services/users';
import { useStore } from '@/lib/store';
import { UserProfile } from '@/types';
import { Target as TargetIcon, CheckSquare, Plus, Shield, User as UserIcon } from 'lucide-react';

export default function CEOTargetsPage() {
  const { userProfile } = useStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Permission based user lists
  const [scoreableUsers, setScoreableUsers] = useState<UserProfile[]>([]);
  const [addableUsers, setAddableUsers] = useState<UserProfile[]>([]);

  // Selection States
  const [selectedDashboardUser, setSelectedDashboardUser] = useState<number | null>(null);
  const [userTargets, setUserTargets] = useState<Target[]>([]);
  
  // Create Target Form State
  const [targetForm, setTargetForm] = useState<Partial<TargetCreate>>({ 
    is_global: false, 
    month: new Date().toISOString().slice(0, 7) 
  });
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  
  // Permissions Form State
  const [permForm, setPermForm] = useState<Partial<TargetPermissionCreate>>({ 
    can_score: true, 
    can_add_targets: false 
  });

  const isCEO = userProfile.role?.toLowerCase() === 'ceo' || userProfile.role?.toLowerCase() === 'super_admin';

  useEffect(() => {
    if (userProfile.id) {
      loadUsers();
    }
  }, [userProfile.id, userProfile.role]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const allUsers = await usersService.getUsers();
      // Filter out CEOs from assignment pools
      const filtered = allUsers.filter(u => u.role?.toLowerCase() !== 'ceo');
      setUsers(filtered);

      if (isCEO) {
        setScoreableUsers(filtered);
        setAddableUsers(filtered);
      } else {
        const perms = await targetService.getPermissions();
        const scoreIds = new Set<number>();
        const addIds = new Set<number>();
        perms.forEach(p => {
          if (p.can_score) scoreIds.add(p.target_user_id);
          if (p.can_add_targets) addIds.add(p.target_user_id);
        });
        
        setScoreableUsers(filtered.filter(u => scoreIds.has(Number(u.id))));
        setAddableUsers(filtered.filter(u => addIds.has(Number(u.id))));
      }
    } catch (err) {
      console.error('Failed to load users and permissions', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (selectedDashboardUser) {
      loadUserTargets(selectedDashboardUser);
    } else {
      setUserTargets([]);
    }
  }, [selectedDashboardUser]);

  const loadUserTargets = async (userId: number) => {
    try {
      const data = await targetService.getUserTargets(userId);
      setUserTargets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAssignee = (userId: number) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.title || !targetForm.month) return;
    
    let targetUsers = selectedAssignees;
    // If it's global (CEO only feature), assign to all addable users
    if (targetForm.is_global && isCEO) {
      targetUsers = addableUsers.map(u => Number(u.id));
    }

    if (targetUsers.length === 0) {
      alert("Please select at least one user to assign this target to.");
      return;
    }

    try {
      await Promise.all(targetUsers.map(uid => 
        targetService.createTarget({
          ...targetForm,
          user_id: uid,
        } as TargetCreate)
      ));
      
      alert('Targets assigned successfully!');
      
      if (selectedDashboardUser && targetUsers.includes(selectedDashboardUser)) {
        loadUserTargets(selectedDashboardUser);
      }
      
      setTargetForm({ ...targetForm, title: '', description: '' });
      setSelectedAssignees([]);
    } catch (err: any) {
      alert('Failed to add target: ' + err.message);
    }
  };

  const handleScoreUpdate = async (targetId: number, score: string) => {
    const numScore = parseFloat(score);
    if (isNaN(numScore)) return;
    try {
      await targetService.scoreTarget(targetId, { score: numScore });
      if (selectedDashboardUser) loadUserTargets(selectedDashboardUser);
    } catch (err: any) {
      alert('Failed to score: ' + err.message);
    }
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permForm.grantee_id || !permForm.target_user_id) {
      alert("Please select both a grantee and a target user.");
      return;
    }
    try {
      await targetService.createPermission(permForm as TargetPermissionCreate);
      alert('Permission granted successfully!');
      setPermForm({ can_score: true, can_add_targets: false });
    } catch (err: any) {
      alert('Failed to grant permission: ' + err.message);
    }
  };

  const showAssignSection = isCEO || addableUsers.length > 0;
  const showScoreSection = isCEO || scoreableUsers.length > 0;

  if (loadingUsers) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  if (!showAssignSection && !showScoreSection && !isCEO) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center py-20 text-text-muted">
        You do not have any target administration permissions.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <TargetIcon className="w-8 h-8 text-accent-blue" />
        <h1 className="text-3xl font-bold text-text-primary dark:text-white">Targets Administration</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ADD TARGETS SECTION */}
        {showAssignSection && (
          <section className="bg-background-primary dark:bg-[#12131c] p-6 rounded-xl shadow-sm border border-border-subtle dark:border-[#1e2030]">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-accent-green" />
              <h2 className="text-xl font-semibold text-text-primary dark:text-white">Assign Target</h2>
            </div>
            
            <form onSubmit={handleAddTarget} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Target Title</label>
                <input 
                  type="text" 
                  className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white focus:border-accent-blue outline-none transition-colors" 
                  value={targetForm.title || ''}
                  onChange={e => setTargetForm({...targetForm, title: e.target.value})}
                  placeholder="e.g. Complete Q3 Compliance Training"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Description</label>
                <textarea 
                  className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white focus:border-accent-blue outline-none transition-colors min-h-[80px]" 
                  value={targetForm.description || ''}
                  onChange={e => setTargetForm({...targetForm, description: e.target.value})}
                  placeholder="Optional details..."
                />
              </div>
              
              <div className="flex gap-6 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Month</label>
                  <input 
                    type="month" 
                    className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white focus:border-accent-blue outline-none transition-colors" 
                    value={targetForm.month || ''}
                    onChange={e => setTargetForm({...targetForm, month: e.target.value})}
                    required
                  />
                </div>
                {isCEO && (
                  <div className="flex items-center mb-3 gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="global-target"
                      className="w-4 h-4 rounded border-gray-300 text-accent-blue focus:ring-accent-blue cursor-pointer"
                      checked={targetForm.is_global || false}
                      onChange={e => setTargetForm({...targetForm, is_global: e.target.checked})}
                    />
                    <label htmlFor="global-target" className="text-sm font-semibold text-text-primary dark:text-slate-200 cursor-pointer">
                      Global Target (All)
                    </label>
                  </div>
                )}
              </div>

              {/* User Selection List (Hidden if Global) */}
              {(!targetForm.is_global || !isCEO) && (
                <div className="mt-4 pt-4 border-t border-border-subtle dark:border-[#1e2030]">
                  <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-2">Select Assignees (by Username)</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {addableUsers.length === 0 ? (
                      <p className="text-sm text-text-muted">No employees available for assignment.</p>
                    ) : (
                      addableUsers.map(u => (
                        <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors border border-transparent hover:border-border-subtle dark:hover:border-[#2a2d3d]">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-accent-blue focus:ring-accent-blue"
                            checked={selectedAssignees.includes(Number(u.id))}
                            onChange={() => toggleAssignee(Number(u.id))}
                          />
                          <div className="flex items-center gap-2">
                            {u.avatar ? (
                              <img src={u.avatar} alt="Avatar" className="w-6 h-6 rounded-full" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-text-primary dark:text-slate-200">{u.username || u.name}</span>
                            <span className="text-xs text-text-muted px-2 py-0.5 bg-slate-100 dark:bg-[#1e2030] rounded-full">{u.role}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              <button type="submit" className="w-full mt-4 bg-accent-blue hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
                Assign Target
              </button>
            </form>
          </section>
        )}

        {/* DELEGATE PERMISSIONS SECTION (CEO ONLY) */}
        {isCEO && (
          <section className="bg-background-primary dark:bg-[#12131c] p-6 rounded-xl shadow-sm border border-border-subtle dark:border-[#1e2030]">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-accent-purple" />
              <h2 className="text-xl font-semibold text-text-primary dark:text-white">Delegate Management Access</h2>
            </div>
            
            <form onSubmit={handleAddPermission} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Grantee (Who gets access)</label>
                  <select 
                    className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white outline-none focus:border-accent-blue"
                    value={permForm.grantee_id || ''}
                    onChange={e => setPermForm({...permForm, grantee_id: Number(e.target.value)})}
                    required
                  >
                    <option value="" disabled>Select a username...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username || u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Target User (Who they can manage)</label>
                  <select 
                    className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white outline-none focus:border-accent-blue"
                    value={permForm.target_user_id || ''}
                    onChange={e => setPermForm({...permForm, target_user_id: Number(e.target.value)})}
                    required
                  >
                    <option value="" disabled>Select a username...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username || u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-6 pt-2 pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-accent-purple focus:ring-accent-purple"
                    checked={permForm.can_score} 
                    onChange={e => setPermForm({...permForm, can_score: e.target.checked})} 
                  />
                  <span className="text-sm font-semibold text-text-primary dark:text-slate-200">Can Score</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-accent-purple focus:ring-accent-purple"
                    checked={permForm.can_add_targets} 
                    onChange={e => setPermForm({...permForm, can_add_targets: e.target.checked})} 
                  />
                  <span className="text-sm font-semibold text-text-primary dark:text-slate-200">Can Add Targets</span>
                </label>
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
                Grant Permission
              </button>
            </form>
          </section>
        )}

      </div>

      {/* USER TARGETS & SCORING */}
      {showScoreSection && (
        <section className="bg-background-primary dark:bg-[#12131c] p-6 rounded-xl shadow-sm border border-border-subtle dark:border-[#1e2030]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-accent-orange" />
              <h2 className="text-xl font-semibold text-text-primary dark:text-white">Review & Score Targets</h2>
            </div>
            
            <div className="w-full md:w-64">
              <select 
                className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white outline-none focus:border-accent-blue"
                value={selectedDashboardUser || ''}
                onChange={e => setSelectedDashboardUser(Number(e.target.value))}
              >
                <option value="" disabled>Select employee to review...</option>
                {scoreableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.username || u.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {!selectedDashboardUser ? (
            <div className="text-center py-12 text-text-muted border-2 border-dashed border-border-subtle dark:border-[#1e2030] rounded-xl">
              Select an employee from the dropdown above to view and score their targets.
            </div>
          ) : userTargets.length === 0 ? (
            <div className="text-center py-12 text-text-muted border-2 border-dashed border-border-subtle dark:border-[#1e2030] rounded-xl">
              No targets assigned to this user.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle dark:border-[#1e2030]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1c1d29] border-b border-border-subtle dark:border-[#1e2030]">
                    <th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Target Title</th>
                    <th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Month</th>
                    <th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Completed At</th>
                    <th className="p-4 text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle dark:divide-[#1e2030]">
                  {userTargets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-text-primary dark:text-slate-200 flex items-center gap-2">
                          {t.title}
                          {t.is_global && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Global</span>}
                        </div>
                        {t.description && <div className="text-xs text-text-muted mt-1 truncate max-w-xs">{t.description}</div>}
                      </td>
                      <td className="p-4 text-sm text-text-secondary dark:text-slate-400">{t.month}</td>
                      <td className="p-4">
                        {t.is_completed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-text-secondary dark:text-slate-400">
                        {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <input 
                          type="number" 
                          step="0.1" 
                          defaultValue={t.score || ''}
                          onBlur={e => handleScoreUpdate(t.id, e.target.value)}
                          className="w-24 bg-white dark:bg-[#12131c] border border-border-subtle dark:border-[#2a2d3d] rounded-md p-1.5 text-sm text-right text-text-primary dark:text-white outline-none focus:border-accent-blue transition-colors font-medium"
                          placeholder="e.g. 8.5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
