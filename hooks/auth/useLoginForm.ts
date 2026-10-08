'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EMAIL_DOMAIN } from '@/lib/constants/email';

export interface LoginFormData {
  email: string;
  password: string;
}

export interface UserTemp {
  id: string | number;
  email: string;
  role: string;
}

// ponytail: client-side rate limit removed — server handles it in prod

export const useLoginForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'recovery'>('login');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryComplete, setRecoveryComplete] = useState(false);
  const [recoveryRun, setRecoveryRun] = useState('');
  const [theme, setTheme] = useState('system');
  const [codigo, setCodigo] = useState('');
  const [loginData, setLoginData] = useState<LoginFormData>({ email: '', password: '' });
  const [userTmp, setUserTmp] = useState<UserTemp | null>(null);
  const [step, setStep] = useState<'login' | 'codigo'>('login');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registerData, setRegisterData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    ci: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const getRedirectTarget = useCallback(() => {
    if (typeof window === 'undefined') return '/dashboard';
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (!redirect || !redirect.startsWith('/')) return '/dashboard';
    if (redirect === '/login' || redirect.startsWith('/login?')) return '/dashboard';
    return redirect;
  }, []);

  const redirectAfterLogin = useCallback(async () => {
    const target = getRedirectTarget();
    try {
      await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
    } catch {
      // ignore check failure; still navigate
    }

    router.replace(target);
  }, [getRedirectTarget, router]);

  const handlePasswordRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recoveryLoading) return;
    const run = recoveryRun.trim();
    if (run.length < 4) {
      toast.error('Ingresa un RUN/CI válido');
      return;
    }
    setRecoveryLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ run })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.success !== true) {
        toast.error(data?.message || 'No se pudo procesar la recuperación');
        return;
      }
      setRecoveryComplete(true);
    } catch {
      toast.error('No se pudo conectar al servidor. Intenta nuevamente.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const resetRecovery = () => {
    setRecoveryRun('');
    setRecoveryComplete(false);
    setRecoveryLoading(false);
  };

  const applyTheme = (mode: string) => {
    if (typeof window === 'undefined') return;
    const html = document.documentElement;
    if (mode === 'dark') {
      html.classList.add('dark');
    } else if (mode === 'light') {
      html.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  };

  const setThemeMode = useCallback((mode: string) => {
    setTheme(mode);
    if (typeof window !== 'undefined') localStorage.setItem('theme', mode);
    applyTheme(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    let next;
    if (theme === 'light') next = 'dark';
    else if (theme === 'dark') next = 'system';
    else next = 'light';
    setThemeMode(next);
  }, [theme, setThemeMode]);

  useEffect(() => {
    if (step === 'login') {
      setCodigo('');
    }
  }, [step]);

  useEffect(() => {
    if (step === 'codigo') {
      const input = document.querySelector('input[placeholder="0000"]') as HTMLInputElement;
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }, [step]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const initialTheme =
      saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system';
    setThemeMode(initialTheme);

    async function fetchData() {
      try {
        const resUsers = await fetch('/api/auth/check-users', { credentials: 'include' });
        const dataUsers = await resUsers.json();
        if (resUsers.ok && dataUsers.success) {
          setHasUsers(dataUsers.hasUsers);
        } else {
          setHasUsers(true);
        }

        const resSession = await fetch('/api/auth/check', { credentials: 'include' });
        if (resSession.ok) {
          router.replace('/dashboard');
        }
      } catch (error) {
        setHasUsers(true);
      }
    }
    fetchData();
  }, [router, setThemeMode]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (loading) return;
    if (e) e.preventDefault();
    const emailValue = loginData.email.trim();
    const passwordValue = loginData.password.trim();
    if (!emailValue || !passwordValue) {
      toast.error('Complete usuario y contrasena');
      return;
    }
    setLoading(true);
    try {
      let emailToSend = emailValue;
      if (!emailToSend.includes('@')) {
        emailToSend = `${emailToSend}${EMAIL_DOMAIN}`;
      }

      const body = JSON.stringify({ ...loginData, email: emailToSend, password: passwordValue });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body
      });

      const data = await res.json();

      if (data.requiereCodigo === true) {
        setUserTmp(data.user);
        if (data.user?.role) {
          localStorage.setItem('userRole', data.user.role);
          localStorage.setItem('auth_role_hint', data.user.role);
        }
        setStep('codigo');
        setLoading(false);
        return;
      }

      if (!data.success) {
        toast.error(data.message || 'Error de autenticación');
        setLoading(false);
        return;
      }

      // S7: Redirigir a cambio forzado de contraseña si aplica
      if (data.user?.forcePasswordChange) {
        toast.info('Debés cambiar tu contraseña antes de continuar', { duration: 5000 });
        setLoading(false);
        router.replace('/change-password');
        return;
      }

      toast.success('¡Bienvenido al sistema!');
      if (data.user?.role) {
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('auth_role_hint', data.user.role);
      }
      setLoading(false);
      await redirectAfterLogin();
    } catch (err) {
      toast.error('Error de red o servidor');
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.length !== 4) {
      toast.error('El código debe tener 4 dígitos');
      return;
    }
    setLoading(true);
    try {
      let emailToSend = loginData.email.trim();
      if (!emailToSend.includes('@')) {
        emailToSend = `${emailToSend}${EMAIL_DOMAIN}`;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: emailToSend,
          password: loginData.password,
          codigo
        })
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || 'Código incorrecto');
        setLoading(false);
        return;
      }
      // S7: Redirigir a cambio forzado de contraseña si aplica
      if (data.user?.forcePasswordChange) {
        toast.info('Debés cambiar tu contraseña antes de continuar', { duration: 5000 });
        setLoading(false);
        router.replace('/change-password');
        return;
      }

      toast.success('¡Bienvenido al sistema!');
      if (data.user?.role) {
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('auth_role_hint', data.user.role);
      }
      setLoading(false);
      await redirectAfterLogin();
    } catch (err) {
      toast.error('Error de red o servidor');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegisterLoading(true);
    try {
      const passwordByCI = registerData.ci.trim();
      if (passwordByCI.length < 4) {
        toast.error('El CI debe tener al menos 4 caracteres');
        return;
      }

      let emailOriginal = registerData.email.trim();
      if (!emailOriginal.includes('@')) {
        emailOriginal = `${emailOriginal}${EMAIL_DOMAIN}`;
      }

      const res = await fetch('/api/auth/register-first-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: registerData.nombre.trim(),
          apellido: registerData.apellido.trim(),
          email: emailOriginal,
          ci: registerData.ci.trim(),
          password: passwordByCI
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Usuario administrador creado exitosamente');
        setShowRegisterModal(false);
        setHasUsers(true);
        setRegisterData({ nombre: '', apellido: '', email: '', ci: '' });
      } else {
        toast.error(data.message || 'Error al crear el usuario');
      }
    } catch (error) {
      toast.error('Error interno del servidor');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.currentTarget.value.trim() === '') {
        toast.error('Por favor complete este campo antes de continuar');
        return;
      }
      if (nextRef?.current) nextRef.current.focus();
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (loginData.email.trim() === '') {
        toast.error('Por favor complete el campo de usuario');
        emailInputRef.current?.focus();
        return;
      }
      if (e.currentTarget.value.trim() === '') {
        toast.error('Por favor complete el campo de contraseña');
        return;
      }
      if (submitButtonRef.current && !loading) {
        handleLogin();
      }
    }
  };

  return {
    loading,
    view,
    setView,
    recoveryLoading,
    recoveryComplete,
    recoveryRun,
    setRecoveryRun,
    handlePasswordRecovery,
    resetRecovery,
    theme,
    toggleTheme,
    setThemeMode,
    codigo,
    setCodigo,
    loginData,
    setLoginData,
    userTmp,
    step,
    setStep,
    hasUsers,
    showRegisterModal,
    setShowRegisterModal,
    showPassword,
    setShowPassword,
    registerData,
    setRegisterData,
    registerLoading,
    handleLogin,
    handleVerifyCode,
    handleRegister,
    handleKeyDown,
    handlePasswordKeyDown,
    emailInputRef,
    passwordInputRef,
    submitButtonRef
  };
};
