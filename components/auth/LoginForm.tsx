'use client';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EMAIL_DOMAIN } from '@/lib/constants/email';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logger from '@/lib/utils/logger';
import type { LoginFormData } from '@/hooks/auth/useLoginForm';

interface FormState {
  step: 'login' | 'codigo';
  view: 'login' | 'recovery';
  loading: boolean;
  recoveryLoading: boolean;
  recoveryComplete: boolean;
  recoveryRun: string;
  setRecoveryRun: (value: string) => void;
  codigo: string;
  setCodigo: (val: string) => void;
  hasUsers: boolean | null;
}

interface PasswordState {
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}

interface InputRefs {
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  submitButtonRef: React.RefObject<HTMLButtonElement | null>;
}

interface FormHandlers {
  handleLogin: (e?: React.FormEvent) => void;
  handlePasswordRecovery: (e: React.FormEvent) => void;
  handleVerifyCode: (e: React.FormEvent) => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    ref: React.RefObject<HTMLInputElement | null>
  ) => void;
  handlePasswordKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface ThemeState {
  theme: string;
  toggleTheme: () => void;
  setThemeMode: (mode: string) => void;
}

interface Callbacks {
  onShowRegister: () => void;
  onSetStep: (step: 'login' | 'codigo') => void;
  onSetView: (view: 'login' | 'recovery') => void;
  onResetRecovery: () => void;
}

interface LoginFormProps {
  form: FormState;
  credentials: {
    loginData: LoginFormData;
    setLoginData: React.Dispatch<React.SetStateAction<LoginFormData>>;
  };
  password: PasswordState;
  inputRefs: InputRefs;
  handlers: FormHandlers;
  theme: ThemeState;
  callbacks: Callbacks;
}

