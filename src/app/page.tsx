'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HabitCard } from '@/components/habits/habit-card';
import { PomodoroTimer } from '@/components/timer/pomodoro-timer';
import { useHabits } from '@/hooks/use-habits';
import { useTimerStore } from '@/lib/store/timer-store';
import { getDayLevel, getToday } from '@/lib/utils';
import { X } from 'lucide-react';
import { getAllEntries } from '@/lib/db/habits-service';

export default function HomePage() {
  const { habits, loading, error, updateEntry, logPomodoro } = useHabits();
  const { setHabit, habitId } = useTimerStore();
  const [showTimer, setShowTimer] = useState(false);

  // Debug: verificar o que está no banco
  useEffect(() => {
    const debugEntries = async () => {
      const entries = await getAllEntries();
      const todayStr = getToday();
      console.log('[DEBUG] Todas as entries:', entries);
      console.log('[DEBUG] Hoje:', todayStr);
      console.log('[DEBUG] Entries de hoje:', entries.filter(e => e.date === todayStr));
    };
    debugEntries();
  }, []);

  const today = new Date();
  const dayName = format(today, 'EEEE', { locale: ptBR });
  const dateStr = format(today, "d 'de' MMMM", { locale: ptBR });

  const habitsAtMinimum = habits.filter(h => (h.todayEntry?.value ?? 0) >= h.minimum).length;
  const habitsAtTarget = habits.filter(h => (h.todayEntry?.value ?? 0) >= h.target).length;
  const habitsAtMaximum = habits.filter(h => (h.todayEntry?.value ?? 0) >= h.maximum).length;
  const totalPomodoros = habits.reduce((sum, h) => sum + (h.todayEntry?.pomodoros ?? 0), 0);

  const { level, color } = getDayLevel(habitsAtMinimum, habitsAtTarget, habitsAtMaximum, habits.length);

  const handleStartTimer = (id: string, name: string) => {
    setHabit(id, name);
    setShowTimer(true);
  };

  const handlePomodoroComplete = (id: string, duration: number, note?: string) => {
    logPomodoro(id, duration, note);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-zinc-500">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <header className="mb-6">
        <p className="text-sm text-zinc-500 capitalize">{dayName}</p>
        <h1 className="text-2xl font-bold text-white">{dateStr}</h1>
        <p className={`text-sm mt-1 ${color}`}>{level}</p>
      </header>

      {/* Timer Modal */}
      {showTimer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md relative">
            <button
              onClick={() => setShowTimer(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <PomodoroTimer
              onComplete={handlePomodoroComplete}
              onClose={() => setShowTimer(false)}
            />
          </div>
        </div>
      )}

      {/* Lista de hábitos */}
      <div className="space-y-4">
        {habits.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>Nenhum hábito cadastrado.</p>
            <p className="text-sm mt-2">Vá em Configurações para criar seus hábitos.</p>
          </div>
        ) : (
          habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onQuickLog={updateEntry}
              onStartTimer={handleStartTimer}
            />
          ))
        )}
      </div>

      {/* Footer com resumo do dia */}
      {habits.length > 0 && (
        <footer className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-zinc-500">Mínimos:</span>{' '}
              <span className="text-white font-medium">{habitsAtMinimum}/{habits.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">Metas:</span>{' '}
              <span className="text-white font-medium">{habitsAtTarget}/{habits.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">Pomodoros:</span>{' '}
              <span className="text-white font-medium">{totalPomodoros}</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
