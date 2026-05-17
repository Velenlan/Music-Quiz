import React, { useState, useEffect } from 'react';
import { Search, Music, Play, X, Plus, User, Grid, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WSEvent } from '../types/game';
import { cn } from '../lib/utils';
import { COLLECTIONS } from '../constants/collections';

interface LobbyProps {
  onJoin: (roomId: string, name: string) => void;
  onStart: (settings: any) => void;
  send: (type: WSEvent, payload: any) => void;
  isHost: boolean;
  roomId?: string;
  players?: any[];
}

export function Lobby({ onJoin, onStart, send, isHost, roomId: initialRoomId, players = [] }: LobbyProps) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [joined, setJoined] = useState(!!initialRoomId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<{ type: 'artist' | 'genre' | 'collection', value: string }[]>([]);
  const [rounds, setRounds] = useState(10);
  const [activeTab, setActiveTab] = useState<'collections' | 'search'>('collections');

  useEffect(() => {
    const handleResults = (e: any) => setSearchResults(e.detail);
    window.addEventListener('search_results', handleResults);
    return () => window.removeEventListener('search_results', handleResults);
  }, []);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.length > 2) {
      send(WSEvent.SEARCH, { query: val, type: 'artist' });
    }
  };

  const addFilter = (type: 'artist' | 'genre' | 'collection', value: string) => {
    if (!selectedFilters.find(f => f.value === value)) {
      setSelectedFilters([...selectedFilters, { type, value }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFilter = (value: string) => {
    setSelectedFilters(selectedFilters.filter(f => f.value !== value));
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[100dvh] p-4 md:p-8 space-y-8 md:space-y-12 max-w-md md:max-w-4xl mx-auto w-full py-12 md:py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
          Melody<span className="text-neutral-500">Master</span>
        </h1>
        <p className="text-neutral-500 text-[10px] md:text-xs uppercase tracking-[0.3em] font-black">Музична вікторина на швидкість</p>
      </motion.div>

      {!joined ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-neutral-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[28px] p-6 md:p-10 space-y-6 shadow-2xl"
        >
          <div className="space-y-4">
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4 transition-colors group-focus-within:text-white" />
              <input
                type="text"
                placeholder="ТВОЄ ІМ'Я"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2x py-4 md:py-5 pl-12 pr-4 text-white placeholder:text-neutral-700 focus:outline-none focus:bg-white/5 focus:border-white/10 transition-all font-bold text-xs tracking-widest uppercase"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="relative group">
              <Music className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4 transition-colors group-focus-within:text-white" />
              <input
                type="text"
                placeholder="КОД КІМНАТИ"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 md:py-5 pl-12 pr-4 text-white placeholder:text-neutral-700 focus:outline-none focus:bg-white/5 focus:border-white/10 transition-all font-bold text-xs tracking-widest uppercase"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (name && roomId) {
                onJoin(roomId, name);
                setJoined(true);
              }
            }}
            disabled={!name || !roomId}
            className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-neutral-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs uppercase tracking-[0.2em] shadow-xl active:scale-[0.98]"
          >
            Enter Game
          </button>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-neutral-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[28px] p-5 md:p-8 space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-neutral-500 tracking-[0.25em] font-black mb-2">В лобі</span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">{players.length}</h2>
                <span className="text-[10px] text-neutral-600 font-mono tracking-widest uppercase">Гравців</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest px-2 py-1 bg-white/[0.03] rounded-lg border border-white/5">
                  Код: <span className="text-white">{initialRoomId}</span>
                </div>
              </div>
            </div>
            {isHost && (
              <button
                onClick={() => onStart({ filters: selectedFilters, rounds })}
                disabled={selectedFilters.length === 0}
                className="w-full sm:w-auto bg-white text-black px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-neutral-100 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Почати сесію
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center relative z-10 border-t border-white/5 pt-6">
            {players.map((p, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl flex items-center gap-3 transition-colors hover:bg-white/[0.06]">
                <div className="w-2 h-2 rounded-full bg-white opacity-40 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                <span className="text-white text-xs font-black uppercase tracking-wider">{p.name}</span>
                {p.isHost && <span className="text-[8px] bg-white/10 text-white px-2 py-0.5 rounded-md uppercase font-black tracking-tighter">ХОСТ</span>}
              </div>
            ))}
          </div>

          {isHost && (
            <div className="space-y-6 md:space-y-8 pt-6 border-t border-white/5 relative z-10 w-full">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] whitespace-nowrap">Генерація міксу</label>
                  <div className="flex bg-neutral-900/80 p-1 rounded-full border border-white/5 w-full md:w-auto overflow-hidden">
                    <button 
                      onClick={() => setActiveTab('collections')}
                      className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'collections' ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
                      )}
                    >
                      <Grid className="w-3 h-3" />
                      Добірки
                    </button>
                    <button 
                      onClick={() => setActiveTab('search')}
                      className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'search' ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
                      )}
                    >
                      <Search className="w-3 h-3" />
                      Артисти
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'search' ? (
                    <motion.div 
                      key="search-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4 transition-colors group-focus-within:text-white" />
                        <input
                          type="text"
                          placeholder="ПОШУК АРТИСТІВ..."
                          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-white placeholder:text-neutral-700 focus:outline-none transition-all font-bold text-xs tracking-widest uppercase focus:bg-white/5 focus:border-white/10"
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                        />
                        <AnimatePresence>
                          {searchResults.length > 0 && searchQuery && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute top-full left-0 right-0 mt-3 bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
                            >
                              {searchResults.map((r, i) => (
                                <button
                                  key={i}
                                  onClick={() => addFilter('artist', r.name)}
                                  className="w-full px-6 py-4 text-left hover:bg-white/5 text-white/80 font-black text-[10px] tracking-widest transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                                >
                                  <Plus className="w-4 h-4 text-neutral-600" />
                                  {r.name.toUpperCase()}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] ml-1">Топ UA Артисти</label>
                        <div className="flex flex-wrap gap-2">
                          {['Klavdia Petrivna', 'Artem Pivovarov', 'DOROFEEVA', 'Jerry Heil', 'YAKTAK', 'SadSvit'].map((artist) => (
                            <button
                              key={artist}
                              onClick={() => addFilter('artist', artist)}
                              className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-full text-[10px] font-black text-white/60 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                            >
                              {artist}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="collections-tab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pr-3 custom-scroll"
                    >
                      {COLLECTIONS.map((collection) => {
                        const isSelected = selectedFilters.some(f => f.value === collection.id);
                        return (
                          <button 
                            key={collection.id}
                            onClick={() => isSelected ? removeFilter(collection.id) : addFilter('collection', collection.id)}
                            className="group flex flex-col items-start gap-3 text-left w-full"
                          >
                            <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-800">
                              <img 
                                src={collection.coverImage} 
                                className={cn(
                                  "w-full h-full object-cover transition-all duration-700",
                                  isSelected ? "scale-105" : "group-hover:scale-110",
                                  !isSelected && "contrast-[0.9] grayscale-[0.2]"
                                )}
                                alt={collection.title}
                              />
                              <div className={cn(
                                "absolute inset-0 bg-white/10 transition-opacity duration-300",
                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                              )} />
                              <div className={cn(
                                "absolute inset-0 border-2 transition-all duration-300 rounded-2xl",
                                isSelected ? "border-white" : "border-transparent"
                              )} />
                              {isSelected && (
                                <motion.div 
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  className="absolute top-3 right-3 bg-white text-black p-1.5 rounded-full shadow-2xl"
                                >
                                  <Plus className="w-3.5 h-3.5 rotate-45" />
                                </motion.div>
                              )}
                            </div>
                            <div className="space-y-1 px-1 w-full">
                              <div className="text-[11px] font-black text-white tracking-widest truncate uppercase group-hover:text-neutral-300 transition-colors w-full">{collection.title}</div>
                              <div className="text-[10px] text-neutral-500 font-bold tracking-wider truncate uppercase w-full">{collection.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                  {selectedFilters.map((f) => (
                    <motion.div 
                      key={f.value}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 group max-w-[150px] md:max-w-[200px]"
                    >
                      {f.type === 'collection' ? (
                        <Grid className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      ) : (
                        <Radio className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      )}
                      <span className="text-white text-[10px] font-black uppercase tracking-widest truncate">
                        {f.type === 'collection' ? COLLECTIONS.find(c => c.id === f.value)?.title : f.value}
                      </span>
                      <button 
                        onClick={() => removeFilter(f.value)}
                        className="text-neutral-600 hover:text-white transition-colors p-0.5 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">Тривалість сесії</label>
                  <span className="text-white font-black text-xs tracking-widest">{rounds} РАУНДІВ</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="5"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-white transition-all hover:bg-white/10"
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
