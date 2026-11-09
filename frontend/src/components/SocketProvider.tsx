'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import { MessageSquare } from 'lucide-react';

interface LatestMessageInfo {
  timestamp: string;
  sender_name: string;
  content: string;
}

interface SocketContextType {
  socket: Socket | null;
  latestMessages: Record<string, LatestMessageInfo>;
  setLatestMessages: React.Dispatch<React.SetStateAction<Record<string, LatestMessageInfo>>>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  latestMessages: {},
  setLatestMessages: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children, user }: { children: ReactNode; user: User | null }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [latestMessages, setLatestMessages] = useState<Record<string, LatestMessageInfo>>({});

  useEffect(() => {
    // Clients (L9) have no internal chat, so they never open a socket.
    if (!user || user.accessLevel >= 9) return;

    const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://internalx.dropwinggroups.com';
    const s = io(url, { withCredentials: true });
    setSocket(s);

    // Rooms are assigned by the server on connect (own DMs, global, and the
    // venture channels this account may use). Nothing to join from here.

    const handleReceiveMessage = (msg: any) => {
      // Determine the channel key for this message
      let channelKey = '';
      if (msg.ventureId !== undefined && msg.ventureId !== null) {
        channelKey = msg.ventureId === 'global' ? 'global' : `venture_${msg.ventureId}`;
      } else if (msg.receiver_id && msg.receiver_id !== user.id) {
        // If we sent it, the channel is the receiver
        channelKey = `dm_${msg.receiver_id}`;
      } else if (msg.sender_id && msg.sender_id !== user.id && msg.receiver_id === user.id) {
        // If we received a DM, the channel is the sender
        channelKey = `dm_${msg.sender_id}`;
      }

      // Update latest messages for sorting
      if (channelKey) {
        setLatestMessages(prev => ({
          ...prev,
          [channelKey]: {
            timestamp: msg.created_at,
            sender_name: msg.sender_name,
            content: msg.content,
          }
        }));
      }

      // Show toast if message is not from current user
      if (msg.sender_id !== user.id) {
        let title = msg.sender_name;
        if (msg.ventureId === 'global') {
          title = `${msg.sender_name} in #Global HQ`;
        } else if (msg.ventureId) {
          title = `${msg.sender_name} in #${msg.venture_name || 'Venture'}`;
        } else {
          title = `${msg.sender_name} (Direct Message)`;
        }

        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-sm w-full bg-[var(--color-bg-card)] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-[var(--color-border)] overflow-hidden cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-colors`}
            onClick={() => toast.dismiss(t.id)}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-purple-glow)]/10 flex items-center justify-center">
                    <MessageSquare size={20} className="text-[var(--color-purple-glow)]" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-[13px] font-bold text-[var(--color-text-primary)]">
                    {title}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[var(--color-text-secondary)] line-clamp-2">
                    {msg.content}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-[var(--color-border)]">
              <button
                onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-[12px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000 });
      }
    };

    s.on('receive_message', handleReceiveMessage);

    return () => {
      s.off('receive_message', handleReceiveMessage);
      s.close();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, latestMessages, setLatestMessages }}>
      {children}
    </SocketContext.Provider>
  );
}
