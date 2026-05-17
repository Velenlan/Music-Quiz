import { useEffect, useRef, useState, useCallback } from 'react';
import { GameRoom, WSEvent, WSMessage, Player, GameState } from '../types/game';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';

export function useSocket() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback((roomIdRaw: string, playerName: string) => {
    const roomId = roomIdRaw.trim().toUpperCase();
    setJoiningRoomId(roomId);
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

    socket.onclose = () => {
      setRoom(null);
      setPlayerId(null);
    };

    socketRef.current = socket;

    // Subscriptions will be managed by useEffect triggered by connect call or state
  }, []);

  useEffect(() => {
    if (!joiningRoomId) return;

    const roomId = joiningRoomId;
    const roomRef = doc(db, 'rooms', roomId);

    const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameRoom;
        setRoom(data);
      } else {
        // Handle non-existent room if necessary, but server should create it
      }
    });

    return () => {
      unsubscribeRoom();
    };
  }, [joiningRoomId]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const send = useCallback((type: WSEvent, payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { room, playerId, error, connect, send };
}
