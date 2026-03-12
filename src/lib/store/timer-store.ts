/**
 * timer-store.ts - Estado Global do Timer (Zustand)
 * 
 * O que é Zustand?
 * Zustand é uma biblioteca de gerenciamento de estado (como Redux, mas mais simples).
 * Ele cria um "store" (armazém) de estado que pode ser acessado de qualquer componente.
 * 
 * Diferença para useState:
 * - useState = estado LOCAL (só um componente pode usar)
 * - Zustand = estado GLOBAL (múltiplos componentes podem acessar)
 * 
 * Isso é útil porque o Timer precisa ser controlado pelo PomodoroTimer,
 * mas também pode precisar ser lido por outros componentes.
 */

// Indica que este código roda no navegador
'use client';

// Importação do create e persist do Zustand
import { create } from 'zustand'; // Cria o store
import { persist } from 'zustand/middleware'; // Salva no localStorage automaticamente

/**
 * Interface TimerState - Define a estrutura do estado do timer
 * 
 * É como um "contrato" que define quais dados e funções existem no store.
 * TypeScript usa isso para garantir que estamos usando o store corretamente.
 */
interface TimerState {
  habitId: string | null;
  habitName: string | null;
  duration: number;
  remaining: number;
  isRunning: boolean;
  pomodorosCompleted: number;
  sessionStartedAt: string | null;
  targetEndAt: string | null;
  
  setHabit: (id: string, name: string) => void;
  setDuration: (minutes: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  tickReal: () => void;
  completePomodoro: () => void;
  resetSession: () => void;
}

/**
 * CRIAÇÃO DO STORE
 * 
 * create<TimerState>() cria o store tipado com nossa interface
 * persist() é um middleware que salva o estado no localStorage do navegador
 * (assim, se fechar a aba e voltar, o timer não perde o progresso)
 */
export const useTimerStore = create<TimerState>()(
  // persist recebe uma função que retorna o estado inicial e as ações
  persist(
    /**
     * A função (set, get) => ({ ... }) define o estado inicial e as ações
     * - set: função para atualizar o estado
     * - get: função para ler o estado atual
     */
    (set, get) => ({
      // === ESTADO INICIAL ===
      habitId: null,           // Nenhum hábito selecionado
      habitName: null,
      duration: 25 * 60,       // 25 minutos em segundos (1500)
      remaining: 25 * 60,      // Tempo restante = duração total
      isRunning: false,        // Timer começa pausado
      pomodorosCompleted: 0,   // Nenhum pomodoro completado
      sessionStartedAt: null,  // Sessão ainda não começou
      targetEndAt: null,

      /**
       * setHabit - Define qual hábito está sendo trabalhado
       * Usado quando usuário clica em um hábito para iniciar o timer
       */
      setHabit: (id, name) => set({ habitId: id, habitName: name }),
      
      /**
       * setDuration - Altera a duração do timer
       * @param minutes - Duração em minutos (ex: 25 ou 50)
       * Quando muda a duração, também reseta o remaining
       */
      setDuration: (minutes) => set({ 
        duration: minutes * 60,      // Converte minutos para segundos
        remaining: minutes * 60      // Zera o tempo restante para nova duração
      }),
      
      /**
       * start - Inicia o timer
       * Define isRunning como true e registra o timestamp atual
       * Usa get().sessionStartedAt || para manter a hora original se já estava rodando
       */
      start: () => {
        const now = new Date();
        const current = get();
        const endTime = new Date(now.getTime() + current.remaining * 1000);
        set({ 
          isRunning: true,
          sessionStartedAt: current.sessionStartedAt || now.toISOString(),
          targetEndAt: endTime.toISOString()
        });
      },
      
      /**
       * pause - Pausa o timer
       * Simplesmente define isRunning como false
       */
      pause: () => {
        const state = get();
        if (state.isRunning && state.targetEndAt) {
          const remaining = Math.max(0, Math.floor((new Date(state.targetEndAt).getTime() - Date.now()) / 1000));
          set({ isRunning: false, remaining, targetEndAt: null });
        } else {
          set({ isRunning: false, targetEndAt: null });
        }
      },
      
      /**
       * reset - Reseta o timer para o tempo original
       * Mantém a duração mas volta o remaining para o início
       * Usa função (state) => para acessar o estado atual
       */
      reset: () => set((state) => ({ 
        remaining: state.duration,
        isRunning: false,
        sessionStartedAt: null,
        targetEndAt: null
      })),
      
      tick: () => set((state) => {
        if (!state.isRunning || !state.targetEndAt) return state;
        
        const now = Date.now();
        const endTime = new Date(state.targetEndAt).getTime();
        const newRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        if (newRemaining <= 0) {
          return { remaining: 0, isRunning: false, targetEndAt: null };
        }
        
        return { remaining: newRemaining };
      }),
      
      tickReal: () => set((state) => {
        if (!state.isRunning || !state.targetEndAt) return state;
        
        const now = Date.now();
        const endTime = new Date(state.targetEndAt).getTime();
        const newRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
        
        if (newRemaining <= 0) {
          return { remaining: 0, isRunning: false, targetEndAt: null };
        }
        
        return { remaining: newRemaining };
      }),
      
      /**
       * completePomodoro - Marca um pomodoro como completo
       * Incrementa contador e reseta o timer para próxima sessão
       */
      completePomodoro: () => set((state) => ({
        pomodorosCompleted: state.pomodorosCompleted + 1,
        remaining: state.duration,
        isRunning: false,
        sessionStartedAt: null,
        targetEndAt: null
      })),
      
      /**
       * resetSession - Reseta toda a sessão de pomodoros
       * Usado quando usuário quer começar do zero
       */
      resetSession: () => set({
        pomodorosCompleted: 0,
        remaining: 25 * 60,
        duration: 25 * 60,
        isRunning: false,
        sessionStartedAt: null,
        targetEndAt: null
      })
    }),
    
    /**
     * CONFIGURAÇÃO DO PERSIST (localStorage)
     * 
     * name: 'agentic-timer' - Chave usada no localStorage
     * partialize: quais campos salvar no localStorage
     * (só salvamos esses 4 campos, não salvamos remaining/isRunning porque
     * podem causar problemas se restaurar com timer "pendente")
     */
    {
      name: 'agentic-timer',  // Nome da chave no localStorage
      partialize: (state) => ({  // Quais campos persistir
        habitId: state.habitId,
        habitName: state.habitName,
        duration: state.duration,
        pomodorosCompleted: state.pomodorosCompleted,
      }),
    }
  )
);
