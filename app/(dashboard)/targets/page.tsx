'use client';

import React, { useEffect, useState } from 'react';
import targetService, { Target, TargetUpdate, TargetCreate, TargetScoreUpdate, TargetPermissionCreate } from '@/services/targetService';
import { workcenterService, WCQuarter } from '@/services/workcenter';
import { usersService } from '@/services/users';
import { useStore } from '@/lib/store';
import { UserProfile } from '@/types';
import { Target as TargetIcon, Plus, Users } from 'lucide-react';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function UnifiedTargetsPage() {
  const { userProfile } = useStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Data for the dashboard
  const [allTargets, setAllTargets] = useState<Record<number, Target[]>>({});
  const [wcQuarters, setWcQuarters] = useState<WCQuarter[]>([]);

  // Add Target Form inside Modal
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState<Partial<TargetCreate>>({ 
    month: new Date().toISOString().slice(0, 7),
    is_global: false
  });
  const [targetType, setTargetType] = useState<'individual' | 'global' | 'quarterly'>('individual');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  // Delegation Modal
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegationForm, setDelegationForm] = useState({ grantee_id: '', target_user_id: '' });

  const isCEO = userProfile.role?.toLowerCase() === 'ceo' || userProfile.role?.toLowerCase() === 'super_admin';
  const canManageTargets = isCEO || userProfile.role?.toLowerCase() === 'team_lead';

  useEffect(() => {
    if (userProfile.id) {
      loadData();
    }
  }, [userProfile.id, userProfile.role]);

  const loadData = async () => {
    try {
      setLoading(true);
      const myData = await targetService.getMyTargets();
      
      const allU = await usersService.getUsers();
      setAllUsersList(allU);

      let quarters: WCQuarter[] = [];
      try {
        quarters = await workcenterService.getQuarters();
      } catch (e) {}
      setWcQuarters(quarters);
      
      const quarterTargets: Target[] = quarters.map(q => ({
        id: -q.id,
        title: `[Quarterly] ${q.name}`,
        description: q.goals || '',
        month: q.start_date ? q.start_date.substring(0, 7) : '',
        is_global: true,
        is_completed: q.status === 'completed' || q.status === 'closed',
        user_id: 0,
        created_by_id: 0,
        my_score: q.status === 'completed' || q.status === 'closed' ? 100 : 0,
        average_score: q.status === 'completed' || q.status === 'closed' ? 100 : 0,
        score_count: 1
      }));
      
      const combinedMyTargets = [...myData, ...quarterTargets];

      if (canManageTargets) {
        const filteredUsers = allU.filter(u => u.role?.toLowerCase() !== 'ceo');
        setUsers(filteredUsers);
        
        const targetsMap: Record<number, Target[]> = {};
        for (const u of filteredUsers) {
          try {
            const userTargets = await targetService.getUserTargets(Number(u.id));
            targetsMap[Number(u.id)] = [...userTargets, ...quarterTargets];
          } catch(e) {}
        }
        setAllTargets(targetsMap);
      } else {
        const teamLeads = allU.filter(u => u.role?.toLowerCase() === 'team_lead');
        const visibleUsers = [userProfile, ...teamLeads.filter(tl => tl.id !== userProfile.id)];
        setUsers(visibleUsers);
        
        const targetsMap: Record<number, Target[]> = {};
        targetsMap[Number(userProfile.id)] = combinedMyTargets;
        
        for (const tl of teamLeads) {
          if (tl.id === userProfile.id) continue;
          try {
            const tlTargets = await targetService.getUserTargets(Number(tl.id));
            targetsMap[Number(tl.id)] = [...tlTargets, ...quarterTargets];
          } catch(e) {}
        }
        setAllTargets(targetsMap);
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelegateScore = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!delegationForm.grantee_id || !delegationForm.target_user_id) return;
      try {
          await targetService.createPermission({
              grantee_id: Number(delegationForm.grantee_id),
              target_user_id: Number(delegationForm.target_user_id),
              can_score: true
          });
          alert('Scoring permission granted successfully!');
          setShowDelegationModal(false);
          setDelegationForm({ grantee_id: '', target_user_id: '' });
      } catch (err: any) {
          alert('Failed to delegate scoring: ' + err.message);
      }
  };

  const handleDelete = async (targetId: number) => {
    if (targetId < 0) {
      alert("Workcenter quarters cannot be deleted from here. Manage them in the Workcenter.");
      return;
    }
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      await targetService.deleteTarget(targetId);
      loadData();
    } catch (err: any) {
      alert('Failed to delete target: ' + err.message);
    }
  };

  const handleToggleComplete = async (target: Target) => {
    if (target.id < 0 && !target.title.startsWith('[Eval]')) {
      alert("Workcenter quarters status must be updated in the Workcenter.");
      return;
    }
    try {
      const updateData: TargetUpdate = { is_completed: !target.is_completed };
      await targetService.updateTarget(target.id, updateData);
      loadData();
    } catch (err: any) {
      alert('Error updating target: ' + err.message);
    }
  };

  const handleProgressUpdate = async (targetObj: Target, progress: number) => {
    if (targetObj.id < 0 && !targetObj.title.startsWith('[Eval]')) {
        alert("Workcenter quarter progress is calculated automatically based on tasks. You cannot score a global Workcenter quarter here.");
        return;
    }
    try {
      let targetId = targetObj.id;
      
      // If it's a dummy evaluation target, we create it first!
      if (targetId < 0 && targetObj.title.startsWith('[Eval]')) {
          const newTarget = await targetService.createTarget({
              title: targetObj.title,
              description: targetObj.description,
              month: targetObj.month,
              is_global: false,
              user_id: targetObj.user_id
          } as TargetCreate);
          targetId = newTarget.id;
      }

      // Optimistic UI Update first (only if it already existed in state, meaning id > 0 initially or we just created it)
      let updatedCompleted = false;
      let shouldUpdateDbCompleted = false;
      let targetWasCompleted = false;
      
      setAllTargets(prev => {
          const newTargets = { ...prev };
          for (const userId in newTargets) {
              const list = newTargets[userId];
              const idx = list.findIndex(t => t.id === targetObj.id);
              if (idx !== -1) {
                  const t = { ...list[idx] };
                  targetWasCompleted = t.is_completed || false;
                  t.my_score = progress;
                  
                  if (progress >= 100 && !t.title.startsWith('[Eval]')) {
                      t.is_completed = true;
                      updatedCompleted = true;
                  } else if (progress < 100 && !t.title.startsWith('[Eval]')) {
                      t.is_completed = false;
                      updatedCompleted = false;
                  }
                  
                  if (t.is_completed !== targetWasCompleted) {
                      shouldUpdateDbCompleted = true;
                  }
                  
                  // if we just created it, swap the negative ID with the real one in state
                  if (targetObj.id < 0) t.id = targetId;

                  newTargets[userId] = [...list.slice(0, idx), t, ...list.slice(idx + 1)];
              }
          }
          return newTargets;
      });

      await targetService.scoreTarget(targetId, { score: progress } as TargetScoreUpdate);

      if (shouldUpdateDbCompleted && !targetObj.title.startsWith('[Eval]')) {
          await targetService.updateTarget(targetId, { is_completed: updatedCompleted });
      }

      loadData();
    } catch (err: any) {
      alert('Error updating progress: ' + err.message);
      loadData(); // Revert on failure
    }
  };

    const handlePushTarget = async (target: Target) => {
    if (!confirm(`Push "${target.title}" to the next month?`)) return;
    try {
      const [year, month] = target.month.split('-');
      const d = new Date(Number(year), Number(month), 1);
      const nextMonthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      
      const newTarget = await targetService.createTarget({
          title: target.title.replace(' (Pushed)', ''),
          description: `[Pushed from ${target.month}]\n${target.description || ''}`.trim(),
          month: nextMonthStr,
          is_global: target.is_global,
          user_id: target.user_id
      } as TargetCreate);
      
      if (target.my_score != null && target.my_score > 0) {
          await targetService.scoreTarget(newTarget.id, { score: target.my_score } as TargetScoreUpdate);
      }
      
      await targetService.updateTarget(target.id, {
          title: target.title + ' (Pushed)'
      });
      
      loadData();
    } catch (err: any) {
      alert('Failed to push target: ' + err.message);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.title || !targetForm.month) return;
    
    let finalTitle = targetForm.title.replace(/^\[Quarterly\]\s*/i, '');
    if (targetType === 'quarterly') {
      finalTitle = `[Quarterly] ${finalTitle}`;
    }
    const isGlobal = targetType === 'global' || targetType === 'quarterly';

    try {
      setIsAdding(true);
      if (editingTarget && editingTarget.id > 0) {
        await targetService.updateTarget(editingTarget.id, {
          title: finalTitle,
          description: targetForm.description,
          is_completed: targetForm.is_completed
        });
      } else {
        await targetService.createTarget({
          ...targetForm,
          title: finalTitle,
          is_global: isGlobal,
          user_id: Number(userProfile.id)
        } as TargetCreate);
      }
      
      setTargetForm({ title: '', description: '', month: new Date().toISOString().slice(0, 7), is_global: false });
      setTargetType('individual');
      setEditingTarget(null);
      setShowTargetModal(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to save target: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (target: Target) => {
    if (target.id < 0) {
      alert("Workcenter quarters must be edited in the Workcenter.");
      return;
    }
    setEditingTarget(target);
    let title = target.title;
    let type: 'individual' | 'global' | 'quarterly' = 'individual';
    
    if (title.toLowerCase().startsWith('[quarterly]')) {
      type = 'quarterly';
      title = title.replace(/^\[Quarterly\]\s*/i, '');
    } else if (target.is_global) {
      type = 'global';
    }

    setTargetType(type);
    setTargetForm({
      title: title,
      description: target.description,
      month: target.month,
      is_global: target.is_global
    });
    
    setShowTargetModal(true);
  };

  const openCreateModal = () => {
    setEditingTarget(null);
    setTargetForm({ title: '', description: '', month: new Date().toISOString().slice(0, 7), is_global: false });
    setTargetType('individual');
    setShowTargetModal(true);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <TargetIcon className="w-8 h-8 text-blue-600 dark:text-blue-500" />
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Targets & Performance</h1>
          </div>
          
          <div className="flex items-center flex-wrap justify-end gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-[#12131c] border border-slate-200 dark:border-[#1e2030] px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase">View Month:</span>
                  <input 
                      type="month" 
                      value={viewMonth}
                      onChange={e => setViewMonth(e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  />
              </div>

              <button 
                  onClick={openCreateModal}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
              >
                  <Plus className="w-4 h-4" />
                  Create Target
              </button>
              
              {canManageTargets && (
                  <button 
                      onClick={() => setShowDelegationModal(true)}
                      className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                  >
                      <Users className="w-4 h-4" />
                      Delegate Scoring
                  </button>
              )}
          </div>
      </div>

      <div className="mb-8">
        <PerformanceDashboard 
          viewMonth={viewMonth}
          users={users} 
          allTargets={allTargets} 
          allUsersList={allUsersList}
          currentUser={userProfile}
          onEdit={startEdit}
          onDelete={handleDelete}
          onToggle={handleToggleComplete}
          onScoreUpdate={handleProgressUpdate}
          onPushTarget={handlePushTarget}
        />
      </div>

      {/* Create / Edit Target Modal */}
      <Dialog open={showTargetModal} onOpenChange={setShowTargetModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                {editingTarget ? 'Edit Target' : 'Create New Target'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTarget} className="space-y-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Target Type</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-[#2a2d3d] rounded-lg p-3 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                    >
                      <option value="individual">Individual Target</option>
                      <option value="global">Global Target</option>
                      <option value="quarterly">Quarter-wise (3 Months) Target</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Month / Quarter (Start)</label>
                    <input 
                      type="month" 
                      className="w-full bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-[#2a2d3d] rounded-lg p-3 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm" 
                      value={targetForm.month || ''}
                      onChange={e => setTargetForm({...targetForm, month: e.target.value})}
                      required
                      disabled={!!editingTarget}
                    />
                  </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Title</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-[#2a2d3d] rounded-lg p-3 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm" 
                  value={targetForm.title || ''}
                  onChange={e => setTargetForm({...targetForm, title: e.target.value})}
                  required
                  placeholder="e.g. Q3 Compliance"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Description (Optional)</label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-[#2a2d3d] rounded-lg p-3 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm min-h-[100px] resize-y" 
                  value={targetForm.description || ''}
                  onChange={e => setTargetForm({...targetForm, description: e.target.value})}
                  placeholder="Details..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isAdding} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95">
                  {isAdding ? 'Saving...' : (editingTarget ? 'Update Target' : 'Create New Target')}
                </button>
                <button type="button" onClick={() => setShowTargetModal(false)} className="bg-slate-100 dark:bg-[#1e2030] hover:bg-slate-200 dark:hover:bg-[#2a2d3d] text-slate-700 dark:text-slate-300 px-4 py-3 rounded-xl font-bold transition-colors active:scale-95">
                    Cancel
                </button>
              </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delegation Modal */}
      <Dialog open={showDelegationModal} onOpenChange={setShowDelegationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delegate Scoring Permission</DialogTitle>
            <DialogDescription>Allow an employee to peer-evaluate another employee's targets.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDelegateScore} className="space-y-4 pt-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Reviewer</label>
                <select 
                    value={delegationForm.grantee_id}
                    onChange={e => setDelegationForm(f => ({ ...f, grantee_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm"
                    required
                >
                    <option value="">-- Choose Reviewer --</option>
                    {allUsersList.filter(u => u.role !== 'ceo').map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Employee To Be Evaluated</label>
                <select 
                    value={delegationForm.target_user_id}
                    onChange={e => setDelegationForm(f => ({ ...f, target_user_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm"
                    required
                >
                    <option value="">-- Choose Employee --</option>
                    {allUsersList.filter(u => u.role !== 'ceo').map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username}</option>
                    ))}
                </select>
            </div>
            <div className="pt-2">
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded transition-colors">
                    Grant Permission
                </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
