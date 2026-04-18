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
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'google/gemma-3-4b-it:free',
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
        temperature: 0.2,
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

// ─── 4. Insight Individual do Funcionário ────────────────────────────────────
export async function generateEmployeeInsight(
  employee: any,
  attendanceRecord: any,
  holidays: any[],
  currentDate: string,
  detailedHistoryText?: string,
  provider: AIProvider = 'groq'
) {
  const [yearStr, monthStr, dayStr] = currentDate.split('-');
  const currentDayNum = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const pastAttendance = Object.fromEntries(
    Object.entries(attendanceRecord).filter(([day]) => parseInt(day, 10) <= currentDayNum)
  );

  const absencesCount  = Object.values(pastAttendance).filter(s => s === 'F').length;
  const vacationsCount = Object.values(pastAttendance).filter(s => s === 'Fe').length;
  const leavesCount    = Object.values(pastAttendance).filter(s => s === 'A').length;
  const presenceCount  = Object.values(pastAttendance).filter(s => s === 'P').length;
  const workDaysCount  = presenceCount + absencesCount;

  const systemPrompt = `Você é um Analista de RH de uma indústria brasileira. Analise o histórico de presença de um colaborador em escala 12x36 e gere um insight objetivo.

REGRAS ABSOLUTAS — OBEDEÇA CEGAMENTE:
1. A escala é 12x36: o colaborador trabalha 1 dia e folga no seguinte. Dias sem registro NO HISTÓRICO = FOLGA DA ESCALA. NÃO são ausências.
2. Os únicos dias de trabalho são os que aparecem com status P, F, Fe ou A no histórico.
3. Faltas reais injustificadas = ${absencesCount}. NÃO invente faltas. Se for 0, elogie a assiduidade.
4. Férias (Fe) e Afastamentos (A) são direitos trabalhistas. NUNCA os cite como problema.
5. Escreva 2-3 frases diretas em português brasileiro + 1 ação prática em negrito.
6. NÃO repita os dados brutos. NÃO use markdown excessivo. Seja humano e objetivo.
7. Se não houver faltas (${absencesCount} = 0), foque em aspectos positivos e sugestões de engajamento.`;

  const userPrompt = `Colaborador: ${employee.name} | Cargo: ${employee.role}
Mês/Ano: ${month}/${year} | Período analisado: dias 1 a ${currentDayNum}

Resumo estatístico confirmado:
- Presenças confirmadas (P): ${presenceCount}
- Faltas injustificadas (F): ${absencesCount}
- Férias (Fe): ${vacationsCount}
- Afastamentos legais (A): ${leavesCount}
- Total de dias de trabalho esperados: ${workDaysCount}
- Taxa de presença: ${workDaysCount > 0 ? Math.round((presenceCount / workDaysCount) * 100) : 100}%

Histórico detalhado dia a dia (apenas dias de trabalho):
${detailedHistoryText || 'Sem registros detalhados disponíveis.'}

Feriados do mês: ${holidays.length > 0 ? JSON.stringify(holidays.map((h: any) => h.name || h.date)) : 'Nenhum'}

Gere o insight seguindo rigorosamente as regras do sistema.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], provider);
}

// ─── 5. Insight Mensal Completo ───────────────────────────────────────────────
export async function generateMonthlyInsight(
  shift: string,
  month: number,
  year: number,
  employees: any[],
  attendanceRecord: any,
  vacations: any[],
  notes: any,
  workDays: number[],
  provider: AIProvider = 'groq'
) {
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  // Build per-employee stats for the full month
  const employeeStats = employees.map(emp => {
    const record: Record<string, string> = attendanceRecord[emp.id] || {};
    const absenceDays = workDays.filter(d => record[d] === 'F');
    const vacationDays = workDays.filter(d => record[d] === 'Fe').length;
    const leaveDays = workDays.filter(d => record[d] === 'A').length;
    const presenceDays = workDays.filter(d => record[d] === 'P' || (!record[d])).length;
    const empNotes = Object.entries(notes[emp.id] || {})
      .filter(([d]) => workDays.includes(Number(d)))
      .map(([d, n]) => `Dia ${d}: ${n}`);
    const absenceRate = workDays.length > 0
      ? ((absenceDays.length / workDays.length) * 100).toFixed(1)
      : '0';
    const statusLabel =
      absenceDays.length >= 5 ? 'CRÍTICO' :
      absenceDays.length >= 3 ? 'ATENÇÃO' : 'REGULAR';

    return {
      nome: emp.name,
      cargo: emp.role || 'N/I',
      totalFaltas: absenceDays.length,
      diasFalta: absenceDays,
      diasFerias: vacationDays,
      diasAfastamento: leaveDays,
      diasPresenca: presenceDays,
      taxaFalta: `${absenceRate}%`,
      observacoes: empNotes,
      status: statusLabel,
    };
  });

  const criticalEmployees = employeeStats.filter(e => e.status === 'CRÍTICO');
  const attentionEmployees = employeeStats.filter(e => e.status === 'ATENÇÃO');
  const regularEmployees   = employeeStats.filter(e => e.status === 'REGULAR');
  const totalAbsences      = employeeStats.reduce((s, e) => s + e.totalFaltas, 0);
  const overallRate = workDays.length > 0 && employees.length > 0
    ? ((totalAbsences / (workDays.length * employees.length)) * 100).toFixed(1)
    : '0';

  // Day-of-week breakdown
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const byWeekday: Record<string, number> = { Dom: 0, Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0 };
  employees.forEach(emp => {
    const record: Record<string, string> = attendanceRecord[emp.id] || {};
    workDays.forEach(d => {
      if (record[d] === 'F') {
        const wd = weekdays[new Date(year, month, d).getDay()];
        byWeekday[wd] = (byWeekday[wd] || 0) + 1;
      }
    });
  });

  const systemPrompt = `Você é um Analista Sênior de RH industrial especializado em controle de absenteísmo em turnos 12x36.
Gere um RELATÓRIO EXECUTIVO MENSAL completo, profissional e acionável para o supervisor do turno.

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO:
1. **Resumo Executivo** — 2-3 frases com os números principais (faltas, taxa, contexto)
2. **Funcionários em Estado Crítico (5+ faltas)** — para cada um: nome, total de faltas, dias específicos, recomendação concreta
3. **Funcionários em Atenção (3-4 faltas)** — lista resumida com nome e contagem
4. **Padrões e Tendências** — dias da semana críticos, semanas com mais faltas, comportamentos recorrentes
5. **Destaques Positivos** — funcionários com presença perfeita ou queda de faltas
6. **Recomendações para o Próximo Mês** — exatamente 3 ações priorizadas e concretas

REGRAS:
- Use apenas os dados fornecidos. NÃO invente situações.
- Férias (Fe) e Afastamentos (A) são direitos. NUNCA os trate como problema.
- Tom executivo, direto, em português brasileiro corporativo.
- Inclua percentuais e números específicos.
- Se não há críticos, destaque isso positivamente.`;

  const userPrompt = `
TURNO: ${shift} | MÊS: ${MONTH_NAMES[month]} de ${year}
Total de funcionários: ${employees.length}
Dias de trabalho do turno no mês: ${workDays.length} (dias: ${workDays.join(', ')})
Total de faltas: ${totalAbsences}
Taxa de absenteísmo geral: ${overallRate}%

Faltas por dia da semana: ${JSON.stringify(byWeekday)}

─── FUNCIONÁRIOS CRÍTICOS (${criticalEmployees.length}) ───
${criticalEmployees.length > 0 ? JSON.stringify(criticalEmployees, null, 2) : 'Nenhum funcionário em estado crítico. ✓'}

─── FUNCIONÁRIOS EM ATENÇÃO (${attentionEmployees.length}) ───
${attentionEmployees.length > 0 ? JSON.stringify(attentionEmployees.map(e => ({ nome: e.nome, cargo: e.cargo, faltas: e.totalFaltas, dias: e.diasFalta }))) : 'Nenhum.'}

─── FUNCIONÁRIOS REGULARES (${regularEmployees.length}) ───
${JSON.stringify(regularEmployees.map(e => ({ nome: e.nome, cargo: e.cargo, presencas: e.diasPresenca })))}

Gere o relatório executivo mensal completo seguindo a estrutura definida.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], provider);
}

