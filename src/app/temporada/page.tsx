'use client';

import { useState, useEffect } from 'react';
import { format, differenceInWeeks, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronRight } from 'lucide-react';
import { getHabits } from '@/lib/db/habits-service';
import { getSeasons, createSeason, endSeason } from '@/lib/db/seasons-service';
import type { Habit, Season } from '@/lib/database.types';

export default function TemporadaPage() {
  const [currentSeason, setCurrentSeason] = useState<(Season & { focusHabit?: Habit }) | null>(null);
  const [pastSeasons, setPastSeasons] = useState<Season[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showEndForm, setShowEndForm] = useState(false);
  const [reflection, setReflection] = useState('');
  const [newSeason, setNewSeason] = useState({ name: '', focusHabitId: '', weeks: 6 });

  const fetchData = async () => {
    setLoading(true);

    try {
      const habitsData = await getHabits();
      const { active, past } = await getSeasons();

      setHabits(habitsData);
      setPastSeasons(past);

      if (active) {
        const focusHabit = habitsData.find(h => h.id === active.focus_habit_id);
        setCurrentSeason({ ...active, focusHabit });
      } else {
        setCurrentSeason(null);
      }
    } catch (err) {
      console.error('Erro ao carregar temporadas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSeason = async () => {
    await createSeason({
      name: newSeason.name,
      focusHabitId: newSeason.focusHabitId || undefined,
      weeks: newSeason.weeks,
    });

    setShowNewForm(false);
    setNewSeason({ name: '', focusHabitId: '', weeks: 6 });
    await fetchData();
  };

  const handleEndSeason = async () => {
    if (!currentSeason) return;

    await endSeason(currentSeason.id, reflection);

    setShowEndForm(false);
    setReflection('');
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-zinc-500">Carregando...</div>
      </div>
    );
  }

  const weeksElapsed = currentSeason
    ? differenceInWeeks(new Date(), new Date(currentSeason.started_at))
    : 0;
  const totalWeeks = currentSeason
    ? differenceInWeeks(new Date(currentSeason.target_end), new Date(currentSeason.started_at))
    : 0;
  const daysRemaining = currentSeason
    ? differenceInDays(new Date(currentSeason.target_end), new Date())
    : 0;

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Temporada</h1>
        <p className="text-sm text-zinc-500">Ciclos de foco de 6-8 semanas</p>
      </header>

      {/* Temporada atual */}
      {currentSeason ? (
        <section className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Temporada Atual</p>
              <h2 className="text-lg font-semibold text-white">{currentSeason.name}</h2>
              {currentSeason.focusHabit && (
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentSeason.focusHabit.color }}
                  />
                  <span className="text-sm text-zinc-400">
                    Foco: {currentSeason.focusHabit.name}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {weeksElapsed + 1}/{totalWeeks}
              </p>
              <p className="text-xs text-zinc-500">semanas</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min((weeksElapsed / totalWeeks) * 100, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">
              Início: {format(new Date(currentSeason.started_at), "d MMM", { locale: ptBR })}
            </span>
            {daysRemaining > 0 ? (
              <span className="text-zinc-400">{daysRemaining} dias restantes</span>
            ) : (
              <span className="text-amber-400">Hora de avaliar!</span>
            )}
          </div>

          {/* Alerta de fim de temporada */}
          {daysRemaining <= 7 && daysRemaining > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400">
                Temporada na semana {weeksElapsed + 1}. Hora de avaliar: estender ou rodar?
              </p>
            </div>
          )}

          <button
            onClick={() => setShowEndForm(true)}
            className="w-full mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
          >
            Encerrar Ciclo
          </button>
        </section>
      ) : (
        <section className="p-6 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed text-center">
          <p className="text-zinc-500 mb-4">Nenhuma temporada ativa</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Temporada
          </button>
        </section>
      )}

      {/* Histórico */}
      {pastSeasons.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Histórico</h2>
          <div className="space-y-2">
            {pastSeasons.map((season) => {
              const weeks = differenceInWeeks(
                new Date(season.ended_at!),
                new Date(season.started_at)
              );
              return (
                <div
                  key={season.id}
                  className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{season.name}</p>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(season.started_at), "MMM yyyy", { locale: ptBR })} • {weeks} semanas
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal nova temporada */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Nova Temporada</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nome do Ciclo</label>
                <input
                  type="text"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  placeholder="Ex: Tech: System Design"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Hábito em Foco (opcional)</label>
                <select
                  value={newSeason.focusHabitId}
                  onChange={(e) => setNewSeason({ ...newSeason, focusHabitId: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Nenhum</option>
                  {habits.map((habit) => (
                    <option key={habit.id} value={habit.id}>{habit.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Duração</label>
                <div className="flex gap-2">
                  {[6, 7, 8].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setNewSeason({ ...newSeason, weeks: w })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                        newSeason.weeks === w
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {w} semanas
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSeason}
                  disabled={!newSeason.name}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal encerrar temporada */}
      {showEndForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Encerrar Ciclo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">O que funcionou?</label>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Reflexões sobre o ciclo..."
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEndForm(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEndSeason}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Encerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
