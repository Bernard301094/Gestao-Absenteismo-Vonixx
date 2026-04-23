import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type AIProvider = 'openrouter' | 'groq';

const MAX_MONTHLY_CALLS = 200;

async function checkAndIncrementQuota(): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}_${now.getMonth() + 1}`;
  const quotaRef = doc(db, 'system', `ai_quota_${monthKey}`);
  const snap = await getDoc(quotaRef);
  let count = 0;
  if (snap.exists()) count = snap.data().calls || 0;
  if (count >= MAX_MONTHLY_CALLS) {
    throw new Error(`LIMITE DE CUSTO ATINGIDO: Você atingiu o limite de ${MAX_MONTHLY_CALLS} chamadas este mês. A IA foi bloqueada para evitar cobranças adicionais.`);
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

const getEndpoint = (provider: AIProvider) => {
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions';
  if (provider === 'groq') return 'https://api.groq.com/openai/v1/chat/completions';
  return '';
};

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'deepseek/deepseek-r1-0528:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

const getModel = (provider: AIProvider) => {
  if (provider === 'groq') return 'llama-3.1-8b-instant';
  return OPENROUTER_FREE_MODELS[0];
};

// Trunca apenas as mensagens que não sejam system ou a última user (dados reais)
// para garantir que o payload de dados NUNCA seja cortado
function truncateMessages(
  messages: { role: string; content: string }[],
  maxChars = 14000
): { role: string; content: string }[] {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');

  // A última mensagem user contém os dados reais — NUNCA truncar
  const lastUserMsg = userMsgs[userMsgs.length - 1];
  const middleMsgs = userMsgs.slice(0, -1);

  const reservedChars = (systemMsg?.content.length ?? 0) + (lastUserMsg?.content.length ?? 0);
  const budgetForMiddle = maxChars - reservedChars;

  const kept: { role: string; content: string }[] = [];
  let used = 0;
  for (let i = middleMsgs.length - 1; i >= 0; i--) {
    const len = middleMsgs[i].content.length;
    if (used + len > budgetForMiddle) break;
    used += len;
    kept.unshift(middleMsgs[i]);
  }

  const result: { role: string; content: string }[] = [];
  if (systemMsg) result.push(systemMsg);
  result.push(...kept);
  if (lastUserMsg) result.push(lastUserMsg);
  return result;
}

// Regra base anti-alucinação e formatação — injetada em todos os prompts
const BASE_RULES = `
⚠️ REGRAS ABSOLUTAS — VIOLAÇÃO DESQUALIFICA O RELATÓRIO:
1. PROIBIDO inventar, supor ou extrapolar qualquer dado que não esteja no JSON fornecido.
2. Se um campo estiver vazio, ausente ou como array vazio [], escreva explicitamente "Nenhum registro" para aquela seção. NUNCA preencha com exemplos fictícios.
3. Use EXCLUSIVAMENTE os nomes, números e datas presentes no JSON. Nenhum nome genérico como "Funcionário A" ou "Colaborador X".
4. FORMATO DE SAÍDA OBRIGATÓRIO: Markdown estilizado renderizável. Use:
   - ## para títulos de seção
   - **negrito** para nomes de funcionários e métricas numéricas
   - > citações em bloco para alertas críticos
   - --- para separadores entre seções
   - Listas com - para itens múltiplos
