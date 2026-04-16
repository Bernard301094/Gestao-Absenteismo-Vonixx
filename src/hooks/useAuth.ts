import React, { useState, useMemo, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithEmail, logout as firebaseLogout } from '../firebase';
import type { ShiftType, LoginShiftType } from '../types';

// ─── Contraseñas desde variables de entorno ────────────────────────────────
// Definir en .env local: VITE_PWD_TURNO_A, VITE_PWD_SUPERVISAO, VITE_PWD_TURNOS_BCD
// NUNCA commitear el archivo .env al repositorio
const PWD_TURNO_A      = import.meta.env.VITE_PWD_TURNO_A      ?? 'TurnoA@Vonixx2026';
const PWD_SUPERVISAO   = import.meta.env.VITE_PWD_SUPERVISAO   ?? 'Supervisao@Vonixx2026';
const PWD_TURNOS_BCD   = import.meta.env.VITE_PWD_TURNOS_BCD   ?? 'vonixx2026';

// ─── Tipos propios (sin any) ───────────────────────────────────────────────
type DeferredInstallPrompt = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedShiftLogin, setSelectedShiftLogin] = useState<LoginShiftType>('A');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);

  // ─── Derived Auth State ─────────────────────────────────────────────────────
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

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Auth listener + overscroll prevention
  useEffect(() => {
    document.body.style.overscrollBehaviorY = 'none';
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Notification permission request
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as DeferredInstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const email =
      selectedShiftLogin === 'SUPERVISAO'
        ? 'supervisao@vonixx.com'
        : `turno.${selectedShiftLogin.toLowerCase()}@vonixx.com`;

    let passwordToUse = loginPassword;

    if (selectedShiftLogin === 'A') {
      if (loginPassword !== PWD_TURNO_A) {
        setLoginError('Senha incorreta para o Turno A.');
        return;
      }
    } else if (selectedShiftLogin === 'SUPERVISAO') {
      if (loginPassword !== PWD_SUPERVISAO) {
        setLoginError('Senha incorreta para Supervisão.');
        return;
      }
    } else {
      passwordToUse = PWD_TURNOS_BCD;
    }

    try {
      await loginWithEmail(email, passwordToUse);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/invalid-credential') {
        setLoginError('Contraseña incorrecta.');
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
    authLoading,
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
