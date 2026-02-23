'use client';

import { useSocket } from './hooks/useSocket';
import JoinForm from './components/JoinForm';
import ChatRoom from './components/ChatRoom';

export default function Home() {
  const {
    messages,
    connected,
    joined,
    currentRoom,
    currentUser,
    joinRoom,
    sendMessage,
    leaveRoom,
  } = useSocket();

  if (!joined) {
    return <JoinForm onJoin={joinRoom} connected={connected} />;
  }

  return (
    <ChatRoom
      messages={messages}
      room={currentRoom}
      username={currentUser}
      onSendMessage={sendMessage}
      onLeave={leaveRoom}
      connected={connected}
    />
  );
}
