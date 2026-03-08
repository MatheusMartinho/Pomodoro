'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimerState {
  habitId: string | null;
  habitName: string | null;
  duration: number; // em segundos
  remaining: number; // em segundos
  isRunning: boolean;
  pomodorosCompleted: number;
  sessionStartedAt: string | null;
  lastTickAt: string | null; // Para calcular tempo real quando aba fica inativa
  
  // Actions
  setHabit: (id: string, name: string) => void;
  setDuration: (minutes: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  tickReal: () => void; // Para compensar tempo perdido
  completePomodoro: () => void;
  resetSession: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      habitId: null,
      habitName: null,
      duration: 25 * 60,
      remaining: 25 * 60,
      isRunning: false,
      pomodorosCompleted: 0,
      sessionStartedAt: null,
      lastTickAt: null,

      setHabit: (id, name) => set({ habitId: id, habitName: name }),
      
      setDuration: (minutes) => set({ 
        duration: minutes * 60, 
        remaining: minutes * 60 
      }),
      
      start: () => set({ 
        isRunning: true,
        sessionStartedAt: get().sessionStartedAt || new Date().toISOString(),
        lastTickAt: new Date().toISOString()
      }),
      
      pause: () => set({ 
        isRunning: false,
        lastTickAt: null
      }),
      
      reset: () => set((state) => ({ 
        remaining: state.duration,
        isRunning: false,
        sessionStartedAt: null,
        lastTickAt: null
      })),
      
      tick: () => set((state) => {
        if (state.remaining <= 0) {
          return { isRunning: false, remaining: 0, lastTickAt: null };
        }
        return { 
          remaining: state.remaining - 1,
          lastTickAt: new Date().toISOString()
        };
      }),
      
      tickReal: () => set((state) => {
        if (!state.isRunning || !state.lastTickAt) return state;
        
        const now = new Date();
        const lastTick = new Date(state.lastTickAt);
        const secondsPassed = Math.floor((now.getTime() - lastTick.getTime()) / 1000);
        
        if (secondsPassed <= 0) return state;
        
        const newRemaining = Math.max(0, state.remaining - secondsPassed);
        
        if (newRemaining === 0) {
          return {
            remaining: 0,
            isRunning: false,
            lastTickAt: null
          };
        }
        
        return {
          remaining: newRemaining,
          lastTickAt: now.toISOString()
        };
      }),
      
      completePomodoro: () => set((state) => ({
        pomodorosCompleted: state.pomodorosCompleted + 1,
        remaining: state.duration,
        isRunning: false,
        sessionStartedAt: null
      })),
      
      resetSession: () => set({
        pomodorosCompleted: 0,
        remaining: 25 * 60,
        duration: 25 * 60,
        isRunning: false,
        sessionStartedAt: null,
        lastTickAt: null
      })
    }),
    {
      name: 'agentic-timer',
      partialize: (state) => ({
        habitId: state.habitId,
        habitName: state.habitName,
        duration: state.duration,
        pomodorosCompleted: state.pomodorosCompleted,
      }),
    }
  )
);
