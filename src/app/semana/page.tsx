'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getHabits, getEntriesByDateRange } from '@/lib/db/habits-service';
import type { Habit, Entry } from '@/lib/database.types';
import { cn, formatMinutes } from '@/lib/utils';

interface WeekData {
  habit: Habit;
  entries: (Entry | null)[];
  weekTotal: number;
  streak: number;
}

export default function SemanaPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const fetchWeekData = async () => {
      setLoading(true);
      
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      try {
        const habits = await getHabits();
        const entries = await getEntriesByDateRange(startDate, endDate);

        const data: WeekData[] = habits.map((habit) => {
          const habitEntries = days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return entries?.find((e) => e.habit_id === habit.id && e.date === dateStr) || null;
          });

          const weekTotal = habitEntries.reduce((sum, e) => sum + (e?.value || 0), 0);

          return {
            habit,
            entries: habitEntries,
            weekTotal,
            streak: 0,
          };
        });

        setWeekData(data);
      } catch (err) {
        console.error('Erro ao carregar dados da semana:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [weekStart]);

  const getCellColor = (entry: Entry | null, habit: Habit): string => {
    if (!entry || entry.value === 0) return 'bg-red-500/30';
    if (entry.value >= habit.maximum) return 'bg-blue-500';
    if (entry.value >= habit.target) return 'bg-green-500';
    if (entry.value >= habit.minimum) return 'bg-yellow-500';
    return 'bg-red-500/30';
  };

  const hasConsecutiveZeros = (entries: (Entry | null)[], index: number, habit: Habit): boolean => {
    if (index === 0) return false;
    const current = entries[index];
    const previous = entries[index - 1];
    return (!current || current.value < habit.minimum) && (!previous || previous.value < habit.minimum);
  };

  const weeklyScore = weekData.reduce((total, { entries, habit }) => {
    return total + entries.reduce((sum, entry) => {
      if (!entry) return sum;
      if (entry.value >= habit.maximum) return sum + 3;
      if (entry.value >= habit.target) return sum + 2;
      if (entry.value >= habit.minimum) return sum + 1;
      return sum;
    }, 0);
  }, 0);

  const totalPomodoros = weekData.reduce((total, { entries }) => {
    return total + entries.reduce((sum, e) => sum + (e?.pomodoros || 0), 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-zinc-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header com navegação de semana */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">
            {format(weekStart, "d MMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "d MMM", { locale: ptBR })}
          </h1>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-center gap-4 text-sm text-zinc-400">
          <span>Score: <span className="text-white font-medium">{weeklyScore}</span></span>
          <span>Pomodoros: <span className="text-white font-medium">{totalPomodoros}</span></span>
        </div>
      </header>

      {/* Grid de dias */}
      <div className="w-full">
        <table className="w-full table-fixed">
          <thead>
            <tr>
              <th className="text-left text-xs text-zinc-500 pb-2 w-20">Hábito</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="text-center text-xs text-zinc-500 pb-2 w-9">
                  <div>{format(day, 'EEEEE', { locale: ptBR })}</div>
                  <div className="text-zinc-600">{format(day, 'd')}</div>
                </th>
              ))}
              <th className="text-right text-xs text-zinc-500 pb-2 w-12">Total</th>
            </tr>
          </thead>
          <tbody>
            {weekData.map(({ habit, entries, weekTotal }) => (
              <tr key={habit.id} className="border-t border-zinc-800">
                <td className="py-1.5">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="text-xs text-white truncate">{habit.name}</span>
                  </div>
                </td>
                {entries.map((entry, i) => (
                  <td key={i} className="py-1.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded flex items-center justify-center text-xs font-medium mx-auto',
                        getCellColor(entry, habit),
                        hasConsecutiveZeros(entries, i, habit) && 'ring-1 ring-red-500'
                      )}
                      title={entry ? `${entry.value} ${habit.unit}` : 'Sem registro'}
                    >
                      {entry?.value || ''}
                    </div>
                  </td>
                ))}
                <td className="py-1.5 text-right">
                  <span className="text-xs text-white font-medium">
                    {habit.unit === 'minutos' ? formatMinutes(weekTotal) : weekTotal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/30" />
          <span>Zero</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>Mínimo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Meta</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Máximo</span>
        </div>
      </div>

      {weekData.length === 0 && (
        <p className="text-center py-12 text-zinc-500">
          Nenhum hábito cadastrado.
        </p>
      )}
    </div>
  );
}
