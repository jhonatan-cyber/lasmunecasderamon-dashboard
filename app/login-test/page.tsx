'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginTestPage() {
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('🚀 Attempting login...');
      
      const res = await fetch('/api/test-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await res.json();
      console.log('📊 Login response:', data);

      if (!data.success) {
        toast.error(data.message || 'Error de autenticación');
        setLoading(false);
        return;
      }

      toast.success('¡Bienvenido al sistema!');
      setLoading(false);
      
      console.log('🔄 Attempting redirect...');
      
      // Guardar token en localStorage para debugging
      localStorage.setItem('debug_token', data.token);
      console.log('🔍 Token saved to localStorage for debugging');
      
      // Redirección directa sin usar router
      console.log('🔄 Redirecting to dashboard-simple...');
      window.location.href = '/dashboard-simple';
      
    } catch (err) {
      console.error('❌ Login error:', err);
      toast.error('Error de red o servidor');
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='bg-white rounded-2xl shadow-lg p-10 w-full max-w-md'>
        <h2 className='text-2xl font-bold text-center mb-6'>
          Login Test (Aislado)
        </h2>
        
        <form className='space-y-5' onSubmit={handleLogin}>
          <div>
            <Label className='block text-sm font-medium text-gray-700 mb-1'>
              Correo
            </Label>
            <div className='relative'>
              <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' />
              <Input
                type='text'
                placeholder='Correo electrónico'
                className='pl-10'
                value={loginData.email}
                onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className='block text-sm font-medium text-gray-700 mb-1'>
              Contraseña
            </Label>
            <div className='relative'>
              <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' />
              <Input
                type='password'
                placeholder='Contraseña'
                className='pl-10'
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
          </div>

          <Button
            type='submit'
            className='w-full'
            disabled={loading}
          >
            {loading ? 'Validando...' : 'Iniciar sesión'}
          </Button>

          {loading && (
            <div className='flex justify-center mt-2'>
              <span className='animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full'></span>
            </div>
          )}
        </form>

        <div className='mt-4 text-center'>
          <p className='text-sm text-gray-500'>
            Esta página está completamente aislada para testing
          </p>
        </div>
      </div>
    </div>
  );
}
