'use client';

import { useState, useEffect, useCallback } from 'react';
import { getHabitsWithEntries, upsertEntry, logPomodoroSession } from '@/lib/db/habits-service';
import type { HabitWithEntry } from '@/lib/database.types';
import { getToday, getYesterday } from '@/lib/utils';

export function useHabits() {
  const [habits, setHabits] = useState<HabitWithEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = getToday();
  const yesterday = getYesterday();

  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      const habitsWithEntries = await getHabitsWithEntries(today, yesterday);
      setHabits(habitsWithEntries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar hábitos');
    } finally {
      setLoading(false);
    }
  }, [today, yesterday]);

  const updateEntry = useCallback(async (habitId: string, value: number, pomodoros?: number) => {
    try {
      await upsertEntry(habitId, today, value, pomodoros);
      const habitsWithEntries = await getHabitsWithEntries(today, yesterday);
      setHabits([...habitsWithEntries]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar entry');
    }
  }, [today, yesterday]);

  const logPomodoro = useCallback(async (habitId: string, durationMinutes: number, note?: string) => {
    try {
      await logPomodoroSession(habitId, durationMinutes, note);
      
      // Buscar valor atual diretamente do banco para evitar stale closure
      const freshHabits = await getHabitsWithEntries(today, yesterday);
      const habit = freshHabits.find((h) => h.id === habitId);
      const currentValue = habit?.todayEntry?.value || 0;
      
      await upsertEntry(habitId, today, currentValue + durationMinutes, 1);
      
      // Atualizar estado com dados frescos
      const updatedHabits = await getHabitsWithEntries(today, yesterday);
      setHabits([...updatedHabits]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pomodoro');
    }
  }, [today, yesterday]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return {
    habits,
    loading,
    error,
    refetch: fetchHabits,
    updateEntry,
    logPomodoro,
  };
}
