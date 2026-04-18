import React, { useState, useMemo, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, loginWithEmail, logout as firebaseLogout } from '../firebase';
import type { ShiftType, LoginShiftType } from '../types';

type DeferredInstallPrompt = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

interface ShiftPasswords {
  turnoA: string;
  supervisao: string;
  turnosBCD: string;
}

export function useAuth() {
  const [user, setUser]                             = useState<User | null>(null);
  const [authLoading, setAuthLoading]               = useState(true);
  const [passwords, setPasswords]                   = useState<ShiftPasswords | null>(null);
  const [pwdLoading, setPwdLoading]                 = useState(true);
  const [selectedShiftLogin, setSelectedShiftLogin] = useState<LoginShiftType>('A');
  const [loginPassword, setLoginPassword]           = useState('');
  const [loginError, setLoginError]                 = useState('');
  const [deferredPrompt, setDeferredPrompt]         = useState<DeferredInstallPrompt | null>(null);

  // ─── Carregar senhas do Firestore (config/passwords) ──────────────────────
  useEffect(() => {
    const fetchPasswords = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'passwords'));
        if (snap.exists()) {
          setPasswords(snap.data() as ShiftPasswords);
        } else {
          console.error('[useAuth] Documento config/passwords não encontrado no Firestore.');
        }
      } catch (err) {
        console.error('[useAuth] Erro ao carregar senhas do Firestore:', err);
      } finally {
        setPwdLoading(false);
      }
    };
    fetchPasswords();
  }, []);

  // ─── Derived Auth State ────────────────────────────────────────────────────
  const currentShift = useMemo<ShiftType | null>(() => {
    if (!user?.email) return null;
    if (user.email === 'supervisao@vonixx.com' || user.email === 'bernard30101994@gmail.com') return 'ALL';
    const match = user.email.match(/turno\.?([abcd])@vonixx\.com/i);
    return match ? (match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D') : null;
  }, [user]);

  const isSupervision = useMemo(() => currentShift === 'ALL', [currentShift]);

  const isAdminUser = useMemo(
    () => user?.email === 'bernard30101994@gmail.com' || user?.email === 'supervisao@vonixx.com',
    [user]
  );

  const isStandalone = useMemo(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overscrollBehaviorY = 'none';
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as DeferredInstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (pwdLoading) {
      setLoginError('Carregando configurações, aguarde...');
      return;
    }

    if (!passwords) {
      setLoginError('Sistema indisponível. Verifique sua conexão e tente novamente.');
      return;
    }

    const email =
      selectedShiftLogin === 'SUPERVISAO'
        ? 'supervisao@vonixx.com'
        : `turno.${selectedShiftLogin.toLowerCase()}@vonixx.com`;

    let passwordToUse = loginPassword;

    if (selectedShiftLogin === 'A') {
      if (loginPassword !== passwords.turnoA) {
        setLoginError('Senha incorreta para o Turno A.');
        return;
      }
    } else if (selectedShiftLogin === 'SUPERVISAO') {
      if (loginPassword !== passwords.supervisao) {
        setLoginError('Senha incorreta para Supervisão.');
        return;
      }
    } else {
      // Turnos B, C, D: senha compartilhada
      passwordToUse = passwords.turnosBCD;
    }

    try {
      await loginWithEmail(email, passwordToUse);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/invalid-credential') {
        setLoginError('Credenciais inválidas.');
      } else {
        setLoginError('Erro: ' + (firebaseError.message ?? 'desconhecido'));
      }
    }
  };

  const logout = async () => {
    await firebaseLogout();
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  return {
    user,
    authLoading: authLoading || pwdLoading,
    currentShift,
    isSupervision,
    isAdminUser,
    isStandalone,
    selectedShiftLogin,
    setSelectedShiftLogin,
    loginPassword,
    setLoginPassword,
    loginError,
    handleLogin,
    logout,
    deferredPrompt,
    handleInstallClick,
  };
}
