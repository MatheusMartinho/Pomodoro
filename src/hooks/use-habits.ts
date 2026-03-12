/**
 * useHabits.ts - Hook Customizado para Gerenciar Hábitos
 * 
 * Este é um HOOK CUSTOMIZADO do React. Hooks são funções especiais que permitem
 * que componentes React tenham estado e outras funcionalidades.
 * 
 * O que este hook faz:
 * 1. Busca hábitos do banco de dados
 * 2. Permite atualizar valores de hábitos
 * 3. Permite registrar sessões de Pomodoro
 * 4. Detecta automaticamente mudança de dia para atualizar dados
 */

// 'use client' indica que este código roda no navegador (não no servidor Next.js)
'use client';

// Importação de hooks nativos do React
import { useState, useEffect, useCallback, useRef } from 'react';

// Importação de funções do serviço de banco de dados
// Essas funções fazem queries SQL no SQLite do navegador
import { getHabitsWithEntries, upsertEntry, logPomodoroSession } from '@/lib/db/habits-service';

// Importação de tipos TypeScript para garantir que os dados estão no formato correto
import type { HabitWithEntry } from '@/lib/database.types';

// Importação de funções utilitárias para datas
import { getToday, getYesterday } from '@/lib/utils';

/**
 * Função principal do hook - exportada para ser usada em componentes
 * Retorna um objeto com dados e funções que os componentes podem usar
 */
