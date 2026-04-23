import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { WeekSnapshot } from '../hooks/useAIInsights';

export type AIProvider = 'openrouter' | 'groq';

const MAX_MONTHLY_CALLS = 200;

async function checkAndIncrementQuota(): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}_${now.getMonth() + 1}`;
  const quotaRef = doc(db, 'system', `ai_quota_${monthKey}`);
  const snap = await getDoc(quotaRef);
  const count = snap.exists() ? (snap.data().calls || 0) : 0;
  if (count >= MAX_MONTHLY_CALLS) {
    throw new Error(`LIMITE DE CUSTO ATINGIDO: Você atingiu o limite de ${MAX_MONTHLY_CALLS} chamadas este mês.`);
  }
  await setDoc(quotaRef, { calls: count + 1 }, { merge: true });
}

async function fetchApiKey(provider: AIProvider): Promise<string | null> {
  try {
    const configSnap = await getDoc(doc(db, 'system', 'ai_config'));
    if (configSnap.exists()) {
      const data = configSnap.data();
      if (provider === 'openrouter' && data.openrouterKey) return data.openrouterKey;
      if (provider === 'groq' && data.groqKey) return data.groqKey;
    }
  } catch (e) {
    console.warn('Firestore config check failed:', e);
  }
  if (provider === 'openrouter') return import.meta.env.VITE_OPENROUTER_API_KEY || null;
  if (provider === 'groq') return import.meta.env.VITE_GROQ_API_KEY || null;
  return null;
}

const getEndpoint = (provider: AIProvider) =>
  provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'deepseek/deepseek-r1-0528:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

const getModel = (provider: AIProvider) =>
  provider === 'groq' ? 'llama-3.1-8b-instant' : OPENROUTER_FREE_MODELS[0];

// Preserva SEMPRE a última mensagem user (dados reais) ao truncar
function truncateMessages(
  messages: { role: string; content: string }[],
  maxChars = 14000
): { role: string; content: string }[] {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs  = messages.filter(m => m.role !== 'system');
  const lastUser  = userMsgs[userMsgs.length - 1];
  const middle    = userMsgs.slice(0, -1);

  const reserved = (systemMsg?.content.length ?? 0) + (lastUser?.content.length ?? 0);
  const budget   = maxChars - reserved;

  const kept: { role: string; content: string }[] = [];
  let used = 0;
  for (let i = middle.length - 1; i >= 0; i--) {
    const len = middle[i].content.length;
    if (used + len > budget) break;
    used += len;
    kept.unshift(middle[i]);
  }

  const result: { role: string; content: string }[] = [];
  if (systemMsg) result.push(systemMsg);
  result.push(...kept);
  if (lastUser)  result.push(lastUser);
  return result;
}

// Regras anti-alucinação injetadas em todos os prompts
const BASE_RULES = `
⚠️ REGRAS ABSOLUTAS:
1. Use SOMENTE os dados do JSON fornecido. PROIBIDO inventar nomes, números ou situações.
2. Se um array estiver vazio [], escreva "Nenhum registro" para aquela seção.
3. Formato de saída: Markdown renderizável com ##, **negrito**, tabelas e listas.
4. Seja direto e executivo — sem introduções genéricas nem repetição de dados óbvios.
`;

export async function callAI(
  messages: { role: string; content: string }[],
  initialProvider: AIProvider = 'openrouter'
) {
  const providers: AIProvider[] =
    initialProvider === 'openrouter' ? ['openrouter', 'groq'] : ['groq', 'openrouter'];

  await checkAndIncrementQuota();
  const safeMessages = truncateMessages(messages);
  let lastError: any = null;

  for (const provider of providers) {
    const apiKey = await fetchApiKey(provider);
    if (!apiKey) { console.warn(`[AI] Sem chave para ${provider}`); continue; }

    const models = provider === 'openrouter' ? OPENROUTER_FREE_MODELS : [getModel('groq')];

    for (const model of models) {
      let retries = 0;
      while (retries < 2) {
        try {
          const res = await fetch(getEndpoint(provider), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              ...(provider === 'openrouter' && {
                'HTTP-Referer': window.location.href,
                'X-Title': 'Gestão de Absenteísmo',
              }),
            },
            body: JSON.stringify({ model, messages: safeMessages, temperature: 0.0 }),
          });

          if (res.status === 429) {
            const txt = await res.text().catch(() => '');
            if (txt.includes('rate_limit_exceeded') && txt.includes('tokens')) break;
            const wait = parseInt(res.headers.get('retry-after') || '0') || Math.pow(2, retries);
            await new Promise(r => setTimeout(r, wait * 1000));
            retries++;
            continue;
          }
          if (!res.ok) throw new Error(await res.text());

          const data = await res.json();
          console.log(`[AI] ✅ ${provider}/${model}`);
          return data.choices?.[0]?.message?.content || '';
        } catch (err: any) {
          lastError = err;
          console.error(`[AI] ❌ ${provider}/${model}:`, err.message);
          break;
        }
      }
    }
  }
  throw new Error(`Falha em todos os provedores. Último erro: ${lastError?.message || 'Sem conexão.'}`);
}

// ─── Resumo de Turno (Handover) ───────────────────────────────────────────────
export async function generateShiftSummary(
  shift: string,
  absentEmployees: any[],
  criticalEmployees: any[],
  notes: any[],
  provider: AIProvider = 'openrouter'
) {
  const systemPrompt = `Você é um assistente de RH industrial. Gere resumos de handover de turno.
