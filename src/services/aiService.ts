import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI } from "@google/genai";

export type AIProvider = 'gemini' | 'openrouter' | 'groq';

// Global AI quota variables
const MAX_MONTHLY_CALLS = 1000;

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
    throw new Error('Limite mensal de inteligência artificial atingido para o sistema. Tente novamente no próximo mês.');
  }
  
  await setDoc(quotaRef, { calls: count + 1 }, { merge: true });
}

// Function to get API keys from different sources (Firestore or Env)
async function fetchApiKey(provider: AIProvider): Promise<string | null> {
  // 1. Check Firestore first (for persistence outside Google AI Studio)
  try {
    const configSnap = await getDoc(doc(db, 'system', 'ai_config'));
    if (configSnap.exists()) {
      const data = configSnap.data();
      if (provider === 'gemini' && data.geminiKey) return data.geminiKey;
      if (provider === 'openrouter' && data.openrouterKey) return data.openrouterKey;
      if (provider === 'groq' && data.groqKey) return data.groqKey;
    }
  } catch (e) {
    console.warn("Firestore config check failed:", e);
  }

  // 2. Check Environment Variables (standard way)
  if (provider === 'gemini') {
    // Platform standard key
    const platformKey = (process.env as any).GEMINI_API_KEY;
    if (platformKey) return platformKey;
    return import.meta.env.VITE_GEMINI_API_KEY || null;
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

const getModel = (provider: AIProvider) => {
  if (provider === 'gemini') return 'gemini-2.0-flash-lite-preview-02-05';
  if (provider === 'openrouter') return 'google/gemini-2.0-flash-lite-preview-02-05:free';
  if (provider === 'groq') return 'llama-3.1-8b-instant';
  return '';
};

export async function callAI(messages: { role: string; content: string }[], provider: AIProvider = 'openrouter') {
  let activeProvider = provider;
  let activeApiKey = await fetchApiKey(activeProvider);
  
  // Provider rotation logic if preferred key is missing
  if (!activeApiKey) {
    const providers: AIProvider[] = ['openrouter', 'groq', 'gemini'];
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
    throw new Error('Nenhuma chave de API configurada. Configure o Gemini, OpenRouter ou Groq nas configurações.');
  }

  // Check global database quota
  await checkAndIncrementQuota();

  // If using Gemini SDK directly
  if (activeProvider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: activeApiKey });
    const modelName = getModel('gemini');
    
    // Convert messages to Gemini format (system instruction separate)
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction: systemMessage?.content,
        temperature: 0.3,
      }
    });
    
    return response.text;
  }

  // If using HTTP providers (OpenRouter, Groq)
  const endpoint = getEndpoint(activeProvider);
  const model = getModel(activeProvider);

  const response = await fetch(endpoint, {
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
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
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
  provider: AIProvider = 'groq'
) {
  const currentDayNum = parseInt(currentDate.split('-')[2], 10);
  
  // Filter attendance record strictly to days <= current day of month (if we are looking at the current month)
  // We assume the caller handles parsing if looking at a past month.
  const pastAttendance = Object.fromEntries(
    Object.entries(attendanceRecord).filter(([day]) => parseInt(day, 10) <= currentDayNum)
  );

  const absencesCount = Object.values(pastAttendance).filter(s => s === 'F').length;
  const vacationsCount = Object.values(pastAttendance).filter(s => s === 'Fe').length;
  const leavesCount = Object.values(pastAttendance).filter(s => s === 'A').length;
  const presenceCount = Object.values(pastAttendance).filter(s => s === 'P').length;

  const systemPrompt = `Você é um Analista Comportamental de RH sênior.
Sua tarefa é analisar o histórico de ausências de um funcionário e fornecer um "AI Insight" inteligente.

CONTEXTO DE DADOS:
- 'P': Presença.
- 'F': Falta Injustificada.
- 'Fe': Férias (NÃO É FALTA).
- 'A': Afastamento (NÃO É FALTA).

DADOS REAIS TOTAIS (BASEIE-SE NISSO PARA NÃO ERRAR A CONTA):
- Total de Faltas Reais ('F'): ${absencesCount}
- Total de Dias em Férias ('Fe'): ${vacationsCount}
- Total de Dias Afastado ('A'): ${leavesCount}
- Total de Presenças ('P'): ${presenceCount}

REGRAS CRÍTICAS:
1. NUNCA some Férias ('Fe') ou Afastamentos ('A') ao total de "faltas". Se o funcionário tem apenas 2 faltas ('F'), você DEVE dizer que ele tem 2 faltas, mesmo que tenha 30 dias de férias.
2. Analise apenas os dias com 'F' (faltas injustificadas) para identificar padrões de comportamento (proximidade com feriados ou fins de semana).
3. Se o funcionário estiver em férias ('Fe'), mencione que ele "está em período de descanso" e não que está "faltando irregularmente".
4. Seja conciso: 2 a 3 frases de análise + 1 Ação Prática (em negrito).
`;

  const userPrompt = `Funcionário: ${employee.name} (${employee.role})
Histórico Diário (Dia: Status): ${JSON.stringify(pastAttendance)}
Feriados do Mês: ${JSON.stringify(holidays)}

Gere o insight respeitando os totais informados. Retorne APENAS o texto do insight e a sugestão de ação.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}
