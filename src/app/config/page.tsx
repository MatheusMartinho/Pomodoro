'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Edit2 } from 'lucide-react';
import { getAllHabits, createHabit, updateHabit, deleteHabit } from '@/lib/db/habits-service';
import type { Habit, HabitCategory } from '@/lib/database.types';

const CATEGORIES: { value: HabitCategory; label: string }[] = [
  { value: 'tech', label: 'Tech' },
  { value: 'idioma', label: 'Idioma' },
  { value: 'leitura', label: 'Leitura' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'meditacao', label: 'Meditação' },
  { value: 'carreira', label: 'Carreira' },
];

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

interface HabitForm {
  name: string;
  category: HabitCategory;
  unit: string;
  minimum: number;
  target: number;
  maximum: number;
  color: string;
}

const defaultForm: HabitForm = {
  name: '',
  category: 'tech',
  unit: 'minutos',
  minimum: 5,
  target: 30,
  maximum: 60,
  color: '#3B82F6',
};

export default function ConfigPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchHabits = async () => {
    try {
      const data = await getAllHabits();
      setHabits(data);
    } catch (err) {
      console.error('Erro ao carregar hábitos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        await updateHabit(editingId, {
          name: form.name,
          category: form.category,
          unit: form.unit,
          minimum: form.minimum,
          target: form.target,
          maximum: form.maximum,
          color: form.color,
        });
      } else {
        const newHabit = {
          name: form.name,
          category: form.category,
          unit: form.unit,
          minimum: form.minimum,
          target: form.target,
          maximum: form.maximum,
          color: form.color,
          is_active: true,
          sort_order: habits.length,
          user_id: 'local',
        };
        console.log('Creating habit:', newHabit);
        await createHabit(newHabit);
      }

      await fetchHabits();
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
    } catch (err) {
      console.error('Erro ao salvar hábito:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (habit: Habit) => {
    setForm({
      name: habit.name,
      category: habit.category,
      unit: habit.unit,
      minimum: habit.minimum,
      target: habit.target,
      maximum: habit.maximum,
      color: habit.color,
    });
    setEditingId(habit.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este hábito?')) return;
    
    await deleteHabit(id);
    await fetchHabits();
  };

  const handleToggleActive = async (habit: Habit) => {
    await updateHabit(habit.id, { is_active: !habit.is_active });
    await fetchHabits();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-zinc-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
      </header>

      {/* Seção de Hábitos */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Hábitos</h2>
          <button
            onClick={() => {
              setForm(defaultForm);
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Hábito
          </button>
        </div>

        {/* Lista de hábitos */}
        <div className="space-y-2">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border ${
                habit.is_active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-50'
              }`}
            >
              <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: habit.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{habit.name}</p>
                <p className="text-xs text-zinc-500">
                  {habit.minimum}/{habit.target}/{habit.maximum} {habit.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(habit)}
                  className={`px-2 py-1 text-xs rounded ${
                    habit.is_active
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {habit.is_active ? 'Ativo' : 'Inativo'}
                </button>
                <button
                  onClick={() => handleEdit(habit)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(habit.id)}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {habits.length === 0 && (
            <p className="text-center py-8 text-zinc-500">
              Nenhum hábito cadastrado. Clique em "Novo Hábito" para começar.
            </p>
          )}
        </div>
      </section>

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingId ? 'Editar Hábito' : 'Novo Hábito'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Deep Work"
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as HabitCategory })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Unidade</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="minutos">Minutos</option>
                    <option value="paginas">Páginas</option>
                    <option value="sessao">Sessões</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-yellow-500 mb-1">Mínimo</label>
                  <input
                    type="number"
                    value={form.minimum}
                    onChange={(e) => setForm({ ...form, minimum: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-green-500 mb-1">Meta</label>
                  <input
                    type="number"
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-blue-500 mb-1">Máximo</label>
                  <input
                    type="number"
                    value={form.maximum}
                    onChange={(e) => setForm({ ...form, maximum: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Cor</label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(defaultForm);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
