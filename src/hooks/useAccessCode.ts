import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const CODE_INTERVAL_SECONDS = 30;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function useAccessCode(isAdmin: boolean) {
  const [currentCode, setCurrentCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const rotateCode = useCallback(async () => {
    if (!isAdmin) return;
    const newCode = generateCode();
    const newExpiry = Date.now() + CODE_INTERVAL_SECONDS * 1000;
    await setDoc(doc(db, 'config', 'accessCode'), {
      code: newCode,
      expiresAt: newExpiry,
      createdAt: Date.now(),
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    rotateCode();
    const interval = setInterval(rotateCode, CODE_INTERVAL_SECONDS * 1000);
    return () => clearInterval(interval);
  }, [isAdmin, rotateCode]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'accessCode'), (snap) => {
      if (snap.exists()) {
        setCurrentCode(snap.data().code);
        setExpiresAt(snap.data().expiresAt);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
    }, 500);
    return () => clearInterval(tick);
  }, [expiresAt]);

  const validateCode = async (inputCode: string): Promise<boolean> => {
    const snap = await getDoc(doc(db, 'config', 'accessCode'));
    if (!snap.exists()) return false;
    const { code, expiresAt: exp } = snap.data();
    return inputCode === code && Date.now() < exp;
  };

  return { currentCode, timeLeft, validateCode };
}
