-- Agentic Tracker - Database Schema
-- 4 tabelas principais: habits, entries, pomodoro_sessions, seasons

-- Enum para categorias de hábitos
CREATE TYPE habit_category AS ENUM ('tech', 'idioma', 'leitura', 'fitness', 'meditacao', 'carreira');

-- 1. HABITS - Definição dos hábitos com mínimo/meta/máximo
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category habit_category NOT NULL DEFAULT 'tech',
  unit TEXT NOT NULL DEFAULT 'minutos', -- 'minutos', 'paginas', 'sessao'
  minimum INTEGER NOT NULL DEFAULT 5, -- Piso mínimo (ex: 5 min Anki)
  target INTEGER NOT NULL DEFAULT 30, -- Meta normal (ex: 30 min)
  maximum INTEGER NOT NULL DEFAULT 60, -- Alta temporada (ex: 60 min)
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Cor hex para dashboard
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ENTRIES - Logs diários de cada hábito
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value INTEGER NOT NULL DEFAULT 0, -- Quanto fez (ex: 25 min, 20 páginas)
  pomodoros INTEGER NOT NULL DEFAULT 0, -- Quantos pomodoros completos
  note TEXT, -- Nota opcional ('estudei DDIA cap 3')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, date) -- Um entry por hábito por dia
);

-- 3. POMODORO_SESSIONS - Sessões individuais de pomodoro
CREATE TABLE pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INTEGER NOT NULL DEFAULT 25, -- 25 padrão, 50 para deep work
  completed BOOLEAN NOT NULL DEFAULT false, -- True se completou, false se cancelou
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SEASONS - Rotação sazonal (ciclos de 6-8 semanas)
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Tech: System Design', 'Alemão push B1'
  focus_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL, -- Hábito em foco
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  target_end DATE NOT NULL, -- 6-8 semanas depois
  ended_at DATE, -- Null = ativo
  reflection TEXT, -- Reflexão ao fechar o ciclo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES para performance
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_active ON habits(user_id, is_active);
CREATE INDEX idx_entries_habit_date ON entries(habit_id, date);
CREATE INDEX idx_entries_date ON entries(date);
CREATE INDEX idx_pomodoro_habit ON pomodoro_sessions(habit_id);
CREATE INDEX idx_pomodoro_started ON pomodoro_sessions(started_at);
CREATE INDEX idx_seasons_user ON seasons(user_id);
CREATE INDEX idx_seasons_active ON seasons(user_id, ended_at) WHERE ended_at IS NULL;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Policies para habits
CREATE POLICY "Users can view own habits" ON habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para entries (via habit ownership)
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = entries.habit_id AND habits.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own entries" ON entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = entries.habit_id AND habits.user_id = auth.uid())
  );

CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = entries.habit_id AND habits.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = entries.habit_id AND habits.user_id = auth.uid())
  );

-- Policies para pomodoro_sessions (via habit ownership)
CREATE POLICY "Users can view own pomodoro sessions" ON pomodoro_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = pomodoro_sessions.habit_id AND habits.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own pomodoro sessions" ON pomodoro_sessions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = pomodoro_sessions.habit_id AND habits.user_id = auth.uid())
  );

CREATE POLICY "Users can update own pomodoro sessions" ON pomodoro_sessions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM habits WHERE habits.id = pomodoro_sessions.habit_id AND habits.user_id = auth.uid())
  );

-- Policies para seasons
CREATE POLICY "Users can view own seasons" ON seasons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seasons" ON seasons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seasons" ON seasons
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own seasons" ON seasons
  FOR DELETE USING (auth.uid() = user_id);

-- FUNCTIONS para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VIEW para dashboard aggregations (performance)
CREATE OR REPLACE VIEW habit_stats AS
SELECT 
  h.id as habit_id,
  h.user_id,
  h.name,
  h.unit,
  h.minimum,
  h.target,
  h.maximum,
  h.color,
  COALESCE(SUM(e.value), 0) as total_value,
  COALESCE(SUM(e.pomodoros), 0) as total_pomodoros,
  COUNT(DISTINCT e.date) FILTER (WHERE e.value >= h.minimum) as days_minimum,
  COUNT(DISTINCT e.date) FILTER (WHERE e.value >= h.target) as days_target,
  COUNT(DISTINCT e.date) FILTER (WHERE e.value >= h.maximum) as days_maximum
FROM habits h
LEFT JOIN entries e ON h.id = e.habit_id
WHERE h.is_active = true
GROUP BY h.id;

-- RPC para calcular streak atual de um hábito
CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  min_value INTEGER;
  entry_value INTEGER;
BEGIN
  SELECT minimum INTO min_value FROM habits WHERE id = p_habit_id;
  
  LOOP
    SELECT value INTO entry_value 
    FROM entries 
    WHERE habit_id = p_habit_id AND date = check_date;
    
    IF entry_value IS NULL OR entry_value < min_value THEN
      EXIT;
    END IF;
    
    streak := streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;
  
  RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
