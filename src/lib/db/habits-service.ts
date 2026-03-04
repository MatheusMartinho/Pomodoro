'use client';

import { getDatabase, save, generateId } from './database';
import type { Habit, Entry, HabitWithEntry } from '../database.types';

function parseRows<T>(result: unknown): T[] {
  if (!result || !Array.isArray(result) || result.length === 0) {
    return [];
  }
  
  // sql.js retorna array de objetos com columns e values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstResult = result[0] as any;
  
  if (!firstResult) {
    return [];
  }
  
  // Tentar acessar columns e values de diferentes formas
  const columns = firstResult.columns || Object.keys(firstResult);
  const values = firstResult.values || [Object.values(firstResult)];
  
  if (!columns || !values || !Array.isArray(values)) {
    return [];
  }
  
  return values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

export async function getHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM habits WHERE is_active = 1 ORDER BY sort_order`);
  const habits: Habit[] = [];
  
  while (stmt.step()) {
    const row = stmt.getAsObject();
    habits.push({
      id: String(row.id),
      user_id: String(row.user_id || 'local'),
      name: String(row.name),
      category: String(row.category) as Habit['category'],
      unit: String(row.unit),
      minimum: Number(row.minimum),
      target: Number(row.target),
      maximum: Number(row.maximum),
      color: String(row.color),
      is_active: true,
      sort_order: Number(row.sort_order),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    });
  }
  stmt.free();
  
  return habits;
}

export async function getAllHabits(): Promise<Habit[]> {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM habits ORDER BY sort_order`);
  const habits: Habit[] = [];
  
  while (stmt.step()) {
    const row = stmt.getAsObject();
    habits.push({
      id: String(row.id),
      user_id: String(row.user_id || 'local'),
      name: String(row.name),
      category: String(row.category) as Habit['category'],
      unit: String(row.unit),
      minimum: Number(row.minimum),
      target: Number(row.target),
      maximum: Number(row.maximum),
      color: String(row.color),
      is_active: Boolean(row.is_active),
      sort_order: Number(row.sort_order),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    });
  }
  stmt.free();
  
  return habits;
}

export async function createHabit(habit: Omit<Habit, 'id' | 'created_at' | 'updated_at'>): Promise<Habit> {
  const db = await getDatabase();
  const id = generateId();
  
  const name = String(habit.name || '').trim();
  const category = String(habit.category || 'tech');
  const unit = String(habit.unit || 'minutos');
  const minimum = Number(habit.minimum) || 5;
  const target = Number(habit.target) || 30;
  const maximum = Number(habit.maximum) || 60;
  const color = String(habit.color || '#3B82F6');
  const isActive = habit.is_active ? 1 : 0;
  const sortOrder = Number(habit.sort_order) || 0;

  console.log('createHabit called with:', { id, name, category, unit, minimum, target, maximum, color, isActive, sortOrder });

  if (!name) {
    throw new Error('Nome do hábito é obrigatório');
  }
  
  // Escapar aspas simples para SQL
  const escapeSql = (str: string) => str.replace(/'/g, "''");
  
  const sql = `
    INSERT INTO habits (id, name, category, unit, minimum, target, maximum, color, is_active, sort_order)
    VALUES ('${escapeSql(id)}', '${escapeSql(name)}', '${escapeSql(category)}', '${escapeSql(unit)}', ${minimum}, ${target}, ${maximum}, '${escapeSql(color)}', ${isActive}, ${sortOrder})
  `;
  
  console.log('Executing SQL:', sql);
  
  try {
    db.run(sql);
    console.log('SQL executed successfully');
  } catch (e) {
    console.error('SQL execution error:', e);
    throw e;
  }
  
  save();
  console.log('Database saved');
  
  // Verificar se foi salvo
  const check = db.exec(`SELECT * FROM habits WHERE id = '${id}'`);
  console.log('Verification query result:', check);
  
  const result = {
    id,
    ...habit,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  console.log('Returning:', result);
  return result;
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  
  const escapeSql = (str: string) => str.replace(/'/g, "''");
  
  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'created_at') {
      if (key === 'is_active') {
        sets.push(`${key} = ${value ? 1 : 0}`);
      } else if (typeof value === 'string') {
        sets.push(`${key} = '${escapeSql(value)}'`);
      } else if (typeof value === 'number') {
        sets.push(`${key} = ${value}`);
      }
    }
  });
  
  sets.push('updated_at = datetime("now")');
  
  const sql = `UPDATE habits SET ${sets.join(', ')} WHERE id = '${id}'`;
  db.run(sql);
  save();
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDatabase();
  db.run(`DELETE FROM habits WHERE id = '${id}'`);
  save();
}

