'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { issuesService } from '@/services/issues';
import { usersService } from '@/services/users';
import { Issue, UserProfile } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, UserCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GlobalAssignmentPopup() {
  const { userProfile } = useStore();
  const [pendingAssignment, setPendingAssignment] = useState<Issue | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const currentUserId = userProfile?.id ? String(userProfile.id) : '';

  const checkPendingAssignments = useCallback(async () => {
    if (!currentUserId || isNaN(parseInt(currentUserId))) return;
    try {
      const { issues } = await issuesService.getIssues({ assigned_user_id: parseInt(currentUserId) });
      const pending = issues.find(i => (i as any).assignmentStatus === 'pending_acceptance' && String((i as any).assignedUserId || (i as any).assigned_user_id) === currentUserId);
      if (pending && !pendingAssignment) {
        setPendingAssignment(pending);
      } else if (!pending) {
        setPendingAssignment(null);
      }
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    }
  }, [currentUserId, pendingAssignment]);

  useEffect(() => {
    checkPendingAssignments();
    const interval = setInterval(checkPendingAssignments, 10000);
    return () => clearInterval(interval);
  }, [checkPendingAssignments]);

  const handleAssignmentAction = async (issue: Issue, action: 'accept' | 'decline') => {
    if (!issue || !issue.id) return;
    try {
      if (action === 'accept') {
        await issuesService.acceptIssue(parseInt(issue.id));
      } else if (action === 'decline') {
        await issuesService.declineIssue(parseInt(issue.id));
      }
      
      setPendingAssignment(null);
      await checkPendingAssignments();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('issue:updated'));
        window.dispatchEvent(new CustomEvent('task:created'));
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const openTransferModal = async () => {
    setShowTransferModal(true);
    try {
      const users = await usersService.getUsers();
      // Exclude current user from the list
      setUsersList(users.filter(u => String(u.id) !== currentUserId));
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleTransfer = async () => {
    if (!pendingAssignment || !selectedUserId) return;
    setIsSubmitting(true);
    try {
      await issuesService.transferIssue(parseInt(pendingAssignment.id), parseInt(selectedUserId), transferReason);
      setPendingAssignment(null);
      setShowTransferModal(false);
      await checkPendingAssignments();
      
      if (window.location.pathname !== '/issues') {
        router.push('/issues');
      }
    } catch (err: any) {
      alert(err.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical': return 'text-accent-red bg-accent-red/10 border-accent-red/30 font-extrabold animate-pulse';
      case 'high': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20 font-bold';
      case 'medium': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20 font-semibold';
      case 'low': return 'text-text-secondary bg-background-secondary border-border-subtle font-medium';
      default: return 'text-text-secondary bg-background-secondary border-border-subtle';
    }
  };

  return (
    <>
      <Dialog open={!!pendingAssignment && !showTransferModal} onOpenChange={(open) => !open && setPendingAssignment(null)}>
        <DialogContent className="max-w-md border-accent-blue/50 bg-background-primary shadow-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-xl text-accent-blue flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              New Assignment!
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold mt-2">
              You have been assigned an issue. Please review and Accept or Decline.
            </DialogDescription>
          </DialogHeader>

          {pendingAssignment && (
            <div className="bg-background-secondary p-4 rounded-lg border border-border-subtle my-2">
              <h3 className="font-bold text-text-primary text-base mb-1">{pendingAssignment.title}</h3>
              <p className="text-xs text-text-secondary line-clamp-2 mb-3">{pendingAssignment.description}</p>
              
              <div className="flex items-center gap-4 text-xs font-bold text-text-muted">
                <span>Priority: <span className={getSeverityBadge(pendingAssignment.severity) + " px-1.5 py-0.5 rounded"}>{pendingAssignment.severity}</span></span>
                <span>Project: {pendingAssignment.projectName || '—'}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => pendingAssignment && handleAssignmentAction(pendingAssignment, 'accept')}
              className="flex-1 px-4 py-2.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-sm font-bold rounded-md shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> Accept Issue
            </button>
            <button
              onClick={openTransferModal}
              className="flex-1 px-4 py-2.5 bg-background-primary border border-border-subtle hover:bg-background-secondary text-text-secondary hover:text-accent-blue text-sm font-bold rounded-md shadow-sm transition-all"
            >
              Transfer
            </button>
            <button
              onClick={() => pendingAssignment && handleAssignmentAction(pendingAssignment, 'decline')}
              className="flex-1 px-4 py-2.5 bg-background-primary border border-border-subtle hover:bg-background-secondary text-text-secondary hover:text-accent-red text-sm font-bold rounded-md shadow-sm transition-all"
            >
              Decline
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-md bg-background-primary border-border-subtle z-[10000]">
          <DialogHeader>
            <DialogTitle>Transfer Issue</DialogTitle>
            <DialogDescription>
              Select a teammate to transfer this issue to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-secondary">Teammate</label>
              <select 
                className="w-full bg-background-secondary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select a user...</option>
                {usersList.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.department ? `(${user.department})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-secondary">Reason (Optional)</label>
              <textarea 
                className="w-full bg-background-secondary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                rows={3}
                placeholder="Why are you transferring this issue?"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 justify-end">
            <button
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 text-sm font-bold text-text-secondary hover:bg-background-secondary rounded-md transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={!selectedUserId || isSubmitting}
              className="px-4 py-2 text-sm font-bold bg-accent-blue text-white rounded-md hover:bg-accent-blue-hover disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Transferring...' : 'Transfer'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