${BASE_RULES}`;

  const userPrompt = `DADOS DO TURNO ${shift}:
- Faltas hoje: ${JSON.stringify(absentEmployees)}
- Funcionários críticos (muitas faltas no mês): ${JSON.stringify(criticalEmployees)}
- Observações do dia: ${JSON.stringify(notes)}

ESTRUTURA:
## 📋 Resumo de Turno — ${shift}
### 👥 Faltas do Dia
(liste ausentes com nome em **negrito** e motivo. Se vazio: "Nenhuma falta registrada.")
### 🚨 Casos Críticos
(funcionários com alto índice mensal. Se vazio: "Nenhum caso crítico.")
### 📝 Observações
(observações registradas. Se vazio: "Nenhuma observação.")
> Gerado automaticamente com base nos registros do sistema.`;

  return callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], provider);
}

// ─── Análise de Padrões ───────────────────────────────────────────────────────
export async function analyzePatterns(weekdayData: any[], provider: AIProvider = 'groq') {
  const systemPrompt = `Você é um analista de dados de RH industrial.
${BASE_RULES}`;
  const userPrompt = `FALTAS POR DIA DA SEMANA: ${JSON.stringify(weekdayData)}

Gere em máximo 2 parágrafos os padrões identificados. Formato:
## 📊 Análise de Padrões de Absenteísmo
(Se não houver padrão claro: "Os dados não indicam concentração em dias específicos.")`;
  return callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], provider);
}

// ─── Resolução de Conflitos de Férias ────────────────────────────────────────
export async function suggestVacationResolution(conflictData: any, provider: AIProvider = 'groq') {
  const systemPrompt = `Você é um planejador de RH industrial estratégico.
${BASE_RULES}`;
  const userPrompt = `CONFLITO DE FÉRIAS: ${JSON.stringify(conflictData)}

ESTRUTURA:
## 🗓️ Resolução de Conflito de Férias
### Conflito Identificado
(descreva com nomes e datas exatos do JSON)
### Proposta de Resolução
(sugira realocação de datas com base nos dados)
> Sugestão baseada nos dados do sistema.`;
  return callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], provider);
}

// ─── Auditoria Semanal ────────────────────────────────────────────────────────
export async function generateWeeklyInsight(
  payload: any,
  weekNumber: number,
  startDay: number,
  endDay: number,
  historySummary: string = '',
  prevSnapshots: WeekSnapshot[] = [],
  provider: AIProvider = 'groq'
) {
  const systemPrompt = `Você é um Auditor Sênior de RH Industrial. Gere auditorias executivas de presença de turno.
${BASE_RULES}
DIRETRIZES DE QUALIDADE:
- Seja narrativo e executivo, não liste todos os funcionários presentes
- Destaque apenas os casos que merecem atenção gerencial
- O comparativo com semanas anteriores deve ser quantitativo (use os números reais)
- Férias: mencione quantos estão ausentes por férias e se isso impacta a operação
- Faltas sem justificativa são mais críticas — destaque-as separadamente
- Máximo 400 palavras no total`;

  // Monta tabela comparativa se houver histórico
  let tabelaComparativa = '';
  if (prevSnapshots.length > 0) {
    const linhas = prevSnapshots
      .map(s => `| Semana ${s.semana} | ${s.totalFaltas} | ${s.taxaAbsenteismo}% | ${s.semJustificativa} |`)
      .join('\n');
    const atual = `| **Semana ${weekNumber} (atual)** | **${payload.metricas.totalFaltas}** | **${payload.metricas.taxaAbsenteismo}%** | **${payload.metricas.totalSemJustificativa}** |`;
    tabelaComparativa = `\n| Período | Faltas | Absenteísmo | Sem Justificativa |\n|---------|--------|-------------|-------------------|\n${linhas}\n${atual}`;
  }

  const userPrompt =
`DADOS REAIS DA SEMANA ${weekNumber} (Dias ${startDay}–${endDay}) — USE SOMENTE ESTES:
${JSON.stringify(payload)}