export function useHabits() {
  // === ESTADOS DO HOOK ===
  // useState é um hook que cria estado dentro do componente
  // syntax: const [valor, funcaoParaMudarValor] = useState(valorInicial);
  
  // 'habits' guarda a lista de hábitos com seus dados de hoje
  const [habits, setHabits] = useState<HabitWithEntry[]>([]);
  
  // 'loading' indica se está carregando dados do banco
  const [loading, setLoading] = useState(true);
  
  // 'error' guarda mensagem de erro se algo der errado (null = sem erro)
  const [error, setError] = useState<string | null>(null);
  
  // 'currentDate' guarda a data atual para detectar mudanças de dia
  const [currentDate, setCurrentDate] = useState(getToday());
  
  // 'lastDateRef' é uma referência que persiste entre re-renderizações
  // Usamos useRef em vez de useState porque não precisamos trigger re-render
  const lastDateRef = useRef(getToday());

  /**
   * fetchHabits - Função para buscar hábitos do banco
   * 
   * useCallback é um hook que "memoriza" uma função para que ela
   * não seja recriada em cada render, a menos que suas dependências mudem
   * 
   * O array [] no final significa: "esta função nunca vai mudar"
   */
  const fetchHabits = useCallback(async () => {
    try {
      // Inicia carregamento
      setLoading(true);
      
      // Pega data de hoje e ontem (formato YYYY-MM-DD)
      const today = getToday(); // ex: "2026-03-11"
      const yesterday = getYesterday(); // ex: "2026-03-10"
      
      // Busca hábitos com entradas do banco de dados
      // Esta é uma query SQL que retorna hábitos + valores de hoje
      const habitsWithEntries = await getHabitsWithEntries(today, yesterday);
      
      // Atualiza o estado com os dados recebidos
      setHabits(habitsWithEntries);
      
      // Limpa qualquer erro anterior
      setError(null);
      
    } catch (err) {
      // Se der erro, salva a mensagem de erro
      // err instanceof Error verifica se é um erro JavaScript válido
      setError(err instanceof Error ? err.message : 'Erro ao carregar hábitos');
      
    } finally {
      // finally sempre executa, dando erro ou não
      // Aqui garantimos que loading vira false independente do resultado
      setLoading(false);
    }
  }, []); // Sem dependências - função estável

  /**
   * updateEntry - Função para atualizar o valor de um hábito
   * 
   * @param habitId - ID único do hábito
   * @param value - Novo valor (em minutos, por exemplo)
   * @param pomodoros - Optional: número de pomodoros completados
   */
  const updateEntry = useCallback(async (habitId: string, value: number, pomodoros?: number) => {
    try {
      const today = getToday();
      const yesterday = getYesterday();
      
      // upsertEntry = "update or insert"
      // Se já existe entrada para hoje, atualiza. Se não, cria nova.
      await upsertEntry(habitId, today, value, pomodoros);
      
      // Busca dados atualizados do banco
      const habitsWithEntries = await getHabitsWithEntries(today, yesterday);
      
      // Atualiza estado com novos dados (spreading cria novo array para trigger re-render)
      setHabits([...habitsWithEntries]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar entry');
    }
  }, []);

  /**
   * logPomodoro - Função para registrar uma sessão de Pomodoro completa
   * 
   * Quando o timer termina, chamamos esta função para:
   * 1. Registrar a sessão no histórico
   * 2. Adicionar o tempo ao valor do hábito
   * 3. Incrementar contador de pomodoros
   */
  const logPomodoro = useCallback(async (habitId: string, durationMinutes: number, note?: string) => {
    try {
      const today = getToday();
      const yesterday = getYesterday();
      
      // Primeiro: registra a sessão no histórico de pomodoros
      await logPomodoroSession(habitId, durationMinutes, note);
      
      // CRÍTICO: Busca dados FRESCOS do banco agora
      // Isso evita "stale closure" - onde teríamos dados desatualizados em memória
      const freshHabits = await getHabitsWithEntries(today, yesterday);
      
      // Encontra o hábito específico pelo ID
      const habit = freshHabits.find((h) => h.id === habitId);
      
      // Pega valor atual (ou 0 se não existir)
      const currentValue = habit?.todayEntry?.value || 0;
      
      // Atualiza com novo valor = valor atual + tempo do pomodoro
      // Também incrementa pomodoros em 1
      await upsertEntry(habitId, today, currentValue + durationMinutes, 1);
      
      // Busca dados atualizados novamente para garantir UI correta
      const updatedHabits = await getHabitsWithEntries(today, yesterday);
      setHabits([...updatedHabits]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pomodoro');
    }
  }, []);

  /**
   * useEffect para detectar mudança de dia
   * 
   * useEffect é um hook que executa código em momentos específicos:
   * - Quando o componente monta (primeira vez que aparece)
   * - Quando alguma dependência muda
   * 
   * Aqui: verifica se a data mudou a cada minuto
   */
  useEffect(() => {
    // Função que verifica se mudou o dia
    const checkDateChange = () => {
      const now = getToday(); // Pega data de HOJE
      
      // Se a data de hoje é diferente da última data que salvamos
      if (now !== lastDateRef.current) {
        // Atualiza referência
        lastDateRef.current = now;
        // Atualiza estado (para possível re-render)
        setCurrentDate(now);
        // Recarrega hábitos do banco (agora com nova data)
        fetchHabits();
      }
    };

    // Executa imediatamente ao montar (para caso usuário abriu de madrugada)
    checkDateChange();

    // Configura intervalo para verificar a cada 60 segundos (1 minuto)
    const interval = setInterval(checkDateChange, 60000);
    
    // cleanup: quando componente desmonta, limpa o intervalo
    // Isso evita vazamento de memória e erros
    return () => clearInterval(interval);
    
  }, [fetchHabits]); // Depende de fetchHabits (que é estável com useCallback)

  /**
   * useEffect inicial - executa uma vez ao montar o componente
   * Busca os hábitos do banco quando a página carrega
   */
  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  /**
   * RETORNO DO HOOK
   * 
   * O que este hook expõe para os componentes usarem:
   * - habits: lista de hábitos com dados de hoje
   * - loading: boolean indicando se está carregando
   * - error: mensagem de erro ou null
   * - refetch: função para forçar re-busca de dados
   * - updateEntry: função para atualizar valor de hábito
   * - logPomodoro: função para registrar pomodoro
   */
  return {
    habits,
    loading,
    error,
    refetch: fetchHabits,
    updateEntry,
    logPomodoro,
  };
}
