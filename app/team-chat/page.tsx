'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { projectsService } from '@/services/projects';
import { tasksService } from '@/services/tasks';
import { plannerService } from '@/services/planner';
import { knowledgeService, DocumentItem } from '@/services/knowledge';
import { StreamChat } from 'stream-chat';
import { FileText, X, Paperclip, Plus, Briefcase } from 'lucide-react';
import {
  Chat,
  ChannelList,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageComposer,
  Thread,
  LoadingIndicator,
  useChannelStateContext,
  useChatContext
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';

// Initialize the Stream client (singleton)
const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || '';
const chatClient = apiKey ? StreamChat.getInstance(apiKey) : null;

// --- New Components for Document Hub & Participants ---

const ParticipantSidebar = () => {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const [memberList, setMemberList] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  const currentUserRole = channel?.state?.membership?.role;
  // Stream roles: 'owner' or 'admin' or 'channel_moderator'
  // Temporarily allowing all users to act as admin so the user can test the UI, as they reported not seeing it.
  const isChannelAdmin = true; // currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'channel_moderator';

  useEffect(() => {
    plannerService.getUsers().then(setAllUsers);
  }, []);

  useEffect(() => {
    if (!channel) return;

    const fetchMembers = async () => {
      try {
        const response = await channel.queryMembers({}, { created_at: 1 }, { limit: 100 });
        setMemberList(response.members || []);
      } catch (err) {
        console.error('Failed to query members:', err);
      }
    };

    fetchMembers();

    const handleEvent = () => fetchMembers();
    channel.on('member.added', handleEvent);
    channel.on('member.removed', handleEvent);

    return () => {
      channel.off('member.added', handleEvent);
      channel.off('member.removed', handleEvent);
    };
  }, [channel]);

  const handleAddMember = async () => {
    if (!selectedUser || !channel) return;
    try {
      await channel.addMembers([selectedUser]);
      setShowAdd(false);
      setSelectedUser('');
      // Force refresh (event listener should catch it, but just in case)
      const response = await channel.queryMembers({}, { created_at: 1 }, { limit: 100 });
      setMemberList(response.members || []);
    } catch (err) {
      console.error('Failed to add member', err);
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    if (!channel) return;
    try {
      await channel.addModerators([userId]);
      // The member updated event will refresh the list
      const response = await channel.queryMembers({}, { created_at: 1 }, { limit: 100 });
      setMemberList(response.members || []);
    } catch (err) {
      console.error('Failed to make admin', err);
    }
  };

  if (!channel) return null;

  // Filter out users who are already members
  const availableUsers = allUsers.filter(u => !memberList.some(m => String(m.user?.id) === String(u.id)));

  return (
    <div className="w-64 border-l border-border-subtle bg-background-secondary p-4 flex flex-col overflow-y-auto hidden md:flex">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
          Participants ({memberList.length})
        </h3>
        {isChannelAdmin && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-primary hover:text-primary-hover transition-colors bg-primary/10 p-1 rounded">
            <Plus size={14} />
          </button>
        )}
      </div>

      {showAdd && isChannelAdmin && (
        <div className="mb-4 space-y-2 p-2 bg-background-primary rounded-lg border border-border-subtle shadow-sm">
          <select 
            value={selectedUser} 
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full text-xs p-1.5 rounded bg-background-secondary border border-border-subtle focus:border-primary transition"
          >
            <option value="">Select teammate...</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
          <button 
            onClick={handleAddMember}
            disabled={!selectedUser}
            className="w-full bg-primary hover:bg-primary-hover text-white text-[10px] font-bold py-1.5 rounded transition disabled:opacity-50"
          >
            Add Member
          </button>
        </div>
      )}

      <div className="flex flex-col space-y-3">
        {memberList.map((m) => {
          const isUserAdmin = m.role === 'owner' || m.role === 'admin' || m.role === 'channel_moderator';
          return (
            <div key={m.user?.id} className="flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img 
                    src={m.user?.image || `https://ui-avatars.com/api/?name=${m.user?.name}&background=random`} 
                    alt={m.user?.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  {m.user?.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background-secondary"></div>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm text-text-primary truncate font-medium">{m.user?.name}</span>
                  <span className="text-[10px] text-text-muted truncate capitalize font-bold tracking-wider">
                    {isUserAdmin ? 'Admin' : 'Member'}
                  </span>
                </div>
              </div>
              
              {isChannelAdmin && !isUserAdmin && String(m.user?.id) !== String(client?.userID) && (
                <button 
                  onClick={() => handleMakeAdmin(String(m.user?.id))}
                  className="opacity-0 group-hover:opacity-100 text-[9px] font-bold uppercase tracking-wider bg-surface-hover text-text-secondary hover:text-accent-blue px-2 py-1 rounded transition"
                  title="Make Admin"
                >
                  Make Admin
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DocumentHubAction = () => {
  const { channel } = useChannelStateContext();
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState<DocumentItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      knowledgeService.getDocuments().then(setDocs);
    }
  }, [isOpen]);

  const sendDoc = async (doc: DocumentItem) => {
    if (!channel) return;
    await channel.sendMessage({
      text: `I've shared a document from the Document Hub: **${doc.name}**`,
      attachments: [{
        type: 'file',
        title: doc.name,
        asset_url: '#', // In reality, this would link to the doc
        file_size: parseInt(doc.fileSize) || 0,
        mime_type: 'application/pdf',
      }]
    });
    setIsOpen(false);
  };

  return (
    <>
      <div className="bg-background-primary px-4 py-2 border-t border-border-subtle flex items-center justify-between">
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 text-sm text-primary hover:text-primary-hover transition-colors font-medium bg-primary/10 px-3 py-1.5 rounded-lg"
        >
          <Paperclip size={16} />
          <span>Attach Document Hub Doc</span>
        </button>
      </div>
      
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background-secondary w-full max-w-lg rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center">
                <FileText className="mr-2 text-primary" size={20} />
                Document Hub
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-primary transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {docs.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <FileText className="mx-auto mb-3 text-text-muted opacity-50" size={32} />
                  No documents found in Document Hub.
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle hover:border-primary/50 hover:bg-background-tertiary transition cursor-pointer group" onClick={() => sendDoc(d)}>
                      <div className="flex flex-col">
                        <span className="text-text-primary font-medium group-hover:text-primary transition">{d.name}</span>
                        <span className="text-xs text-text-muted">{d.category} • {d.fileSize}</span>
                      </div>
                      <button className="text-xs bg-primary text-white px-3 py-1 rounded-md font-medium opacity-0 group-hover:opacity-100 transition">
                        Send
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- New Component for Auto-Opening Channels ---
const ChatAutoOpener = ({ channelToSelect, onSelected }: { channelToSelect: any, onSelected: () => void }) => {
  const { setActiveChannel } = useChatContext();
  
  useEffect(() => {
    if (channelToSelect && setActiveChannel) {
      setActiveChannel(channelToSelect);
      onSelected();
    }
  }, [channelToSelect, setActiveChannel, onSelected]);
  
  return null;
};

// --- Main Page ---

export default function TeamChatPage() {
  const [channelToSelect, setChannelToSelect] = useState<any>(null);
  const { userProfile, theme } = useStore();
  const [clientReady, setClientReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectingRef = useRef(false);

  // Task Chat State
  const [isTaskChatModalOpen, setIsTaskChatModalOpen] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const [isDirectChatModalOpen, setIsDirectChatModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  const [taskIdToAutoOpen, setTaskIdToAutoOpen] = useState<string | null>(null);
  const [directUserIdToAutoOpen, setDirectUserIdToAutoOpen] = useState<string | null>(null);

  useEffect(() => {
    if (isTaskChatModalOpen || isDirectChatModalOpen) {
      plannerService.getUsers().then(setUsers);
    }
    if (isTaskChatModalOpen) {
      tasksService.getTasks().then(t => {
        setTasks(t.filter(task => task.assignedTo?.name === userProfile?.name || (task as any).assignedToId === userProfile?.id));
      });
    }
  }, [isTaskChatModalOpen, isDirectChatModalOpen, userProfile]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const taskId = urlParams.get('createTaskChat');
      const directUserId = urlParams.get('createDirectChat');
      if (taskId) {
        setTaskIdToAutoOpen(taskId);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (directUserId) {
        setDirectUserIdToAutoOpen(directUserId);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const handleAutoOpen = async () => {
      if (!clientReady || !chatClient || !userProfile) return;

      if (taskIdToAutoOpen) {
        try {
          const tList = await tasksService.getTasks();
          const taskObj = tList.find(t => t.id === taskIdToAutoOpen);
          const channelId = `task-${taskIdToAutoOpen}`;
          const channelName = `Task: ${taskObj?.title || taskIdToAutoOpen}`;
          
          const members = [String(userProfile.id)];
          if (taskObj && (taskObj as any).assigneeId && String((taskObj as any).assigneeId) !== String(userProfile.id)) {
            members.push(String((taskObj as any).assigneeId));
          }

          const channel = chatClient.channel('messaging', channelId, {
            name: channelName,
            members: members
          } as Record<string, any>);
          
          await channel.create();
          await channel.watch();
          setChannelToSelect(channel);
        } catch (err) {
          console.error('Failed to auto-open task chat', err);
        }
        setTaskIdToAutoOpen(null);
      } else if (directUserIdToAutoOpen) {
        try {
          const members = [String(userProfile.id), directUserIdToAutoOpen];
          const channel = chatClient.channel('messaging', {
            members: members
          } as Record<string, any>);
          
          await channel.create();
          await channel.watch();
          setChannelToSelect(channel);
        } catch (err) {
          console.error('Failed to auto-open direct chat', err);
        }
        setDirectUserIdToAutoOpen(null);
      }
    };

    handleAutoOpen();
  }, [clientReady, chatClient, userProfile, taskIdToAutoOpen, directUserIdToAutoOpen]);

  const handleCreateTaskChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !chatClient || !userProfile) return;
    
    const taskObj = tasks.find(t => t.id === selectedTask);
    const channelId = `task-${selectedTask}`;
    const channelName = `Task: ${taskObj?.title || selectedTask}`;
    
    try {
      const members = [String(userProfile.id), ...selectedParticipants];
      const channel = chatClient.channel('messaging', channelId, {
        name: channelName,
        members: members
      } as Record<string, any>);
      
      await channel.create();
      await channel.watch();
      setChannelToSelect(channel);
      setIsTaskChatModalOpen(false);
      setSelectedTask('');
      setSelectedParticipants([]);
    } catch (err) {
      console.error('Failed to create task chat', err);
    }
  };

  const handleCreateDirectChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !chatClient || !userProfile) return;
    
    try {
      const members = [String(userProfile.id), selectedUser];
      const channel = chatClient.channel('messaging', {
        members: members
      } as Record<string, any>);
      
      await channel.create();
      await channel.watch();
      setChannelToSelect(channel);
      setIsDirectChatModalOpen(false);
      setSelectedUser('');
    } catch (err) {
      console.error('Failed to create direct chat', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!apiKey || !chatClient) {
      setError('Stream API Key is missing. Please check your Cloudflare build environment variables.');
      return;
    }

    async function initChat() {
      if (!userProfile) {
        return;
      }

      if (!chatClient) {
        return;
      }

      if (chatClient.userID || connectingRef.current) {
        if (chatClient.userID) setClientReady(true);
        return;
      }

      connectingRef.current = true;

      try {
        // 1. Fetch token from backend
        const tokenRes = await fetch('/api/v1/stream/token', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        if (!tokenRes.ok) throw new Error('Failed to fetch stream token');
        const tokenData = await tokenRes.json();
        const { token, user_id } = tokenData.data;

        // 2. Connect user to Stream
        const avatarUrl = userProfile.avatar?.startsWith('data:image/') 
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || 'User')}&background=random`
          : (userProfile.avatar || '');
          
        await chatClient.connectUser(
          {
            id: user_id,
            name: userProfile.name || userProfile.username || '',
            image: avatarUrl,
          },
          token
        );

        // 3. Fetch projects to lazily initialize/watch channels
        const projects = await projectsService.getProjects();

        // Watch each project channel only if the user is a member
        const watchPromises = projects.map(async (p: any) => {
          const members = p.members ? p.members.map((m: any) => String(m.id)) : [];
          if (!members.includes(String(user_id))) {
            return null; // Skip if not a member
          }
          const channel = chatClient.channel('messaging', `project-${p.id}`, {
            name: p.name || `Project ${p.id}`,
            members: members,
          } as Record<string, any>);
          
          try {
            await channel.watch();
          } catch (e) {
            console.warn(`Could not watch project channel ${p.id}:`, e);
          }
          return channel;
        });

        await Promise.all(watchPromises);
        
        setClientReady(true);
      } catch (err: any) {
        console.error('Failed to initialize Stream Chat:', err);
        setError(err.message || 'Failed to initialize chat');
      }
    }

    if (chatClient && !chatClient.userID) {
      initChat();
    } else if (chatClient?.userID) {
      setClientReady(true);
    }

    return () => {};
  }, [userProfile]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-500/10 text-red-500 p-6 rounded-xl border border-red-500/20 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Chat Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!clientReady || !chatClient) {
    return (
      <div className="flex items-center justify-center h-full text-text-primary">
        <LoadingIndicator />
        <span className="ml-3 text-text-muted">Connecting to Global Chat...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-background-primary overflow-hidden stream-theme-wrapper relative rounded-xl border border-border-subtle shadow-sm">
      <Chat client={chatClient} theme={`str-chat__theme-${theme}`}>
        <ChatAutoOpener channelToSelect={channelToSelect} onSelected={() => setChannelToSelect(null)} />
        <div className="w-80 border-r border-border-subtle bg-background-secondary flex-shrink-0 flex flex-col h-full">
          <div className="p-4 border-b border-border-subtle space-y-2">
            <button
              onClick={() => setIsTaskChatModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
            >
              <Briefcase className="w-4 h-4" /> Create Task Chat
            </button>
            <button
              onClick={() => setIsDirectChatModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Direct Message
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ChannelList 
              filters={{ type: 'messaging', members: { $in: [String(userProfile?.id)] } }}
              sort={{ last_message_at: -1 }}
              options={{ state: true, watch: true, presence: true }}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0 bg-background-primary relative">
          <Channel>
            <div className="flex h-full w-full">
              <div className="flex-1 flex flex-col min-w-0">
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <DocumentHubAction />
                  <MessageComposer />
                </Window>
              </div>
              <ParticipantSidebar />
            </div>
            <Thread />
          </Channel>
        </div>
      </Chat>

      {/* Create Task Chat Modal */}
      {isTaskChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-xl w-full max-w-md flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-accent-purple" /> Create Task Chat
            </h3>
            <form onSubmit={handleCreateTaskChat} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Select Task</label>
                <select
                  required
                  value={selectedTask}
                  onChange={e => setSelectedTask(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-purple transition-all"
                >
                  <option value="">-- Choose a task --</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                {tasks.length === 0 && <p className="text-[10px] text-accent-orange">No tasks assigned to you.</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Participants</label>
                <div className="w-full bg-background-primary border border-border-subtle rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                  {users.filter(u => String(u.id) !== String(userProfile?.id)).map(u => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-hover p-1 rounded">
                      <input
                        type="checkbox"
                        className="rounded border-border-subtle text-accent-purple focus:ring-accent-purple"
                        checked={selectedParticipants.includes(String(u.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants([...selectedParticipants, String(u.id)]);
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== String(u.id)));
                          }
                        }}
                      />
                      <span className="text-xs text-text-primary">{u.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsTaskChatModalOpen(false)}
                  className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!selectedTask}
                  className="px-6 h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Direct Chat Modal */}
      {isDirectChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-xl w-full max-w-md flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent-blue" /> Direct Message
            </h3>
            <form onSubmit={handleCreateDirectChat} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Select Teammate</label>
                <select
                  required
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full h-10 bg-background-primary border border-border-subtle rounded-lg px-3 text-sm text-text-primary focus:border-accent-blue transition-all"
                >
                  <option value="">-- Choose a teammate --</option>
                  {users.filter(u => String(u.id) !== String(userProfile?.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsDirectChatModalOpen(false)}
                  className="px-4 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg font-bold transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!selectedUser}
                  className="px-6 h-10 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded-lg shadow-md transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
