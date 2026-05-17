import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameRoom, GameState, WSEvent } from '../types/game';
import { AudioPlayer } from './AudioPlayer';
import { cn } from '../lib/utils';
import { Music, Clock, Trophy, ChevronRight, LogOut } from 'lucide-react';

interface GameProps {
  room: GameRoom;
  send: (type: WSEvent, payload: any) => void;
}

export function Game({ room, send }: GameProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const currentTrack = room.tracks?.[room.currentTrackIndex];
  const isIntermission = room.state === GameState.INTERMISSION;
  const isGameOver = room.state === GameState.GAME_OVER;

  useEffect(() => {
    setSelectedOption(null);
  }, [room.currentTrackIndex]);

  const GUESS_WINDOW = 3000;
  const PHASE_DURATION = 1000;

  if (!currentTrack && !isGameOver && room.state !== GameState.LOBBY) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <Music className="w-16 h-16 text-neutral-800 mx-auto animate-pulse" />
          <h2 className="text-xl font-black uppercase tracking-widest text-neutral-500">Завантаження сесії...</h2>
          <p className="text-neutral-700 text-xs">Будь ласка, зачекайте, поки ми налаштуємо ваше підключення.</p>
        </motion.div>
      </div>
    );
  }

  useEffect(() => {
    if (room.state === GameState.PLAYING) {
      const interval = setInterval(() => {
        const totalDuration = PHASE_DURATION + GUESS_WINDOW;
        const elapsed = Date.now() - room.phaseStartTime;
        setTimeLeft(Math.max(0, totalDuration - elapsed));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [room.state, room.phaseStartTime]);

  const handleAnswer = (option: string) => {
    if (selectedOption || isIntermission) return;
    setSelectedOption(option);
    send(WSEvent.SUBMIT_ANSWER, { roomId: room.id, answer: option });
  };

  const handleExit = () => {
    send(WSEvent.LEAVE_ROOM, { roomId: room.id });
    window.location.reload();
  };

  if (isGameOver) {
    const winner = [...room.players].sort((a, b) => b.score - a.score)[0];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Trophy className="w-24 h-24 text-white mx-auto opacity-20" />
          <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">Сесія завершена</h1>
          <p className="text-neutral-500 text-sm uppercase tracking-[0.3em] font-bold">Фінальний рейтинг</p>
        </motion.div>

        <div className="w-full max-w-xl space-y-3">
          {room.players.sort((a, b) => b.score - a.score).map((p, i) => (
            <motion.div 
              key={p.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "flex justify-between items-center p-6 rounded-[2rem] border transition-all",
                i === 0 ? "glass bg-white/[0.08] border-white/20 scale-105 shadow-2xl" : "glass opacity-40 border-white/5"
              )}
            >
              <div className="flex items-center gap-4">
                <span className="font-black text-2xl w-8 italic text-neutral-600">#{i + 1}</span>
                <span className="font-bold text-xl uppercase tracking-tight">{p.name}</span>
              </div>
              <span className="font-mono font-bold text-2xl">{p.score}</span>
            </motion.div>
          ))}
        </div>

        <button 
          onClick={handleExit}
          className="bg-white text-black px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all active:scale-95"
        >
          Вийти з сесії
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full p-4 md:p-8 gap-6 md:gap-8 max-w-[1440px] mx-auto overflow-hidden bg-black text-white relative">
      {/* Mobile Backdrop for Drawer */}
      <AnimatePresence>
        {isLeaderboardOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLeaderboardOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Mobile Bottom Sheet Leaderboard */}
      <aside className={cn(
        "fixed md:relative inset-x-0 bottom-0 md:inset-auto z-50 md:z-auto transition-transform duration-500 md:translate-y-0",
        "w-full md:w-80 flex flex-col gap-4 md:gap-6 h-[80vh] md:h-full glass md:bg-transparent rounded-t-[2.5rem] md:rounded-none p-6 md:p-0 border-t border-white/10 md:border-none",
        !isLeaderboardOpen ? "translate-y-full" : "translate-y-0"
      )}>
        <div className="md:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
        
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Таблиця лідерів</h2>
          <span className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full text-neutral-400 font-mono">
            {room.players.length} / 12
          </span>
        </div>
        
        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scroll scrollbar-hide">
          {room.players.sort((a, b) => b.score - a.score).map((p, i) => (
            <motion.div 
              key={p.id}
              layout
              className={cn(
                "glass rounded-2xl p-4 flex items-center gap-4 transition-all",
                i === 0 ? "border-l-4 border-l-white bg-white/[0.08]" : "opacity-70 border-l border-white/5"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center text-xs font-black italic">
                {p.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate uppercase tracking-tight">{p.name}</div>
                {p.lastGuessPoints > 0 && isIntermission ? (
                   <div className="text-[10px] text-green-400 font-bold">+{p.lastGuessPoints} PTS</div>
                ) : (
                   <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Активна сесія</div>
                )}
              </div>
              <div className="text-sm font-mono font-bold tracking-tighter">{p.score.toLocaleString()}</div>
            </motion.div>
          ))}
        </div>

        <div className="glass rounded-[2rem] p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-600 tracking-[0.2em] mb-1">Код сесії</div>
              <div className="text-xl font-bold tracking-tighter text-white">{room.id}</div>
            </div>
          </div>
          <button 
            onClick={handleExit}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-neutral-500 hover:text-white py-3 rounded-2xl text-[10px] uppercase font-bold tracking-widest transition-all active:scale-[0.98]"
          >
            Залишити сесію
          </button>
        </div>
      </aside>

      {/* Main Board */}
      <main className="flex-1 flex flex-col h-full overflow-hidden max-w-2xl mx-auto w-full">
        <header className="flex items-center justify-between w-full h-16 px-2 md:px-6 shrink-0 z-20">
          {/* Left Zone: Exit + Round */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExit}
              className="glass p-2.5 rounded-xl active:scale-95 transition-transform bg-white/5 hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 text-neutral-400" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] tracking-wider uppercase text-neutral-500 font-black">Раунд</span>
              <div className="text-sm md:text-base font-bold text-white tabular-nums">
                {String(room.currentTrackIndex + 1).padStart(2, '0')} 
                <span className="text-neutral-600 font-medium"> / {String(room.tracks.length).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Center Zone: Status Badge */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] tracking-wider uppercase text-neutral-500 font-black">Статус</span>
            <div className={cn(
              "text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border",
              isIntermission ? "bg-neutral-900 border-white/10 text-neutral-400" : "bg-white text-black border-white"
            )}>
              {isIntermission ? 'Перерва' : 'Слухаємо'}
            </div>
          </div>

          {/* Right Zone: Pool + Trophy */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] tracking-wider uppercase text-neutral-500 font-black">Пул</span>
              <div className={cn(
                "text-sm md:text-base font-mono font-black tabular-nums transition-all",
                isIntermission ? "text-neutral-700" : "text-white"
              )}>
                {isIntermission ? '0000' : '1000'}
              </div>
            </div>
            <button 
              onClick={() => setIsLeaderboardOpen(true)}
              className="glass p-2.5 rounded-xl active:scale-95 transition-transform bg-white/5 hover:bg-white/10 hover:border-white/20"
            >
              <Trophy className="w-4 h-4 text-white" />
            </button>
          </div>
        </header>

        {/* Central Display */}
        <div className="w-full my-4 md:my-6 flex-1 px-2 md:px-0">
          <div className="h-full glass rounded-[2rem] md:rounded-[2.5rem] relative flex flex-col items-center justify-center overflow-hidden border-white/10 md:border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.02)] pb-6">
            <div className="absolute inset-0 orb-glow animate-pulse opacity-30"></div>
            
            <AnimatePresence mode="wait">
              {!isIntermission ? (
                <motion.div 
                  key="viz"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="relative z-10 flex flex-col items-center p-6"
                >
                  <div className="w-16 h-16 md:w-24 md:h-24 mb-6 text-white opacity-20 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <Music className="w-full h-full" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black tracking-tighter text-center max-w-sm mb-2 uppercase">Слухай уважно...</h2>
                  <p className="text-neutral-500 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-center">
                    Вгадай трек за 1с фрагментом
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="art"
                  initial={{ scale: 0.9, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="relative z-10 flex flex-col items-center p-6 md:p-8 w-full"
                >
                  <div className="relative mb-6 group">
                    <img 
                      src={currentTrack.artwork} 
                      className="w-44 h-44 md:w-64 md:h-64 object-cover rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative z-10 border border-white/20 aspect-square"
                      alt="Artwork"
                    />
                  </div>
                  <div className="text-center space-y-1 w-full max-w-md px-4">
                    <span className="text-[10px] uppercase font-black text-neutral-500 tracking-[0.3em]">Правильна відповідь</span>
                    <h3 className="text-xl md:text-4xl font-black text-white tracking-tighter truncate uppercase">{currentTrack.title}</h3>
                    <p className="text-neutral-400 text-sm md:text-lg font-bold tracking-widest truncate uppercase">{currentTrack.artist}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Total Duration Guarded Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1.5 bg-white/5 w-full overflow-hidden">
              {!isIntermission ? (
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  key={`progress-${room.currentTrackIndex}`}
                  className="h-full bg-white/60 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                />
              ) : (
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="h-full bg-neutral-600"
                />
              )}
            </div>
          </div>
        </div>

        {/* Answer Grid / List */}
        <div className="flex flex-col gap-3 w-full mt-4 shrink-0 px-2 md:px-0 pb-6 md:pb-8">
          {room.options.map((option, i) => {
            const isCorrect = isIntermission && option === currentTrack.title;
            const isWrong = isIntermission && selectedOption === option && !isCorrect;
            const label = ['A', 'B', 'C', 'D'][i];

            return (
              <button
                key={i}
                disabled={Boolean(selectedOption) || isIntermission}
                onClick={() => handleAnswer(option)}
                className={cn(
                  "flex items-center gap-4 w-full py-4 px-5 transition-all active:scale-[0.98] outline-none",
                  "bg-neutral-900/40 border-white/5 border rounded-2xl md:rounded-[1.5rem]",
                  selectedOption === option && !isIntermission && "bg-white/10 ring-2 ring-white/20 border-white/30",
                  isCorrect && "bg-white/10 border-white scale-[1.02] z-10 shadow-2xl",
                  isWrong && "opacity-20 blur-[1px]",
                  "hover:bg-white/[0.08]"
                )}
              >
                <span className="text-xs font-black text-neutral-500 uppercase tracking-widest shrink-0 w-6">
                  {label}
                </span>
                <div className="flex-1 min-w-0 flex flex-col items-start">
                  <div className="text-base md:text-lg font-black tracking-tight text-white truncate w-full uppercase">
                    {option}
                  </div>
                </div>
                {isCorrect && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]" 
                  />
                )}
              </button>
            );
          })}
        </div>


        <AudioPlayer url={currentTrack.previewUrl} phase={room.phase} isPlaying={room.state === GameState.PLAYING} />
      </main>
    </div>
  );
}
