/* eslint-disable */
'use client';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Moon, Sun, Monitor, Mail, Lock, Eye } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from 'sonner';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('system');
  const [codigo, setCodigo] = useState('');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [userTmp, setUserTmp] = useState<any>(null);
  const [step, setStep] = useState<'login' | 'codigo'>('login');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [registerData, setRegisterData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const router = useRouter();

  // Función para obtener la URL base correcta
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      // Usar la URL actual del navegador para evitar problemas con dominios internacionalizados
      const protocol = window.location.protocol;
      const host = window.location.host;
      const baseUrl = `${protocol}//${host}`;
      return baseUrl;
    }
    return '';
  };

  // Referencias para los inputs
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Limpiar código cuando se cambia de paso
  useEffect(() => {
    if (step === 'login') {
      setCodigo('');
    }
  }, [step]);

  // Enfocar el campo de código cuando se cambia a ese paso
  useEffect(() => {
    if (step === 'codigo') {
      const input = document.querySelector('input[placeholder="0000"]') as HTMLInputElement;
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }, [step]);

  useEffect(() => {
    // Al cargar, lee el tema guardado o usa system
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      setTheme(saved);
      applyTheme(saved);
    } else {
      setTheme('system');
      applyTheme('system');
    }

    // Verificar si hay usuarios registrados
    async function checkUsers() {
      try {
        const baseUrl = getBaseUrl();
        console.log('🔍 [LOGIN] Verificando usuarios en:', '/api/auth/check-users');

        const res = await fetch('/api/auth/check-users', {
          credentials: 'include'
        });

        console.log('🔍 [LOGIN] Respuesta recibida. Status:', res.status);

        const data = await res.json();
        console.log('🔍 [LOGIN] Datos recibidos:', data);

        if (res.ok && data.success) {
          console.log('✅ [LOGIN] Verificación exitosa. hasUsers:', data.hasUsers);
          setHasUsers(data.hasUsers);
        } else {
          const errorMsg = data?.message || 'No se pudo verificar usuarios. Intenta más tarde.';
          console.error('❌ [LOGIN] Error al verificar usuarios:', {
            status: res.status,
            message: errorMsg,
            error: data?.error,
            errorCode: data?.errorCode,
            fullResponse: data
          });
          setHasUsers(true); // Por defecto, asumir que hay usuarios
        }
      } catch (error) {
        console.error('❌ [LOGIN] Error de red/excepción al verificar usuarios:', {
          error,
          message: error instanceof Error ? error.message : 'Error desconocido',
          stack: error instanceof Error ? error.stack : undefined
        });
        setHasUsers(true); // Por defecto, asumir que hay usuarios
      }
    }

    // Protección robusta: verifica sesión con endpoint protegido
    async function checkSession() {
      try {
        const baseUrl = getBaseUrl();

        const res = await fetch('/api/auth/check', {
          credentials: 'include'
        });

        if (res.ok) {
          router.replace('/dashboard');
        }
      } catch (error) {
        // Si hay error de red, permite el acceso al login
      }
    }

    // Ejecutar verificaciones
    checkUsers();
    checkSession();
  }, []);

  const applyTheme = (mode: string) => {
    if (typeof window === 'undefined') return;
    const html = document.documentElement;
    if (mode === 'dark') {
      html.classList.add('dark');
    } else if (mode === 'light') {
      html.classList.remove('dark');
    } else {
      // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  };

  const handleThemeToggle = () => {
    let next;
    if (theme === 'light') next = 'dark';
    else if (theme === 'dark') next = 'system';
    else next = 'light';
    setTheme(next);
    if (typeof window !== 'undefined') localStorage.setItem('theme', next);
    applyTheme(next);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  // Función para manejar el registro del primer usuario
  const handleRegister = async () => {
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (registerData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validación manual del email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      toast.error('Por favor ingrese un email válido');
      return;
    }

    setRegisterLoading(true);
    try {
      // Prevenir la codificación Punycode del navegador
      const emailOriginal = registerData.email;

      const baseUrl = getBaseUrl();
      const res = await fetch('/api/auth/register-first-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          nombre: registerData.nombre.trim(),
          apellido: registerData.apellido.trim(),
          email: emailOriginal, // Email original sin codificación
          password: registerData.password
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Usuario administrador creado exitosamente');
        setShowRegisterModal(false);
        setHasUsers(true);
        // Limpiar formulario
        setRegisterData({
          nombre: '',
          apellido: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        toast.error(data.message || 'Error al crear el usuario');
      }
    } catch (error) {
      console.error('❌ [LOGIN] Error en registro:', error);
      toast.error('Error interno del servidor');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Función para manejar la navegación con Enter
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Validar que el campo actual no esté vacío
      if (e.currentTarget.value.trim() === '') {
        toast.error('Por favor complete este campo antes de continuar');
        return;
      }
      if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  };

  // Función para manejar Enter en el campo de contraseña (enviar formulario)
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Validar que ambos campos estén completos
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
        submitButtonRef.current.click();
      }
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black transition-colors duration-300'>
      <div className='flex w-full max-w-6xl mx-auto items-center justify-center gap-8'>
        {/* Lado izquierdo: Logo y presentación */}
        <div className='hidden md:flex flex-1 flex-col items-center justify-center'>
          <Image src='/img/system/logo2.png' alt='Logo' width={320} height={120} className='mb-4' />
          <h1 className='text-2xl md:text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white transition-colors duration-300'>
            Bien venido, Las Muñecas de Ramón
          </h1>
          <p className='text-gray-600 dark:text-gray-300 text-center mb-2 transition-colors duration-300'>
            Nightclub exclusivo en la ciudad de Linares
            <br />
            "Un lugar para caballeros"
          </p>
          <div className='flex justify-center mt-8'>
            <Image src='/img/system/presentation.png' alt='Presentación' width={600} height={200} />
          </div>
        </div>

        {/* Lado derecho: Formulario de login */}
        <div className='flex-1 flex items-center justify-center w-full'>
          <div className='w-full flex flex-col items-center'>
            {/* Logo solo en móvil */}
            <div className='md:hidden mb-6 flex justify-center w-full'>
              <Image src='/img/system/logo2.png' alt='Logo' width={200} height={80} />
            </div>

            <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-900/50 p-10 w-full max-w-md transition-all duration-300 border dark:border-gray-800'>
              <h2 className='text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white transition-colors duration-300'>
                {step === 'login' ? 'Iniciar sesión' : 'Verificación'}
              </h2>
              <p className='text-gray-600 dark:text-gray-300 text-center mb-6 text-sm transition-colors duration-300'>
                {step === 'login'
                  ? 'Ingrese sus datos para iniciar sesión en su cuenta'
                  : 'Complete la verificación de seguridad'}
              </p>

              {step === 'login' && (
                <form
                  className='space-y-5'
                  onSubmit={async e => {
                    e.preventDefault();
                    setLoading(true);
                    try {
                      // Agregar dominio si no está presente
                      let emailToSend = loginData.email.trim();
                      if (!emailToSend.includes('@')) {
                        emailToSend = `${emailToSend}@lasmuñecasderamon.com`;
                      }

                      const baseUrl = getBaseUrl();
                      const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          ...loginData,
                          email: emailToSend
                        })
                      });

                      const data = await res.json();

                      // Verificar si requiere código PRIMERO
                      if (data.requiereCodigo === true) {
                        setUserTmp(data.user);

                        // Guardar el rol en localStorage para evitar flash de permisos
                        if (data.user?.role) {
                          localStorage.setItem('userRole', data.user.role);
                        }

                        setStep('codigo');
                        setLoading(false);
                        return;
                      }

                      // Solo verificar success si NO requiere código
                      if (!data.success) {
                        console.error('❌ [LOGIN] Error de autenticación:', data.message);
                        toast.error(data.message || 'Error de autenticación');
                        setLoading(false);
                        return;
                      }
                      // Login exitoso (admin/cajero)
                      toast.success('¡Bienvenido al sistema!');

                      // Guardar el rol en localStorage para evitar flash de permisos
                      if (data.user?.role) {
                        localStorage.setItem('userRole', data.user.role);
                      }

                      setLoading(false);
                      // Redirección inmediata al dashboard
                      window.location.href = '/dashboard';
                    } catch (err) {
                      console.error('❌ [LOGIN] Error de red o servidor:', err);
                      toast.error('Error de red o servidor');
                      setLoading(false);
                    }
                  }}
                >
                  <div>
                    <Label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 transition-colors duration-300'>
                      Usuario
                    </Label>
                    <div className='relative'>
                      <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base pointer-events-none' />
                      <Input
                        ref={emailInputRef}
                        type='text'
                        placeholder='admin, pepe, lizi...'
                        autoComplete='username'
                        className='pl-12 pr-4 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all duration-300'
                        value={loginData.email}
                        onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                        onKeyDown={e => handleKeyDown(e, passwordInputRef)}
                      />
                      {loginData.email && (
                        <span
                          className='absolute top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none transition-all duration-200'
                          style={{
                            left: `${48 + (loginData.email.length * 8.5)}px`
                          }}
                        >
                          @lasmuñecasderamon.com
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 transition-colors duration-300'>
                      Contraseña
                    </Label>
                    <div className='relative'>
                      <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base pointer-events-none' />
                      <Input
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : 'password'}
                        placeholder='Contraseña'
                        className='pl-12 pr-12 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all duration-300'
                        value={loginData.password}
                        onChange={e =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value
                          })
                        }
                        onKeyDown={handlePasswordKeyDown}
                        autoComplete='current-password'
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200'
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <Eye className='w-5 h-5' />
                      </button>
                    </div>
                  </div>

                  <Button
                    ref={submitButtonRef}
                    type='submit'
                    variant='outline'
                    disabled={loading}
                    className='rounded-full px-6 bg-black dark:bg-white text-white dark:text-black border-black dark:border-white  dark:hover:bg-gray-200 hover:scale-110 transition-all duration-200 w-full'
                  >
                    {loading ? 'Validando...' : 'Iniciar sesión'}
                  </Button>

                  {/* Botón de registro solo si no hay usuarios */}
                  {hasUsers === false && (
                    <div className='mt-4'>
                      <div className='relative'>
                        <div className='absolute inset-0 flex items-center'>
                          <span className='w-full border-t border-gray-300 dark:border-gray-600' />
                        </div>
                        <div className='relative flex justify-center text-xs uppercase'>
                          <span className='bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400'>
                            O
                          </span>
                        </div>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        className='mt-4 rounded-full px-6 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:scale-110 transition-all duration-200 w-full'
                        onClick={() => setShowRegisterModal(true)}
                      >
                        Crear primer usuario administrador
                      </Button>
                    </div>
                  )}

                  {loading && (
                    <div className='flex justify-center mt-2'>
                      <span className='animate-spin h-5 w-5 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full'></span>
                    </div>
                  )}

                  {/* Selector de tema con Popover */}
                  <div className='flex justify-center mt-4'>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          className='rounded-full text-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300'
                          aria-label='Cambiar tema'
                        >
                          {theme === 'light' && (
                            <Sun className='text-yellow-500 dark:text-yellow-400' />
                          )}
                          {theme === 'dark' && (
                            <Moon className='text-blue-600 dark:text-blue-400' />
                          )}
                          {theme === 'system' && (
                            <Monitor className='text-gray-600 dark:text-gray-400' />
                          )}
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        align='center'
                        className='w-40 p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-gray-900/50 transition-all duration-300'
                      >
                        <div className='py-2'>
                          {themeOptions.map(opt => (
                            <button
                              key={opt.value}
                              className={`flex items-center w-full px-4 py-2 gap-2 text-sm transition-all duration-200 ${theme === opt.value
                                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              onClick={() => {
                                setTheme(opt.value);
                                if (typeof window !== 'undefined')
                                  localStorage.setItem('theme', opt.value);
                                applyTheme(opt.value);
                              }}
                            >
                              <opt.icon
                                className={`w-4 h-4 ${theme === opt.value
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : opt.value === 'light'
                                      ? 'text-yellow-500'
                                      : opt.value === 'dark'
                                        ? 'text-blue-600'
                                        : 'text-gray-600 dark:text-gray-400'
                                  }`}
                              />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </form>
              )}
              {step === 'codigo' && (
                <form
                  className='space-y-5'
                  onSubmit={async e => {
                    e.preventDefault();
                    if (codigo.length !== 4) {
                      toast.error('El código debe tener 4 dígitos');
                      return;
                    }
                    setLoading(true);
                    try {
                      // Agregar dominio si no está presente
                      let emailToSend = loginData.email.trim();
                      if (!emailToSend.includes('@')) {
                        emailToSend = `${emailToSend}@lasmuñecasderamon.com`;
                      }

                      const baseUrl = getBaseUrl();
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
                      toast.success('¡Bienvenido al sistema, ' + (userTmp?.username || '') + '!');

                      // Guardar el rol en localStorage para evitar flash de permisos
                      if (data.user?.role) {
                        localStorage.setItem('userRole', data.user.role);
                      }

                      setLoading(false);
                      setTimeout(() => {
                        window.location.href = '/dashboard';
                      }, 3000);
                    } catch (err) {
                      toast.error('Error de red o servidor');
                      setLoading(false);
                    }
                  }}
                >
                  <div className='text-center mb-6'>
                    <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-4 border border-blue-200 dark:border-blue-800'>
                      <div className='flex items-center justify-center mb-3'>
                        <div className='w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center'>
                          <span className='text-2xl'>🔐</span>
                        </div>
                      </div>
                      <h3 className='text-xl font-bold text-blue-900 dark:text-blue-100 mb-2'>
                        Verificación de Seguridad
                      </h3>
                      <p className='text-sm text-blue-700 dark:text-blue-300 leading-relaxed'>
                        Para completar el acceso, ingrese el código de verificación proporcionado
                        por el administrador.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-300'>
                      Código de Verificación
                    </Label>
                    <div className='relative'>
                      <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 text-base pointer-events-none mr-2' />
                      <Input
                        type='text'
                        placeholder='0000'
                        value={codigo}
                        onChange={e => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setCodigo(value);
                        }}
                        maxLength={4}
                        className='pl-10 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all duration-300 text-center text-xl font-mono tracking-widest border-2 focus:border-blue-500 dark:focus:border-blue-400'
                        autoFocus
                      />
                    </div>
                    <div className='flex justify-center mt-2'>
                      <div className='flex gap-1'>
                        {[0, 1, 2, 3].map(index => (
                          <div
                            key={index}
                            className={`w-3 h-3 rounded-full ${index < codigo.length
                                ? 'bg-blue-500 dark:bg-blue-400'
                                : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 text-center'>
                      Ingrese el código de 4 dígitos proporcionado por el administrador
                    </p>
                  </div>

                  <Button
                    type='submit'
                    variant='outline'
                    className='rounded-full px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-blue-600 dark:border-blue-500 hover:scale-105 transition-all duration-200 w-full font-semibold'
                    disabled={loading || codigo.length !== 4}
                  >
                    {loading ? (
                      <div className='flex items-center gap-2'>
                        <span className='animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full'></span>
                        Validando...
                      </div>
                    ) : (
                      'Verificar Código'
                    )}
                  </Button>

                  {loading && (
                    <div className='flex justify-center mt-2'>
                      <span className='animate-spin h-5 w-5 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full'></span>
                    </div>
                  )}

                  <div className='text-center'>
                    <button
                      type='button'
                      onClick={() => {
                        setStep('login');
                        setCodigo('');
                      }}
                      className='text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-1 mx-auto'
                    >
                      <span>←</span>
                      <span>Volver al login</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro del Primer Usuario */}
      {showRegisterModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl'>
            <div className='text-center mb-6'>
              <div className='w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>👑</span>
              </div>
              <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                Crear Administrador
              </h2>
              <p className='text-gray-600 dark:text-gray-400'>
                Crea el primer usuario administrador del sistema
              </p>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleRegister();
              }}
              className='space-y-4'
            >
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label
                    htmlFor='nombre'
                    className='text-sm font-medium text-gray-700 dark:text-gray-200'
                  >
                    Nombre
                  </Label>
                  <Input
                    id='nombre'
                    type='text'
                    value={registerData.nombre}
                    onChange={e =>
                      setRegisterData({
                        ...registerData,
                        nombre: e.target.value
                      })
                    }
                    onBlur={e =>
                      setRegisterData({
                        ...registerData,
                        nombre: e.target.value
                          .trim()
                          .toLowerCase()
                          .replace(/\b\w/g, c => c.toUpperCase())
                      })
                    }
                    className='mt-1'
                    required
                  />
                </div>
                <div>
                  <Label
                    htmlFor='apellido'
                    className='text-sm font-medium text-gray-700 dark:text-gray-200'
                  >
                    Apellido
                  </Label>
                  <Input
                    id='apellido'
                    type='text'
                    value={registerData.apellido}
                    onChange={e =>
                      setRegisterData({
                        ...registerData,
                        apellido: e.target.value
                      })
                    }
                    onBlur={e =>
                      setRegisterData({
                        ...registerData,
                        apellido: e.target.value
                          .trim()
                          .toLowerCase()
                          .replace(/\b\w/g, c => c.toUpperCase())
                      })
                    }
                    className='mt-1'
                    required
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor='email'
                  className='text-sm font-medium text-gray-700 dark:text-gray-200'
                >
                  Email
                </Label>
                <Input
                  id='email'
                  type='text'
                  value={registerData.email}
                  onChange={e => setRegisterData({ ...registerData, email: e.target.value })}
                  className='mt-1'
                  required
                  autoComplete='email'
                  placeholder='ejemplo@dominio.com'
                />
              </div>

              <div>
                <Label
                  htmlFor='password'
                  className='text-sm font-medium text-gray-700 dark:text-gray-200'
                >
                  Contraseña
                </Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerData.password}
                    onChange={e => setRegisterData({ ...registerData, password: e.target.value })}
                    className='mt-1 pr-10'
                    required
                    minLength={6}
                  />
                  <button
                    type='button'
                    onClick={() => setShowRegisterPassword(prev => !prev)}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                    aria-label={showRegisterPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <Eye className='w-4 h-4' />
                  </button>
                </div>
              </div>

              <div>
                <Label
                  htmlFor='confirmPassword'
                  className='text-sm font-medium text-gray-700 dark:text-gray-200'
                >
                  Confirmar Contraseña
                </Label>
                <div className='relative'>
                  <Input
                    id='confirmPassword'
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    value={registerData.confirmPassword}
                    onChange={e =>
                      setRegisterData({ ...registerData, confirmPassword: e.target.value })
                    }
                    className='mt-1 pr-10'
                    required
                    minLength={6}
                  />
                  <button
                    type='button'
                    onClick={() => setShowRegisterConfirmPassword(prev => !prev)}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                    aria-label={
                      showRegisterConfirmPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    <Eye className='w-4 h-4' />
                  </button>
                </div>
              </div>

              <div className='flex gap-3 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowRegisterModal(false)}
                  className='flex-1 rounded-full'
                  disabled={registerLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  className='flex-1 bg-green-600 hover:bg-green-700 rounded-full'
                  disabled={registerLoading}
                >
                  {registerLoading ? 'Creando...' : 'Crear Administrador'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

