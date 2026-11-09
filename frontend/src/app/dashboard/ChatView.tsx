'use client';

import { useState, useEffect, useRef, useCallback, useId, useMemo } from 'react';
import type { User } from '@/lib/constants';
import { getChatMessages, sendChatMessage, getUsers, getChatChannels } from '@/lib/api';
import { useApi, unwrapList } from '@/lib/useApi';
import type { ChatMessage, TeamMember } from '@/lib/types';
import toast from 'react-hot-toast';
import { useSocket } from '@/components/SocketProvider';
import { Send, Hash, MessageSquare, AtSign, Globe, Sparkles } from 'lucide-react';
import { Button, EmptyState, Skeleton, SkeletonText, cn, tint } from '@/components/ui';

interface ChatViewProps { currentUser: User; }
interface Channel { type: 'venture' | 'dm'; id: string | number; name: string; color: string; }
type Msg = ChatMessage;

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,var(--color-purple-glow),var(--color-purple-dark))',
  'linear-gradient(135deg,var(--color-cyan),color-mix(in srgb,var(--color-cyan) 70%,black))',
  'linear-gradient(135deg,var(--color-emerald),color-mix(in srgb,var(--color-emerald) 70%,black))',
  'linear-gradient(135deg,var(--color-amber),color-mix(in srgb,var(--color-amber) 70%,black))',
  'linear-gradient(135deg,var(--color-rose),color-mix(in srgb,var(--color-rose) 70%,black))',
  'linear-gradient(135deg,var(--color-purple-light),var(--color-purple-glow))',
];

function getGradient(name: string) {
  const code = name ? name.charCodeAt(0) % AVATAR_GRADIENTS.length : 0;
  return AVATAR_GRADIENTS[code];
}

/**
 * Initial-tile avatar.
 *
 * The person's name is always rendered as text next to this tile, so by
 * default the tile is decorative and hidden from assistive tech — otherwise
 * every name would be announced twice. Pass `decorative={false}` where the
 * tile stands alone and must carry the name itself.
 */