export const LoginForm = ({
  form,
  credentials,
  password,
  inputRefs,
  handlers,
  theme: themeState,
  callbacks
}: LoginFormProps) => {
  const {
    step,
    view,
    loading,
    recoveryLoading,
    recoveryComplete,
    recoveryRun,
    setRecoveryRun,
    codigo,
    setCodigo,
    hasUsers
  } = form;
  const { loginData, setLoginData } = credentials;
  const { showPassword, setShowPassword } = password;
  const { emailInputRef, passwordInputRef, submitButtonRef } = inputRefs;
  const {
    handleLogin,
    handleVerifyCode,
    handlePasswordRecovery,
    handleKeyDown,
    handlePasswordKeyDown
  } = handlers;
  const { theme, toggleTheme, setThemeMode } = themeState;
  const { onShowRegister, onSetStep, onSetView, onResetRecovery } = callbacks;
  const [themeChanging, setThemeChanging] = useState<string | null>(null);
  const passwordTapRef = useRef(0);
  const themeTapRef = useRef(0);

  const runSingleTap = (ref: { current: number }, action: () => void) => {
    const now = Date.now();
    if (now - ref.current < 250) return;
    ref.current = now;
    action();
  };

  const handleThemeChange = (mode: string) => {
    logger.info('[Login][Theme] Cambio solicitado', { mode, timestamp: new Date().toISOString() });
    setThemeChanging(mode);
    setThemeMode(mode);
    setTimeout(() => setThemeChanging(null), 300);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  if (view === 'recovery') {
    return (
      <div className='space-y-5'>
        <button
          type='button'
          onClick={() => {
            onResetRecovery();
            onSetView('login');
          }}
          className='inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-300'
        >
          <ArrowLeft className='h-4 w-4' aria-hidden='true' />
          Volver al inicio de sesión
        </button>

        {recoveryComplete ? (
          <div className='space-y-3 text-center' role='status'>
            <MessageCircle className='mx-auto h-10 w-10 text-emerald-600' aria-hidden='true' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
              Revisa tu WhatsApp
            </h3>
            <p className='text-sm leading-relaxed text-gray-600 dark:text-gray-300'>
              Si los datos corresponden a una cuenta con teléfono registrado, enviaremos una clave
              temporal por WhatsApp. Tendrás que cambiarla al iniciar sesión.
            </p>
            <Button
              type='button'
              variant='outline'
              className='w-full rounded-full'
              onClick={() => onSetView('login')}
            >
              Ir a iniciar sesión
            </Button>
          </div>
        ) : (
          <form className='space-y-4' onSubmit={handlePasswordRecovery}>
            <div className='text-center'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Recuperar contraseña
              </h3>
              <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                Ingresa tu RUN/CI. Enviaremos una clave temporal al WhatsApp registrado en tu
                cuenta.
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='recovery-run'>RUN / CI</Label>
              <Input
                id='recovery-run'
                autoComplete='off'
                value={recoveryRun}
                onChange={event => setRecoveryRun(event.target.value)}
                placeholder='Número de identificación'
                minLength={4}
                maxLength={24}
                required
              />
            </div>
            <Button type='submit' disabled={recoveryLoading} className='w-full rounded-full'>
              {recoveryLoading ? 'Enviando...' : 'Enviar clave por WhatsApp'}
            </Button>
          </form>
        )}
      </div>
    );
  }

  if (step === 'login') {
    return (
      <form className='space-y-5' noValidate onSubmit={handleLogin}>
        <div>
          <Label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1'>
            Usuario
          </Label>
          <div className='relative'>
            <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base pointer-events-none' />
            <Input
              ref={emailInputRef}
              id='nick'
              type='text'
              placeholder='admin, pepe, lizi...'
              autoComplete='username'
              className='pl-12 pr-4 bg-white dark:bg-gray-800'
              value={loginData.email}
              onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              onKeyDown={e => handleKeyDown(e, passwordInputRef)}
            />
            {loginData.email && (
              <span
                className='absolute top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none'
                style={{ left: `${48 + loginData.email.length * 8.5}px` }}
              >
                {EMAIL_DOMAIN}
              </span>
            )}
          </div>
        </div>

        <div>
          <Label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1'>
            Contraseña
          </Label>
          <div className='relative'>
            <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base pointer-events-none' />
            <Input
              ref={passwordInputRef}
              id='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Contraseña'
              className='pl-12 pr-14 bg-white dark:bg-gray-800'
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              onKeyDown={handlePasswordKeyDown}
              autoComplete='current-password'
            />
            <button
              type='button'
              onPointerDown={e => {
                e.preventDefault();
                runSingleTap(passwordTapRef, () => setShowPassword(!showPassword));
              }}
              onMouseDown={e => {
                e.preventDefault();
                runSingleTap(passwordTapRef, () => setShowPassword(!showPassword));
              }}
              onClick={e => {
                e.preventDefault();
                runSingleTap(passwordTapRef, () => setShowPassword(!showPassword));
              }}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              className='absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-md p-2 text-gray-400 transition-colors hover:text-gray-600 focus:outline-hidden focus:ring-2 focus:ring-gray-300 dark:text-gray-500 dark:focus:ring-gray-600 touch-manipulation cursor-pointer pointer-events-auto'
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
            </button>
          </div>
        </div>

        <Button
          ref={submitButtonRef}
          type='submit'
          variant='outline'
          disabled={loading}
          className='rounded-full px-6 bg-black dark:bg-white text-white dark:text-black border-black dark:border-white  dark:hover:bg-gray-200 hover:scale-110 transition-all w-full'
        >
          {loading ? 'Validando...' : 'Iniciar sesión'}
        </Button>

        <div className='text-center'>
          <button
            type='button'
            onClick={() => onSetView('recovery')}
            className='text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400'
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {hasUsers === false && (
          <Button
            type='button'
            variant='outline'
            className='mt-4 rounded-full px-6 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:scale-110 transition-all w-full'
            onClick={onShowRegister}
          >
            Crear primer usuario administrador
          </Button>
        )}

        {}
        <div className='flex justify-center mt-4'>
          <div className='flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-xs dark:border-gray-800 dark:bg-gray-900'>
            {themeOptions.map(opt => {
              const Icon = opt.icon;
              const isActive = theme === opt.value;

              return (
                <Button
                  key={opt.value}
                  type='button'
                  variant='ghost'
                  onPointerDown={e => {
                    e.preventDefault();
                    runSingleTap(themeTapRef, () => handleThemeChange(opt.value));
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    runSingleTap(themeTapRef, () => handleThemeChange(opt.value));
                  }}
                  onClick={e => {
                    e.preventDefault();
                    runSingleTap(themeTapRef, () => handleThemeChange(opt.value));
                  }}
                  aria-pressed={isActive}
                  title={opt.label}
                  className={`rounded-full text-xl transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  } min-h-10 min-w-10 touch-manipulation cursor-pointer pointer-events-auto ${
                    themeChanging === opt.value ? 'opacity-80 animate-pulse' : ''
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Icon className='h-4 w-4' />
                </Button>
              );
            })}
            <Button
              type='button'
              variant='ghost'
              onClick={toggleTheme}
              title='Cambiar tema'
              className='sr-only'
            >
              Cambiar tema
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form className='space-y-5' onSubmit={handleVerifyCode}>
      <div className='text-center mb-6'>
        <div className='bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800'>
          <div className='flex items-center justify-center mb-3'>
            <div className='w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center'>
              <span className='text-2xl'>🔐</span>
            </div>
          </div>
          <h3 className='text-xl font-bold text-blue-900 dark:text-blue-100 mb-2'>
            Verificación de Seguridad
          </h3>
          <p className='text-sm text-blue-700 dark:text-blue-300 leading-relaxed'>
            Para completar el acceso, ingrese el código de verificación proporcionado por el
            administrador.
          </p>
        </div>
      </div>

      <div>
        <Label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 text-center'>
          Código de Verificación
        </Label>
        <div className='relative'>
          <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-blue-500' />
          <Input
            type='text'
            placeholder='0000'
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            className='pl-10 text-center text-xl font-mono tracking-widest border-2 focus:border-blue-500'
            autoFocus
          />
        </div>
      </div>

      <Button
        type='submit'
        variant='outline'
        className='rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:scale-105 transition-all w-full font-semibold'
        disabled={loading || codigo.length !== 4}
      >
        {loading ? 'Validando...' : 'Verificar Código'}
      </Button>

      <div className='text-center'>
        <button
          type='button'
          onClick={() => onSetStep('login')}
          className='text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mx-auto'
        >
          <span>← Volver al login</span>
        </button>
      </div>
    </form>
  );
};
