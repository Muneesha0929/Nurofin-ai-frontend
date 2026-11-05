'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, Notification } from '@/lib/store';
import { cn } from '@/utils/cn';
import { notificationsService } from '@/services/notifications';
import { workcenterService } from '@/services/workcenter';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Briefcase, 
  Users, 
  DollarSign, 
  Info,
  ArrowRight,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    setNotifications 
  } = useStore();

  const [filter, setFilter] = useState<'all' | 'unread' | 'followups' | 'grouped'>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isFollowupDone, setIsFollowupDone] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [successReplyId, setSuccessReplyId] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const extractTaskId = (link?: string): number | null => {
    if (!link) return null;
    const match = link.match(/task=(\d+)/);
    return match ? Number(match[1]) : null;
  };

  const isFollowupNotification = (notif: Notification): boolean => {
    const title = notif.title.toLowerCase();
    const desc = notif.description.toLowerCase();
    const type = (notif.notification_type || '').toLowerCase();
    return (
      title.includes('tagged') ||
      title.includes('follow-up') ||
      title.includes('followup') ||
      title.includes('assigned') ||
      desc.includes('tagged you') ||
      desc.includes('follow-up') ||
      type.includes('task_assigned') ||
      type.includes('project_update')
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'finance': return <DollarSign className="w-4 h-4 text-accent-red" />;
      case 'meetings': return <Users className="w-4 h-4 text-accent-blue" />;
      case 'tasks': return <Briefcase className="w-4 h-4 text-accent-orange" />;
      default: return <Info className="w-4 h-4 text-accent-green" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'finance': return 'border-accent-red/20 bg-accent-red/5 text-accent-red';
      case 'meetings': return 'border-accent-blue/20 bg-accent-blue/5 text-accent-blue';
      case 'tasks': return 'border-accent-orange/20 bg-accent-orange/5 text-accent-orange';
      default: return 'border-accent-green/20 bg-accent-green/5 text-accent-green';
    }
  };

  const categoriesList = ['finance', 'meetings', 'tasks', 'alerts', 'general'] as const;

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'followups') return isFollowupNotification(n);
    return true;
  });

  const handleOpenLink = (notif: Notification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
      try { notificationsService.markAsRead(Number(notif.id)); } catch {}
    }
    if (notif.link) {
      let link = notif.link;
      if (link.includes('/workcenter') && !link.includes('tab=')) {
        link = link.includes('?') ? `${link}&tab=updates` : `${link}?tab=updates`;
      }
      router.push(link);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    markAllNotificationsAsRead();
    try { await notificationsService.markAllAsRead(unreadIds); } catch {}
  };

  const handleClearAll = async () => {
    setNotifications([]);
    try { await notificationsService.clearAll(); } catch {}
  };

  const handleSubmitQuickReply = async (notif: Notification) => {
    const taskId = extractTaskId(notif.link);
    if (!taskId || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      await workcenterService.addComment(taskId, {
        content: replyText.trim(),
        is_followup_completed: isFollowupDone,
      });

      markNotificationAsRead(notif.id);
      try { await notificationsService.markAsRead(Number(notif.id)); } catch {}

      setSuccessReplyId(notif.id);
      setReplyText('');
      setReplyingId(null);

      setTimeout(() => {
        setSuccessReplyId(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to submit quick follow-up:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-text-primary">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background-secondary p-4 rounded-lg border border-border-subtle shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent-blue/10 rounded-lg text-accent-blue">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-sans">Notification Center</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent-red text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-2xs text-text-secondary mt-0.5">
              Review mentions, task follow-ups, team updates, and schedule notifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-background-primary border border-border-subtle hover:text-text-primary text-xs font-semibold rounded-md text-text-secondary transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-accent-blue" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-background-primary border border-border-subtle hover:text-accent-red text-xs font-semibold rounded-md text-text-muted transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Roster Filter tabs */}
      <div className="flex border-b border-border-subtle gap-4 text-xs font-semibold pb-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "pb-2 border-b-2 px-1 transition-all whitespace-nowrap",
            filter === 'all' ? "border-accent-blue text-accent-blue font-bold" : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          All Stream ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            "pb-2 border-b-2 px-1 transition-all flex items-center gap-1.5 whitespace-nowrap",
            filter === 'unread' ? "border-accent-blue text-accent-blue font-bold" : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          Unread Alerts
          {unreadCount > 0 && (
            <span className="bg-accent-red text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('followups')}
          className={cn(
            "pb-2 border-b-2 px-1 transition-all flex items-center gap-1.5 whitespace-nowrap",
            filter === 'followups' ? "border-accent-blue text-accent-blue font-bold" : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Follow-ups & Mentions
        </button>
        <button
          onClick={() => setFilter('grouped')}
          className={cn(
            "pb-2 border-b-2 px-1 transition-all whitespace-nowrap",
            filter === 'grouped' ? "border-accent-blue text-accent-blue font-bold" : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          Grouped Category List
        </button>
      </div>

      {/* Render notifications list based on tab */}
      {filter !== 'grouped' ? (
        <div className="bg-background-secondary border border-border-subtle rounded-lg overflow-hidden divide-y divide-border-subtle shadow-md">
          {filteredNotifs.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted italic">
              No notifications inside this folder.
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const hasTaskLink = Boolean(notif.link && notif.link.includes('task='));
              const isReplying = replyingId === notif.id;
              const isSuccess = successReplyId === notif.id;

              return (
                <div 
                  key={notif.id}
                  className={cn(
                    "p-4 transition-colors text-left space-y-3",
                    !notif.read ? "bg-accent-blue/[0.03] border-l-2 border-accent-blue" : "hover:bg-surface-hover/30"
                  )}
                >
                  <div className="flex gap-4 items-start">
                    <div className={cn("p-2 border rounded-md h-fit mt-0.5 flex-shrink-0", getCategoryColor(notif.category))}>
                      {getCategoryIcon(notif.category)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-text-primary text-xs truncate">{notif.title}</h4>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-accent-blue" />
                          )}
                        </div>
                        <span className="text-[10px] text-text-muted flex-shrink-0 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {notif.time || 'Recently'}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{notif.description}</p>
                    </div>

                    {/* Mark read indicator / button */}
                    <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                      {!notif.read ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            markNotificationAsRead(notif.id);
                            try { await notificationsService.markAsRead(Number(notif.id)); } catch {}
                          }}
                          className="p-1 rounded hover:bg-surface-hover text-accent-blue hover:text-accent-blue/80 transition-colors"
                          title="Mark as read"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-blue block" />
                        </button>
                      ) : (
                        <Check className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  </div>

                  {/* Success notification for quick reply */}
                  {isSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-1.5 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Follow-up submitted successfully! The assigner has been notified.
                    </div>
                  )}

                  {/* Inline Quick Reply Drawer for Follow-up */}
                  {isReplying && hasTaskLink && (
                    <div className="p-3 rounded-lg bg-background-primary border border-border-subtle space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-accent-blue" />
                          Submit Follow-up Response
                        </span>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer text-text-secondary">
                          <input
                            type="checkbox"
                            checked={isFollowupDone}
                            onChange={(e) => setIsFollowupDone(e.target.checked)}
                            className="rounded border-border-subtle text-accent-green w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                          />
                          <span className={cn(isFollowupDone && "text-emerald-500")}>
                            Mark completed
                          </span>
                        </label>
                      </div>

                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your follow-up notes, what was completed, or response to the tag..."
                        rows={2}
                        className="w-full text-xs p-2 rounded-md bg-background-secondary border border-border-subtle focus:border-accent-blue focus:outline-none text-text-primary resize-none"
                        autoFocus
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText('');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmitQuickReply(notif)}
                          disabled={submittingReply || !replyText.trim()}
                          className="flex items-center gap-1 px-3 py-1 bg-accent-blue text-white rounded-md text-[11px] font-bold hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
                        >
                          {submittingReply ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          Send Follow-up
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle/30">
                    <div className="flex items-center gap-2">
                      {notif.link && (
                        <button
                          onClick={() => handleOpenLink(notif)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-accent-blue text-white text-[11px] font-bold hover:bg-accent-blue/90 transition-colors"
                        >
                          <span>Open & Follow Up</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {hasTaskLink && !isReplying && (
                        <button
                          onClick={() => {
                            setReplyingId(notif.id);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-hover text-text-secondary hover:text-text-primary text-[11px] font-semibold border border-border-subtle transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Quick Reply</span>
                        </button>
                      )}
                    </div>

                    {!notif.read && (
                      <button
                        onClick={async () => {
                          markNotificationAsRead(notif.id);
                          try { await notificationsService.markAsRead(Number(notif.id)); } catch {}
                        }}
                        className="text-[10px] font-semibold text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-surface-hover transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Render Grouped Category List folders */
        <div className="space-y-4">
          {categoriesList.map((cat) => {
            const catNotifs = notifications.filter(n => n.category === cat);
            if (catNotifs.length === 0) return null;
            return (
              <div key={cat} className="bg-background-secondary border border-border-subtle rounded-lg overflow-hidden shadow-md">
                <div className="p-3 border-b border-border-subtle bg-surface-card/10 flex items-center justify-between">
                  <span className="text-2xs font-bold uppercase tracking-wider text-text-primary">{cat} Alerts</span>
                  <span className="text-2xs bg-background-primary border border-border-subtle px-2 py-0.5 rounded text-text-secondary font-bold">
                    {catNotifs.length}
                  </span>
                </div>
                <div className="divide-y divide-border-subtle">
                  {catNotifs.map((notif) => (
                    <div 
                      key={notif.id}
                      className={cn(
                        "p-4 flex gap-4 items-start text-xs transition-colors hover:bg-surface-hover/30 text-left",
                        !notif.read ? "bg-accent-blue/[0.02] border-l-2 border-accent-blue" : ""
                      )}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-bold text-text-primary text-xs truncate">{notif.title}</h4>
                          <span className="text-[9px] text-text-muted flex-shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">{notif.description}</p>
                        {notif.link && (
                          <div className="pt-2">
                            <button
                              onClick={() => handleOpenLink(notif)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-blue hover:underline"
                            >
                              <span>Open & Follow Up</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                        {!notif.read ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
                        ) : (
                          <Check className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
