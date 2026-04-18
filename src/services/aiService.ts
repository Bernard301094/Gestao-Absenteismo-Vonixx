import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type AIProvider = 'openrouter' | 'groq';

// Global AI quota variables
const MAX_MONTHLY_CALLS = 200; 

async function checkAndIncrementQuota(): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}_${now.getMonth() + 1}`;
  const quotaRef = doc(db, 'system', `ai_quota_${monthKey}`);
  
  const snap = await getDoc(quotaRef);
  let count = 0;
  if (snap.exists()) {
    count = snap.data().calls || 0;
  }
  
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
    console.warn("Firestore config check failed:", e);
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
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

const getModel = (provider: AIProvider) => {
  if (provider === 'openrouter') {
    return OPENROUTER_FREE_MODELS[Math.floor(Math.random() * OPENROUTER_FREE_MODELS.length)];
  }
  if (provider === 'groq') return 'llama-3.1-8b-instant';
  return '';
};

export async function callAI(messages: { role: string; content: string }[], provider: AIProvider = 'openrouter') {
  let activeProvider = provider;
  let activeApiKey = await fetchApiKey(activeProvider);
  
  if (!activeApiKey) {
    const providers: AIProvider[] = ['openrouter', 'groq'];
    for (const p of providers) {
      if (p === provider) continue;
      const key = await fetchApiKey(p);
      if (key) {
        activeProvider = p;
        activeApiKey = key;
        break;
      }
    }
  }

  if (!activeApiKey) {
    throw new Error('Nenhuma chave de API configurada. Configure o OpenRouter ou Groq nas configurações.');
  }

  await checkAndIncrementQuota();

  const endpoint = getEndpoint(activeProvider);
  const model = getModel(activeProvider);

  let response;
  let retries = 0;
  const MAX_RETRIES = 3;

  while (retries < MAX_RETRIES) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeApiKey}`,
        ...(activeProvider === 'openrouter' && {
          'HTTP-Referer': window.location.href,
          'X-Title': 'Gestão de Absenteísmo',
        }),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.0,
      }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) : Math.pow(2, retries);
      console.warn(`Rate limit hit on ${activeProvider}. Retrying in ${waitTime} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      retries++;
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    const errText = await response?.text() || 'Unknown error';
    throw new Error(`Erro na API de IA (${activeProvider}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── 1. Geração de Resumo de Turno (Handover) ────────────────────────────────
export async function generateShiftSummary(
  shift: string,
  absentEmployees: any[],
  criticalEmployees: any[],
  notes: any[],
  provider: AIProvider = 'openrouter'
) {
  const systemPrompt = `Você é um assistente de RH industrial sênior.
Sua tarefa é gerar um resumo de turno (handover) profissional, direto e claro para o próximo encarregado.
O supervisor trabalha em regime 12x36 (06:00 às 18:00).
Use APENAS os dados fornecidos. Não invente nomes ou situações.
Formato de saída: Texto pronto para ser copiado para WhatsApp ou E-mail corporativo.
Inclua saudações profissionais, o resumo das faltas, os casos críticos que precisam de atenção e as observações relevantes registradas no turno.`;

  const userPrompt = `
Turno: ${shift}
Faltas do dia: ${JSON.stringify(absentEmployees)}
Funcionários em estado crítico (muitas faltas no mês): ${JSON.stringify(criticalEmployees)}
Observações registradas hoje: ${JSON.stringify(notes)}

Por favor, gere o resumo do turno.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}

// ─── 2. Detecção de Padrões de Comportamento ─────────────────────────────────
export async function analyzePatterns(weekdayData: any[], provider: AIProvider = 'groq') {
  const systemPrompt = `Você é um analista de dados de RH industrial.
Sua tarefa é analisar os dados de absenteísmo por dia da semana e identificar 1 ou 2 padrões ou tendências importantes.
Seja extremamente conciso, direto e profissional. Escreva no máximo 2 parágrafos curtos.
Exemplo de tom: "Notamos que 40% das faltas ocorrem às segundas-feiras. Sugerimos atenção redobrada neste dia."
Não invente dados, baseie-se apenas no JSON fornecido.`;

  const userPrompt = `Dados de faltas por dia da semana: ${JSON.stringify(weekdayData)}
Gere os insights.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}

// ─── 3. Resolução de Conflitos de Férias ─────────────────────────────────────
export async function suggestVacationResolution(conflictData: any, provider: AIProvider = 'groq') {
  const systemPrompt = `Você é um planejador de RH industrial estratégico.
Sua tarefa é ler um conflito de sobreposição de férias entre funcionários e sugerir uma realocação matemática de datas.
O objetivo é evitar gargalos na produção (ex: não ter dois operadores da mesma máquina de férias ao mesmo tempo).
Seja prático, direto e sugira datas específicas para resolver o conflito.
Tom: Corporativo, focado em solução.`;

  const userPrompt = `Conflito detectado: ${JSON.stringify(conflictData)}
Sugira uma resolução para este conflito.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}

// ─── 4. Insight Semanal Consolidado da Equipe ─────────────────────────────────
export async function generateWeeklyInsight(
  payload: any,
  weekNumber: number,
  startDay: number,
  endDay: number,
  previousInsights: string = "",
  provider: AIProvider = 'groq'
) {
  const systemPrompt = `Você é um Auditor Sênior de RH. Analise o desempenho da Semana ${weekNumber}.
Você receberá os dados atuais da semana e, se disponível, o resumo das semanas anteriores deste mesmo mês.

SUA MISSÃO PRINCIPAL:
Além de analisar a semana atual, você deve identificar a REINCIDÊNCIA. Verifique se os problemas ou destaques da semana anterior persistem ou foram resolvidos.

ESTRUTURA DO RELATÓRIO:
1. **Análise de Evolução**: Compare esta semana com as anteriores. O absenteísmo subiu ou desceu? Os problemas citados antes continuam?
2. **Destaques Positivos**: Funcionários com assiduidade mantida.
3. **Mapeamento de Desvios (Com histórico)**: Foque em quem já falhou antes e falhou de novo.
4. **Plano de Ação Tática**: Baseado na evolução do mês.

REGRAS:
- Se não houver histórico anterior, foque apenas nos dados atuais.
- Seja rigoroso com reincidentes.
- Temperatura: 0.0 para precisão máxima.`;

  const userPrompt = `
CONTEXTO DAS SEMANAS ANTERIORES:
${previousInsights || "Nenhum histórico disponível para este mês ainda."}

DADOS DA SEMANA ATUAL (${weekNumber}):
${JSON.stringify(payload)}

Por favor, gere a auditoria evolutiva.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}

// ─── 5. Insight Mensal Gerencial (Fechamento) ─────────────────────────────────
export async function generateMonthlyInsight(
  payload: any,
  provider: AIProvider = 'openrouter'
) {
  const systemPrompt = `Você é um Diretor de Recursos Humanos (CHRO) do setor industrial.
Sua tarefa é elaborar o Relatório Gerencial de Fechamento de Mês para a liderança de um turno que opera em regime 12x36. O nível de exigência é altíssimo. O relatório deve ser exaustivo, crítico, embasado em dados e focado em eficiência operacional e compliance.

ESTRUTURA DO RELATÓRIO OBRIGATÓRIA:
1. **Balanço Estratégico do Mês**: Faça um diagnóstico severo sobre o estado geral da equipe de ${payload.totalFuncionarios} colaboradores. Avalie o peso das ausências e das férias (${payload.feriasAtivas} ativas) sobre a sobrecarga do turno.
2. **Quadro de Excelência e Retenção**: Avalie o grupo "destaquesPositivos". Exija que a supervisão reconheça formalmente essa estabilidade. Aponte que a retenção desses talentos é vital.
3. **Auditoria de Absenteísmo e Casos Críticos**: Inspecione detalhadamente o grupo "pontosAtencao".
   - Avalie a gravidade do absenteísmo indivíduo por indivíduo.
   - Questione a validade operacional das "justificativas" (notas). Há reincidência injustificada? Há padrão de comportamento nocivo à cultura da empresa?
   - Indique nominalmente quem requer feedback corretivo formal (advertência verbal/escrita) e quem requer atenção médica/assistencial.
4. **Diretrizes Estratégicas para o Próximo Ciclo**: Defina 3 metas de gestão de pessoas inegociáveis para o supervisor corrigir os desvios de rota identificados.

REGRAS DE OURO:
- Postura implacável contra o absenteísmo injustificado, mas justa com problemas reais de saúde.
- Use jargão técnico de RH (turnover, capacidade instalada, compliance, feedback corretivo, engajamento).
- Estruturação impecável: use títulos (##), bullet points e negrito para destacar nomes e métricas.
- Baseie-se 100% no JSON fornecido. Tolerância zero para alucinações de dados.`;

  const userPrompt = `Dados Estratégicos de Fechamento do Mês Completo: ${JSON.stringify(payload)}
Gere o Dossiê Gerencial de RH do turno.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}