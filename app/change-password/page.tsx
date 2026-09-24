'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.trim().length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: password.trim(), confirmPassword: confirmPassword.trim() })
      });

      if (res.status === 401) {
        toast.error('Sesión expirada. Redirigiendo al login...');
        setTimeout(() => router.replace('/login'), 1500);
        return;
      }

      const data = await res.json();

      if (data.success) {
        toast.success('Contraseña actualizada exitosamente');
        router.replace('/dashboard');
      } else {
        toast.error(data.message || 'Error al cambiar la contraseña');
      }
    } catch {
      toast.error('Error de red o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4'>
      <div className='w-full max-w-md'>
        <div className='flex justify-center mb-8'>
          <Image
            src='/img/system/logo2.png'
            alt='Logo'
            width={200}
            height={128}
            className='w-[200px] h-auto'
            sizes='200px'
            priority
          />
        </div>

        <Card className='border-t-4 border-t-blue-600 shadow-xl'>
          <CardHeader className='text-center'>
            <div className='mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-3'>
              <KeyRound className='h-6 w-6 text-blue-600 dark:text-blue-400' />
            </div>
            <CardTitle className='text-xl font-bold text-gray-900 dark:text-gray-100'>
              Cambio de Contraseña Requerido
            </CardTitle>
            <CardDescription className='text-sm text-gray-500 dark:text-gray-400'>
              Esta es tu primera sesión o tu contraseña fue restablecida. Creá una nueva contraseña
              para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-5'>
              <div className='space-y-2'>
                <Label htmlFor='password'>Nueva Contraseña</Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder='Mínimo 8 caracteres'
                    className='pr-10'
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-hidden='true'
                  >
                    {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>Confirmar Contraseña</Label>
                <Input
                  id='confirmPassword'
                  type='password'
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder='Repetí la nueva contraseña'
                  disabled={loading}
                />
              </div>

              <Button
                type='submit'
                disabled={loading || !password || !confirmPassword}
                className='w-full bg-black text-white rounded-full hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 h-12 font-bold'
              >
                {loading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    Guardando...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
