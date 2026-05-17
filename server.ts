import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { WSEvent, WSMessage } from './src/types/game.ts';
import { RoomManager } from './backend/roomManager.ts';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3000;

class GameServer {
  private rooms: Map<string, RoomManager> = new Map();

  constructor() {
    this.setupWSS();
  }

  private setupWSS() {
    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: string) => {
        try {
          const { type, payload } = JSON.parse(message) as WSMessage;
          this.handleEvent(ws, type, payload);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
    });
  }

  private async handleEvent(ws: WebSocket, type: WSEvent, payload: any) {
    const roomId = (ws as any).roomId;
    const playerId = (ws as any).playerId;

    switch (type) {
      case WSEvent.JOIN_ROOM:
        this.joinRoom(ws, payload.roomId, payload.playerName);
        break;
      case WSEvent.START_GAME:
        this.rooms.get(payload.roomId)?.startGame(payload.settings);
        break;
      case WSEvent.SUBMIT_ANSWER:
        this.rooms.get(roomId)?.submitAnswer(playerId, payload.answer);
        break;
      case WSEvent.SEARCH:
        this.searchMusic(ws, payload.query, payload.type);
        break;
      case WSEvent.LEAVE_ROOM:
        this.handleDisconnect(ws);
        break;
    }
  }

  private async searchMusic(ws: WebSocket, query: string, type: 'artist' | 'genre') {
    try {
      const response = await axios.get(`https://itunes.apple.com/search`, {
        params: {
          term: query,
          media: 'music',
          entity: type === 'artist' ? 'musicArtist' : 'genre',
          limit: 10
        }
      });
      
      const results = response.data.results.map((r: any) => ({
        id: r.artistId || r.genreId || r.collectionId,
        name: r.artistName || r.name,
      }));

      ws.send(JSON.stringify({ type: WSEvent.SEARCH_RESULTS, payload: results }));
    } catch (e) {
      console.error('Search failed', e);
    }
  }

  private joinRoom(ws: WebSocket, roomId: string, playerName: string) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new RoomManager(roomId));
    }

    const manager = this.rooms.get(roomId)!;
    const playerId = Math.random().toString(36).substring(7);
    
    (ws as any).playerId = playerId;
    (ws as any).roomId = roomId;

    ws.send(JSON.stringify({ type: WSEvent.INITIAL_SYNC, payload: { playerId } }));
    manager.addPlayer(ws, playerId, playerName);
  }

  private handleDisconnect(ws: WebSocket) {
    const roomId = (ws as any).roomId;
    const playerId = (ws as any).playerId;
    if (!roomId || !playerId) return;

    const manager = this.rooms.get(roomId);
    if (manager) {
      manager.removePlayer(playerId).then(remaining => {
        if (remaining === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} destroyed`);
        }
      });
    }
    
    (ws as any).roomId = null;
    (ws as any).playerId = null;
  }
}

async function startServer() {
  new GameServer();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
