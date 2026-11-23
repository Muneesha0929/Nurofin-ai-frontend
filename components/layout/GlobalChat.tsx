'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, X, Send, Sparkles, Loader2, Minimize2 } from 'lucide-react';
import { aiService, ChatMessage } from '@/services/ai';
import { cn } from '@/utils/cn';
import { useStore } from '@/lib/store';

export default function GlobalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'How can I assist you with your operations right now?' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputVal.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: inputVal };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      const response = await aiService.sendChatMessage([...messages, userMsg]);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button - Positioned above the docked taskbar on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-24 right-3 sm:bottom-6 sm:right-6 z-50 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border border-border-subtle/50 cursor-pointer",
          isOpen 
            ? "bg-surface-card text-text-primary rotate-90" 
            : "bg-accent-blue text-white hover:scale-105 hover:bg-accent-blue-hover"
        )}
        aria-label="Toggle Global AI Chat"
      >
        {isOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      {/* Slide-Up Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-36 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-6 z-50 sm:w-[360px] h-[460px] max-h-[calc(100vh-10rem)] bg-background-secondary border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 font-sans">
          
          {/* Header */}
          <div className="p-3.5 border-b border-border-subtle bg-surface-card/25 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4.5 h-4.5 text-accent-blue" />
              <div>
                <span className="text-2xs font-bold text-text-primary block leading-none">Executive AI Quick Sync</span>
                <span className="text-[9px] text-text-muted">Always ready to advise</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-text-secondary hover:text-text-primary p-0.5 hover:bg-surface-hover rounded"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-background-primary/10">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "p-2.5 rounded-lg text-xs leading-relaxed max-w-[85%] text-left",
                  msg.role === 'user' 
                    ? "bg-accent-blue/10 border border-accent-blue/20 ml-auto" 
                    : "bg-surface-card border border-border-subtle mr-auto"
                )}
              >
                <p className="text-text-primary">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className="bg-surface-card border border-border-subtle mr-auto max-w-[85%] rounded-lg p-2.5 text-xs italic text-text-secondary flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-blue" /> Thinking...
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Simple Prompts suggestions */}
          {messages.length === 1 && (
            <div className="px-3 py-2 border-t border-border-subtle/50 flex gap-1.5 overflow-x-auto bg-surface-card/10 scrollbar-none">
              <button 
                onClick={() => { setInputVal("Explain budget"); }}
                className="text-[10px] bg-background-primary border border-border-subtle px-2 py-1 rounded-full text-text-secondary hover:text-text-primary whitespace-nowrap"
              >
                Explain budget
              </button>
              <button 
                onClick={() => { setInputVal("Project Delta progress"); }}
                className="text-[10px] bg-background-primary border border-border-subtle px-2 py-1 rounded-full text-text-secondary hover:text-text-primary whitespace-nowrap"
              >
                Project Delta
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="p-3 border-t border-border-subtle bg-surface-card/30">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask Nurofin Copilot..."
                className="flex-1 h-9 bg-background-primary border border-border-subtle rounded px-3 text-xs text-text-primary placeholder-text-muted focus:border-accent-blue outline-none"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
              />
              <button 
                type="submit"
                className="p-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded transition-colors"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
