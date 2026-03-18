import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';
import { getUsers } from '../../api';
import { Send, MessageSquare, Search } from 'lucide-react';

export default function MessagesPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        getUsers().then(({ data }) => {
            setUsers((data || []).filter(u => u.id !== profile?.id));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [profile?.id]);

    // Load messages when a user is selected
    useEffect(() => {
        if (!selected || !profile?.id) return;
        setMessages([]);

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${profile.id})`)
                .order('created_at');
            setMessages(data || []);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        };

        fetchMessages();

        // Real-time subscription
        const channel = supabase
            .channel(`chat:${profile.id}:${selected.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages',
            }, (payload) => {
                const m = payload.new;
                if (
                    (m.sender_id === profile.id && m.receiver_id === selected.id) ||
                    (m.sender_id === selected.id && m.receiver_id === profile.id)
                ) {
                    setMessages(prev => [...prev, m]);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [selected?.id, profile?.id]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!body.trim() || !selected) return;
        const msg = body;
        setBody('');
        await supabase.from('messages').insert({
            sender_id: profile.id,
            receiver_id: selected.id,
            body: msg,
        });
        // Notification for receiver
        await supabase.from('notifications').insert({
            user_id: selected.id,
            type: 'message',
            message: `New message from ${profile.full_name}`,
            link: '/messages',
        }).catch(() => { });
    };

    const filtered = users.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const initials = (name) => name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';

    return (
        <div>
            <div className="page-header">
                <div className="page-title">Messages</div>
                <div className="page-subtitle">Direct messaging with your team</div>
            </div>

            <div className="chat-layout">
                {/* Contact list */}
                <div className="chat-sidebar">
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', borderRadius: '10px', padding: '8px 12px' }}>
                            <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            <input
                                placeholder="Search people..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%', color: 'var(--color-text-primary)' }}
                            />
                        </div>
                    </div>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : filtered.map(u => (
                        <div
                            key={u.id}
                            className={`chat-contact ${selected?.id === u.id ? 'active' : ''}`}
                            onClick={() => setSelected(u)}
                        >
                            <div className="avatar-fallback avatar-sm" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                                {u.avatar_url
                                    ? <img src={u.avatar_url} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%' }} />
                                    : initials(u.full_name)
                                }
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat area */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {!selected ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-text-muted)' }}>
                            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p>Select a person to start messaging</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="avatar-fallback avatar-sm" style={{ fontSize: '0.65rem' }}>{initials(selected.full_name)}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selected.full_name}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{selected.role}</div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="chat-messages">
                                {messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
                                        No messages yet. Say hello! 👋
                                    </div>
                                ) : messages.map(m => (
                                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender_id === profile.id ? 'flex-end' : 'flex-start' }}>
                                        <div className={`chat-bubble ${m.sender_id === profile.id ? 'sent' : 'received'}`}>{m.body}</div>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '2px 4px' }}>
                                            {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={sendMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px' }}>
                                <input
                                    id="message-input"
                                    className="form-input"
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    placeholder={`Message ${selected.full_name}...`}
                                    style={{ flex: 1 }}
                                />
                                <button id="send-message-btn" type="submit" className="btn btn-primary" disabled={!body.trim()}>
                                    <Send size={16} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
