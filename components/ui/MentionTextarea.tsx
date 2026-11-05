/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AtSign, User as UserIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface MentionUser {
  id: string | number;
  name: string;
  avatar?: string | null;
  role?: string | null;
  email?: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  users: MentionUser[];
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  showTriggerButton?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  users = [],
  placeholder = 'Type @ to mention teammates...',
  rows = 3,
  className = '',
  disabled = false,
  autoFocus = false,
  onKeyDown,
  showTriggerButton = true,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter users by query
  const filteredUsers = useMemo(() => {
    if (!isOpen) return [];
    const q = query.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter(u => {
        const name = (u.name || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(q) || role.includes(q) || email.includes(q);
      })
      .slice(0, 8);
  }, [isOpen, query, users]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredUsers]);

  // Check cursor position and detect @ trigger
  const checkMentionTrigger = (text: string, pos: number) => {
    const textBefore = text.slice(0, pos);
    // Matches @query where @ is preceded by start of string or whitespace, followed by non-space/single-space word chars
    const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_.\s]{0,25})$/);
    if (match) {
      setQuery(match[1]);
      setIsOpen(true);
      setCursorPos(pos);
    } else {
      setIsOpen(false);
      setQuery('');
      setCursorPos(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    checkMentionTrigger(newVal, e.target.selectionStart || 0);
  };

  const handleSelectUser = (user: MentionUser) => {
    if (!textareaRef.current) return;
    const text = value;
    const pos = textareaRef.current.selectionStart || (cursorPos ?? text.length);
    const textBefore = text.slice(0, pos);
    const textAfter = text.slice(pos);

    // Find the last @ before the cursor
    const lastAtIndex = textBefore.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const mentionText = `@${user.name} `;
      const newText = textBefore.slice(0, lastAtIndex) + mentionText + textAfter;
      onChange(newText);
      setIsOpen(false);

      // Re-focus and set cursor position after inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = lastAtIndex + mentionText.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isOpen && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectUser(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Click handler for outside click
  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(ev.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(ev.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerMentionManually = () => {
    if (!textareaRef.current) return;
    const text = value;
    const pos = textareaRef.current.selectionStart || text.length;
    const needsLeadingSpace = pos > 0 && text[pos - 1] !== ' ' && text[pos - 1] !== '\n';
    const insert = (needsLeadingSpace ? ' ' : '') + '@';
    const newText = text.slice(0, pos) + insert + text.slice(pos);
    onChange(newText);
    const newPos = pos + insert.length;

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
        checkMentionTrigger(newText, newPos);
      }
    }, 0);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        onClick={e => checkMentionTrigger(value, (e.target as HTMLTextAreaElement).selectionStart || 0)}
        onKeyUp={e => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            checkMentionTrigger(value, (e.target as HTMLTextAreaElement).selectionStart || 0);
          }
        }}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          "w-full bg-background-primary border border-border-subtle rounded-lg p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors resize-y",
          className
        )}
      />

      {/* Manual @ mention button */}
      {showTriggerButton && (
        <div className="absolute right-2 bottom-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={triggerMentionManually}
            className="p-1 rounded text-text-muted hover:text-accent-blue hover:bg-surface-hover/80 transition-colors"
            title="Mention a teammate (@)"
          >
            <AtSign className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mention Dropdown */}
      {isOpen && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 bottom-full mb-1 w-64 max-h-56 overflow-y-auto bg-surface-card border border-border-subtle rounded-lg shadow-2xl z-50 py-1 text-left divide-y divide-border-subtle/40 backdrop-blur-md"
        >
          <div className="px-2.5 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider bg-background-secondary/50">
            Mention Teammate
          </div>
          {filteredUsers.map((user, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={user.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleSelectUser(user)}
                className={cn(
                  "px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors text-xs select-none",
                  isSelected ? "bg-accent-blue/15 text-accent-blue font-semibold" : "hover:bg-surface-hover text-text-primary"
                )}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-5 h-5 rounded-full object-cover border border-border-subtle flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{user.name}</div>
                  {user.role && (
                    <div className="text-[9px] text-text-muted capitalize truncate">{user.role}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Helper to display text with @mentions highlighted in a clean, stylish chip.
 */
export function MentionContent({
  text,
  users = [],
  className = '',
}: {
  text: string;
  users?: MentionUser[];
  className?: string;
}) {
  const userNames = useMemo(() => {
    return users.map(u => u.name).filter(Boolean);
  }, [users]);

  const rendered = useMemo(() => {
    if (!text || !text.includes('@')) {
      return text;
    }

    // Build regex pattern matching either known user names or @word words
    let pattern: RegExp;
    if (userNames.length > 0) {
      const sorted = [...userNames].sort((a, b) => b.length - a.length);
      const escaped = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      pattern = new RegExp(`((?:(?<!\\w)@(?:${escaped})(?![a-zA-Z0-9_]))|(?<!\\w)@[a-zA-Z0-9_.\-]+)`, 'gi');
    } else {
      pattern = /((?<!\w)@[a-zA-Z0-9_.\-]+(?:\s+[a-zA-Z0-9_.\-]+)?)/g;
    }

    const parts = text.split(pattern);
    return parts.map((part, i) => {
      if (part.startsWith('@') && part.length > 1) {
        return (
          <span
            key={i}
            className="inline-flex items-center text-accent-blue font-semibold bg-accent-blue/10 px-1.5 py-0.5 rounded text-[10px] mx-0.5 border border-accent-blue/25"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [text, userNames]);

  if (!text) return null;

  return <span className={cn("whitespace-pre-wrap leading-relaxed", className)}>{rendered}</span>;
}
