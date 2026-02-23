'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Message } from '../hooks/useSocket';

interface ChatRoomProps {
  messages: Message[];
  room: string;
  username: string;
  onSendMessage: (message: string) => void;
  onLeave: () => void;
  connected: boolean;
}

export default function ChatRoom({
  messages,
  room,
  username,
  onSendMessage,
  onLeave,
  connected,
}: ChatRoomProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !connected) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Unique colour per username (deterministic)
  const userColor = (name: string) => {
    const colors = [
      'text-rose-400',
      'text-amber-400',
      'text-lime-400',
      'text-cyan-400',
      'text-violet-400',
      'text-pink-400',
      'text-sky-400',
      'text-orange-400',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 rounded-xl w-9 h-9 flex items-center justify-center text-white font-bold text-sm shadow shadow-indigo-900/50">
            {room[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm leading-tight">#{room}</h2>
            <p className="text-gray-500 text-xs leading-tight">
              Logged in as <span className="text-indigo-400">{username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              connected
                ? 'text-emerald-400 bg-emerald-950 border-emerald-900'
                : 'text-red-400 bg-red-950 border-red-900'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                connected ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            {connected ? 'Live' : 'Offline'}
          </div>

          <button
            onClick={onLeave}
            className="bg-gray-800 hover:bg-red-950 text-gray-400 hover:text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-all border border-gray-700 hover:border-red-800"
          >
            Leave
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
            <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Be the first to say something!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.username === username;
          const isSystem = msg.type === 'join' || msg.type === 'leave';

          // System message
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="text-xs text-gray-500 bg-gray-900 border border-gray-800 px-3 py-1 rounded-full">
                  {msg.message}
                </span>
              </div>
            );
          }

          // Show avatar only for first message in a group from the same sender
          const prevMsg = messages[idx - 1];
          const showSender =
            !isOwn &&
            (!prevMsg || prevMsg.type !== 'message' || prevMsg.username !== msg.username);

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}>
              {/* Avatar placeholder for alignment */}
              {!isOwn && (
                <div className="w-7 shrink-0 flex items-end pb-5">
                  {showSender && (
                    <div
                      className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-white"
                      title={msg.username}
                    >
                      {msg.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`max-w-[72%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}
              >
                {showSender && (
                  <span className={`text-xs font-medium px-1 ${userColor(msg.username)}`}>
                    {msg.username}
                  </span>
                )}
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm'
                  }`}
                >
                  {msg.message}
                </div>
                <span className="text-xs text-gray-600 px-1">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={connected ? `Message #${room}…` : 'Reconnecting…'}
            disabled={!connected}
            maxLength={500}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || !connected}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl transition-all font-medium text-sm shadow shadow-indigo-900/40"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-700 mt-1.5 text-right">{input.length}/500</p>
      </footer>
    </div>
  );
}
