import React, { useEffect, useRef } from 'react';
import { Phase } from '../types/game';

interface AudioPlayerProps {
  url: string;
  phase: Phase;
  isPlaying: boolean;
}

const PHASE_DURATIONS = {
  1: 1.0
};

export function AudioPlayer({ url, phase, isPlaying }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    let isSubscribed = true;

    const safePause = async () => {
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (e) {
          // Interruption is expected
        }
      }
      if (isSubscribed) {
        audio.pause();
      }
    };

    if (isPlaying) {
      const duration = PHASE_DURATIONS[phase];
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      playPromiseRef.current = playPromise;
      
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Interruption is expected
        });
      }
      
      const checkTime = () => {
        if (isSubscribed && audio.currentTime >= duration) {
          safePause();
          audio.removeEventListener('timeupdate', checkTime);
        }
      };
      
      audio.addEventListener('timeupdate', checkTime);
      
      return () => {
        isSubscribed = false;
        audio.removeEventListener('timeupdate', checkTime);
        safePause();
      };
    } else {
      safePause();
    }
  }, [url, phase, isPlaying]);

  return <audio ref={audioRef} src={url} />;
}
