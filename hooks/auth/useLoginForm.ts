import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const useLoginForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('system');
  const [codigo, setCodigo] = useState('');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [userTmp, setUserTmp] = useState<any>(null);
  const [step, setStep] = useState<'login' | 'codigo'>('login');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(0);
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
      // Ignorar: igualmente forzamos redirecciÃ³n.
    }

    if (typeof window !== 'undefined') {
      window.location.assign(target);
    } else {
      router.replace(target);
    }
  }, [getRedirectTarget, router]);

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    return '';
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

  // Efectos de carga
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
    if (rateLimitRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setRateLimitRemaining(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [rateLimitRemaining]);

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
    if (e) e.preventDefault();
    if (rateLimitRemaining > 0) return;
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
        emailToSend = `${emailToSend}@lasmuÃ±ecasderamon.com`;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...loginData, email: emailToSend, password: passwordValue })
      });

      const data = await res.json();

      if (res.status === 429 || data.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = Number(data.retryAfter || res.headers.get('Retry-After') || 60);
        setRateLimitRemaining(retryAfter);
        toast.error(`Demasiados intentos. EsperÃ¡ ${retryAfter}s para volver a intentar.`);
        setLoading(false);
        return;
      }

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
        toast.error(data.message || 'Error de autenticaciÃ³n');
        setLoading(false);
        return;
      }

      toast.success('Â¡Bienvenido al sistema!');
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
    if (rateLimitRemaining > 0) return;
    if (codigo.length !== 4) {
      toast.error('El cÃ³digo debe tener 4 dÃ­gitos');
      return;
    }
    setLoading(true);
    try {
      let emailToSend = loginData.email.trim();
      if (!emailToSend.includes('@')) {
        emailToSend = `${emailToSend}@lasmuÃ±ecasderamon.com`;
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
      if (res.status === 429 || data.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = Number(data.retryAfter || res.headers.get('Retry-After') || 60);
        setRateLimitRemaining(retryAfter);
        toast.error(`Demasiados intentos. EsperÃ¡ ${retryAfter}s para volver a intentar.`);
        setLoading(false);
        return;
      }
      if (!data.success) {
        toast.error(data.message || 'CÃ³digo incorrecto');
        setLoading(false);
        return;
      }
      toast.success('Â¡Bienvenido al sistema!');
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
        emailOriginal = `${emailOriginal}@lasmuÃ±ecasderamon.com`;
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
        toast.error('Por favor complete el campo de contraseÃ±a');
        return;
      }
      if (submitButtonRef.current && !loading) {
        handleLogin();
      }
    }
  };

  return {
    loading,
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
    rateLimitRemaining,
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
