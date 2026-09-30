'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatFechaLarga, formatSoloHora } from '@/lib/utils/formatters';

interface CajaDetailsUserCardsProps {
  caja: any;
  imageVersion: string | number;
}

const cardShell =
  'bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700';

function UsuarioAvatar({
  nombre,
  foto,
  imageVersion,
  fallbackClass
}: {
  nombre?: string;
  foto?: string;
  imageVersion: string | number;
  fallbackClass: string;
}) {
  return (
    <Avatar className='h-8 w-8'>
      {foto && foto !== '' ? (
        <Image
          data-themed-photo
          src={`/img/users/${foto}?v=${imageVersion}`}
          alt={nombre || 'Usuario'}
          width={32}
          height={32}
          className='w-full h-full object-cover rounded-full'
        />
      ) : (
        <AvatarImage src='/img/users/default.png' alt={nombre || 'Usuario'} />
      )}
      <AvatarFallback className={`${fallbackClass} font-bold text-xs`}>
        {nombre?.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

/** Tarjetas «Abierta por» y, si la caja está cerrada, «Cerrada por». */
export const CajaDetailsUserCards = memo(function CajaDetailsUserCards({
  caja,
  imageVersion
}: CajaDetailsUserCardsProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2'>
      <div className={cardShell}>
        <div className='mb-3'>
          <p className='text-xs font-bold text-gray-500 uppercase mb-2'>Abierta por</p>
          <div className='flex items-center gap-2'>
            <UsuarioAvatar
              nombre={caja.cajero_nombre}
              foto={caja.cajero_foto}
              imageVersion={imageVersion}
              fallbackClass='bg-emerald-100 text-emerald-700'
            />
            <p className='font-bold text-gray-900 dark:text-white'>{caja.cajero_nombre || 'N/A'}</p>
          </div>
        </div>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          {formatFechaLarga(caja.fecha_apertura)} • {formatSoloHora(caja.fecha_apertura)}
        </p>
      </div>
      {caja.fecha_cierre && (
        <div className={cardShell}>
          <div className='mb-3'>
            <p className='text-xs font-bold text-gray-500 uppercase mb-2'>Cerrada por</p>
            <div className='flex items-center gap-2'>
              <UsuarioAvatar
                nombre={caja.cajero_cierre_nombre}
                foto={caja.cajero_cierre_foto}
                imageVersion={imageVersion}
                fallbackClass='bg-slate-100 text-slate-700'
              />
              <p className='font-bold text-gray-900 dark:text-white'>
                {caja.cajero_cierre_nombre || 'N/A'}
              </p>
            </div>
          </div>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            {formatFechaLarga(caja.fecha_cierre)} • {formatSoloHora(caja.fecha_cierre)}
          </p>
        </div>
      )}
    </div>
  );
});
