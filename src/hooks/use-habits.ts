'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getHabitsWithEntries, upsertEntry, logPomodoroSession } from '@/lib/db/habits-service';
import type { HabitWithEntry } from '@/lib/database.types';
import { getToday, getYesterday } from '@/lib/utils';

export function useHabits() {
  const [habits, setHabits] = useState<HabitWithEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(getToday());
  const lastDateRef = useRef(getToday());

  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      // Sempre usar data fresca
      const today = getToday();
      const yesterday = getYesterday();
      const habitsWithEntries = await getHabitsWithEntries(today, yesterday);
      setHabits(habitsWithEntries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar hábitos');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEntry = useCallback(async (habitId: string, value: number, pomodoros?: number) => {
    try {
      const today = getToday();
      const yesterday = getYesterday();
      await upsertEntry(habitId, today, value, pomodoros);
      const habitsWithEntries = await getHabitsWithEntries(today, yesterday);
      setHabits([...habitsWithEntries]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar entry');
    }
  }, []);

  const logPomodoro = useCallback(async (habitId: string, durationMinutes: number, note?: string) => {
    try {
      const today = getToday();
      const yesterday = getYesterday();
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
  }, []);

  // Verificar mudança de dia a cada minuto
  useEffect(() => {
    const checkDateChange = () => {
      const now = getToday();
      if (now !== lastDateRef.current) {
        lastDateRef.current = now;
        setCurrentDate(now);
        fetchHabits(); // Recarregar dados para o novo dia
      }
    };

    // Verificar imediatamente
    checkDateChange();

    // Verificar a cada minuto
    const interval = setInterval(checkDateChange, 60000);
    
    return () => clearInterval(interval);
  }, [fetchHabits]);

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
