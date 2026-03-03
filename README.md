# Agentic Tracker

Seu sistema pessoal de progresso: pomodoros, hábitos, rotação sazonal, e a motivação que vem de ver os números.

## O Conceito

Um app pessoal que combina 3 coisas que não existem juntas:
- **Habit tracker com pisos mínimos** (não só 'fiz/não fiz', mas quanto)
- **Timer pomodoro integrado** (que automaticamente loga tempo no hábito)
- **Dashboard de progresso** que mostra dados acumulados ao longo do tempo

## Stack

- **Frontend:** Next.js 14 + Tailwind CSS + App Router
- **Database:** SQLite no browser (sql.js) - 100% offline-first
- **Charts:** Recharts
- **State:** Zustand
- **Deploy:** Vercel (ou qualquer host estático)

## Setup

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

**Pronto!** Não precisa de backend, banco de dados externo, ou configuração. Todos os dados são salvos localmente no browser usando SQLite (sql.js) e persistidos no localStorage.

## Telas

| Tela | Descrição |
|------|-----------|
| **HOJE** | Lista de hábitos com barra de progresso tripla (mínimo/meta/máximo), quick log, e alerta "Nunca Falhe 2x" |
| **TIMER** | Pomodoro circular que auto-loga no hábito selecionado |
| **SEMANA** | Grid colorido estilo GitHub contributions |
| **DASHBOARD** | Horas acumuladas, heatmap anual, distribuição por categoria |
| **TEMPORADA** | Ciclos de 6-8 semanas com reflexão |
| **CONFIG** | Gerenciar hábitos (criar, editar, desativar) |

## Modelo de Dados

- **habits:** Definição dos hábitos com mínimo/meta/máximo
- **entries:** Logs diários de cada hábito
- **pomodoro_sessions:** Sessões individuais de pomodoro
- **seasons:** Rotação sazonal (ciclos de 6-8 semanas)

## Gamificação Sutil

- **Streaks:** Dias consecutivos que atingiu o mínimo
- **Milestones:** '100 horas de Deep Work', '500 páginas lidas'
- **Nível do dia:** 'Dia Mínimo', 'Dia Sólido', 'Dia Monstro'
- **Weekly score:** mínimo = 1pt, meta = 2pts, máximo = 3pts

## Deploy

```bash
npm run build
```

Deploy automático via Vercel conectando o repositório GitHub.

## Licença

MIT
