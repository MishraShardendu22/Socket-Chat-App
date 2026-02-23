'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export interface Message {
  id: string;
  username: string;
  message: string;
  room: string;
  timestamp: number;
  type: 'message' | 'join' | 'leave'; 
}

export function useSocket() {
  const [joined, setJoined] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => {
      setConnected(false);
      setJoined(false);
    });

    socket.on('join', (payload: Omit<Message, 'id' | 'type'>) => {
      setMessages(prev => [
        ...prev,
        { ...payload, id: crypto.randomUUID(), type: 'join' },
      ]);
    });

    socket.on('message', (payload: Omit<Message, 'id' | 'type'>) => {
      setMessages(prev => [
        ...prev,
        { ...payload, id: crypto.randomUUID(), type: 'message' },
      ]);
    });

    socket.on('leave', (payload: Omit<Message, 'id' | 'type'>) => {
      setMessages(prev => [
        ...prev,
        { ...payload, id: crypto.randomUUID(), type: 'leave' },
      ]);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((username: string, room: string) => {
    if (!socketRef.current) return;
    setCurrentUser(username);
    setCurrentRoom(room);
    setMessages([]);
    socketRef.current.emit('join', { username, room });
    setJoined(true);
  }, []);

  const sendMessage = useCallback(
    (message: string) => {
      if (!socketRef.current || !currentRoom || !currentUser) return;
      socketRef.current.emit('message', {
        username: currentUser,
        message,
        room: currentRoom,
      });
    },
    [currentRoom, currentUser],
  );

  const leaveRoom = useCallback(() => {
    if (!socketRef.current || !currentRoom || !currentUser) return;
    socketRef.current.emit('leave', {
      username: currentUser,
      room: currentRoom,
    });
    setJoined(false);
    setCurrentRoom('');
    setCurrentUser('');
    setMessages([]);
  }, [currentRoom, currentUser]);

  return {
    messages,
    connected,
    joined,
    currentRoom,
    currentUser,
    joinRoom,
    sendMessage,
    leaveRoom,
  };
}
