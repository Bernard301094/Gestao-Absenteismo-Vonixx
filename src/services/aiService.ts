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
  'google/gemma-3-27b-it:free',
  'venice/dolphin-mistral-24b:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'google/gemma-3-4b-it:free',
  'google/gemma-3n-4b-it:free',
  'meta-llama/llama-guard-4-12b-it:free'
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
        temperature: 0.2, // Reduzido para menos alucinações
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

// 1. Generación de Resúmenes de Turno (Handover)
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

// 2. Detección de Patrones de Comportamiento
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

// 3. Resolución de Conflictos de Vacaciones
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

// 4. Insight Individual do Funcionário
export async function generateEmployeeInsight(
  employee: any,
  attendanceRecord: any,
  holidays: any[],
  currentDate: string, // YYYY-MM-DD
  detailedHistoryText?: string, // NOVO PARÂMETRO PARA BLOQUEAR ALUCINAÇÕES
  provider: AIProvider = 'groq'
) {
  const currentDayNum = parseInt(currentDate.split('-')[2], 10);
  
  const pastAttendance = Object.fromEntries(
    Object.entries(attendanceRecord).filter(([day]) => parseInt(day, 10) <= currentDayNum)
  );

  const absencesCount = Object.values(pastAttendance).filter(s => s === 'F').length;
  const vacationsCount = Object.values(pastAttendance).filter(s => s === 'Fe').length;
  const leavesCount = Object.values(pastAttendance).filter(s => s === 'A').length;
  const presenceCount = Object.values(pastAttendance).filter(s => s === 'P').length;

  const systemPrompt = `Você é um Analista Comportamental de RH altamente rigoroso.
Sua tarefa é analisar o histórico de ausências de um funcionário em escala 12x36 (folga dia sim, dia não) e fornecer um "AI Insight" SEM INVENTAR NADA.

DADOS MATEMÁTICOS ABSOLUTOS (OBEDEÇA CEGAMENTE A ESTES NÚMEROS):
- Faltas Reais Injustificadas: ${absencesCount}
- Dias de Férias: ${vacationsCount}
- Dias de Afastamento Legal: ${leavesCount}
- Presenças Confirmadas: ${presenceCount}

REGRAS INQUEBRÁVEIS:
1. JAMAIS INVENTE FALTAS. O número exato de faltas é ${absencesCount}. Se for 0, elogie a assiduidade e não sugira problemas de comparecimento.
2. Férias ('Fe') e Afastamentos ('A') SÃO DIREITOS e NÃO são faltas. Se estiver de férias, mencione que está usufruindo do seu descanso legal.
3. A escala é 12x36. Portanto, NÃO considere dias vazios ou alternados como ausências, são folgas.
4. Baseie-se APENAS no Histórico Detalhado em texto fornecido na mensagem do usuário para entender os dias.
5. Seja direto: 2 a 3 frases curtas de análise + 1 Ação Prática (em negrito).`;

  const userPrompt = `Funcionário: ${employee.name} (${employee.role})
Histórico Detalhado do Mês até o dia ${currentDayNum}:
${detailedHistoryText ? detailedHistoryText : JSON.stringify(pastAttendance)}

Feriados do Mês: ${JSON.stringify(holidays)}

Gere o insight obedecendo rigorosamente às regras matemáticas informadas no sistema. Retorne APENAS o texto da análise.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}
