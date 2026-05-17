import { useEffect, useRef, useState, useCallback } from 'react';
import { GameRoom, WSEvent, WSMessage, Player } from '../types/game';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';

export function useSocket() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback((roomId: string, playerName: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: WSEvent.JOIN_ROOM,
        payload: { roomId, playerName }
      }));
    };

    socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data) as WSMessage;
      
      switch (type) {
        case WSEvent.INITIAL_SYNC:
          setPlayerId(payload.playerId);
          break;
        case WSEvent.ERROR:
          setError(payload);
          break;
        case WSEvent.SEARCH_RESULTS:
          window.dispatchEvent(new CustomEvent('search_results', { detail: payload }));
          break;
      }
    };

    socketRef.current = socket;

    // Listen to Firestore for room state
    const roomRef = doc(db, 'rooms', roomId);
    const playersRef = collection(db, 'rooms', roomId, 'players');

    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameRoom;
        setRoom(prev => ({
          ...data,
          players: prev?.players || []
        }));
      }
    });

    const unsubscribePlayers = onSnapshot(playersRef, (snapshot) => {
      const players = snapshot.docs.map(doc => doc.data() as Player);
      setRoom(prev => prev ? { ...prev, players } : null);
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
      socket.close();
    };
  }, []);

  const send = useCallback((type: WSEvent, payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { room, playerId, error, connect, send };
}
