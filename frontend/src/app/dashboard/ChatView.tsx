'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, VENTURES } from '@/lib/constants';
import { getChatMessages, sendChatMessage, getUsers } from '@/lib/api';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { Send, Hash, MessageSquare, AtSign, ChevronDown, Loader2, Globe, Sparkles } from 'lucide-react';

interface ChatViewProps { currentUser: User; }
interface Channel { type: 'venture' | 'dm'; id: string | number; name: string; color: string; }
interface Msg { id: number; sender_id: number; sender_name: string; content: string; created_at: string; ventureId?: any; receiver_id?: number; }

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#06b6d4,#0284c7)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#f43f5e,#e11d48)',
  'linear-gradient(135deg,#a78bfa,#7c3aed)',
];

function getGradient(name: string) {
  const code = name ? name.charCodeAt(0) % AVATAR_GRADIENTS.length : 0;
  return AVATAR_GRADIENTS[code];
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div className="rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-sm"
      style={{ width: size, height: size, background: getGradient(name || '?'), fontSize: size * 0.38 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dt: string) {
  const d = new Date(dt);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export default function ChatView({ currentUser }: ChatViewProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel>({ type: 'venture', id: 'global', name: 'Global HQ', color: '#8b5cf6' });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<any>(null);

  // Init socket & users
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const s = io(url, { withCredentials: true });
    setSocket(s);
    getUsers().then(r => { if (r.success) setAllUsers(r.data.filter((u: any) => u.id !== currentUser.id)); });
    return () => { s.close(); };
  }, []);

  // Join channel + listen
  useEffect(() => {
    if (!socket) return;
    const ch = activeChannel.type === 'venture'
      ? (activeChannel.id === 'global' ? 'global' : `venture_${activeChannel.id}`)
      : `dm_${currentUser.id}`;
    socket.emit('join_channel', ch);
    fetchMessages();

    const handler = (msg: Msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        if (activeChannel.type === 'venture') {
          if (msg.ventureId === activeChannel.id || (msg.ventureId === null && activeChannel.id === 'global')) return [...prev, msg];
        } else {
          if ((msg.sender_id === activeChannel.id && msg.receiver_id === currentUser.id) ||
            (msg.sender_id === currentUser.id && msg.receiver_id === activeChannel.id)) return [...prev, msg];
        }
        return prev;
      });
      setIsTyping(false);
    };

    const typingHandler = () => {
      setIsTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 2500);
    };

    socket.on('receive_message', handler);
    socket.on('user_typing', typingHandler);
    return () => { socket.off('receive_message', handler); socket.off('user_typing', typingHandler); };
  }, [activeChannel, socket]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    setMessages([]);
    try {
      const params = activeChannel.type === 'venture' ? { ventureId: activeChannel.id } : { receiverId: activeChannel.id as number };
      const res = await getChatMessages(params);
      if (res.success) setMessages(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const emitTyping = useCallback(() => {
    socket?.emit('typing', activeChannel.id);
  }, [socket, activeChannel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || sending) return;
    const content = inputMsg.trim();
    setInputMsg('');
    setSending(true);
    try {
      const payload = {
        content,
        ventureId: activeChannel.type === 'venture' ? activeChannel.id : undefined,
        receiverId: activeChannel.type === 'dm' ? activeChannel.id as number : undefined,
      };
      const res = await sendChatMessage(payload);
      if (res.success) {
        socket?.emit('send_message', { ...res.data, ventureId: payload.ventureId, receiverId: payload.receiverId });
        setMessages(prev => [...prev.filter(m => m.id !== res.data.id), res.data]);
      }
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const switchChannel = (ch: Channel) => { setActiveChannel(ch); setDmSearch(''); };

  const filteredUsers = allUsers.filter(u => u.full_name?.toLowerCase().includes(dmSearch.toLowerCase()));

  const VENTURE_CHANNELS = VENTURES.map((v, i) => ({ v, vId: i + 1 })).filter(({ vId }) => currentUser.accessLevel <= 2 || currentUser.venture?.id === vId);

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl">

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]">

        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="font-black text-[15px] text-[var(--color-text-primary)] flex items-center gap-2">
              <MessageSquare size={16} className="text-[var(--color-purple-glow)]" /> Communications
            </h2>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-0.5 uppercase tracking-widest">InternalX Chat</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">

          {/* Channels */}
          <div>
            <div className="px-2 mb-1.5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <Hash size={10} /> Channels
            </div>
            {/* Global */}
            <SidebarBtn
              active={activeChannel.id === 'global'}
              color="#8b5cf6"
              onClick={() => switchChannel({ type: 'venture', id: 'global', name: 'Global HQ', color: '#8b5cf6' })}
              icon={<Globe size={14} />}
              label="Global HQ"
            />
            {VENTURE_CHANNELS.map(({ v, vId }) => (
              <SidebarBtn key={v.slug} active={activeChannel.id === vId && activeChannel.type === 'venture'}
                color={v.color}
                onClick={() => switchChannel({ type: 'venture', id: vId, name: v.name, color: v.color })}
                icon={<Hash size={14} />}
                label={v.name}
              />
            ))}
          </div>

          {/* DMs */}
          <div>
            <div className="px-2 mb-1.5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <AtSign size={10} /> Direct Messages
            </div>
            {/* DM search */}
            <div className="mx-1 mb-2">
              <input value={dmSearch} onChange={e => setDmSearch(e.target.value)} placeholder="Search people..." className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]" />
            </div>
            {filteredUsers.map(u => {
              const isActive = activeChannel.id === u.id && activeChannel.type === 'dm';
              return (
                <button key={u.id} onClick={() => switchChannel({ type: 'dm', id: u.id, name: u.full_name, color: '#06b6d4' })}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 border ${isActive ? 'bg-[var(--color-purple-glow)]/15 border-[var(--color-purple-glow)]/30' : 'border-transparent hover:bg-[var(--color-bg-primary)]'}`}
                >
                  <div className="relative shrink-0">
                    <Avatar name={u.full_name} size={26} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-bg-secondary)] ${u.is_active ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />
                  </div>
                  <span className={`text-[13px] font-semibold truncate flex-1 ${isActive ? 'text-[var(--color-purple-glow)]' : 'text-[var(--color-text-secondary)]'}`}>{u.full_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Self info */}
        <div className="px-3 py-3 border-t border-[var(--color-border)] flex items-center gap-2.5 bg-[var(--color-bg-primary)]/50">
          <div className="relative shrink-0">
            <Avatar name={currentUser.fullName || currentUser.name} size={28} />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-bg-secondary)] bg-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-[var(--color-text-primary)] truncate">{currentUser.fullName || currentUser.name}</div>
            <div className="text-[10px] font-medium text-emerald-500">● Online</div>
          </div>
        </div>
      </div>

      {/* ── Main Chat ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[var(--color-bg-card)] min-w-0">

        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-[var(--color-border)] flex items-center gap-3 bg-[var(--color-bg-secondary)]/60 backdrop-blur-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `${activeChannel.color}20` }}>
            {activeChannel.type === 'venture'
              ? <Hash size={16} style={{ color: activeChannel.color }} />
              : <Avatar name={activeChannel.name} size={28} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-[14px] text-[var(--color-text-primary)]">
              {activeChannel.type === 'venture' ? `# ${activeChannel.name}` : activeChannel.name}
            </h3>
            <p className="text-[11px] font-medium text-[var(--color-text-muted)]">
              {activeChannel.type === 'venture' ? 'Company-wide team channel' : 'Direct message'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)]">
            <Sparkles size={11} className="text-[var(--color-purple-glow)]" /> {messages.length} messages
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1 scroll-smooth">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-3" />
              <p className="font-medium text-sm">Loading history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${activeChannel.color}20` }}>
                <MessageSquare size={32} style={{ color: activeChannel.color }} />
              </div>
              <h3 className="font-bold text-base text-[var(--color-text-primary)] mb-1">Start the conversation</h3>
              <p className="text-[var(--color-text-muted)] text-sm font-medium">No messages yet in {activeChannel.type === 'venture' ? `#${activeChannel.name}` : activeChannel.name}</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              const prevMsg = messages[idx - 1];
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id || !isSameDay(msg.created_at, prevMsg.created_at);
              const showDate = !prevMsg || !isSameDay(msg.created_at, prevMsg.created_at);
              const grouped = !!prevMsg && prevMsg.sender_id === msg.sender_id && isSameDay(msg.created_at, prevMsg.created_at);

              return (
                <div key={msg.id ?? `${msg.sender_id}-${idx}`}>
                  {/* Date Separator */}
                  {showDate && (
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-[var(--color-border)]" />
                      <span className="text-[11px] font-bold text-[var(--color-text-muted)] px-3 py-1 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">{formatDateLabel(msg.created_at)}</span>
                      <div className="flex-1 h-px bg-[var(--color-border)]" />
                    </div>
                  )}

                  {/* Message Row */}
                  <div className={`flex gap-3 group items-end ${isMe ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-4'}`}>
                    {/* Avatar */}
                    <div className="shrink-0" style={{ width: 32 }}>
                      {showAvatar && <Avatar name={msg.sender_name} size={32} />}
                    </div>

                    <div className={`flex flex-col gap-1 max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {showAvatar && (
                        <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[12px] font-bold text-[var(--color-text-primary)]">{isMe ? 'You' : msg.sender_name}</span>
                          <span className="text-[10px] font-medium text-[var(--color-text-muted)]">{formatTime(msg.created_at)}</span>
                        </div>
                      )}

                      <div className="relative group/msg">
                        <div
                          className="px-4 py-2.5 text-[14px] leading-relaxed font-medium shadow-sm"
                          style={{
                            background: isMe ? `linear-gradient(135deg, ${activeChannel.color}cc, ${activeChannel.color}99)` : 'var(--color-bg-secondary)',
                            color: isMe ? '#fff' : 'var(--color-text-primary)',
                            border: isMe ? `1px solid ${activeChannel.color}50` : '1px solid var(--color-border)',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          }}
                        >
                          {msg.content}
                        </div>

                        {/* Time tooltip on hover */}
                        {!showAvatar && (
                          <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity text-[10px] font-medium text-[var(--color-text-muted)] whitespace-nowrap ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                            {formatTime(msg.created_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-end gap-3 mt-4">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple-glow)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
              <div className="px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl text-[12px] font-medium text-[var(--color-text-muted)]">
                Someone is typing...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMsg}
                onChange={e => { setInputMsg(e.target.value); emitTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                placeholder={`Message ${activeChannel.type === 'venture' ? '#' + activeChannel.name : activeChannel.name}...`}
                className="w-full pl-4 pr-4 py-3 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[14px] font-medium text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-purple-glow)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>

            {/* Send button */}
            <button type="submit" disabled={!inputMsg.trim() || sending}
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all font-bold shadow-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: inputMsg.trim() ? `linear-gradient(135deg, ${activeChannel.color}, ${activeChannel.color}cc)` : 'var(--color-bg-primary)',
                boxShadow: inputMsg.trim() ? `0 4px 16px ${activeChannel.color}40` : 'none',
                color: inputMsg.trim() ? '#fff' : 'var(--color-text-muted)',
                border: `1px solid ${inputMsg.trim() ? activeChannel.color + '40' : 'var(--color-border)'}`,
              }}
            >
              {sending
                ? <Loader2 size={17} className="animate-spin" />
                : <Send size={17} className={inputMsg.trim() ? 'translate-x-px -translate-y-px' : ''} />
              }
            </button>
          </form>
          <p className="text-[10px] font-medium text-[var(--color-text-muted)] mt-2 ml-1">Press Enter to send · Ctrl+Enter for newline</p>
        </div>
      </div>
    </div>
  );
}

function SidebarBtn({ active, color, onClick, icon, label }: { active: boolean; color: string; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 border ${active ? 'border shadow-sm font-bold' : 'border-transparent hover:bg-[var(--color-bg-primary)] font-medium'}`}
      style={active ? { background: `${color}15`, borderColor: `${color}35`, color } : { color: 'var(--color-text-secondary)' }}
    >
      <span style={active ? { color } : { color: 'var(--color-text-muted)' }}>{icon}</span>
      <span className="text-[13px] truncate">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
    </button>
  );
}
