import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/lib/api/site';

export default function NotFound() {
  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950'>
      <div className='max-w-md w-full text-center space-y-6'>
        {/* Icon */}
        <div className='mx-auto w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
          <Search className='w-10 h-10 text-blue-600 dark:text-blue-400' />
        </div>

        {/* Title */}
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-100'>
          404
        </h1>
        <h2 className='text-xl font-semibold text-gray-700 dark:text-gray-300'>
          Página no encontrada
        </h2>

        {/* Description */}
        <p className='text-gray-600 dark:text-gray-400'>
          Lo sentimos, la página que buscas no existe o fue movida a otra ubicación.
        </p>

        {/* Actions */}
        <div className='flex gap-3 justify-center flex-wrap'>
          <Link href='/'>
            <Button className='gap-2'>
              <Home className='w-4 h-4' />
              Ir al inicio
            </Button>
          </Link>

          <Button
            variant='outline'
            onClick={() => window.history.back()}
            className='gap-2'
          >
            <ArrowLeft className='w-4 h-4' />
            Volver atrás
          </Button>
        </div>

        {/* Quick links */}
        <div className='pt-6 border-t border-gray-200 dark:border-gray-800'>
          <p className='text-sm text-gray-500 dark:text-gray-500 mb-4'>
           快速链接:
          </p>
          <div className='flex gap-2 justify-center flex-wrap'>
            <Link href='/dashboard' className='text-sm text-blue-600 hover:underline'>
              Dashboard
            </Link>
            <span className='text-gray-400'>•</span>
            <Link href='/users' className='text-sm text-blue-600 hover:underline'>
              Usuarios
            </Link>
            <span className='text-gray-400'>•</span>
            <Link href='/sales' className='text-sm text-blue-600 hover:underline'>
              Ventas
            </Link>
            <span className='text-gray-400'>•</span>
            <Link href='/services' className='text-sm text-blue-600 hover:underline'>
              Servicios
            </Link>
          </div>
        </div>

        {/* Site info */}
        <p className='text-xs text-gray-400 dark:text-gray-600 pt-4'>
          © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
