import React from 'react';
import { useSocket } from './hooks/useSocket';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { GameState, WSEvent } from './types/game';

export default function App() {
  const { room, playerId, error, connect, send } = useSocket();

  const handleJoin = (roomId: string, name: string) => {
    connect(roomId, name);
  };

  const handleStart = (settings: any) => {
    if (room) {
      send(WSEvent.START_GAME, { roomId: room.id, settings });
    }
  };

  const player = room?.players.find(p => p.id === playerId);
  const isHost = player ? player.isHost : false;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce">
          {error}
        </div>
      )}

      {!room || room.state === GameState.LOBBY ? (
        <Lobby 
          onJoin={handleJoin} 
          onStart={handleStart}
          send={send}
          isHost={isHost}
          roomId={room?.id}
          players={room?.players}
        />
      ) : (
        <Game room={room} send={send} />
      )}
    </div>
  );
}
