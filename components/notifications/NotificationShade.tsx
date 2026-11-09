'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  X, 
  ChevronUp, 
  MessageSquare, 
  Send, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ExternalLink,
  Loader2,
  Briefcase,
  Users,
  AlertTriangle,
  Info,
  DollarSign
} from 'lucide-react';
import { useStore, Notification } from '@/lib/store';
import { notificationsService } from '@/services/notifications';
import { workcenterService } from '@/services/workcenter';
import { cn } from '@/utils/cn';
import { formatISTDateTime, accurateTimeAgo } from '@/utils/date';

interface NotificationShadeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationShade({ isOpen, onClose }: NotificationShadeProps) {
  const router = useRouter();
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    setNotifications,
    theme
  } = useStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'followups' | 'tasks' | 'meetings'>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isFollowupDone, setIsFollowupDone] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [successReplyId, setSuccessReplyId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shadeRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Robust extraction of task ID from link or text
  const extractTaskId = (notif: Notification): number | null => {
    if (notif.link) {
      const match = notif.link.match(/(?:task[=_]|task_id=|id=|\/tasks\/)(\d+)/i);
      if (match) return Number(match[1]);
    }
    // Inspect title and description for task ID if link didn't specify
    const text = `${notif.title || ''} ${notif.description || ''}`;
    const textMatch = text.match(/(?:task|follow-up)\s*#?(\d+)/i);
    if (textMatch) return Number(textMatch[1]);
    return null;
  };

  // Determine if notification is a follow-up, mention, or task
  const isFollowupNotification = (notif: Notification): boolean => {
    const title = (notif.title || '').toLowerCase();
    const desc = (notif.description || '').toLowerCase();
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

  const isTaskRelated = (notif: Notification): boolean => {
    if (extractTaskId(notif) !== null) return true;
    if (notif.category === 'tasks') return true;
    const text = `${notif.title || ''} ${notif.description || ''} ${notif.notification_type || ''}`.toLowerCase();
    return text.includes('task') || text.includes('follow-up') || text.includes('assigned') || text.includes('tagged');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'followups') return isFollowupNotification(n);
    if (activeFilter === 'tasks') return n.category === 'tasks' || isTaskRelated(n);
    if (activeFilter === 'meetings') return n.category === 'meetings';
    return true;
  });

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    markAllNotificationsAsRead();
    try {
      await notificationsService.markAllAsRead(unreadIds);
    } catch {}
  };

  const handleClearAll = async () => {
    setNotifications([]);
    try {
      await notificationsService.clearAll();
    } catch {}
  };

  const handleOpenLink = (notif: Notification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
      try { notificationsService.markAsRead(Number(notif.id)); } catch {}
    }
    onClose();

    const taskId = extractTaskId(notif);
    if (taskId) {
      router.push(`/workcenter?task=${taskId}&tab=updates`);
      return;
    }

    if (notif.link) {
      let link = notif.link;
      if (link.includes('/workcenter') && !link.includes('tab=')) {
        link = link.includes('?') ? `${link}&tab=updates` : `${link}?tab=updates`;
      }
      router.push(link);
    } else if (isTaskRelated(notif)) {
      router.push('/workcenter');
    } else {
      router.push('/notifications');
    }
  };

  const handleSubmitQuickReply = async (notif: Notification) => {
    const taskId = extractTaskId(notif);
    if (!taskId || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      await workcenterService.addComment(taskId, {
        content: replyText.trim(),
        is_followup_completed: isFollowupDone,
      });

      // Mark notification as read
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

  if (!isOpen || !mounted) return null;

  const isDark = theme === 'dark';

  return createPortal(
    <div className={cn("fixed inset-0 z-[9999] flex flex-col justify-start items-center", isDark && "dark")}>
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-down Smartphone-Style Notification Shade */}
      <div 
        ref={shadeRef}
        className={cn(
          "relative z-[10000] w-full max-w-xl mx-auto",
          "bg-white dark:bg-[#121A2A]",
          "border-x border-b border-slate-200 dark:border-slate-800 shadow-2xl rounded-b-3xl",
          "flex flex-col max-h-[85vh] overflow-hidden",
          "animate-in slide-in-from-top duration-300 ease-out"
        )}
      >
        {/* Top Phone-style Status Bar & Header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162032] flex-shrink-0">
          {/* Smartphone Status Bar info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 font-sans font-bold text-slate-800 dark:text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Nurofin EOS Shade
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              {formatISTDateTime(new Date(), { showSeconds: false, withTimezone: true })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">Notifications</h3>
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      All caught up
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors border border-blue-200 dark:border-blue-800/60"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close notification shade"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-3 pt-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap",
                activeFilter === 'all'
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('followups')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap flex items-center gap-1",
                activeFilter === 'followups'
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              )}
            >
              <MessageSquare className="w-3 h-3" />
              Follow-ups & Tags
            </button>
            <button
              onClick={() => setActiveFilter('tasks')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap flex items-center gap-1",
                activeFilter === 'tasks'
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              )}
            >
              <Briefcase className="w-3 h-3" />
              Tasks
            </button>
            <button
              onClick={() => setActiveFilter('meetings')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap flex items-center gap-1",
                activeFilter === 'meetings'
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              )}
            >
              <Users className="w-3 h-3" />
              Meetings
            </button>
          </div>
        </div>

        {/* Scrollable Notifications Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-slate-100/70 dark:bg-[#0b1220]">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700">
                <Bell className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No notifications to show</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                You will receive alerts here whenever someone tags you in a task, assigns follow-ups, or schedules events.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const taskId = extractTaskId(notif);
              const taskRelated = isTaskRelated(notif);
              const isReplying = replyingId === notif.id;
              const isSuccess = successReplyId === notif.id;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3.5 rounded-xl transition-all duration-200 text-left border shadow-sm",
                    !notif.read 
                      ? "bg-blue-50/90 dark:bg-[#16243a] border-blue-300 dark:border-blue-700/60 ring-1 ring-blue-500/20" 
                      : "bg-white dark:bg-[#162032] border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        notif.category === 'tasks' || taskRelated
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60" 
                          : notif.category === 'meetings' 
                          ? "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60" 
                          : notif.category === 'finance' 
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      )}>
                        {(notif.category === 'tasks' || taskRelated) && <Briefcase className="w-2.5 h-2.5" />}
                        {notif.category === 'meetings' && <Users className="w-2.5 h-2.5" />}
                        {notif.category === 'finance' && <DollarSign className="w-2.5 h-2.5" />}
                        {notif.category || 'TASK'}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </div>
                    <span 
                      className="text-[11px] text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1 flex-shrink-0"
                      title={notif.created_at ? formatISTDateTime(notif.created_at) : notif.time}
                    >
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      {notif.created_at ? (
                        <span>
                          {formatISTDateTime(notif.created_at, { showSeconds: false, withTimezone: true })}
                          <span className="ml-1 opacity-75 font-sans">({accurateTimeAgo(notif.created_at)})</span>
                        </span>
                      ) : (
                        notif.time || 'Recently'
                      )}
                    </span>
                  </div>

                  {/* Title & Description - HIGH CONTRAST & FULLY VISIBLE */}
                  <h4 
                    className="text-xs font-bold text-slate-900 dark:text-white mb-1 leading-snug"
                    style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                  >
                    {notif.title}
                  </h4>
                  <p 
                    className="text-[12px] text-slate-700 dark:text-slate-200 leading-relaxed mb-3 font-normal"
                    style={{ color: isDark ? '#E2E8F0' : '#334155' }}
                  >
                    {notif.description}
                  </p>

                  {/* Success notification for quick reply */}
                  {isSuccess && (
                    <div className="mb-2.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-xs font-semibold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                      Follow-up posted successfully!
                    </div>
                  )}

                  {/* Inline Quick Reply Drawer for Follow-up */}
                  {isReplying && taskId && (
                    <div className="mb-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Post Follow-up Update
                        </span>
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={isFollowupDone}
                            onChange={(e) => setIsFollowupDone(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                          <span className={cn(isFollowupDone && "text-emerald-600 dark:text-emerald-400 font-bold")}>
                            Mark completed
                          </span>
                        </label>
                      </div>

                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your follow-up notes, what was completed, or response to the tag..."
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white resize-none shadow-sm placeholder:text-slate-400"
                        autoFocus
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmitQuickReply(notif)}
                          disabled={submittingReply || !replyText.trim()}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
                        >
                          {submittingReply ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Send Follow-up
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card Action Buttons: ALWAYS PRESENT */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Open & Follow Up Button - ALWAYS ACCESSIBLE */}
                      <button
                        onClick={() => handleOpenLink(notif)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                        title="Open task in Workcenter to review details and post follow-ups"
                      >
                        <span>Open & Follow Up</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Reply / Follow-up Button */}
                      {taskId && !isReplying && (
                        <button
                          onClick={() => {
                            setReplyingId(notif.id);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-600 shadow-sm transition-colors cursor-pointer"
                          title="Quick reply with a follow-up directly here"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Quick Reply</span>
                        </button>
                      )}
                    </div>

                    {/* Mark Read/Unread */}
                    {!notif.read ? (
                      <button
                        onClick={async () => {
                          markNotificationAsRead(notif.id);
                          try { await notificationsService.markAsRead(Number(notif.id)); } catch {}
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 flex-shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark read</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Read
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Smartphone-Style Pull Handle & Footer */}
        <div className="pt-2 pb-2.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#162032] flex-shrink-0 text-center">
          <div 
            onClick={onClose}
            className="group cursor-pointer inline-flex flex-col items-center justify-center p-1 w-full"
            title="Drag or click to close shade"
          >
            <div className="w-14 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 transition-all duration-200" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <ChevronUp className="w-3 h-3" />
              Slide up or click outside to close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
