'use client';

import { useEffect, useCallback, useState } from 'react';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { useTimerStore } from '@/lib/store/timer-store';
import { cn, formatTime } from '@/lib/utils';

interface PomodoroTimerProps {
  onComplete: (habitId: string, durationMinutes: number, note?: string) => void;
  onClose?: () => void;
}

export function PomodoroTimer({ onComplete, onClose }: PomodoroTimerProps) {
  const {
    habitId,
    habitName,
    duration,
    remaining,
    isRunning,
    pomodorosCompleted,
    start,
    pause,
    reset,
    tick,
    completePomodoro,
    setDuration,
  } = useTimerStore();

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);

  const progress = ((duration - remaining) / duration) * 100;
  const durationMinutes = duration / 60;

  const handleComplete = useCallback(() => {
    if (habitId) {
      onComplete(habitId, durationMinutes, note || undefined);
      completePomodoro();
      setNote('');
      setShowNoteInput(false);
      setShowBreakPrompt(true);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Completo! 🍅', {
          body: `${durationMinutes} minutos de ${habitName} registrados.`,
        });
      }
    }
  }, [habitId, durationMinutes, note, habitName, onComplete, completePomodoro]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && remaining > 0) {
      interval = setInterval(tick, 1000);
    } else if (remaining === 0 && isRunning) {
      setShowNoteInput(true);
      pause();
    }

    return () => clearInterval(interval);
  }, [isRunning, remaining, tick, pause]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleStartBreak = (minutes: number) => {
    setShowBreakPrompt(false);
    setDuration(minutes);
    start();
  };

  if (!habitId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-zinc-400">Selecione um hábito para iniciar o timer</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6">
      {/* Habit name */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-white">{habitName}</h2>
        <p className="text-sm text-zinc-400">
          Pomodoro {pomodorosCompleted + 1}/4
        </p>
      </div>

      {/* Circular timer */}
      <div className="relative w-64 h-64 mb-8">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke={remaining === 0 ? '#22c55e' : '#3b82f6'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-mono font-bold text-white">
            {formatTime(remaining)}
          </span>
          <span className="text-sm text-zinc-400 mt-2">
            {durationMinutes} min
          </span>
        </div>
      </div>

      {/* Note input when timer completes */}
      {showNoteInput && (
        <div className="w-full max-w-sm mb-6">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="O que você estudou? (opcional)"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            onKeyDown={(e) => e.key === 'Enter' && handleComplete()}
          />
          <button
            onClick={handleComplete}
            className="w-full mt-3 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
          >
            Salvar Pomodoro
          </button>
        </div>
      )}

      {/* Break prompt */}
      {showBreakPrompt && (
        <div className="w-full max-w-sm mb-6 p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-2 mb-3 text-white">
            <Coffee className="w-5 h-5" />
            <span className="font-medium">Hora da pausa!</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleStartBreak(5)}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
            >
              5 min
            </button>
            <button
              onClick={() => handleStartBreak(15)}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
            >
              15 min
            </button>
            <button
              onClick={() => setShowBreakPrompt(false)}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded-lg text-sm transition-colors"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      {!showNoteInput && !showBreakPrompt && (
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-full transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          <button
            onClick={isRunning ? pause : start}
            className={cn(
              'p-5 rounded-full transition-colors',
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-green-600 hover:bg-green-500'
            )}
          >
            {isRunning ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-full transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Duration selector */}
      {!isRunning && !showNoteInput && !showBreakPrompt && (
        <div className="flex gap-2 mt-6">
          {[25, 50].map((mins) => (
            <button
              key={mins}
              onClick={() => setDuration(mins)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-colors',
                durationMinutes === mins
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              )}
            >
              {mins} min
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
