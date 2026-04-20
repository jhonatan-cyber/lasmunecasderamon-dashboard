'use client';

import { Mail, Lock, Eye, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  step: 'login' | 'codigo';
  handleLogin: (e?: React.FormEvent) => void;
  handleVerifyCode: (e: React.FormEvent) => void;
  loginData: any;
  setLoginData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  emailInputRef: any;
  passwordInputRef: any;
  submitButtonRef: any;
  handleKeyDown: (e: any, ref: any) => void;
  handlePasswordKeyDown: (e: any) => void;
  codigo: string;
  setCodigo: (val: string) => void;
  loading: boolean;
  rateLimitRemaining: number;
  hasUsers: boolean | null;
  onShowRegister: () => void;
  theme: string;
  toggleTheme: () => void;
  setThemeMode: (mode: string) => void;
  onSetStep: (step: 'login' | 'codigo') => void;
}

export const LoginForm = ({
  step,
  handleLogin,
  handleVerifyCode,
  loginData,
  setLoginData,
  showPassword,
  setShowPassword,
  emailInputRef,
  passwordInputRef,
  submitButtonRef,
  handleKeyDown,
  handlePasswordKeyDown,
  codigo,
  setCodigo,
  loading,
  rateLimitRemaining,
  hasUsers,
  onShowRegister,
  theme,
  toggleTheme,
  setThemeMode,
  onSetStep
}: LoginFormProps) => {
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  if (step === 'login') {
    return (
      <form className='space-y-5' onSubmit={handleLogin}>
        <div>
          <Label className='block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1'>
            Usuario
          </Label>
          <div className='relative'>
            <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base pointer-events-none' />
            <Input
              ref={emailInputRef}
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
                @lasmuñecasderamon.com
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
              type={showPassword ? 'text' : 'password'}
              placeholder='Contraseña'
              className='pl-12 pr-12 bg-white dark:bg-gray-800'
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              onKeyDown={handlePasswordKeyDown}
              autoComplete='current-password'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors'
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
          className='rounded-full px-6 bg-black dark:bg-white text-white dark:text-black border-black dark:border-white  dark:hover:bg-gray-200 hover:scale-110 transition-all w-full'
        >
          {loading ? 'Validando...' : 'Iniciar sesión'}
        </Button>

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

        {/* Theme Selector */}
        <div className='flex justify-center mt-4'>
          <div className='flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-gray-900'>
            {themeOptions.map(opt => {
              const Icon = opt.icon;
              const isActive = theme === opt.value;

              return (
                <Button
                  key={opt.value}
                  type='button'
                  variant='ghost'
                  onClick={() => setThemeMode(opt.value)}
                  aria-pressed={isActive}
                  title={opt.label}
                  className={`rounded-full text-xl transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
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
        <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800'>
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
