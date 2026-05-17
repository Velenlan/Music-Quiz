export enum GameState {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  INTERMISSION = 'INTERMISSION',
  GAME_OVER = 'GAME_OVER',
}

export type Phase = 1 | 2 | 3;

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  previewUrl: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  lastGuessCorrect: boolean;
  lastGuessPoints: number;
}

export interface GameRoom {
  id: string;
  state: GameState;
  players: Player[];
  currentTrackIndex: number;
  tracks: Track[];
  options: string[]; // Added this
  phase: Phase;
  phaseStartTime: number;
  nextRoundTime: number;
}

export enum WSEvent {
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  START_GAME = 'START_GAME',
  SUBMIT_ANSWER = 'SUBMIT_ANSWER',
  ROOM_STATE_UPDATE = 'ROOM_STATE_UPDATE',
  ERROR = 'ERROR',
  PHASE_START = 'PHASE_START',
  ROUND_END = 'ROUND_END',
  SEARCH_RESULTS = 'SEARCH_RESULTS',
  SEARCH = 'SEARCH',
  INITIAL_SYNC = 'INITIAL_SYNC',
}

export type FilterType = 'artist' | 'genre' | 'collection';

export interface Filter {
  type: FilterType;
  value: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  searchTerms: string[];
}

export interface WSMessage {
  type: WSEvent;
  payload: any;
}
