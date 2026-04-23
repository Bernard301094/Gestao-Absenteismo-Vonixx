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
  if (count >= MAX_MONTHLY_CALLS)
    throw new Error(`LIMITE DE CUSTO ATINGIDO: ${MAX_MONTHLY_CALLS} chamadas este mês.`);
  await setDoc(quotaRef, { calls: count + 1 }, { merge: true });
}

async function fetchApiKey(provider: AIProvider): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'system', 'ai_config'));
    if (snap.exists()) {
      const d = snap.data();
      if (provider === 'openrouter' && d.openrouterKey) return d.openrouterKey;
      if (provider === 'groq'        && d.groqKey)       return d.groqKey;
    }
  } catch (e) { console.warn('Config fetch failed:', e); }
  if (provider === 'openrouter') return import.meta.env.VITE_OPENROUTER_API_KEY || null;
  if (provider === 'groq')       return import.meta.env.VITE_GROQ_API_KEY       || null;
  return null;
}

const getEndpoint = (p: AIProvider) =>
  p === 'openrouter'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'deepseek/deepseek-r1-0528:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

function truncateMessages(
  messages: { role: string; content: string }[],
  maxChars = 14000
): { role: string; content: string }[] {
  const sys    = messages.find(m => m.role === 'system');
  const users  = messages.filter(m => m.role !== 'system');
  const last   = users[users.length - 1];
  const middle = users.slice(0, -1);
  const budget = maxChars - (sys?.content.length ?? 0) - (last?.content.length ?? 0);
  const kept: { role: string; content: string }[] = [];
  let used = 0;
  for (let i = middle.length - 1; i >= 0; i--) {
    const len = middle[i].content.length;
    if (used + len > budget) break;
    used += len;
    kept.unshift(middle[i]);
  }
  const result: { role: string; content: string }[] = [];
  if (sys)  result.push(sys);
  result.push(...kept);
  if (last) result.push(last);
  return result;
}

// Regras anti-alucinação + formatação Markdown obrigatória
const BASE_RULES = `
⚠️ REGRAS ABSOLUTAS:
1. Use SOMENTE os dados do JSON fornecido. PROIBIDO inventar nomes, números ou situações.
2. Campos "ferias.detalhe" com itens = funcionários EM FÉRIAS. Se array vazio = nenhum em férias.
3. Formato OBRIGATÓRIO: Markdown com cabeçalhos ##/###, **negrito**, tabelas GFM e listas.
4. Cada seção deve ter uma linha em branco antes e depois do cabeçalho.
5. Tabelas GFM: cabeçalho | col1 | col2 | seguido de |---|---| em linha separada.
6. Seja executivo e direto — sem introduções genéricas.
`;

