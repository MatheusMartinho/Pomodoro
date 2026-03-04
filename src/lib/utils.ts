import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function getToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayLevel(
  habitsAtMinimum: number,
  habitsAtTarget: number,
  habitsAtMaximum: number,
  totalHabits: number
): { level: string; color: string } {
  if (totalHabits === 0) return { level: 'Sem hábitos', color: 'text-gray-500' };
  
  const maxRatio = habitsAtMaximum / totalHabits;
  const targetRatio = habitsAtTarget / totalHabits;
  const minRatio = habitsAtMinimum / totalHabits;

  if (maxRatio > 0.5) return { level: 'Dia Monstro', color: 'text-blue-500' };
  if (targetRatio > 0.5) return { level: 'Dia Sólido', color: 'text-green-500' };
  if (minRatio === 1) return { level: 'Dia Mínimo', color: 'text-yellow-500' };
  return { level: 'Em progresso', color: 'text-gray-400' };
}

export function getWeeklyScore(entries: { value: number; minimum: number; target: number; maximum: number }[]): number {
  return entries.reduce((score, entry) => {
    if (entry.value >= entry.maximum) return score + 3;
    if (entry.value >= entry.target) return score + 2;
    if (entry.value >= entry.minimum) return score + 1;
    return score;
  }, 0);
}

export function getProgressLevel(value: number, minimum: number, target: number, maximum: number): 'none' | 'minimum' | 'target' | 'maximum' {
  if (value >= maximum) return 'maximum';
  if (value >= target) return 'target';
  if (value >= minimum) return 'minimum';
  return 'none';
}

export function getProgressColor(level: 'none' | 'minimum' | 'target' | 'maximum'): string {
  switch (level) {
    case 'maximum': return 'bg-blue-500';
    case 'target': return 'bg-green-500';
    case 'minimum': return 'bg-yellow-500';
    default: return 'bg-red-500/30';
  }
}