// ─── 6. Insight Semanal ───────────────────────────────────────────────────────
export async function generateWeeklyInsight(
  shift: string,
  weekNumber: number,
  weekStart: number,
  weekEnd: number,
  month: number,
  year: number,
  employees: any[],
  attendanceRecord: any,
  workDaysInWeek: number[],
  notes: any,
  provider: AIProvider = 'groq'
) {
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  // Per-employee stats for this week only
  const weeklyStats = employees.map(emp => {
    const record: Record<string, string> = attendanceRecord[emp.id] || {};
    const absenceDays = workDaysInWeek.filter(d => record[d] === 'F');
    const vacationDays = workDaysInWeek.filter(d => record[d] === 'Fe');
    const leaveDays = workDaysInWeek.filter(d => record[d] === 'A');
    const empNotes = Object.entries(notes[emp.id] || {})
      .filter(([d]) => workDaysInWeek.includes(Number(d)))
      .map(([d, n]) => `Dia ${d}: ${n}`);

    return {
      nome: emp.name,
      cargo: emp.role || 'N/I',
      faltas: absenceDays.length,
      diasFalta: absenceDays,
      diasFerias: vacationDays.length,
      afastamentos: leaveDays.length,
      observacoes: empNotes,
    };
  }).filter(e => e.faltas > 0 || e.observacoes.length > 0 || e.diasFerias > 0);

  const totalFaltas = weeklyStats.reduce((s, e) => s + e.faltas, 0);
  const absenteesOnly = weeklyStats.filter(e => e.faltas > 0);
  const withNotes = weeklyStats.filter(e => e.observacoes.length > 0 && e.faltas === 0);

  // Day-by-day summary for the week
  const dayByDay = workDaysInWeek.map(d => {
    const faltasNoDia = employees.filter(emp => (attendanceRecord[emp.id] || {})[d] === 'F').length;
    const presentesNoDia = employees.filter(emp => {
      const status = (attendanceRecord[emp.id] || {})[d];
      return status === 'P' || !status;
    }).length;
    return { dia: d, faltas: faltasNoDia, presentes: presentesNoDia };
  });

  const systemPrompt = `Você é um Analista de RH industrial. Gere um resumo semanal de absenteísmo para o supervisor do turno.

ESTRUTURA DO RELATÓRIO SEMANAL:
1. **Balanço da Semana** — total de faltas, taxa, dias de trabalho no período
2. **Quem Faltou** — liste cada ausência com nome, cargo e dia(s)
3. **Observações Registradas** — notas relevantes do período
4. **Ponto de Atenção** — se houver padrão ou caso preocupante, destaque-o
5. **Recomendação para a Próxima Semana** — 1 ação concreta e específica

REGRAS:
- Máximo 4-5 parágrafos curtos. Seja conciso e direto.
- Se não há faltas, celebre isso e sugira engajamento.
- Use português brasileiro corporativo.
- Não invente dados.`;

  const userPrompt = `
TURNO: ${shift} | Semana ${weekNumber} de ${MONTH_NAMES[month]}/${year}
Período: dias ${weekStart} a ${weekEnd}
Dias de trabalho do turno na semana: ${workDaysInWeek.length > 0 ? workDaysInWeek.join(', ') : 'nenhum'}
Total de funcionários: ${employees.length}
Total de faltas na semana: ${totalFaltas}

Resumo por dia:
${JSON.stringify(dayByDay)}

Ausências da semana (${absenteesOnly.length} funcionários):
${absenteesOnly.length > 0 ? JSON.stringify(absenteesOnly) : 'Nenhuma ausência registrada. ✓'}

Observações sem falta (${withNotes.length}):
${withNotes.length > 0 ? JSON.stringify(withNotes.map(e => ({ nome: e.nome, obs: e.observacoes }))) : 'Nenhuma.'}

Gere o resumo semanal seguindo a estrutura definida.`;

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], provider);
}