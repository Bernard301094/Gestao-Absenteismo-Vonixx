import { useState, useEffect, useCallback } from 'react';

// Secret compartilhado entre admin e kiosk — nunca exposto ao usuário
const SHARED_SECRET = 'vonixx-presenca-2026';
const CODE_INTERVAL_SECONDS = 30;

/**
 * Gera um código de 6 dígitos deterministicamente a partir do
 * secret + janela de tempo atual (SHA-256).
 * window_offset = 0  → código atual
 * window_offset = -1 → código da janela anterior (só para uso interno)
 */
async function generateTOTP(window_offset = 0): Promise<string> {
  const windowIndex =
    Math.floor(Date.now() / (CODE_INTERVAL_SECONDS * 1000)) + window_offset;
  const msg = `${SHARED_SECRET}:${windowIndex}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const num =
    ((hashArray[0] << 24) |
      (hashArray[1] << 16) |
      (hashArray[2] << 8) |
      hashArray[3]) >>>
    0;
  return String(num % 1_000_000).padStart(6, '0');
}

export function useAccessCode(isAdmin: boolean) {
  const [currentCode, setCurrentCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(CODE_INTERVAL_SECONDS);

  // Recalcula o código baseado na janela de tempo atual (SHA-256)
  const refreshCode = useCallback(async () => {
    const code = await generateTOTP(0);
    setCurrentCode(code);
  }, []);

  // Inicializa e refresca a cada 30s exatos (sincronizado com o relógio)
  useEffect(() => {
    if (!isAdmin) return; // kiosk não precisa exibir o código
    refreshCode();

    const msIntoWindow = Date.now() % (CODE_INTERVAL_SECONDS * 1000);
    const msUntilNext = CODE_INTERVAL_SECONDS * 1000 - msIntoWindow;

    const firstTimeout = setTimeout(() => {
      refreshCode();
      const interval = setInterval(refreshCode, CODE_INTERVAL_SECONDS * 1000);
      return () => clearInterval(interval);
    }, msUntilNext);

    return () => clearTimeout(firstTimeout);
  }, [refreshCode, isAdmin]);

  // Timer de contagem regressiva (só no painel admin)
  useEffect(() => {
    if (!isAdmin) return;
    const tick = setInterval(() => {
      const msIntoWindow = Date.now() % (CODE_INTERVAL_SECONDS * 1000);
      const remaining = Math.ceil(
        (CODE_INTERVAL_SECONDS * 1000 - msIntoWindow) / 1000
      );
      setTimeLeft(remaining);
    }, 500);
    return () => clearInterval(tick);
  }, [isAdmin]);

  /**
   * Valida o código digitado.
   *
   * REGRA ESTRITA: só aceita o código da janela ATUAL.
   * Janelas anteriores são REJEITADAS independentemente de há quanto
   * tempo expiraram — isso garante que um código expirado não deixa entrar.
   *
   * Tolerância de +5s no início da janela seguinte:
   * Se o usuário digitou o código na última janela e demorou ≤5s para
   * submeter enquanto a janela girou, ainda aceita.
   * Isso evita rejeição injusta por latência de rede/digitação lenta.
   */
  const validateCode = async (inputCode: string): Promise<boolean> => {
    const trimmed = inputCode.trim();
    if (trimmed.length !== 6) return false;

    // 1. Código da janela atual — sempre válido
    const current = await generateTOTP(0);
    if (trimmed === current) return true;

    // 2. Tolerância curta: aceita o código ANTERIOR somente se a janela
    //    atual iniciou há menos de 5 segundos (usuário estava digitando
    //    na troca exata de janela)
    const msIntoCurrentWindow = Date.now() % (CODE_INTERVAL_SECONDS * 1000);
    const GRACE_MS = 5_000; // 5 segundos de graça
    if (msIntoCurrentWindow <= GRACE_MS) {
      const previous = await generateTOTP(-1);
      if (trimmed === previous) return true;
    }

    return false;
  };

  return { currentCode, timeLeft, validateCode };
}
