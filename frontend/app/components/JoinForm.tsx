'use client';

import { useState, FormEvent } from 'react';

interface JoinFormProps {
  onJoin: (username: string, room: string) => void;
  connected: boolean;
}

const QUICK_ROOMS = ['general', 'random', 'dev', 'design'];

export default function JoinForm({ onJoin, connected }: JoinFormProps) {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !room.trim()) return;
    onJoin(username.trim(), room.trim().toLowerCase().replace(/\s+/g, '-'));
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-900/50 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Socket Chat</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Real-time messaging powered by Socket.IO</p>

          <div
            className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-medium ${
              connected
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                : 'bg-red-950 text-red-400 border border-red-900'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}
            />
            {connected ? 'Server connected' : 'Connecting to server…'}
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. alice"
                maxLength={24}
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Room
              </label>
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value)}
                placeholder="e.g. general"
                maxLength={32}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
              />
              {/* Quick-select rooms */}
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_ROOMS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoom(r)}
                    className={`text-xs px-3 py-1 rounded-lg border transition ${
                      room === r
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
                    }`}
                  >
                    #{r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!connected || !username.trim() || !room.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm mt-2 shadow-lg shadow-indigo-900/30"
            >
              Join Room →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
