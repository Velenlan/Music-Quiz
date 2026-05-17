import { WebSocket } from 'ws';
import { GameRoom, GameState, Player, Track, WSEvent, Phase } from '../src/types/game';
import { fetchMixedPlaylist } from './musicService';
import { adminDb } from './firebaseAdmin';

const GUESS_WINDOW = 3000;
const INTERMISSION_TIME = 5000;
const PHASE_DURATIONS = { 1: 1000 };
const PHASE_MAX_POINTS = { 1: 1000 };
const WRONG_ANSWER_PENALTY = 100;

export class RoomManager {
  public room: GameRoom;
  private activeTimer: NodeJS.Timeout | null = null;
  private sockets: Map<string, WebSocket> = new Map();

  constructor(roomId: string) {
    this.room = {
      id: roomId,
      state: GameState.LOBBY,
      players: [],
      currentTrackIndex: -1,
      tracks: [],
      options: [],
      phase: 1,
      phaseStartTime: 0,
      nextRoundTime: 0
    };
  }

  public async init() {
    try {
      const doc = await adminDb.collection('rooms').doc(this.room.id).get();
      if (doc.exists) {
        const data = doc.data() as any;
        this.room = {
          ...this.room,
          ...data,
          players: this.room.players // Keep in-memory players until they are loaded/merged
        };
        
        // Also load players from subcollection
        const playersCol = await adminDb.collection('rooms').doc(this.room.id).collection('players').get();
        this.room.players = playersCol.docs.map(d => d.data() as Player);
      } else {
        await this.syncToFirestore();
      }
    } catch (e) {
      console.error('Failed to init room from firestore', e);
      await this.syncToFirestore();
    }
  }

  private async syncToFirestore() {
    try {
      const { players, ...roomData } = this.room;
      await adminDb.collection('rooms').doc(this.room.id).set(roomData);
      
      // Sync players to subcollection
      const playersCol = adminDb.collection('rooms').doc(this.room.id).collection('players');
      for (const player of players) {
        await playersCol.doc(player.id).set(player);
      }
    } catch (e) {
      console.error('Failed to sync to firestore', e);
    }
  }

  public async addPlayer(ws: WebSocket, playerId: string, name: string) {
    const player: Player = {
      id: playerId,
      name,
      score: 0,
      isHost: this.room.players.length === 0,
      lastGuessCorrect: false,
      lastGuessPoints: 0
    };
    this.room.players.push(player);
    this.sockets.set(playerId, ws);
    await this.syncToFirestore();
  }

  public async removePlayer(playerId: string) {
    this.room.players = this.room.players.filter(p => p.id !== playerId);
    this.sockets.delete(playerId);
    
    // Remove from firestore subcollection
    try {
      await adminDb.collection('rooms').doc(this.room.id).collection('players').doc(playerId).delete();
    } catch (e) {
      console.error('Failed to delete player from firestore', e);
    }

    // If host left, assign new host
    if (this.room.players.length > 0 && !this.room.players.some(p => p.isHost)) {
      this.room.players[0].isHost = true;
    }

    await this.syncToFirestore();
    return this.room.players.length;
  }

  public async startGame(settings: { filters: any[], rounds: number }) {
    if (this.room.state !== GameState.LOBBY) return;
    
    this.room.state = GameState.PLAYING;
    await this.syncToFirestore();

    this.room.tracks = await fetchMixedPlaylist(settings.filters, settings.rounds);
    this.room.currentTrackIndex = -1;

    if (this.room.tracks.length === 0) {
      this.broadcast(WSEvent.ERROR, "No tracks found for selected filters.");
      this.room.state = GameState.LOBBY;
      await this.syncToFirestore();
      return;
    }

    this.startNextRound();
  }

  private async startNextRound() {
    this.clearTimer();
    this.room.currentTrackIndex++;

    if (this.room.currentTrackIndex >= this.room.tracks.length) {
      this.room.state = GameState.GAME_OVER;
      await this.syncToFirestore();
      return;
    }

    this.room.state = GameState.PLAYING;
    this.room.phase = 1;
    this.room.players.forEach(p => { 
      p.lastGuessCorrect = false; 
      p.lastGuessPoints = 0; 
    });

    const currentTrack = this.room.tracks[this.room.currentTrackIndex];
    // Generate options including correct answer
    const otherTracks = this.room.tracks.filter(t => t.id !== currentTrack.id);
    const shuffledOthers = otherTracks.sort(() => Math.random() - 0.5);
    this.room.options = [currentTrack.title, ...shuffledOthers.slice(0, 3).map(t => t.title)]
      .sort(() => Math.random() - 0.5);

    this.startPhase(1);
  }

  private startPhase(phase: number) {
    this.clearTimer();
    this.room.phase = phase as Phase;
    this.room.phaseStartTime = Date.now();
    this.syncToFirestore();

    // After Phase Duration + Guess Window
    const totalPhaseTime = PHASE_DURATIONS[this.room.phase] + GUESS_WINDOW;
    
    this.activeTimer = setTimeout(() => {
      this.handlePhaseTimeout();
    }, totalPhaseTime);
  }

  private handlePhaseTimeout() {
    if (this.room.state !== GameState.PLAYING) return;
    this.endRound();
  }

  public async submitAnswer(playerId: string, answer: string) {
    if (this.room.state !== GameState.PLAYING) return;

    const player = this.room.players.find(p => p.id === playerId);
    if (!player || player.lastGuessCorrect) return;

    const currentTrack = this.room.tracks[this.room.currentTrackIndex];
    const isCorrect = answer.trim() === currentTrack.title.trim();

    if (isCorrect) {
      this.clearTimer();
      const elapsedInPhase = Date.now() - this.room.phaseStartTime;
      const totalPhaseTime = PHASE_DURATIONS[this.room.phase] + GUESS_WINDOW;
      
      // Points scaled by reaction speed within the phase
      const points = Math.round(PHASE_MAX_POINTS[this.room.phase] * (1 - (elapsedInPhase / totalPhaseTime)));
      
      player.score += points;
      player.lastGuessCorrect = true;
      player.lastGuessPoints = points;

      this.endRound();
    } else {
      player.score = Math.max(0, player.score - WRONG_ANSWER_PENALTY);
      await this.syncToFirestore();
    }
  }

  private endRound() {
    this.clearTimer();
    this.room.state = GameState.INTERMISSION;
    this.room.nextRoundTime = Date.now() + INTERMISSION_TIME;
    this.syncToFirestore();

    this.activeTimer = setTimeout(() => {
      this.startNextRound();
    }, INTERMISSION_TIME);
  }

  private clearTimer() {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }

  private broadcast(type: WSEvent, payload: any) {
    const message = JSON.stringify({ type, payload });
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}
