'use client';

import { useState, useEffect, useRef } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getChatMessages, sendChatMessage, getUsers } from '@/lib/api';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { 
  Send, Search, Users, Hash, MessageSquare, 
  ChevronRight, UserCircle2, Circle
} from 'lucide-react';

interface ChatViewProps {
  currentUser: User;
}

export default function ChatView({ currentUser }: ChatViewProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Channels and Users
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<{ type: 'venture' | 'dm', id: string | number, name: string, color: string }>({
    type: 'venture', id: 'global', name: 'Global HQ', color: '#8b5cf6'
  });

  // Messages State
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket and fetch users
  useEffect(() => {
    // We expect the backend to be running on the same host but port 5000 based on standard setup,
    // actually our nextjs is usually 3000 and backend is 5000. Let's use the env or default to 5000.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    const newSocket = io(backendUrl, {
      withCredentials: true,
    });
    setSocket(newSocket);

    fetchUsers();

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch users for DM list
  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      if (res.success) {
        setAllUsers(res.data.filter((u: any) => u.id !== currentUser.id)); // exclude self
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Join channel and fetch history
  useEffect(() => {
    if (!socket) return;

    let channelStr = '';
    if (activeChannel.type === 'venture') {
      channelStr = activeChannel.id === 'global' ? 'global' : `venture_${activeChannel.id}`;
    } else {
      // DM channel string logic is tricky if we want a shared room. 
      // We will just let the backend broadcast it to `dm_RECEIVER` and we listen to our own `dm_ME`.
      channelStr = `dm_${currentUser.id}`;
    }

    socket.emit('join_channel', channelStr);

    fetchMessages();

    const messageHandler = (msg: any) => {
      setMessages(prev => {
        // Prevent duplicate keys
        if (prev.some(m => m.id === msg.id)) return prev;

        // Check if message belongs to current view
        if (activeChannel.type === 'venture') {
          if (msg.ventureId === activeChannel.id || (msg.ventureId === null && activeChannel.id === 'global')) {
            return [...prev, msg];
          }
        } else {
          // DM
          if ((msg.sender_id === activeChannel.id && msg.receiver_id === currentUser.id) || 
              (msg.sender_id === currentUser.id && msg.receiver_id === activeChannel.id)) {
            return [...prev, msg];
          }
        }
        return prev;
      });
    };

    socket.on('receive_message', messageHandler);

    return () => {
      socket.off('receive_message', messageHandler);
    };
  }, [activeChannel, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = activeChannel.type === 'venture' 
        ? { ventureId: activeChannel.id } 
        : { receiverId: activeChannel.id as number };
        
      const res = await getChatMessages(params);
      if (res.success) {
        setMessages(res.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const content = inputMsg.trim();
    setInputMsg('');

    try {
      const payload = {
        content,
        ventureId: activeChannel.type === 'venture' ? activeChannel.id : undefined,
        receiverId: activeChannel.type === 'dm' ? activeChannel.id as number : undefined
      };

      const res = await sendChatMessage(payload);
      if (res.success) {
        // Only append if it's a DM sent by me, or venture. Wait, the DB response is perfectly formatted.
        // If we broadcast, we might get double. To prevent double, we could just rely on the socket.
        // But since we built the REST, let's append the REST result if socket doesn't echo to sender.
        // Actually, our socket broadcasts to the channel. Since we joined the channel, we will get it.
        // To be safe, we emit to socket so OTHERS get it.
        socket?.emit('send_message', {
          ...res.data, // It has sender_name, created_at, etc from DB
          ventureId: payload.ventureId,
          receiverId: payload.receiverId
        });
        
        // Add locally to avoid delay
        setMessages(prev => [...prev.filter(m => m.id !== res.data.id), res.data]);
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 24 }}>
      {/* Sidebar */}
      <div className="glass" style={{ width: 300, borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Communications</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Channels */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 8 }}>
              Channels
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => setActiveChannel({ type: 'venture', id: 'global', name: 'Global HQ', color: '#8b5cf6' })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                  background: activeChannel.id === 'global' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left',
                  color: activeChannel.id === 'global' ? '#fff' : 'var(--color-text-secondary)'
                }}
              >
                <Hash size={16} color="#8b5cf6" />
                <span style={{ fontSize: 14, fontWeight: activeChannel.id === 'global' ? 600 : 500 }}>Global HQ</span>
              </button>
              
              {VENTURES.map(v => {
                // Only show if user has access
                if (currentUser.accessLevel > 2 && currentUser.venture?.id !== v.id && v.id !== undefined) return null;
                
                // Hack: We don't have venture IDs perfectly mapped in constants, assuming 1 to 4 based on index
                const vId = VENTURES.indexOf(v) + 1; 
                const isActive = activeChannel.id === vId;
                
                return (
                  <button
                    key={v.slug}
                    onClick={() => setActiveChannel({ type: 'venture', id: vId, name: v.name, color: v.color })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                      background: isActive ? `${v.color}20` : 'transparent',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left',
                      color: isActive ? '#fff' : 'var(--color-text-secondary)'
                    }}
                  >
                    <Hash size={16} color={v.color} />
                    <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>{v.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 8 }}>
              Direct Messages
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {allUsers.map(u => {
                const isActive = activeChannel.id === u.id && activeChannel.type === 'dm';
                return (
                  <button
                    key={u.id}
                    onClick={() => setActiveChannel({ type: 'dm', id: u.id, name: u.full_name, color: '#06b6d4' })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10,
                      background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left',
                      color: isActive ? '#fff' : 'var(--color-text-secondary)'
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                        {getInitials(u.full_name)}
                      </div>
                      <Circle size={8} fill={u.is_active ? '#10b981' : '#64748b'} color={u.is_active ? '#10b981' : '#64748b'} style={{ position: 'absolute', bottom: -2, right: -2, border: '2px solid var(--color-bg-primary)', borderRadius: '50%' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="glass" style={{ flex: 1, borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(0,0,0,0.2)' }}>
          {activeChannel.type === 'venture' ? (
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${activeChannel.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hash size={20} color={activeChannel.color} />
            </div>
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${activeChannel.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: activeChannel.color }}>
              {getInitials(activeChannel.name)}
            </div>
          )}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {activeChannel.type === 'venture' ? `# ${activeChannel.name}` : activeChannel.name}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {activeChannel.type === 'venture' ? 'Company-wide announcements and team chat.' : 'Direct, end-to-end communication.'}
            </p>
          </div>
        </div>

        {/* Messages List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ margin: 'auto', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-text-muted)' }}>
              <div className="animate-spin-slow">✦</div> Loading history...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

              return (
                <div key={msg.id || Math.random()} style={{ display: 'flex', gap: 16, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                  {showAvatar ? (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isMe ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isMe ? '#a78bfa' : '#fff', flexShrink: 0 }}>
                      {getInitials(msg.sender_name || currentUser.name)}
                    </div>
                  ) : (
                    <div style={{ width: 32, flexShrink: 0 }} /> // Spacer
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                    {showAvatar && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: isMe ? '#a78bfa' : 'var(--color-text-primary)' }}>{isMe ? 'You' : msg.sender_name}</span>
                        <span style={{ opacity: 0.5 }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <div style={{ 
                      padding: '12px 16px', 
                      background: isMe ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(109, 40, 217, 0.8))' : 'rgba(255,255,255,0.05)',
                      border: isMe ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      color: '#fff', fontSize: 14, lineHeight: 1.5,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: 20, borderTop: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
            <input 
              type="text"
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder={`Message ${activeChannel.type === 'venture' ? '#' + activeChannel.name : activeChannel.name}...`}
              style={{
                flex: 1, padding: '14px 20px', borderRadius: 16,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = activeChannel.color}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
            <button 
              type="submit"
              disabled={!inputMsg.trim()}
              style={{
                width: 50, height: 50, borderRadius: 16,
                background: inputMsg.trim() ? activeChannel.color : 'rgba(255,255,255,0.05)',
                color: inputMsg.trim() ? '#fff' : 'var(--color-text-muted)',
                border: 'none', cursor: inputMsg.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', boxShadow: inputMsg.trim() ? `0 4px 12px ${activeChannel.color}40` : 'none'
              }}
            >
              <Send size={20} style={{ marginLeft: -2, marginTop: 2 }} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