export async function callAI(
  messages: { role: string; content: string }[],
  initialProvider: AIProvider = 'openrouter'
) {
  const providers: AIProvider[] =
    initialProvider === 'openrouter' ? ['openrouter', 'groq'] : ['groq', 'openrouter'];
  await checkAndIncrementQuota();
  const safe = truncateMessages(messages);
  let lastError: any = null;

  for (const provider of providers) {
    const apiKey = await fetchApiKey(provider);
    if (!apiKey) { console.warn(`[AI] Sem chave: ${provider}`); continue; }
    const models = provider === 'openrouter' ? OPENROUTER_FREE_MODELS : ['llama-3.1-8b-instant'];

    for (const model of models) {
      let retries = 0;
      while (retries < 2) {
        try {
          const res = await fetch(getEndpoint(provider), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              ...(provider === 'openrouter' && {
                'HTTP-Referer': window.location.href,
                'X-Title': 'Gestão de Absenteísmo',
              }),
            },
            body: JSON.stringify({ model, messages: safe, temperature: 0.0 }),
          });
          if (res.status === 429) {
            const txt = await res.text().catch(() => '');
            if (txt.includes('rate_limit_exceeded') && txt.includes('tokens')) break;
            const wait = parseInt(res.headers.get('retry-after') || '0') || Math.pow(2, retries);
            await new Promise(r => setTimeout(r, wait * 1000));
            retries++; continue;
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

// ─── Resumo de Turno ──────────────────────────────────────────────────────────
export async function generateShiftSummary(
  shift: string, absentEmployees: any[], criticalEmployees: any[], notes: any[],
  provider: AIProvider = 'openrouter'
) {
  return callAI([
    { role: 'system', content: `Assistente de RH industrial. Gera resumos de handover de turno.\n${BASE_RULES}` },
    { role: 'user', content:
`DADOS DO TURNO ${shift}:
- Faltas hoje: ${JSON.stringify(absentEmployees)}
- Casos críticos: ${JSON.stringify(criticalEmployees)}
- Observações: ${JSON.stringify(notes)}

## 📋 Resumo de Turno — ${shift}

### 👥 Faltas do Dia
(nome em **negrito** + motivo. Se vazio: "Nenhuma falta registrada.")

### 🚨 Casos Críticos
(Se vazio: "Nenhum caso crítico.")

### 📝 Observações
(Se vazio: "Nenhuma observação.")` },
  ], provider);
}

// ─── Análise de Padrões ───────────────────────────────────────────────────────
export async function analyzePatterns(weekdayData: any[], provider: AIProvider = 'groq') {
  return callAI([
    { role: 'system', content: `Analista de dados de RH industrial.\n${BASE_RULES}` },
    { role: 'user', content:
`FALTAS POR DIA: ${JSON.stringify(weekdayData)}

## 📊 Análise de Padrões de Absenteísmo

(Máximo 2 parágrafos com os padrões identificados usando os números exatos. Se sem padrão: "Os dados não indicam concentração em dias específicos.")` },
  ], provider);
}

// ─── Resolução de Férias ──────────────────────────────────────────────────────
export async function suggestVacationResolution(conflictData: any, provider: AIProvider = 'groq') {
  return callAI([
    { role: 'system', content: `Planejador de RH industrial estratégico.\n${BASE_RULES}` },
    { role: 'user', content:
`CONFLITO: ${JSON.stringify(conflictData)}

## 🗓️ Resolução de Conflito de Férias

### Conflito Identificado
(nomes e datas exatos do JSON)

### Proposta de Resolução
(sugestão baseada nos dados)

> Sugestão baseada nos dados do sistema.` },
  ], provider);
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
  // Monta tabela comparativa no código — não deixa para o modelo formatar
  let comparativo = '';
  if (prevSnapshots.length > 0) {
    const rows = prevSnapshots
      .map(s => `| Semana ${s.semana} | ${s.totalFaltas} | ${s.taxaAbsenteismo}% | ${s.semJustificativa} |`)
      .join('\n');
    const atual = `| **Semana ${weekNumber} ✦** | **${payload.metricas.totalFaltas}** | **${payload.metricas.taxaAbsenteismo}%** | **${payload.metricas.totalSemJustificativa}** |`;
    comparativo =
`| Período | Faltas | Absenteísmo | Sem Justificativa |
|---------|--------|-------------|-------------------|
${rows}
${atual}`;
  }

  // Lista de ausentes por férias extraída do payload — pronta para colar
  const feriasDetalhe = payload.ferias?.detalhe ?? [];
  const feriasTexto = feriasDetalhe.length > 0
    ? feriasDetalhe.map((f: any) => `- **${f.nome}** (${f.cargo}) — Férias: ${f.inicioFerias} a ${f.fimFerias}${f.retorno ? `, retorno ${f.retorno}` : ''}`).join('\n')
    : '- Nenhum funcionário em férias neste período.';

  // Faltas sem justificativa — extraídas e prontas
  const semJustTexto = payload.rankingFaltas
    ?.filter((f: any) => f.semJustificativa > 0)
    .map((f: any) => `- **${f.nome}** — ${f.semJustificativa} falta(s) sem justificativa`)
    .join('\n') || '- Todas as faltas foram justificadas.';

  // Top 3 absenteístas — extraídos e prontos
  const top3Texto = payload.rankingFaltas?.length > 0
    ? payload.rankingFaltas.slice(0, 3)
        .map((f: any) => {
          const ocList = f.ocorrencias.map((o: any) => `Dia ${o.dia}: ${o.justificativa}`).join('; ');
          return `- **${f.nome}** (${f.cargo}) — ${f.totalFaltas} falta(s) | ${ocList}`;
        }).join('\n')
    : '- Nenhuma falta registrada neste período.';

  const systemPrompt =
`Você é um Auditor Sênior de RH Industrial.
${BASE_RULES}
INSTRUÇÕES ESPECIAIS:
- A tabela comparativa, lista de férias, faltas sem justificativa e top absenteístas JÁ VÊM PRONTOS no prompt. Copie-os EXATAMENTE, sem reformatar.
- Escreva SOMENTE a seção "Visão Geral" e "Ação Recomendada" com texto narrativo próprio.
- Máximo 300 palavras no total.`;

  const userPrompt =
`DADOS REAIS DA SEMANA ${weekNumber} (Dias ${startDay}–${endDay}):
${JSON.stringify({ turno: payload.turno, totalFuncionarios: payload.totalFuncionarios, metricas: payload.metricas, ferias: payload.ferias })}

Gere a auditoria com EXATAMENTE esta estrutura (copie as seções prontas sem alterar):

## 📅 Auditoria — Semana ${weekNumber} (Dias ${startDay}–${endDay})

### 📊 Visão Geral
(Escreva 1 parágrafo: taxa de absenteísmo ${payload.metricas.taxaAbsenteismo}%, total ${payload.metricas.totalFaltas} faltas, ${payload.ferias?.quantidadeEmFerias ?? 0} em férias. Compare com semana anterior se disponível.)

${comparativo ? `### 📈 Evolução do Mês\n\n${comparativo}\n` : ''}
### ⚠️ Faltas Sem Justificativa

${semJustTexto}

### 🔴 Maiores Absenteístas

${top3Texto}

### 🏖️ Férias no Período

${feriasTexto}

### 🎯 Ação Recomendada
(Escreva máximo 3 ações concretas baseadas nos dados acima. Se sem desvios: "Manter monitoramento padrão.")`;

  return callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], provider);
}

// ─── Dossiê Mensal ────────────────────────────────────────────────────────────
export async function generateMonthlyInsight(
  payload: any,
  weekSnapshots: WeekSnapshot[] = [],
  provider: AIProvider = 'openrouter'
) {
  // Tabela de evolução semanal — montada no código
  let tabelaEvolucao = '';
  if (weekSnapshots.length > 0) {
    const rows = weekSnapshots
      .map(s => `| Semana ${s.semana} | ${s.totalFaltas} | ${s.taxaAbsenteismo}% | ${s.semJustificativa} |`)
      .join('\n');
    tabelaEvolucao =
`| Semana | Faltas | Absenteísmo | Sem Justificativa |
|--------|--------|-------------|-------------------|
${rows}`;
  }

  // Férias no mês — prontas
  const feriasDetalhe = payload.ferias?.detalhe ?? [];
  const feriasTexto = feriasDetalhe.length > 0
    ? feriasDetalhe.map((f: any) => `- **${f.nome}** (${f.cargo}) — ${f.inicioFerias} a ${f.fimFerias}${f.retorno ? `, retorno ${f.retorno}` : ''}`).join('\n')
    : '- Nenhum funcionário em férias no período.';

  // Top absenteístas — prontos
  const topAbsTexto = payload.rankingFaltas?.length > 0
    ? payload.rankingFaltas.slice(0, 5)
        .map((f: any) => {
          const semJust = f.semJustificativa > 0 ? ` | ⚠️ ${f.semJustificativa} sem justificativa` : '';
          return `- **${f.nome}** (${f.cargo}) — ${f.totalFaltas} falta(s)${semJust}`;
        }).join('\n')
    : '- Nenhum caso crítico no período.';

  const systemPrompt =
`Você é um Diretor de RH (CHRO) do setor industrial. Elabora dossiês gerenciais de fechamento de mês.
${BASE_RULES}
INSTRUÇÕES ESPECIAIS:
- Tabela de evolução, lista de férias e top absenteístas JÁ VÊM PRONTOS. Copie-os EXATAMENTE.
- Escreva SOMENTE as seções narrativas: Diagnóstico Estratégico e Diretrizes.
- Máximo 400 palavras no total.`;

  const userPrompt =
`DADOS REAIS DO MÊS — USE SOMENTE ESTES:
${JSON.stringify({ turno: payload.turno, totalFuncionarios: payload.totalFuncionarios, metricas: payload.metricas, ferias: payload.ferias })}

Gere o dossiê com EXATAMENTE esta estrutura:

## 📊 Dossiê Gerencial — Fechamento do Mês

**Turno:** ${payload.turno} | **Funcionários:** ${payload.totalFuncionarios} | **Taxa de Absenteísmo:** ${payload.metricas?.taxaAbsenteismo ?? 0}%

---

### 1. Diagnóstico Estratégico
(1–2 parágrafos: avaliação geral com base nas métricas reais e tendência semanal.)

### 2. Evolução Semanal

${tabelaEvolucao || '_Dados semanais não disponíveis._'}

${tabelaEvolucao ? '(comente a tendência em 1 frase)' : ''}

### 3. Casos Críticos de Absenteísmo

${topAbsTexto}

(Para cada caso com faltas sem justificativa, indique em 1 linha: **Ação recomendada.**)

### 4. Impacto das Férias

${feriasTexto}

(Avalie em 1 frase se o volume de ${payload.ferias?.quantidadeEmFerias ?? 0} funcionário(s) em férias impactou as métricas.)

### 5. Diretrizes para o Próximo Ciclo

(Exatamente 3 metas concretas baseadas nos desvios reais.)

---

> Dossiê gerado automaticamente com base nos registros do sistema.`;

  return callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], provider);
}