function Avatar({ name, size = 32, decorative = true }: { name: string; size?: number; decorative?: boolean }) {
  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : name}
      className="rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-sm"
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
  const { socket, latestMessages } = useSocket();
  // The server decides which channels this account may open (and joins its socket to them).
  const channelsState = useApi('chat-channels', async () => {
    const r = await getChatChannels();
    return r.success ? r.data : { global: false, ventures: [] };
  });
  const channels = channelsState.data ?? { global: false, ventures: [] };
  const usersState = useApi('chat-users', (s) => unwrapList(getUsers(s)));
  const allUsers = useMemo<TeamMember[]>(
    () => (usersState.data ?? []).filter((u) => u.id !== currentUser.id && u.access_level < 9),
    [usersState.data, currentUser.id],
  );
  const [activeChannel, setActiveChannel] = useState<Channel>({ type: 'venture', id: 'global', name: 'Global HQ', color: 'var(--color-purple-glow)' });
  const channelKey = `${activeChannel.type}-${activeChannel.id}`;
  const history = useApi(channelKey, async () => {
    const params = activeChannel.type === 'venture' ? { ventureId: activeChannel.id } : { receiverId: activeChannel.id as number };
    const res = await getChatMessages(params);
    return res.success ? res.data : [];
  });
  const { setData: setHistory } = history;
  // Switching channel shows the loading state instead of the previous channel's log.
  const messages: Msg[] = history.fetching ? [] : (history.data ?? []);
  const loading = history.fetching;
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  // Coarse clock for the "recent activity" highlight; ticks in a timer, never during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  // Gates the message log's live region. It stays off while a conversation's
  // history is being painted, so switching channels does not make a screen
  // reader read the entire backlog; it flips on afterwards so genuinely new
  // messages are announced.
  const [announced, setAnnounced] = useState('');
  const announceNew = announced === channelKey;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const inputId = useId();
  const inputHintId = `${inputId}-hint`;
  const searchId = `${inputId}-search`;

  // Live messages for the open conversation.
  useEffect(() => {
    if (!socket) return;

    const handler = (msg: Msg) => {
      const vId = msg.ventureId ?? msg.venture_id;
      const rId = msg.receiver_id;
      const belongs = activeChannel.type === 'venture'
        ? (vId === activeChannel.id || ((vId === null || vId === undefined || vId === 'global') && activeChannel.id === 'global'))
        : (msg.sender_id === activeChannel.id && rId === currentUser.id) || (msg.sender_id === currentUser.id && rId === activeChannel.id);
      if (belongs) setHistory((prev) => (prev ?? []).some((m) => m.id === msg.id) ? prev : [...(prev ?? []), msg]);
      setIsTyping(false);
    };

    const typingHandler = (p: { userId: number; ventureId?: number | string; receiverId?: number }) => {
      const here = activeChannel.type === 'venture'
        ? p.ventureId !== undefined && String(p.ventureId) === String(activeChannel.id)
        : p.receiverId === currentUser.id && p.userId === activeChannel.id;
      if (!here) return;
      setIsTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 2500);
    };

    socket.on('receive_message', handler);
    socket.on('user_typing', typingHandler);
    return () => { socket.off('receive_message', handler); socket.off('user_typing', typingHandler); };
  }, [activeChannel, socket, currentUser.id, setHistory]);

  // Silence the log while the newly selected conversation loads and paints.
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(channelKey), 1200);
    return () => clearTimeout(t);
  }, [channelKey]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const emitTyping = useCallback(() => {
    socket?.emit('typing', activeChannel.type === 'venture' ? { ventureId: activeChannel.id } : { receiverId: activeChannel.id });
  }, [socket, activeChannel]);

  const handleSend = async (e: React.SyntheticEvent) => {
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
        // The server persisted it once and broadcasts it to the room itself.
        setHistory((prev) => [...(prev ?? []).filter((m) => m.id !== res.data.id), res.data]);
      }
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const switchChannel = (ch: Channel) => { setActiveChannel(ch); setDmSearch(''); };

  const filteredUsers = allUsers.filter((u) => u.full_name?.toLowerCase().includes(dmSearch.toLowerCase()));

  // Sort channels by latest message
  const getChannelTimestamp = (chKey: string) => {
    const lm = latestMessages[chKey];
    return lm ? new Date(lm.timestamp).getTime() : 0;
  };

  const VENTURE_CHANNELS = channels.ventures.map(v => ({ v, vId: v.id }))
    .sort((a, b) => getChannelTimestamp(`venture_${b.vId}`) - getChannelTimestamp(`venture_${a.vId}`));

  const sortedUsers = [...filteredUsers].sort((a, b) => getChannelTimestamp(`dm_${b.id}`) - getChannelTimestamp(`dm_${a.id}`));

  const globalActive = activeChannel.id === 'global';
  const globalUnread = latestMessages['global'] && getChannelTimestamp('global') > now - 60000; // rough highlight for very recent

  const channelLabel = activeChannel
    ? (activeChannel.type === 'venture' ? `#${activeChannel.name}` : activeChannel.name)
    : '';

  // Clients have no internal chat; the server refuses them too.
  if (currentUser.accessLevel >= 9) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <EmptyState icon={<MessageSquare size={22} />} title="Chat is for the internal team" description="Your project updates and documents are in the client portal." />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl">

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]">

        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="font-black text-[15px] text-[var(--color-text-primary)] flex items-center gap-2">
              <MessageSquare size={16} aria-hidden="true" className="text-[var(--color-purple-glow)]" /> Communications
            </h2>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-0.5 uppercase tracking-widest">InternalX Chat</p>
          </div>
        </div>

        <nav aria-label="Conversations" className="flex-1 overflow-y-auto py-3 px-2 space-y-5">

          {/* Channels */}
          <div>
            <h3 className="px-2 mb-1.5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <Hash size={10} aria-hidden="true" /> Channels
            </h3>
            {/* Global */}
            {channels.global && <SidebarBtn
              active={globalActive}
              color="var(--color-purple-glow)"
              onClick={() => switchChannel({ type: 'venture', id: 'global', name: 'Global HQ', color: 'var(--color-purple-glow)' })}
              icon={<Globe size={14} aria-hidden="true" />}
              label="Global HQ"
              isRecent={!globalActive && !!globalUnread}
            />}
            {VENTURE_CHANNELS.map(({ v, vId }) => {
              const chKey = `venture_${vId}`;
              const isRecent = latestMessages[chKey] && getChannelTimestamp(chKey) > now - 60000;
              const isActive = activeChannel.id === vId && activeChannel.type === 'venture';
              return (
                <SidebarBtn key={v.id} active={isActive}
                  color={v.color}
                  onClick={() => switchChannel({ type: 'venture', id: vId, name: v.name, color: v.color })}
                  icon={<Hash size={14} aria-hidden="true" />}
                  label={v.name}
                  isRecent={!isActive && !!isRecent}
                />
              );
            })}
          </div>

          {/* DMs */}
          <div>
            <h3 className="px-2 mb-1.5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <AtSign size={10} aria-hidden="true" /> Direct Messages
            </h3>
            {/* DM search */}
            <div className="mx-1 mb-2">
              <label htmlFor={searchId} className="sr-only">Search people to message</label>
              <input
                id={searchId}
                type="search"
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full px-2.5 py-1.5 text-[12px] rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-purple-glow)]"
              />
            </div>
            {sortedUsers.length === 0 ? (
              <p role="status" className="px-2.5 py-3 text-[12px] font-medium text-[var(--color-text-muted)]">
                {dmSearch ? `No people match “${dmSearch}”.` : 'No teammates available yet.'}
              </p>
            ) : sortedUsers.map(u => {
              const isActive = activeChannel.id === u.id && activeChannel.type === 'dm';
              const chKey = `dm_${u.id}`;
              const isRecent = latestMessages[chKey] && getChannelTimestamp(chKey) > now - 60000;
              return (
                <button key={u.id} type="button"
                  onClick={() => switchChannel({ type: 'dm', id: u.id, name: u.full_name, color: 'var(--color-cyan)' })}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 border ${isActive ? 'bg-[var(--color-purple-glow)]/15 border-[var(--color-purple-glow)]/30' : 'border-transparent hover:bg-[var(--color-bg-primary)]'}`}
                >
                  <span className="relative shrink-0">
                    <Avatar name={u.full_name} size={26} />
                    <span aria-hidden="true" className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-bg-secondary)] ${u.is_active ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />
                  </span>
                  <span className="flex-1 min-w-0 flex items-center justify-between">
                    <span className={`text-[13px] font-semibold truncate ${isActive ? 'text-[var(--color-purple-glow)]' : (isRecent ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)]')}`}>
                      {u.full_name}
                    </span>
                    <span className="sr-only">{u.is_active ? ', online' : ', offline'}</span>
                    {isRecent && !isActive && (
                      <>
                        <span className="sr-only">, new messages</span>
                        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[var(--color-purple-glow)] shrink-0 ml-2" />
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Self info */}
        <div className="px-3 py-3 border-t border-[var(--color-border)] flex items-center gap-2.5 bg-[var(--color-bg-primary)]/50">
          <div className="relative shrink-0">
            <Avatar name={currentUser.fullName} size={28} />
            <div aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-bg-secondary)] bg-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-[var(--color-text-primary)] truncate">{currentUser.fullName}</div>
            <div className="text-[10px] font-medium text-emerald-500">
              <span aria-hidden="true">● </span>Online
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Chat ─────────────────────────────────────────── */}
      {!activeChannel ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-[var(--color-bg-card)] min-w-0">
          <EmptyState
            icon={<MessageSquare size={22} />}
            title="No conversation selected"
            description="Choose a channel or a teammate from the sidebar to start chatting."
          />
        </div>
      ) : (
      <div className="flex-1 flex flex-col bg-[var(--color-bg-card)] min-w-0">

        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-[var(--color-border)] flex items-center gap-3 bg-[var(--color-bg-secondary)]/60 backdrop-blur-sm">
          <div aria-hidden="true" className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: tint(activeChannel.color, 12) }}>
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
          <p className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)]">
            <Sparkles size={11} aria-hidden="true" className="text-[var(--color-purple-glow)]" /> {messages.length} messages
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scroll-smooth">
          {loading ? (
            <div role="status" aria-busy="true" className="flex flex-col gap-6 pt-2">
              <span className="sr-only">Loading conversation history…</span>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={cn('flex gap-3', i % 2 === 1 && 'flex-row-reverse')}>
                  <Skeleton circle width={32} height={32} className="shrink-0" />
                  <div className="w-[55%] max-w-[420px]">
                    <Skeleton height={10} width="30%" />
                    <SkeletonText lines={2} className="mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={<MessageSquare size={22} />}
                title="No messages yet"
                description={`Be the first to say something in ${channelLabel}.`}
              />
            </div>
          ) : (
            /* aria-live is off until the backlog has painted — see `announceNew`. */
            <div
              role="log"
              aria-label={`Messages in ${channelLabel}`}
              aria-live={announceNew ? 'polite' : 'off'}
              aria-relevant="additions"
              aria-atomic="false"
              className="space-y-1"
            >
              {messages.map((msg, idx) => {
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
                        <div aria-hidden="true" className="flex-1 h-px bg-[var(--color-border)]" />
                        <span className="text-[11px] font-bold text-[var(--color-text-muted)] px-3 py-1 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">{formatDateLabel(msg.created_at)}</span>
                        <div aria-hidden="true" className="flex-1 h-px bg-[var(--color-border)]" />
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
                          {/* Grouped messages hide the author line, so repeat it
                              for assistive tech — otherwise a run of replies is
                              announced with no idea who is speaking. */}
                          {!showAvatar && (
                            <span className="sr-only">{isMe ? 'You' : msg.sender_name}, {formatTime(msg.created_at)}: </span>
                          )}
                          <div
                            className="px-4 py-2.5 text-[14px] leading-relaxed font-medium shadow-sm"
                            style={{
                              background: isMe ? `linear-gradient(135deg, ${tint(activeChannel.color, 80)}, ${tint(activeChannel.color, 60)})` : 'var(--color-bg-secondary)',
                              color: isMe ? 'white' : 'var(--color-text-primary)',
                              border: isMe ? `1px solid ${tint(activeChannel.color, 31)}` : '1px solid var(--color-border)',
                              borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            }}
                          >
                            {msg.content}
                          </div>

                          {/* Time tooltip on hover */}
                          {!showAvatar && (
                            <div aria-hidden="true" className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity text-[10px] font-medium text-[var(--color-text-muted)] whitespace-nowrap ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div role="status" className="flex items-end gap-3 mt-4">
              <div aria-hidden="true" className="w-8 h-8 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center">
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
              <label htmlFor={inputId} className="sr-only">Message {channelLabel}</label>
              <input
                id={inputId}
                ref={inputRef}
                type="text"
                value={inputMsg}
                onChange={e => { setInputMsg(e.target.value); emitTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                placeholder={`Message ${activeChannel.type === 'venture' ? '#' + activeChannel.name : activeChannel.name}...`}
                aria-describedby={inputHintId}
                className="w-full pl-4 pr-4 py-3 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[14px] font-medium text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-purple-glow)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>

            {/* Send button */}
            <Button
              type="submit"
              iconOnly
              size="lg"
              aria-label={`Send message to ${channelLabel}`}
              loading={sending}
              disabled={!inputMsg.trim()}
              variant="secondary"
              style={{
                background: inputMsg.trim() ? `linear-gradient(135deg, ${activeChannel.color}, ${tint(activeChannel.color, 80)})` : 'var(--color-bg-primary)',
                boxShadow: inputMsg.trim() ? `0 4px 16px ${tint(activeChannel.color, 25)}` : 'none',
                color: inputMsg.trim() ? 'white' : 'var(--color-text-muted)',
                border: `1px solid ${inputMsg.trim() ? tint(activeChannel.color, 25) : 'var(--color-border)'}`,
              }}
            >
              <Send size={17} aria-hidden="true" />
            </Button>
          </form>
          <p id={inputHintId} className="text-[10px] font-medium text-[var(--color-text-muted)] mt-2 ml-1">Press Enter to send.</p>
        </div>
      </div>
      )}
    </div>
  );
}

function SidebarBtn({ active, color, onClick, icon, label, isRecent }: { active: boolean; color: string; onClick: () => void; icon: React.ReactNode; label: string; isRecent?: boolean; }) {
  return (
    <button type="button" onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 border ${active ? 'border shadow-sm font-bold' : 'border-transparent hover:bg-[var(--color-bg-primary)] font-medium'}`}
      style={active ? { background: tint(color, 8), borderColor: tint(color, 21), color } : { color: isRecent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
    >
      <span aria-hidden="true" style={active ? { color } : { color: 'var(--color-text-muted)' }}>{icon}</span>
      <span className={`text-[13px] truncate ${isRecent && !active ? 'font-bold' : ''}`}>{label}</span>
      {active && <span aria-hidden="true" className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />}
      {isRecent && !active && (
        <>
          <span className="sr-only">, new messages</span>
          <span aria-hidden="true" className="ml-auto w-2 h-2 rounded-full bg-[var(--color-purple-glow)] shrink-0" />
        </>
      )}
    </button>
  );
}