COMPARATIVO COM SEMANAS ANTERIORES:
${tabelaComparativa || historySummary || 'Primeira semana — sem histórico anterior.'}

Gere a auditoria com EXATAMENTE esta estrutura:

## 📅 Auditoria — Semana ${weekNumber} (Dias ${startDay}–${endDay})

### 📊 Visão Geral
(1 parágrafo: taxa de absenteísmo %, total de faltas, comparação com semana anterior se disponível, menção a férias ativas)

${tabelaComparativa ? `### 📈 Evolução do Mês
(insira a tabela comparativa acima)
` : ''}
### ⚠️ Faltas Sem Justificativa
(liste APENAS os funcionários com faltas SEM justificativa do campo rankingFaltas. Se nenhum: "Todas as faltas foram justificadas.")

### 🔴 Maiores Absenteístas
(liste os TOP 3 do rankingFaltas com nome em **negrito**, total de faltas e justificativas. Se rankingFaltas vazio: "Nenhuma falta registrada neste período.")

### 🏖️ Férias no Período
(mencione quantos funcionários estão em férias e liste os nomes. Se nenhum: "Nenhum funcionário em férias neste período.")

### 🎯 Ação Recomendada
(máximo 3 ações concretas baseadas nos desvios reais. Se sem desvios: "Manter monitoramento padrão — semana sem ocorrências críticas.")

NÃO invente nomes, números ou situações ausentes no JSON.`;

  return callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], provider);
}

// ─── Dossiê Gerencial Mensal ──────────────────────────────────────────────────
export async function generateMonthlyInsight(
  payload: any,
  weekSnapshots: WeekSnapshot[] = [],
  provider: AIProvider = 'openrouter'
) {
  const systemPrompt = `Você é um Diretor de RH (CHRO) do setor industrial. Elabore dossiês gerenciais de fechamento de mês.
${BASE_RULES}
DIRETRIZES DE QUALIDADE:
- Relatório executivo: diagnóstico estratégico, não lista de presença
- Evolução semanal deve ser analisada com tendência (melhora/piora)
- Faltas sem justificativa são um indicador crítico de gestão — destaque-as
- Férias: avalie se o volume de férias ativas impactou as métricas do mês
- Identifique padrões (reincidência, cargos mais afetados)
- Máximo 500 palavras`;

  // Tabela de evolução semanal
  let tabelaEvolucao = '';
  if (weekSnapshots.length > 0) {
    const linhas = weekSnapshots
      .map(s => `| Semana ${s.semana} | ${s.totalFaltas} | ${s.taxaAbsenteismo}% | ${s.semJustificativa} |`)
      .join('\n');
    tabelaEvolucao = `| Semana | Faltas | Absenteísmo | Sem Justificativa |\n|--------|--------|-------------|-------------------|\n${linhas}`;
  }

  const userPrompt =
`DADOS REAIS DO MÊS — USE SOMENTE ESTES:
${JSON.stringify(payload)}

EVOLUÇÃO SEMANAL DO MÊS:
${tabelaEvolucao || 'Dados semanais não disponíveis.'}

Gere o dossiê com EXATAMENTE esta estrutura:

## 📊 Dossiê Gerencial — Fechamento do Mês
**Turno:** ${payload.turno} | **Total de Funcionários:** ${payload.totalFuncionarios} | **Taxa de Absenteísmo:** ${payload.metricas?.taxaAbsenteismo ?? 0}%

---

### 1. Diagnóstico Estratégico
(1–2 parágrafos: avaliação geral do mês com base nas métricas reais. Mencione tendência ao longo das semanas se disponível.)

### 2. Evolução Semanal
${tabelaEvolucao ? '(insira a tabela de evolução acima e comente a tendência)' : '(Dados semanais não disponíveis.)'}

### 3. Casos Críticos de Absenteísmo
(TOP absenteístas do campo rankingFaltas com **nome**, totalFaltas, semJustificativa e ocorrências.
Para cada um, indique: **Ação recomendada** — feedback corretivo / atenção médica / monitoramento.
Se rankingFaltas vazio: "Nenhum caso crítico no período.")

### 4. Impacto das Férias
(Avalie se o volume de ${payload.ferias?.quantidadeEmFerias ?? 0} funcionários em férias durante o mês afetou a operação. Liste os nomes do campo ferias.detalhe.)

### 5. Diretrizes para o Próximo Ciclo
(exatamente 3 metas concretas baseadas nos desvios reais encontrados. Se sem desvios: metas de manutenção.)

---
> Dossiê gerado automaticamente com base nos registros do sistema.

NÃO invente nomes, números ou situações ausentes no JSON.`;

  return callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], provider);
}
