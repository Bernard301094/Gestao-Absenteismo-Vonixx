import { useState, useEffect, useCallback } from 'react';

// Secret compartilhado entre admin e kiosk — nunca exposto ao usuário
// Ambos calculam o mesmo código sem precisar de rede
const SHARED_SECRET = 'vonixx-presenca-2026';
const CODE_INTERVAL_SECONDS = 30;

/**
 * Gera um código de 6 dígitos deterministicamente a partir do
 * secret + janela de tempo atual. O mesmo código é gerado em qualquer
 * dispositivo que chame esta função na mesma janela de 30s.
 */
async function generateTOTP(window_offset = 0): Promise<string> {
  const windowIndex = Math.floor(Date.now() / (CODE_INTERVAL_SECONDS * 1000)) + window_offset;
  const msg = `${SHARED_SECRET}:${windowIndex}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Pega 4 bytes e converte para número de 6 dígitos
  const num = ((hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3]) >>> 0;
  return String(num % 1000000).padStart(6, '0');
}

// Síncrono — usa mesmo algoritmo mas com Math.sin como fallback rápido
// para o useState inicial (crypto.subtle é assíncrono)
function generateCodeSync(): string {
  const windowIndex = Math.floor(Date.now() / (CODE_INTERVAL_SECONDS * 1000));
  const seed = windowIndex * 1234567 + SHARED_SECRET.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const num = Math.abs(Math.sin(seed) * 1000000) % 1000000;
  return String(Math.floor(num)).padStart(6, '0');
}

export function useAccessCode(isAdmin: boolean) {
  const [currentCode, setCurrentCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(CODE_INTERVAL_SECONDS);

  // Recalcula o código baseado na janela de tempo atual
  const refreshCode = useCallback(async () => {
    const code = await generateTOTP(0);
    setCurrentCode(code);
  }, []);

  // Inicializa e refresca a cada 30s exatos (sincronizado com o relógio)
  useEffect(() => {
    refreshCode();

    // Calcula quantos ms faltam para a próxima janela
    const msIntoWindow = Date.now() % (CODE_INTERVAL_SECONDS * 1000);
    const msUntilNext = CODE_INTERVAL_SECONDS * 1000 - msIntoWindow;

    // Primeiro timeout para sincronizar com a janela
    const firstTimeout = setTimeout(() => {
      refreshCode();
      // Depois disso, intervalo exato de 30s
      const interval = setInterval(refreshCode, CODE_INTERVAL_SECONDS * 1000);
      return () => clearInterval(interval);
    }, msUntilNext);

    return () => clearTimeout(firstTimeout);
  }, [refreshCode]);

  // Timer de contagem regressiva
  useEffect(() => {
    const tick = setInterval(() => {
      const msIntoWindow = Date.now() % (CODE_INTERVAL_SECONDS * 1000);
      const remaining = Math.ceil((CODE_INTERVAL_SECONDS * 1000 - msIntoWindow) / 1000);
      setTimeLeft(remaining);
    }, 500);
    return () => clearInterval(tick);
  }, []);

  /**
   * Valida o código digitado.
   * Aceita a janela atual E a anterior (tolerância de ±1 janela = 60s)
   * para compensar diferenças de relógio entre dispositivos.
   */
  const validateCode = async (inputCode: string): Promise<boolean> => {
    const trimmed = inputCode.trim();
    // Janela atual
    const current = await generateTOTP(0);
    if (trimmed === current) return true;
    // Janela anterior (código acabou de expirar mas usuário ainda está digitando)
    const previous = await generateTOTP(-1);
    if (trimmed === previous) return true;
    return false;
  };

  return { currentCode, timeLeft, validateCode };
}
