import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const CODE_INTERVAL_SECONDS = 30;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function useAccessCode(isAdmin: boolean) {
  // Código e expiração locais — gerados imediatamente, sem depender do Firestore
  const [currentCode, setCurrentCode] = useState<string>(() => generateCode());
  const [expiresAt, setExpiresAt]     = useState<number>(() => Date.now() + CODE_INTERVAL_SECONDS * 1000);
  const [timeLeft, setTimeLeft]       = useState<number>(CODE_INTERVAL_SECONDS);

  // Referência ao código local para uso no validateCode
  const localCodeRef  = useRef(currentCode);
  const localExpiryRef = useRef(expiresAt);

  // Tenta salvar no Firestore; se falhar (regras), mantém o código local silenciosamente
  const syncToFirestore = useCallback(async (code: string, expiry: number) => {
    try {
      await setDoc(doc(db, 'config', 'accessCode'), {
        code,
        expiresAt: expiry,
        createdAt: Date.now(),
      });
    } catch {
      // Regras do Firestore ainda não publicadas — código local continua funcionando
    }
  }, []);

  // Roda apenas quando isAdmin: gera novo código a cada 30s e tenta sincronizar
  const rotateCode = useCallback(() => {
    const newCode   = generateCode();
    const newExpiry = Date.now() + CODE_INTERVAL_SECONDS * 1000;
    setCurrentCode(newCode);
    setExpiresAt(newExpiry);
    localCodeRef.current   = newCode;
    localExpiryRef.current = newExpiry;
    syncToFirestore(newCode, newExpiry);
  }, [syncToFirestore]);

  useEffect(() => {
    if (!isAdmin) return;
    // Sincroniza o código inicial gerado no useState
    syncToFirestore(currentCode, expiresAt);
    const interval = setInterval(rotateCode, CODE_INTERVAL_SECONDS * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Escuta Firestore para atualizar se outro dispositivo admin rotacionou
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'accessCode'),
      (snap) => {
        if (!snap.exists()) return;
        const { code, expiresAt: exp } = snap.data();
        // Só sobrescreve o local se o código do Firestore for mais recente
        if (exp > Date.now()) {
          setCurrentCode(code);
          setExpiresAt(exp);
          localCodeRef.current   = code;
          localExpiryRef.current = exp;
        }
      },
      () => { /* ignora erros de permissão no listener */ }
    );
    return () => unsub();
  }, []);

  // Timer de contagem regressiva
  useEffect(() => {
    const tick = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(tick);
  }, [expiresAt]);

  // Valida: aceita código local (sem Firestore) OU código do Firestore
  const validateCode = async (inputCode: string): Promise<boolean> => {
    // 1. Valida contra o código local primeiro (funciona offline/sem regras)
    if (
      inputCode === localCodeRef.current &&
      Date.now() < localExpiryRef.current
    ) return true;

    // 2. Tenta validar no Firestore como fallback
    try {
      const snap = await getDoc(doc(db, 'config', 'accessCode'));
      if (!snap.exists()) return false;
      const { code, expiresAt: exp } = snap.data();
      return inputCode === code && Date.now() < exp;
    } catch {
      return false;
    }
  };

  return { currentCode, timeLeft, validateCode };
}
