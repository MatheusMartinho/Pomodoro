'use client';

import { useState } from 'react';
import { Plus, Timer, AlertTriangle } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cn, formatMinutes } from '@/lib/utils';
import type { HabitWithEntry } from '@/lib/database.types';

interface HabitCardProps {
  habit: HabitWithEntry;
  onQuickLog: (habitId: string, value: number) => void;
  onStartTimer: (habitId: string, habitName: string) => void;
}

export function HabitCard({ habit, onQuickLog, onStartTimer }: HabitCardProps) {
  const [isLogging, setIsLogging] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const currentValue = habit.todayEntry?.value ?? 0;
  const yesterdayValue = habit.yesterdayEntry?.value ?? 0;
  const failedYesterday = yesterdayValue < habit.minimum;
  const isTimeBased = habit.unit === 'minutos';

  const handleQuickLog = () => {
    const value = parseInt(inputValue, 10);
    if (!isNaN(value) && value > 0) {
      onQuickLog(habit.id, currentValue + value);
      setInputValue('');
      setIsLogging(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleQuickLog();
    if (e.key === 'Escape') {
      setIsLogging(false);
      setInputValue('');
    }
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-zinc-900 border transition-all',
        failedYesterday && currentValue < habit.minimum
          ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
          : 'border-zinc-800'
      )}
    >
      {/* Header com alerta "Nunca Falhe 2x" */}
      {failedYesterday && currentValue < habit.minimum && (
        <div className="flex items-center gap-2 mb-3 text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Ontem foi zero. Hoje é inegociável.</span>
        </div>
      )}

      {/* Nome e valor atual */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: habit.color }}
          />
          <span className="font-medium text-white">{habit.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">
            {isTimeBased ? formatMinutes(currentValue) : currentValue}
          </span>
          <span className="text-sm text-zinc-500">{habit.unit}</span>
        </div>
      </div>

      {/* Barra de progresso tripla */}
      <ProgressBar
        value={currentValue}
        minimum={habit.minimum}
        target={habit.target}
        maximum={habit.maximum}
        className="mb-3"
      />

      {/* Labels de mínimo/meta/máximo */}
      <div className="flex justify-between text-xs text-zinc-500 mb-4">
        <span className={cn(currentValue >= habit.minimum && 'text-yellow-500')}>
          Min: {habit.minimum}
        </span>
        <span className={cn(currentValue >= habit.target && 'text-green-500')}>
          Meta: {habit.target}
        </span>
        <span className={cn(currentValue >= habit.maximum && 'text-blue-500')}>
          Max: {habit.maximum}
        </span>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {isLogging ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={habit.unit}
              autoFocus
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={handleQuickLog}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setIsLogging(false);
                setInputValue('');
              }}
              className="px-3 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setIsLogging(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Log</span>
            </button>
            {isTimeBased && (
              <button
                onClick={() => onStartTimer(habit.id, habit.name)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
              >
                <Timer className="w-4 h-4" />
                <span>Timer</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Streak */}
      {habit.streak > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800 text-sm text-zinc-400">
          🔥 {habit.streak} dias seguidos
        </div>
      )}
    </div>
  );
}
