'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HabitCard } from '@/components/habits/habit-card';
import { PomodoroTimer } from '@/components/timer/pomodoro-timer';
import { useHabits } from '@/hooks/use-habits';
import { useTimerStore } from '@/lib/store/timer-store';
import { getDayLevel } from '@/lib/utils';
import { BarChart3, Clock3, Coffee, Flame, Target, X } from 'lucide-react';

export default function HomePage() {
  const { habits, loading, error, updateEntry, logPomodoro } = useHabits();
  const { setHabit, habitId } = useTimerStore();
  const [showTimer, setShowTimer] = useState(false);

  
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-10 space-y-8">
        {/* Header + quick stats */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-zinc-500 capitalize">{dayName}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{dateStr}</h1>
            <p className={`text-sm mt-1 font-medium ${color}`}>{level}</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={Target} label="Mínimos" value={`${habitsAtMinimum}/${habits.length}`} accent="from-sky-500/20" />
            <SummaryCard icon={Flame} label="Metas" value={`${habitsAtTarget}/${habits.length}`} accent="from-amber-500/20" />
            <SummaryCard icon={Coffee} label="Pomodoros" value={totalPomodoros} accent="from-rose-500/20" />
            <SummaryCard icon={BarChart3} label="Hábitos" value={habits.length} accent="from-emerald-500/20" />
          </div>
        </header>

        {/* Content grid */}
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          {/* Habits list */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Hoje</h2>
              <span className="text-xs uppercase text-zinc-500">{habits.length} hábitos</span>
            </div>
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 backdrop-blur">
              {habits.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <p>Nenhum hábito cadastrado.</p>
                  <p className="text-sm mt-2">Vá em Configurações para criar seus hábitos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {habits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onQuickLog={updateEntry}
                      onStartTimer={handleStartTimer}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

        {/* Right column */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase text-zinc-500">Timer</p>
                  <h3 className="text-lg font-semibold">Painel do Pomodoro</h3>
                </div>
                <button
                  onClick={() => setShowTimer(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <Clock3 className="w-4 h-4" /> Iniciar
                </button>
              </div>
              <p className="text-sm text-zinc-400">
                Clique em qualquer hábito para começar um ciclo ou use o botão ao lado para abrir o timer completo.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 backdrop-blur space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Resumo rápido</h3>
              <div className="space-y-3 text-sm text-zinc-400">
                <StatLine label="Tempo ativo" value={`${totalPomodoros * 25} min`} />
                <StatLine label="Hábitos completos" value={`${habitsAtMaximum}`} />
                <StatLine label="Precisam de atenção" value={`${habits.length - habitsAtMinimum}`} />
              </div>
            </div>
          </aside>
        </div>
      </div>

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
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
}

function SummaryCard({ icon: Icon, label, value, accent }: SummaryCardProps) {
  return (
    <div className={`rounded-2xl border border-zinc-800/60 bg-gradient-to-br ${accent} to-zinc-900/40 p-4 backdrop-blur flex flex-col gap-2`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
