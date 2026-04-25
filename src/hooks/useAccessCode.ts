import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const CODE_INTERVAL_SECONDS = 30;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function useAccessCode(isAdmin: boolean) {
  // Admin: gera código local imediatamente para exibir no QR sem esperar Firestore
  // Kiosk: começa vazio — nunca gera código local, só lê do Firestore
  const [currentCode, setCurrentCode] = useState<string>(() =>
    isAdmin ? generateCode() : ''
  );
  const [expiresAt, setExpiresAt] = useState<number>(() =>
    isAdmin ? Date.now() + CODE_INTERVAL_SECONDS * 1000 : 0
  );
  const [timeLeft, setTimeLeft] = useState<number>(
    isAdmin ? CODE_INTERVAL_SECONDS : 0
  );

  // Refs usadas na validação (evitam closure stale)
  const localCodeRef   = useRef(currentCode);
  const localExpiryRef = useRef(expiresAt);

  // Salva código no Firestore (somente admin)
  const syncToFirestore = useCallback(async (code: string, expiry: number) => {
    try {
      await setDoc(doc(db, 'config', 'accessCode'), {
        code,
        expiresAt: expiry,
        createdAt: Date.now(),
      });
    } catch {
      // Falha silenciosa — código local ainda funciona para o admin
    }
  }, []);

  // Rotaciona código a cada 30s (somente admin)
  const rotateCode = useCallback(() => {
    const newCode   = generateCode();
    const newExpiry = Date.now() + CODE_INTERVAL_SECONDS * 1000;
    setCurrentCode(newCode);
    setExpiresAt(newExpiry);
    localCodeRef.current   = newCode;
    localExpiryRef.current = newExpiry;
    syncToFirestore(newCode, newExpiry);
  }, [syncToFirestore]);

  // Admin: sincroniza código inicial + inicia rotação
  useEffect(() => {
    if (!isAdmin) return;
    syncToFirestore(currentCode, expiresAt);
    const interval = setInterval(rotateCode, CODE_INTERVAL_SECONDS * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Ambos (admin + kiosk): escuta Firestore em tempo real
  // Admin: atualiza se outro dispositivo rotacionou
  // Kiosk: recebe o código válido do admin
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'accessCode'),
      (snap) => {
        if (!snap.exists()) return;
        const { code, expiresAt: exp } = snap.data() as { code: string; expiresAt: number };
        if (exp > Date.now()) {
          setCurrentCode(code);
          setExpiresAt(exp);
          localCodeRef.current   = code;
          localExpiryRef.current = exp;
        }
      },
      () => { /* ignora erros de permissão */ }
    );
    return () => unsub();
  }, []);

  // Timer de contagem regressiva (somente admin)
  useEffect(() => {
    if (!isAdmin) return;
    const tick = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(tick);
  }, [isAdmin, expiresAt]);

  /**
   * Valida o código digitado pelo funcionário.
   * Kiosk: valida APENAS contra Firestore (nunca contra código local gerado).
   * Admin: valida contra código local (funciona offline) OU Firestore.
   */
  const validateCode = async (inputCode: string): Promise<boolean> => {
    // Kiosk: sempre consulta Firestore — nunca usa código local
    if (!isAdmin) {
      try {
        const snap = await getDoc(doc(db, 'config', 'accessCode'));
        if (!snap.exists()) return false;
        const { code, expiresAt: exp } = snap.data() as { code: string; expiresAt: number };
        return inputCode.trim() === code && Date.now() < exp;
      } catch {
        return false;
      }
    }

    // Admin: valida local primeiro, Firestore como fallback
    if (
      inputCode === localCodeRef.current &&
      Date.now() < localExpiryRef.current
    ) return true;

    try {
      const snap = await getDoc(doc(db, 'config', 'accessCode'));
      if (!snap.exists()) return false;
      const { code, expiresAt: exp } = snap.data() as { code: string; expiresAt: number };
      return inputCode === code && Date.now() < exp;
    } catch {
      return false;
    }
  };

  return { currentCode, timeLeft, validateCode };
}
