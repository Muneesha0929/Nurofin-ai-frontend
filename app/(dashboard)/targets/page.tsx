'use client';

import React, { useEffect, useState } from 'react';
import targetService, { Target, TargetUpdate, TargetCreate } from '@/services/targetService';
import { useStore } from '@/lib/store';
import { Target as TargetIcon, CheckSquare, Plus, Globe, User as UserIcon } from 'lucide-react';

export default function TargetsPage() {
  const { userProfile } = useStore();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetForm, setTargetForm] = useState<Partial<TargetCreate>>({ 
    month: new Date().toISOString().slice(0, 7) 
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const data = await targetService.getMyTargets();
      setTargets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch targets');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (target: Target) => {
    try {
      const updateData: TargetUpdate = { is_completed: !target.is_completed };
      await targetService.updateTarget(target.id, updateData);
      fetchTargets();
    } catch (err: any) {
      alert('Error updating target: ' + err.message);
    }
  };

  const handleAddIndividualTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.title || !targetForm.month || !userProfile.id) return;
    
    try {
      setIsAdding(true);
      await targetService.createTarget({
        ...targetForm,
        is_global: false,
        user_id: Number(userProfile.id)
      } as TargetCreate);
      
      setTargetForm({ title: '', description: '', month: new Date().toISOString().slice(0, 7) });
      await fetchTargets();
    } catch (err: any) {
      alert('Failed to add target: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  if (loading && targets.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-accent-red font-medium text-center">{error}</div>;
  }

  const globalTargets = targets.filter(t => t.is_global);
  const individualTargets = targets.filter(t => !t.is_global);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <TargetIcon className="w-8 h-8 text-accent-blue" />
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">My Targets</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Add Target & Individual Targets */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* ADD INDIVIDUAL TARGET SECTION */}
          <section className="bg-background-primary dark:bg-[#12131c] p-6 rounded-xl shadow-sm border border-border-subtle dark:border-[#1e2030]">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-accent-green" />
              <h2 className="text-xl font-semibold text-text-primary dark:text-white">Add Individual Target</h2>
            </div>
            
            <form onSubmit={handleAddIndividualTarget} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Target Title</label>
                <input 
                  type="text" 
                  className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white focus:border-accent-blue outline-none transition-colors" 
                  value={targetForm.title || ''}
                  onChange={e => setTargetForm({...targetForm, title: e.target.value})}
                  placeholder="e.g. Complete Personal Project X"
                  required
                />
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Description (Optional)</label>
                  <textarea 
                    className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white focus:border-accent-blue outline-none transition-colors min-h-[46px]" 
                    value={targetForm.description || ''}
                    onChange={e => setTargetForm({...targetForm, description: e.target.value})}
                    placeholder="Details..."
                    rows={1}
                  />
                </div>
                <div className="w-40">
                  <label className="block text-sm font-semibold text-text-secondary dark:text-slate-300 mb-1">Month</label>
                  <input 
                    type="month" 
                    className="w-full bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-2.5 text-text-primary dark:text-white focus:border-accent-blue outline-none transition-colors" 
                    value={targetForm.month || ''}
                    onChange={e => setTargetForm({...targetForm, month: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isAdding}
                  className="bg-accent-blue hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm text-sm"
                >
                  {isAdding ? 'Adding...' : 'Save My Target'}
                </button>
              </div>
            </form>
          </section>

          {/* INDIVIDUAL TARGETS LIST */}
          <section className="bg-background-primary dark:bg-[#12131c] p-6 rounded-xl shadow-sm border border-border-subtle dark:border-[#1e2030]">
            <div className="flex items-center gap-2 mb-6">
              <UserIcon className="w-5 h-5 text-accent-blue" />
              <h2 className="text-xl font-semibold text-text-primary dark:text-white">Individual Targets</h2>
            </div>
            
            {individualTargets.length === 0 ? (
              <div className="text-center py-10 text-text-muted border-2 border-dashed border-border-subtle dark:border-[#1e2030] rounded-xl">
                No individual targets for you yet. Add one above!
              </div>
            ) : (
              <ul className="space-y-4">
                {individualTargets.map((target) => (
                  <li key={target.id} className="bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:border-accent-blue/50 transition-colors">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary dark:text-white flex items-center gap-2">
                        {target.title}
                      </h3>
                      {target.description && <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">{target.description}</p>}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs font-semibold text-text-muted bg-slate-100 dark:bg-[#12131c] px-2 py-1 rounded">Month: {target.month}</span>
                        {target.is_completed && target.completed_at && (
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            Completed: {new Date(target.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center flex-shrink-0">
                      <button
                        onClick={() => handleToggleComplete(target)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2 ${
                          target.is_completed 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60' 
                            : 'bg-background-primary dark:bg-[#12131c] border border-border-subtle dark:border-[#2a2d3d] hover:border-accent-blue hover:text-accent-blue text-text-secondary dark:text-slate-300'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        {target.is_completed ? 'Completed' : 'Mark Complete'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Global Targets */}
        <div className="space-y-8">
          <section className="bg-background-primary dark:bg-[#12131c] p-6 rounded-xl shadow-sm border border-border-subtle dark:border-[#1e2030]">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-accent-purple" />
              <h2 className="text-xl font-semibold text-text-primary dark:text-white">Global Targets</h2>
            </div>
            
            {globalTargets.length === 0 ? (
              <div className="text-center py-10 text-text-muted border-2 border-dashed border-border-subtle dark:border-[#1e2030] rounded-xl text-sm">
                No active global targets assigned.
              </div>
            ) : (
              <ul className="space-y-4">
                {globalTargets.map((target) => (
                  <li key={target.id} className="bg-background-secondary dark:bg-[#1c1d29] border border-border-subtle dark:border-[#2a2d3d] rounded-lg p-4 flex flex-col gap-3 hover:border-accent-purple/50 transition-colors">
                    <div>
                      <h3 className="font-bold text-text-primary dark:text-white leading-tight">
                        {target.title}
                      </h3>
                      {target.description && <p className="text-xs text-text-secondary dark:text-slate-400 mt-1 line-clamp-2">{target.description}</p>}
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-border-subtle dark:border-[#1e2030] pt-3 mt-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{target.month}</span>
                      
                      <button
                        onClick={() => handleToggleComplete(target)}
                        className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors flex items-center gap-1.5 ${
                          target.is_completed 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-text-secondary dark:text-slate-400 hover:text-accent-blue'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        {target.is_completed ? 'Done' : 'Complete'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
