'use client'; // Indica que este componente roda no cliente (navegador)

import { useState } from 'react'; // Hook do React para estado local
import { format } from 'date-fns'; // Biblioteca para formatar datas
import { ptBR } from 'date-fns/locale'; // Locale português brasileiro
import { HabitCard } from '@/components/habits/habit-card'; // Componente de card de hábito
import { PomodoroTimer } from '@/components/timer/pomodoro-timer'; // Componente do timer
import { useHabits } from '@/hooks/use-habits'; // Hook customizado para gerenciar hábitos
import { useTimerStore } from '@/lib/store/timer-store'; // Store global do timer (Zustand)
import { getDayLevel } from '@/lib/utils'; // Utilitário para calcular nível do dia
import { BarChart3, Clock3, Coffee, Flame, Target, X } from 'lucide-react'; // Ícones
import { DbSizeCheck } from '@/components/db-size-check';

export default function HomePage() {
  // Hook useHabits: busca dados dos hábitos do banco e expõe funções
  const { habits, loading, error, updateEntry, logPomodoro } = useHabits();
  
  // Hook useTimerStore: acessa estado global do timer (Zustand)
  const { setHabit, habitId } = useTimerStore();
  
  // Estado local: controla se o modal do timer está visível
  const [showTimer, setShowTimer] = useState(false);

  // Datas formatadas para exibição no header
  const today = new Date();
  const dayName = format(today, 'EEEE', { locale: ptBR }); // Ex: "Terça-feira"
  const dateStr = format(today, "d 'de' MMMM", { locale: ptBR }); // Ex: "11 de Março"

  // Cálculos das estatísticas do dia
  const habitsAtMinimum = habits.filter(h => (h.todayEntry?.value ?? 0) >= h.minimum).length; // Hábitos que atingiram o mínimo
  const habitsAtTarget = habits.filter(h => (h.todayEntry?.value ?? 0) >= h.target).length; // Hábitos que atingiram a meta
  const habitsAtMaximum = habits.filter(h => (h.todayEntry?.value ?? 0) >= h.maximum).length; // Hábitos que atingiram o máximo
  const totalPomodoros = habits.reduce((sum, h) => sum + (h.todayEntry?.pomodoros ?? 0), 0); // Total de pomodoros do dia

  // Calcula nível do dia baseado nas metas atingidas
  const { level, color } = getDayLevel(habitsAtMinimum, habitsAtTarget, habitsAtMaximum, habits.length);

  // Callback: quando usuário clica em "Iniciar Timer" em um hábito
  const handleStartTimer = (id: string, name: string) => {
    setHabit(id, name); // Define o hábito atual no store global
    setShowTimer(true); // Abre o modal do timer
  };

  // Callback: quando um pomodoro é completado
  const handlePomodoroComplete = (id: string, duration: number, note?: string) => {
    logPomodoro(id, duration, note); // Salva a sessão no banco via hook useHabits
  };

  // Estado de loading: mostra spinner enquanto busca dados do banco
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-zinc-500">Carregando...</div>
      </div>
    );
  }

  // Estado de erro: mostra mensagem de erro se algo der errado
  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      </div>
    );
  }

  // Renderização principal do componente
  return (
    // Container principal com gradiente de fundo e texto branco
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Container centralizado com largura máxima e espaçamento responsivo */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-10 space-y-8">
        
        {/* Header com data e cards de estatísticas rápidas */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Seção da data */}
          <div>
            <p className="text-sm text-zinc-500 capitalize">{dayName}</p> {/* Dia da semana */}
            <h1 className="text-3xl font-semibold tracking-tight">{dateStr}</h1> {/* Data formatada */}
            <p className={`text-sm mt-1 font-medium ${color}`}>{level}</p> {/* Nível do dia com cor dinâmica */}
          </div>
          
          {/* Grid de cards de estatísticas (responsivo: 2 col mobile, 4 col desktop) */}
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={Target} label="Mínimos" value={`${habitsAtMinimum}/${habits.length}`} accent="from-sky-500/20" />
            <SummaryCard icon={Flame} label="Metas" value={`${habitsAtTarget}/${habits.length}`} accent="from-amber-500/20" />
            <SummaryCard icon={Coffee} label="Pomodoros" value={totalPomodoros} accent="from-rose-500/20" />
            <SummaryCard icon={BarChart3} label="Hábitos" value={habits.length} accent="from-emerald-500/20" />
          </div>
        </header>

        {/* Grid principal: lista de hábitos (2/3) + painel lateral (1/3) */}
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          
          {/* Seção da lista de hábitos */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Hoje</h2>
              <span className="text-xs uppercase text-zinc-500">{habits.length} hábitos</span>
            </div>
            
            {/* Container com borda e fundo translúcido para os cards */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 backdrop-blur">
              {habits.length === 0 ? (
                // Mensagem quando não há hábitos cadastrados
                <div className="text-center py-12 text-zinc-500">
                  <p>Nenhum hábito cadastrado.</p>
                  <p className="text-sm mt-2">Vá em Configurações para criar seus hábitos.</p>
                </div>
              ) : (
                // Lista de cards de hábitos
                <div className="space-y-4">
                  {habits.map((habit) => (
                    <HabitCard
                      key={habit.id} // Key única para otimização do React
                      habit={habit} // Dados do hábito
                      onQuickLog={updateEntry} // Callback para log rápido
                      onStartTimer={handleStartTimer} // Callback para iniciar timer
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Coluna lateral com painéis */}
          <aside className="space-y-6">
            
            {/* Painel do Timer */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase text-zinc-500">Timer</p>
                  <h3 className="text-lg font-semibold">Painel do Pomodoro</h3>
                </div>
                {/* Botão para abrir timer diretamente do painel */}
                <button
                  onClick={() => setShowTimer(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <Clock3 className="w-4 h-4" /> Iniciar
                </button>
              </div>
              <p className="text-sm text-zinc-400">
                Clique em qualquer hábito para começar um ciclo ou use o botão ao lado para abrir o timer completo.
              </p>
            </div>

            {/* Painel de resumo rápido */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 backdrop-blur space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Resumo rápido</h3>
              <div className="space-y-3 text-sm text-zinc-400">
                <StatLine label="Tempo ativo" value={`${totalPomodoros * 25} min`} />
                <StatLine label="Hábitos completos" value={`${habitsAtMaximum}`} />
                <StatLine label="Precisam de atenção" value={`${habits.length - habitsAtMinimum}`} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal do Timer (overlay fullscreen) */}
      {showTimer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          {/* Container do modal com fundo escuro e bordas arredondadas */}
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md relative">
            {/* Botão X para fechar o modal */}
            <button
              onClick={() => setShowTimer(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Componente do timer com callbacks */}
            <PomodoroTimer
              onComplete={handlePomodoroComplete} // Callback quando timer termina
              onClose={() => setShowTimer(false)} // Callback para fechar modal
            />
          </div>
        </div>
      )}
      
      <DbSizeCheck />
    </div>
  );
}

// Interface TypeScript para props do SummaryCard
interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>; // Componente de ícone (ex: Target, Flame)
  label: string; // Texto do label (ex: "Mínimos", "Metas")
  value: string | number; // Valor a ser exibido (ex: "3/8", 5)
  accent: string; // Classe de cor para gradiente (ex: "from-sky-500/20")
}

// Componente SummaryCard: card colorido com ícone, label e valor
function SummaryCard({ icon: Icon, label, value, accent }: SummaryCardProps) {
  return (
    // Container com borda, gradiente de fundo e efeito backdrop-blur
    <div className={`rounded-2xl border border-zinc-800/60 bg-gradient-to-br ${accent} to-zinc-900/40 p-4 backdrop-blur flex flex-col gap-2`}>
      {/* Seção do ícone + label */}
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
        <Icon className="w-4 h-4" /> {/* Ícone renderizado */}
        {label} {/* Texto do label */}
      </div>
      <p className="text-2xl font-semibold">{value}</p> {/* Valor principal em destaque */}
    </div>
  );
}

// Componente StatLine: linha de estatística simples (label + valor)
function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span> {/* Label à esquerda, cinza claro */}
      <span className="text-white font-medium">{value}</span> {/* Valor à direita, branco e negrito */}
    </div>
  );
}
