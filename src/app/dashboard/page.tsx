'use client';

import { useState, useEffect } from 'react';
import { format, startOfYear, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getHabits, getAllEntries } from '@/lib/db/habits-service';
import type { Habit, Entry } from '@/lib/database.types';
import { formatMinutes, cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Stats {
  totalMinutes: number;
  totalPomodoros: number;
  totalPages: number;
  activeDays: number;
  totalDays: number;
}

interface HeatmapDay {
  date: string;
  value: number;
  level: number;
}

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats>({ totalMinutes: 0, totalPomodoros: 0, totalPages: 0, activeDays: 0, totalDays: 0 });
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ week: string; [key: string]: number | string }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const habitsData = await getHabits();
        const entriesData = await getAllEntries();

        setHabits(habitsData);
        setEntries(entriesData);

        if (entriesData && habitsData) {
          const minuteHabits = habitsData.filter(h => h.unit === 'minutos').map(h => h.id);
          const pageHabits = habitsData.filter(h => h.unit === 'paginas').map(h => h.id);

          const totalMinutes = entriesData
            .filter(e => minuteHabits.includes(e.habit_id))
            .reduce((sum, e) => sum + e.value, 0);

          const totalPages = entriesData
            .filter(e => pageHabits.includes(e.habit_id))
            .reduce((sum, e) => sum + e.value, 0);

          const totalPomodoros = entriesData.reduce((sum, e) => sum + e.pomodoros, 0);

          const uniqueDays = new Set(entriesData.filter(e => e.value > 0).map(e => e.date));
          const daysInYear = eachDayOfInterval({ start: startOfYear(new Date()), end: new Date() });

          setStats({
            totalMinutes,
            totalPomodoros,
            totalPages,
            activeDays: uniqueDays.size,
            totalDays: daysInYear.length,
          });

          const heatmap: HeatmapDay[] = daysInYear.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesData.filter(e => e.date === dateStr);
            const totalValue = dayEntries.reduce((sum, e) => sum + e.value, 0);
            let level = 0;
            if (totalValue > 0) level = 1;
            if (totalValue >= 30) level = 2;
            if (totalValue >= 60) level = 3;
            if (totalValue >= 120) level = 4;
            return { date: dateStr, value: totalValue, level };
          });
          setHeatmapData(heatmap);

          const categoryTotals: Record<string, { value: number; color: string }> = {};
          habitsData.forEach(habit => {
            const habitEntries = entriesData.filter(e => e.habit_id === habit.id);
            const total = habitEntries.reduce((sum, e) => sum + e.value, 0);
            if (!categoryTotals[habit.category]) {
              categoryTotals[habit.category] = { value: 0, color: habit.color };
            }
            categoryTotals[habit.category].value += total;
          });
          setCategoryData(Object.entries(categoryTotals).map(([name, data]) => ({
            name,
            value: data.value,
            color: data.color,
          })));
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getLevelColor = (level: number): string => {
    switch (level) {
      case 0: return 'bg-zinc-800';
      case 1: return 'bg-green-900';
      case 2: return 'bg-green-700';
      case 3: return 'bg-green-500';
      case 4: return 'bg-green-400';
      default: return 'bg-zinc-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-zinc-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">Seu progresso acumulado</p>
      </header>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Horas de Estudo</p>
          <p className="text-2xl font-bold text-white">{Math.floor(stats.totalMinutes / 60)}h</p>
          <p className="text-xs text-zinc-600">{stats.totalMinutes % 60}min</p>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Pomodoros</p>
          <p className="text-2xl font-bold text-white">{stats.totalPomodoros}</p>
          <p className="text-xs text-zinc-600">completados</p>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Páginas Lidas</p>
          <p className="text-2xl font-bold text-white">{stats.totalPages}</p>
          <p className="text-xs text-zinc-600">páginas</p>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Dias Ativos</p>
          <p className="text-2xl font-bold text-white">{stats.activeDays}</p>
          <p className="text-xs text-zinc-600">de {stats.totalDays}</p>
        </div>
      </div>

      {/* Heatmap anual */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Atividade no Ano</h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-[2px] flex-wrap" style={{ maxWidth: '100%' }}>
            {heatmapData.map((day) => (
              <div
                key={day.date}
                className={cn('w-[10px] h-[10px] rounded-sm', getLevelColor(day.level))}
                title={`${format(new Date(day.date), 'd MMM', { locale: ptBR })}: ${day.value} min`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-zinc-500">
          <span>Menos</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={cn('w-[10px] h-[10px] rounded-sm', getLevelColor(level))} />
          ))}
          <span>Mais</span>
        </div>
      </section>

      {/* Distribuição por categoria */}
      {categoryData.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Distribuição por Categoria</h2>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                    <span className="text-zinc-400 capitalize">{cat.name}</span>
                  </div>
                  <span className="text-white font-medium">{formatMinutes(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Records pessoais */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Records Pessoais</h2>
        <div className="space-y-2">
          {habits.slice(0, 3).map((habit) => {
            const habitEntries = entries.filter(e => e.habit_id === habit.id);
            const maxDay = habitEntries.reduce((max, e) => e.value > max ? e.value : max, 0);
            const streak = habitEntries.filter(e => e.value >= habit.minimum).length;
            
            return (
              <div key={habit.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: habit.color }} />
                  <span className="text-sm text-white">{habit.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white font-medium">
                    {habit.unit === 'minutos' ? formatMinutes(maxDay) : maxDay} max
                  </p>
                  <p className="text-xs text-zinc-500">{streak} dias no mínimo</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
