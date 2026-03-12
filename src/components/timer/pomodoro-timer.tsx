/**
 * pomodoro-timer.tsx - Componente do Timer Pomodoro
 * 
 * Este é o componente principal de timer. Ele:
 * 1. Exibe o timer circular com progresso visual
 * 2. Controla start/pause/reset do timer
 * 3. Detecta quando o timer chega a zero
 * 4. Oferece pausas após completar um pomodoro
 * 5. Envia notificações quando termina
 * 6. Compensa tempo perdido quando a aba fica inativa
 */

// Indica que roda no navegador
'use client';

// Importação de hooks do React
import { useEffect, useState, useCallback, useRef } from 'react';

// Importação de ícones da biblioteca Lucide
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';

// Importação do store global do timer (Zustand)
import { useTimerStore } from '@/lib/store/timer-store';

// Importação de funções utilitárias
import { cn, formatTime } from '@/lib/utils'; // cn = className conditional, formatTime = formata segundos para MM:SS

/**
 * Interface das props que o componente recebe
 * 
 * Props são dados passados de um componente pai para um componente filho.
 * Aqui, o componente pai (page.tsx) passa:
 * - onComplete: função para chamar quando timer termina
 * - onClose: função para fechar o modal (opcional)
 */
interface PomodoroTimerProps {
  onComplete: (habitId: string, durationMinutes: number, note?: string) => void;
  onClose?: () => void;
}

/**
 * Componente PomodoroTimer
 * 
 * export function é a forma de exportar um componente React para ser usado em outros arquivos
 */
