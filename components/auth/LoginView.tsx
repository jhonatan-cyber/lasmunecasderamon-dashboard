'use client';

import Image from 'next/image';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { LoginForm } from './LoginForm';
import { RegisterFirstUserModal } from './RegisterFirstUserModal';

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
                step={step}
                handleLogin={handleLogin}
                handleVerifyCode={handleVerifyCode}
                loginData={loginData}
                setLoginData={setLoginData}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                emailInputRef={emailInputRef}
                passwordInputRef={passwordInputRef}
                submitButtonRef={submitButtonRef}
                handleKeyDown={handleKeyDown}
                handlePasswordKeyDown={handlePasswordKeyDown}
                codigo={codigo}
                setCodigo={setCodigo}
                loading={loading}
                rateLimitRemaining={rateLimitRemaining}
                hasUsers={hasUsers}
                onShowRegister={() => setShowRegisterModal(true)}
                theme={theme}
                toggleTheme={toggleTheme}
                setThemeMode={setThemeMode}
                onSetStep={setStep}
              />
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