5. O texto deve estar 100% pronto para ser renderizado em tela — sem texto plano solto.
`;

export async function callAI(
  messages: { role: string; content: string }[],
  initialProvider: AIProvider = 'openrouter'
) {
  const providersToTry: AIProvider[] =
    initialProvider === 'openrouter' ? ['openrouter', 'groq'] : ['groq', 'openrouter'];

  await checkAndIncrementQuota();

  // Trunca preservando SEMPRE a última mensagem user (dados reais)
  const safeMessages = truncateMessages(messages);
  let lastError: any = null;

  for (const currentProvider of providersToTry) {
    const activeApiKey = await fetchApiKey(currentProvider);
    if (!activeApiKey) {
      console.warn(`[AI Service] Chave ausente para ${currentProvider}, pulando...`);
      continue;
    }

    const endpoint = getEndpoint(currentProvider);
    const modelsToTry =
      currentProvider === 'openrouter' ? OPENROUTER_FREE_MODELS : [getModel('groq')];

    for (const model of modelsToTry) {
      let retries = 0;
      const MAX_RETRIES = 2;

      while (retries < MAX_RETRIES) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeApiKey}`,
              ...(currentProvider === 'openrouter' && {
                'HTTP-Referer': window.location.href,
                'X-Title': 'Gestão de Absenteísmo',
              }),
            },
            body: JSON.stringify({ model, messages: safeMessages, temperature: 0.0 }),
          });

          if (response.status === 429) {
            const errText = await response.text().catch(() => '');
            if (errText.includes('rate_limit_exceeded') && errText.includes('tokens')) {
              console.warn(`[AI Service] Limite de tokens em ${currentProvider}/${model}. Próximo modelo...`);
              break;
            }
            const retryAfter = response.headers.get('retry-after');
            const waitTime = retryAfter ? parseInt(retryAfter) : Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            retries++;
            continue;
          }

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro na API (${currentProvider}): ${errText}`);
          }

          const data = await response.json();
          console.log(`[AI Service] ✅ Sucesso com ${currentProvider}/${model}`);
          return data.choices?.[0]?.message?.content || '';

        } catch (err: any) {
          lastError = err;
          console.error(`[AI Service] Falha com ${currentProvider}/${model}:`, err.message);
          break;
        }
      }
    }
  }

  throw new Error(
    `Falha em todos os provedores de IA. Último erro: ${lastError?.message || 'Erro de conexão ou chaves não configuradas.'}`
  );
}

// ─── 1. Resumo de Turno (Handover) ────────────────────────────────────────────
export async function generateShiftSummary(
  shift: string,
  absentEmployees: any[],
  criticalEmployees: any[],
  notes: any[],
  provider: AIProvider = 'openrouter'
) {
  const systemPrompt =
`Você é um assistente de RH industrial sênior responsável por gerar resumos de turno (handover).
O supervisor opera em regime 12x36 (06:00 às 18:00).
${BASE_RULES}
ESTRUTURA OBRIGATÓRIA DO RELATÓRIO:
## 📋 Resumo de Turno — {turno}
---
## 👥 Faltas do Dia
(liste cada funcionário ausente com nome em **negrito** e motivo se disponível. Se array vazio: "Nenhum registro.")
---
## 🚨 Casos Críticos
(funcionários com alto índice de faltas no mês. Se array vazio: "Nenhum caso crítico registrado.")
---
## 📝 Observações do Turno
(observações registradas. Se array vazio: "Nenhuma observação registrada.")
---
> Relatório gerado automaticamente. Informações baseadas exclusivamente nos registros do sistema.`;

  const userPrompt =
`DADOS REAIS DO SISTEMA (use SOMENTE estes):
Turno: ${shift}
Faltas do dia: ${JSON.stringify(absentEmployees)}
Funcionários críticos (muitas faltas no mês): ${JSON.stringify(criticalEmployees)}
Observações registradas hoje: ${JSON.stringify(notes)}

Gere o resumo do turno seguindo EXATAMENTE a estrutura definida. NÃO invente nomes ou dados ausentes.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], provider);
}

// ─── 2. Detecção de Padrões de Comportamento ──────────────────────────────────
export async function analyzePatterns(weekdayData: any[], provider: AIProvider = 'groq') {
  const systemPrompt =
`Você é um analista de dados de RH industrial.
${BASE_RULES}
ESTRUTURA OBRIGATÓRIA:
## 📊 Análise de Padrões de Absenteísmo
---
(Máximo 2 parágrafos. Cada padrão identificado com **dia da semana** em negrito e percentual exato do JSON. Se não houver padrão claro, escreva: "Os dados não indicam padrão concentrado em dias específicos.")`;

  const userPrompt =
`DADOS REAIS DO SISTEMA (use SOMENTE estes):
Faltas por dia da semana: ${JSON.stringify(weekdayData)}

Gere os insights baseando-se SOMENTE nos números acima. NÃO invente dados ausentes.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], provider);
}

// ─── 3. Resolução de Conflitos de Férias ──────────────────────────────────────
export async function suggestVacationResolution(conflictData: any, provider: AIProvider = 'groq') {
  const systemPrompt =
`Você é um planejador de RH industrial estratégico.
${BASE_RULES}
ESTRUTURA OBRIGATÓRIA:
## 🗓️ Resolução de Conflito de Férias
---
### Conflito Identificado
(descreva o conflito com os nomes e datas exatos do JSON)
---
### Proposta de Resolução
(sugira realocação de datas específicas com base nos dados. Não sugira datas que não façam sentido para o período.)
---
> Sugestão baseada nos dados do sistema. Aprovação final sujeita à gestão.`;

  const userPrompt =
`DADOS REAIS DO SISTEMA (use SOMENTE estes):
Conflito detectado: ${JSON.stringify(conflictData)}

Sugira uma resolução baseada SOMENTE nos dados acima. NÃO invente nomes ou datas.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], provider);
}