export function PomodoroTimer({ onComplete, onClose }: PomodoroTimerProps) {
  // === ACESSO AO ESTADO GLOBAL (Zustand) ===
  // O componente "se conecta" ao store do timer para ler e modificar o estado
  const {
    habitId,              // ID do hábito atual
    habitName,            // Nome do hábito para exibir
    duration,             // Duração total em segundos
    remaining,            // Tempo restante em segundos
    isRunning,            // Está rodando?
    pomodorosCompleted,   // Quantos pomodoros já completados
    start,                // Função para iniciar
    pause,                // Função para pausar
    reset,                // Função para resetar
    tick,                 // Função para decrementar 1 segundo
    tickReal,             // Função para calcular tempo real
    completePomodoro,     // Função para marcar como completo
    setDuration,          // Função para mudar duração
  } = useTimerStore();

  // === ESTADOS LOCAIS DO COMPONENTE ===
  // Diferente do Zustand, estes só existem neste componente
  
  // showBreakPrompt: controla se deve mostrar o popup de pausa
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);
  
  // isBreak: controla se está em modo pausa (vs modo trabalho)
  const [isBreak, setIsBreak] = useState(false);

  // === CÁLCULOS DERIVADOS ===
  // Não são estado, são calculados a partir do estado existente
  
  // progress: percentual do timer que já passou (0-100)
  const progress = ((duration - remaining) / duration) * 100;
  
  // durationMinutes: duração em minutos (para exibir)
  const durationMinutes = duration / 60;

  /**
   * useEffect principal - Lógica do timer com setInterval
   * 
   * O setInterval é a forma padrão de criar um timer em JavaScript.
   * Nota: O navegador pode pausar este intervalo quando a aba não está visível
   * (para economizar bateria), mas volta a funcionar quando volta para a aba.
   */
  // Estado para rastrear se o timer já foi completado nesta sessão
  const completedRef = useRef(false);

  useEffect(() => {
    // Variável para guardar o intervalo
    let interval: NodeJS.Timeout;
    
    // SE o timer está rodando E ainda tem tempo restante
    if (isRunning && remaining > 0) {
      // Cria um intervalo que chama tick() a cada 1000ms (1 segundo)
      interval = setInterval(tick, 1000);
      completedRef.current = false;
      
    } else if (remaining === 0 && !completedRef.current) {
      // SE o tempo chegou a zero E ainda não foi processado
      completedRef.current = true;
      
      // Verifica se estava em modo pausa ou modo trabalho
      if (isBreak) {
        // === MODO PAUSA TERMINOU ===
        setIsBreak(false);
        setDuration(25);
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pausa terminada! ☕', {
            body: 'Hora de voltar ao trabalho!',
          });
        }
        
      } else if (habitId) {
        // === POMODORO DE TRABALHO TERMINOU ===
        console.log('Pomodoro completed! Saving to database...');
        
        // Chama a função onComplete (recebida por props) para salvar no banco
        onComplete(habitId, durationMinutes, undefined);
        
        // Marca pomodoro como completo no store
        completePomodoro();
        
        // Mostra o popup de opções de pausa
        setShowBreakPrompt(true);
        
        // Envia notificação de sucesso
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pomodoro Completo! 🍅', {
            body: `${durationMinutes} minutos de ${habitName} registrados.`,
          });
        }
      }
    }

    // cleanup: quando o useEffect rodar de novo ou o componente desmontar,
    // limpa o intervalo para evitar vazamento de memória
    return () => clearInterval(interval);
    
  }, [isRunning, remaining, tick, pause, habitId, durationMinutes, habitName, onComplete, completePomodoro, isBreak, setDuration]);

  /**
   * useEffect para atualizar o timer quando volta para a aba
   * 
   * Quando o usuário volta para a aba, calcula quanto tempo passou
   * e atualiza o timer corretamente (compensa o tempo perdido)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        tickReal();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, tickReal]);

  /**
   * useEffect para permissões de notificação
   * 
   * Executa uma vez ao montar o componente.
   * Se o usuário ainda não deu permissão para notificações, pede permissão.
   */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /**
   * handleStartBreak - Inicia uma pausa
   * @param minutes - Duração da pausa (5 ou 15)
   */
  const handleStartBreak = (minutes: number) => {
    setShowBreakPrompt(false);  // Esconde o popup
    setIsBreak(true);            // Entra em modo pausa
    setDuration(minutes);        // Define duração da pausa
    start();                     // Inicia o timer de pausa
  };

  /**
   * handleSkipBreak - Pula a pausa
   * Usuário não quer fazer pausa, volta direto para trabalho
   */
  const handleSkipBreak = () => {
    setShowBreakPrompt(false);  // Esconde o popup
    setIsBreak(false);           // Sai do modo pausa
    setDuration(25);             // Reseta para 25 minutos de trabalho
  };

  /**
   * handleClose - Fecha o timer
   * 
   * Se o usuário fechou com tempo restante, salva o tempo parcial
   * (ex: estudou 10 minutos e fechou, salva os 10 minutos)
   */
  const handleClose = () => {
    // Calcula quanto tempo já passou (em segundos)
    const elapsedSeconds = duration - remaining;
    // Converte para minutos (arredondando para baixo)
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    
    // Se estudou pelo menos 1 minuto E não está em pausa
    if (elapsedMinutes > 0 && habitId && !isBreak) {
      // Salva o tempo parcial no banco
      onComplete(habitId, elapsedMinutes, undefined);
    }
    
    // Reseta o timer e fecha o modal
    reset();
    onClose?.(); // O ?. significa "se onClose existir, chame-o"
  };

  // === RENDERIZAÇÃO CONDICIONAL ===
  // Se não há hábito selecionado, mostra mensagem
  if (!habitId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-zinc-400">Selecione um hábito para iniciar o timer</p>
      </div>
    );
  }

  // === RENDERIZAÇÃO PRINCIPAL ===
  return (
    <div className="flex flex-col items-center p-6">
      
      {/* === CABEÇALHO === */}
      {/* Nome do hábito e contador de pomodoros */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-white">{habitName}</h2>
        <p className="text-sm text-zinc-400">
          Pomodoro {pomodorosCompleted + 1}/4
        </p>
      </div>

      {/* === TIMER CIRCULAR === */}
      {/* Um círculo SVG que mostra o progresso visual */}
      <div className="relative w-64 h-64 mb-8">
        {/* SVG é uma linguagem de gráficos vetoriais */}
        <svg className="w-full h-full transform -rotate-90">
          {/* Círculo de fundo (cinza) - representa 100% do tempo */}
          <circle
            cx="128" cy="128" r="120"  // centro (128,128), raio 120
            fill="none"                  // sem preenchimento
            stroke="#27272a"            // cor cinza escuro
            strokeWidth="8"             // espessura da linha
          />
          {/* Círculo de progresso (azul ou verde) - representa tempo restante */}
          <circle
            cx="128" cy="128" r="120"
            fill="none"
            // Se chegou a zero, verde. Senão, azul.
            stroke={remaining === 0 ? '#22c55e' : '#3b82f6'}
            strokeWidth="8"
            strokeLinecap="round"       // pontas arredondadas
            // strokeDasharray = comprimento da linha tracejada (perímetro do círculo)
            strokeDasharray={2 * Math.PI * 120}
            // strokeDashoffset = quanto do círculo está "oculto"
            // Calcula para mostrar o progresso
            strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
            className="transition-all duration-1000"  // animação suave
          />
        </svg>
        
        {/* Texto central sobreposto ao círculo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-mono font-bold text-white">
            {formatTime(remaining)}  {/* Formata segundos para "MM:SS" */}
          </span>
          <span className="text-sm text-zinc-400 mt-2">
            {isBreak ? 'Pausa' : `${durationMinutes} min`}
          </span>
        </div>
      </div>

      {/* === POPUP DE PAUSA === */}
      {/* Mostra depois que completa um pomodoro */}
      {showBreakPrompt && (
        <div className="w-full max-w-sm mb-6 p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-2 mb-3 text-white">
            <Coffee className="w-5 h-5" />
            <span className="font-medium">Hora da pausa!</span>
          </div>
          <div className="flex gap-2">
            {/* Botão de pausa de 5 minutos */}
            <button
              onClick={() => handleStartBreak(5)}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
            >
              5 min
            </button>
            {/* Botão de pausa de 15 minutos */}
            <button
              onClick={() => handleStartBreak(15)}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
            >
              15 min
            </button>
            {/* Botão para pular a pausa */}
            <button
              onClick={handleSkipBreak}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded-lg text-sm transition-colors"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* === BOTÕES DE CONTROLE === */}
      {/* Só mostra se não está no popup de pausa */}
      {!showBreakPrompt && (
        <div className="flex items-center gap-4">
          {/* Botão de reset (↺) */}
          <button
            onClick={reset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-full transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          
          {/* Botão principal: Play ou Pause */}
          <button
            onClick={isRunning ? pause : start}  // Se rodando, pause. Se parado, start.
            className={cn(
              'p-5 rounded-full transition-colors',
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500'  // Amarelo quando rodando
                : 'bg-green-600 hover:bg-green-500'   // Verde quando parado
            )}
          >
            {isRunning ? (
              <Pause className="w-8 h-8 text-white" />  // Ícone de pause
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />  // Ícone de play
            )}
          </button>
          
          {/* Botão de fechar (X) - só aparece se onClose foi passado */}
          {onClose && (
            <button
              onClick={handleClose}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-full transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* === SELETOR DE DURAÇÃO === */}
      {/* Só mostra se não está rodando e não está no popup de pausa */}
      {!isRunning && !showBreakPrompt && (
        <div className="flex gap-2 mt-6">
          {/* Cria botões para 25 e 50 minutos */}
          {[25, 50].map((mins) => (
            <button
              key={mins}
              onClick={() => setDuration(mins)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-colors',
                // Se é a duração atual, azul. Senão, cinza.
                durationMinutes === mins
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              )}
            >
              {mins} min
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
