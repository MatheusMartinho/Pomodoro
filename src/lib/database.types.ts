export type HabitCategory = 'tech' | 'idioma' | 'leitura' | 'fitness' | 'meditacao' | 'carreira';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: HabitCategory;
  unit: string;
  minimum: number;
  target: number;
  maximum: number;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  habit_id: string;
  date: string;
  value: number;
  pomodoros: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSession {
  id: string;
  habit_id: string;
  started_at: string;
  duration_minutes: number;
  completed: boolean;
  note: string | null;
  created_at: string;
}

export interface Season {
  id: string;
  user_id: string;
  name: string;
  focus_habit_id: string | null;
  started_at: string;
  target_end: string;
  ended_at: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitWithEntry extends Habit {
  todayEntry: Entry | null;
  yesterdayEntry: Entry | null;
  streak: number;
}

export interface Database {
  public: {
    Tables: {
      habits: {
        Row: Habit;
        Insert: Omit<Habit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Habit, 'id' | 'created_at' | 'updated_at'>>;
      };
      entries: {
        Row: Entry;
        Insert: Omit<Entry, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Entry, 'id' | 'created_at' | 'updated_at'>>;
      };
      pomodoro_sessions: {
        Row: PomodoroSession;
        Insert: Omit<PomodoroSession, 'id' | 'created_at'>;
        Update: Partial<Omit<PomodoroSession, 'id' | 'created_at'>>;
      };
      seasons: {
        Row: Season;
        Insert: Omit<Season, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Season, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