// ─── 4. Insight Semanal Consolidado ───────────────────────────────────────────
export async function generateWeeklyInsight(
  payload: any,
  weekNumber: number,
  startDay: number,
  endDay: number,
  previousInsights: string = '',
  provider: AIProvider = 'groq'
) {
  const systemPrompt =
`Você é um Auditor Sênior de RH. Analise o desempenho da Semana ${weekNumber} (dias ${startDay} a ${endDay}).
${BASE_RULES}
ESTRUTURA OBRIGATÓRIA:
## 📅 Auditoria — Semana ${weekNumber} (Dias ${startDay}–${endDay})
---
### 📈 Análise de Evolução
(compare com semanas anteriores SE o histórico contiver dados. Se não: "Primeira semana registrada no mês.")
---
### ✅ Destaques Positivos
(copie os nomes em **negrito** do campo "destaquesPositivos" do JSON. Se array vazio: "Nenhum destaque positivo nesta semana.")
---
### ⚠️ Mapeamento de Desvios
(copie os nomes em **negrito** + totalFaltas do campo "pontosAtencao" do JSON. Se array vazio: "Nenhum desvio registrado.")
---
### 🎯 Plano de Ação
(máximo 3 ações concretas baseadas nos desvios reais encontrados. Se nenhum desvio: "Manter o monitoramento padrão.")`;

  // Dados reais SEMPRE no user prompt — o histórico vem depois e é descartável
  const userPrompt =
`DADOS REAIS DA SEMANA ${weekNumber} — USE SOMENTE ESTES:
${JSON.stringify(payload)}

HISTÓRICO RESUMIDO DAS SEMANAS ANTERIORES (apenas para comparação):
${previousInsights || 'Nenhum histórico disponível para este mês ainda.'}

Gere a auditoria usando SOMENTE os dados reais acima. NÃO invente nomes, números ou situações.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], provider);
}

// ─── 5. Insight Mensal Gerencial (Fechamento) ─────────────────────────────────
export async function generateMonthlyInsight(
  payload: any,
  provider: AIProvider = 'openrouter'
) {
  const systemPrompt =
`Você é um Diretor de Recursos Humanos (CHRO) do setor industrial.
Elabore o Relatório Gerencial de Fechamento de Mês para um turno 12x36.
${BASE_RULES}
ESTRUTURA OBRIGATÓRIA:
## 📊 Dossiê Gerencial de RH — Fechamento do Mês
---
### 1. Balanço Estratégico
(diagnóstico baseado nos dados reais do JSON: total de funcionários, férias ativas e ausências.)
---
### 2. Quadro de Excelência
(lista com **nomes** do campo "destaquesPositivos" do JSON. Se array vazio: "Nenhum destaque positivo registrado no período.")
---
### 3. Auditoria de Absenteísmo
(analise cada item do campo "pontosAtencao" com **nome**, totalFaltas e justificativas do JSON. Se array vazio: "Nenhum caso crítico no período.")
> Para cada caso crítico, indique: **Ação recomendada** (feedback corretivo / atenção médica / monitoramento).
---
### 4. Diretrizes para o Próximo Ciclo
(exatamente 3 metas baseadas nos desvios reais encontrados. Se não houver desvios: foque em manutenção.)
---
> Relatório gerado automaticamente com base nos registros do sistema.`;

  // Dados reais diretamente no user prompt — sem intermediário
  const userPrompt =
`DADOS REAIS DO SISTEMA — USE SOMENTE ESTES:
${JSON.stringify(payload)}

Gere o Dossiê Gerencial usando SOMENTE os dados fornecidos acima. NÃO invente nomes, números ou situações ausentes no JSON.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], provider);
}
