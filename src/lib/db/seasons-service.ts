'use client';

import { getDatabase, save, generateId } from './database';
import type { Season } from '../database.types';

export async function getSeasons(): Promise<{ active: Season | null; past: Season[] }> {
  const db = await getDatabase();
  
  const activeResult = db.exec(`
    SELECT * FROM seasons 
    WHERE ended_at IS NULL 
    ORDER BY started_at DESC 
    LIMIT 1
  `);
  
  const pastResult = db.exec(`
    SELECT * FROM seasons 
    WHERE ended_at IS NOT NULL 
    ORDER BY ended_at DESC
  `);
  
  let active: Season | null = null;
  if (activeResult.length && activeResult[0].values.length) {
    const columns = activeResult[0].columns;
    const row = activeResult[0].values[0];
    const season: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      season[col] = row[i];
    });
    active = season as unknown as Season;
  }
  
  const past: Season[] = [];
  if (pastResult.length) {
    const columns = pastResult[0].columns;
    pastResult[0].values.forEach((row) => {
      const season: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        season[col] = row[i];
      });
      past.push(season as unknown as Season);
    });
  }
  
  return { active, past };
}

export async function createSeason(data: {
  name: string;
  focusHabitId?: string;
  weeks: number;
}): Promise<Season> {
  const db = await getDatabase();
  const id = generateId();
  
  const startedAt = new Date().toISOString().split('T')[0];
  const targetEnd = new Date();
  targetEnd.setDate(targetEnd.getDate() + data.weeks * 7);
  const targetEndStr = targetEnd.toISOString().split('T')[0];
  
  db.run(`
    INSERT INTO seasons (id, name, focus_habit_id, started_at, target_end)
    VALUES (?, ?, ?, ?, ?)
  `, [id, data.name, data.focusHabitId || null, startedAt, targetEndStr]);
  
  save();
  
  return {
    id,
    user_id: 'local',
    name: data.name,
    focus_habit_id: data.focusHabitId || null,
    started_at: startedAt,
    target_end: targetEndStr,
    ended_at: null,
    reflection: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function endSeason(id: string, reflection: string): Promise<void> {
  const db = await getDatabase();
  const endedAt = new Date().toISOString().split('T')[0];
  
  db.run(`
    UPDATE seasons 
    SET ended_at = ?, reflection = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [endedAt, reflection, id]);
  
  save();
}
