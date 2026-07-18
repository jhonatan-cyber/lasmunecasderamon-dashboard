'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { LoginForm } from './LoginForm';
import { RegisterFirstUserModal } from './RegisterFirstUserModal';
import { QrCode } from 'lucide-react';

export const LoginView = () => {
  const {
    loading,
    theme,
    toggleTheme,
    setThemeMode,
    codigo,
    setCodigo,
    loginData,
    setLoginData,
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
  } = useLoginForm();

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black transition-colors duration-300'>
      <div className='flex w-full max-w-6xl mx-auto items-center justify-center gap-8'>
        {}
        <div className='hidden md:flex flex-1 flex-col items-center justify-center'>
          <Image
            src='/img/system/logo2.png'
            alt='Logo'
            width={1124}
            height={721}
            className='mb-4 w-[320px] h-auto'
            sizes='320px'
            loading='eager'
          />
          <h1 className='text-2xl md:text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white transition-colors duration-300'>
            Bien venido, Las Muñecas de Ramón
          </h1>
          <p className='text-gray-600 dark:text-gray-300 text-center mb-2 transition-colors duration-300'>
            Nightclub exclusivo en la ciudad de Linares
            <br />
            &quot;Un lugar para caballeros&quot;
          </p>
          <div className='flex justify-center mt-8'>
            <Image
              src='/img/system/presentation.png'
              alt='Presentación'
              width={600}
              height={200}
              loading='eager'
            />
          </div>
        </div>

        {}
        <div className='flex-1 flex items-center justify-center w-full'>
          <div className='w-full flex flex-col items-center'>
            {}
            <div className='md:hidden mb-6 flex justify-center w-full'>
              <Image
                src='/img/system/logo2.png'
                alt='Logo'
                width={1124}
                height={721}
                className='w-[200px] h-auto'
                sizes='200px'
                loading='eager'
              />
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

              <LoginForm
                form={{
                  step,
                  loading,
                  codigo,
                  setCodigo,
                  rateLimitRemaining,
                  hasUsers
                }}
                credentials={{ loginData, setLoginData }}
                password={{ showPassword, setShowPassword }}
                inputRefs={{ emailInputRef, passwordInputRef, submitButtonRef }}
                handlers={{
                  handleLogin,
                  handleVerifyCode,
                  handleKeyDown,
                  handlePasswordKeyDown
                }}
                theme={{ theme, toggleTheme, setThemeMode }}
                callbacks={{
                  onShowRegister: () => setShowRegisterModal(true),
                  onSetStep: setStep
                }}
              />
              <div className='mt-6 pt-6 border-t border-gray-100 dark:border-gray-800/80 text-center w-full'>
                <Link
                  href='/asistencia-qr'
                  className='w-full bg-black text-white rounded-full px-6 py-3 border-2 border-black hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all duration-200 inline-flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white cursor-pointer select-none'
                >
                  <QrCode className='h-4 w-4' />
                  Asistencia Trabajadores (QR)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RegisterFirstUserModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        registerData={registerData}
        setRegisterData={setRegisterData}
        onRegister={handleRegister}
        loading={registerLoading}
      />
    </div>
  );
};