export async function getEntriesByDate(date: string): Promise<Entry[]> {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM entries WHERE date = ?`);
  stmt.bind([date]);
  
  const entries: Entry[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    entries.push({
      id: String(row.id),
      habit_id: String(row.habit_id),
      date: String(row.date),
      value: Number(row.value),
      pomodoros: Number(row.pomodoros),
      note: row.note ? String(row.note) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    });
  }
  stmt.free();
  
  return entries;
}

export async function getEntriesByDateRange(startDate: string, endDate: string): Promise<Entry[]> {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM entries WHERE date >= ? AND date <= ?`);
  stmt.bind([startDate, endDate]);
  
  const entries: Entry[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    entries.push({
      id: String(row.id),
      habit_id: String(row.habit_id),
      date: String(row.date),
      value: Number(row.value) || 0,
      pomodoros: Number(row.pomodoros) || 0,
      note: row.note ? String(row.note) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    });
  }
  stmt.free();
  
  return entries;
}

export async function upsertEntry(habitId: string, date: string, value: number, pomodoros?: number): Promise<void> {
  const db = await getDatabase();
  
  const existing = db.exec(`SELECT * FROM entries WHERE habit_id = '${habitId}' AND date = '${date}'`);
  
  if (existing.length && existing[0] && existing[0].values && existing[0].values.length) {
    const currentPomodoros = Number(existing[0].values[0][4]) || 0;
    const newPomodoros = pomodoros !== undefined ? currentPomodoros + pomodoros : currentPomodoros;
    db.run(`UPDATE entries SET value = ${value}, pomodoros = ${newPomodoros}, updated_at = datetime('now') WHERE habit_id = '${habitId}' AND date = '${date}'`);
  } else {
    const id = generateId();
    db.run(`INSERT INTO entries (id, habit_id, date, value, pomodoros) VALUES ('${id}', '${habitId}', '${date}', ${value}, ${pomodoros || 0})`);
  }
  
  save();
}

export async function logPomodoroSession(habitId: string, durationMinutes: number, note?: string): Promise<void> {
  const db = await getDatabase();
  const id = generateId();
  const escapedNote = note ? note.replace(/'/g, "''") : '';
  
  db.run(`
    INSERT INTO pomodoro_sessions (id, habit_id, duration_minutes, completed, note)
    VALUES ('${id}', '${habitId}', ${durationMinutes}, 1, ${note ? `'${escapedNote}'` : 'NULL'})
  `);
  
  save();
}

export async function getHabitsWithEntries(today: string, yesterday: string): Promise<HabitWithEntry[]> {
  const habits = await getHabits();
  const todayEntries = await getEntriesByDate(today);
  const yesterdayEntries = await getEntriesByDate(yesterday);
  
  return habits.map((habit) => ({
    ...habit,
    todayEntry: todayEntries.find((e) => String(e.habit_id) === String(habit.id)) || null,
    yesterdayEntry: yesterdayEntries.find((e) => String(e.habit_id) === String(habit.id)) || null,
    streak: 0,
  }));
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM entries ORDER BY date DESC`);
  
  const entries: Entry[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    entries.push({
      id: String(row.id),
      habit_id: String(row.habit_id),
      date: String(row.date),
      value: Number(row.value) || 0,
      pomodoros: Number(row.pomodoros) || 0,
      note: row.note ? String(row.note) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    });
  }
  stmt.free();
  
  return entries;
}
