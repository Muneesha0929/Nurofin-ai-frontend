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
    setNotifications 
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

  // Close on Escape
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

  // Extract task ID from link
  const extractTaskId = (link?: string): number | null => {
    if (!link) return null;
    const match = link.match(/task=(\d+)/);
    return match ? Number(match[1]) : null;
  };

  // Determine if notification is a follow-up or mention
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'followups') return isFollowupNotification(n);
    if (activeFilter === 'tasks') return n.category === 'tasks';
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

    if (notif.link) {
      // If task link, ensure updates tab is targeted
      let link = notif.link;
      if (link.includes('/workcenter') && !link.includes('tab=')) {
        link = link.includes('?') ? `${link}&tab=updates` : `${link}?tab=updates`;
      }
      router.push(link);
    } else {
      router.push('/notifications');
    }
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-start items-center">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-down Smartphone-Style Notification Shade */}
      <div 
        ref={shadeRef}
        className={cn(
          "relative z-[10000] w-full max-w-xl mx-auto",
          "bg-white dark:bg-[#121A2A]",
          "border-x border-b border-gray-200 dark:border-gray-800 shadow-2xl rounded-b-3xl",
          "flex flex-col max-h-[85vh] overflow-hidden",
          "animate-in slide-in-from-top duration-300 ease-out"
        )}
      >
        {/* Top Phone-style Status Bar & Header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#162032] flex-shrink-0">
          {/* Smartphone Status Bar info */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-2 font-mono">
            <span className="flex items-center gap-1.5 font-sans font-semibold text-gray-700 dark:text-gray-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Nurofin EOS Notification Shade
            </span>
            <span className="font-semibold text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white font-sans">Notifications</h3>
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
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
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap",
                activeFilter === 'all'
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('followups')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                activeFilter === 'followups'
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              )}
            >
              <MessageSquare className="w-3 h-3" />
              Follow-ups & Tags
            </button>
            <button
              onClick={() => setActiveFilter('tasks')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                activeFilter === 'tasks'
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              )}
            >
              <Briefcase className="w-3 h-3" />
              Tasks
            </button>
            <button
              onClick={() => setActiveFilter('meetings')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                activeFilter === 'meetings'
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              )}
            >
              <Users className="w-3 h-3" />
              Meetings
            </button>
          </div>
        </div>

        {/* Scrollable Notifications Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-gray-50/50 dark:bg-[#0f1724]">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto flex items-center justify-center text-gray-400 dark:text-gray-500">
                <Bell className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No notifications to show</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                You will receive alerts here whenever someone tags you in a task, assigns follow-ups, or schedules events.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const hasTaskLink = Boolean(notif.link && notif.link.includes('task='));
              const isReplying = replyingId === notif.id;
              const isSuccess = successReplyId === notif.id;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3.5 rounded-xl transition-all duration-200 text-left border shadow-sm",
                    !notif.read 
                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60" 
                      : "bg-white dark:bg-[#162032] border-gray-200 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-[#1a263c]"
                  )}
                >
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        notif.category === 'tasks' 
                          ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60" 
                          : notif.category === 'meetings' 
                          ? "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60" 
                          : notif.category === 'finance' 
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60" 
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      )}>
                        {notif.category === 'tasks' && <Briefcase className="w-2.5 h-2.5" />}
                        {notif.category === 'meetings' && <Users className="w-2.5 h-2.5" />}
                        {notif.category}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notif.time || 'Recently'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1 leading-snug">
                    {notif.title}
                  </h4>
                  <p className="text-[12px] text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                    {notif.description}
                  </p>

                  {/* Success notification for quick reply */}
                  {isSuccess && (
                    <div className="mb-2.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-xs font-semibold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                      Follow-up submitted successfully! The assigner has been notified.
                    </div>
                  )}

                  {/* Inline Quick Reply Drawer for Follow-up */}
                  {isReplying && hasTaskLink && (
                    <div className="mb-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 space-y-2.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Post Follow-up Update
                        </span>
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={isFollowupDone}
                            onChange={(e) => setIsFollowupDone(e.target.checked)}
                            className="rounded border-gray-300 text-emerald-600 w-4 h-4 accent-emerald-600 cursor-pointer"
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
                        className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-white resize-none shadow-sm placeholder:text-gray-400"
                        autoFocus
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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

                  {/* Card Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      {/* Direct Open Button */}
                      {notif.link && (
                        <button
                          onClick={() => handleOpenLink(notif)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          <span>Open & Follow Up</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Quick Reply Button */}
                      {hasTaskLink && !isReplying && (
                        <button
                          onClick={() => {
                            setReplyingId(notif.id);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold border border-gray-300 dark:border-gray-600 shadow-sm transition-colors"
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
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 font-medium">
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
        <div className="pt-2 pb-2.5 px-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#162032] flex-shrink-0 text-center">
          <div 
            onClick={onClose}
            className="group cursor-pointer inline-flex flex-col items-center justify-center p-1 w-full"
            title="Drag or click to close shade"
          >
            {/* Phone Drag Handle Bar */}
            <div className="w-14 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-500 transition-all duration-200" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
