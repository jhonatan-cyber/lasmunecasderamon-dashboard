'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowLeft, QrCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LazyQRCode } from '@/components/shared/LazyQRCode';
import Link from 'next/link';
import Image from 'next/image';

interface PublicUser {
  id: string | number;
  name: string;
  nick: string;
  foto: string;
  qr_token: string | null;
  role: string;
}

export default function AsistenciaQrPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    fetch('/api/public/users')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setUsers(data.data);
        }
      })
      .catch(err => console.error('Error fetching users:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(
    user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nick.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className='min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500 selection:text-black'>
      {/* Background decoration */}
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-950/20 via-neutral-950 to-neutral-950 pointer-events-none' />

      <div className='relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12 border-b border-neutral-800 pb-8'>
          <div>
            <h1 className='text-3xl md:text-4xl font-extrabold uppercase tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent'>
              Acceso de Asistencia
            </h1>
            <p className='text-neutral-400 text-sm mt-2 max-w-xl'>
              Seleccioná tu perfil para generar y visualizar tu código QR de asistencia. Luego,
              escanealo desde la app móvil para registrar tu jornada.
            </p>
          </div>

          <Link href='/login' passHref legacyBehavior>
            <Button
              variant='outline'
              className='border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl gap-2 w-fit self-start active:scale-95 transition-all'
            >
              <ArrowLeft className='h-4 w-4' />
              Volver al Login
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className='relative max-w-md mb-8'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500' />
          <Input
            type='text'
            placeholder='Buscar por tu nombre o apodo...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='pl-12 pr-4 py-6 bg-neutral-900/60 border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl text-white placeholder-neutral-500 w-full transition-all'
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className='bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 flex flex-col items-center animate-pulse'
              >
                <div className='w-20 h-20 bg-neutral-800 rounded-full mb-4' />
                <div className='h-4 bg-neutral-800 rounded w-2/3 mb-2' />
                <div className='h-3 bg-neutral-800 rounded w-1/2' />
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className='text-center py-16 bg-neutral-900/20 border border-dashed border-neutral-800 rounded-3xl'>
            <QrCode className='h-12 w-12 text-neutral-600 mx-auto mb-4' />
            <h3 className='text-lg font-bold text-neutral-300'>No se encontraron trabajadores</h3>
            <p className='text-neutral-500 text-sm mt-1'>Ajustá los términos de tu búsqueda.</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className='group bg-neutral-900/30 hover:bg-neutral-900/60 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/5'
              >
                <div className='relative w-20 h-20 rounded-full mb-4 overflow-hidden border-2 border-neutral-800 group-hover:border-amber-500 transition-colors'>
                  <Image
                    src={user.foto ? `/img/users/${user.foto}` : '/img/users/default.png'}
                    alt={user.name}
                    fill
                    sizes='80px'
                    className='object-cover'
                    unoptimized
                  />
                </div>
                <h3 className='font-bold text-neutral-100 text-sm group-hover:text-amber-400 transition-colors line-clamp-1'>
                  {user.name}
                </h3>
                <span className='text-xs text-neutral-500 font-medium mt-1 uppercase tracking-wider line-clamp-1'>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)}>
        <DialogContent className='w-[92vw] max-w-sm sm:max-w-md bg-neutral-900 border-neutral-800 text-white rounded-2xl overflow-hidden p-6'>
          {selectedUser && (
            <>
              <DialogHeader className='items-center text-center'>
                <div className='relative w-20 h-20 rounded-full overflow-hidden border-2 border-amber-500 mb-3 shadow-md shadow-amber-500/10'>
                  <Image
                    src={
                      selectedUser.foto
                        ? `/img/users/${selectedUser.foto}`
                        : '/img/users/default.png'
                    }
                    alt={selectedUser.name}
                    fill
                    sizes='80px'
                    className='object-cover'
                    unoptimized
                  />
                </div>
                <DialogTitle className='text-xl font-black uppercase tracking-tight text-amber-400'>
                  {selectedUser.name}
                </DialogTitle>
                <DialogDescription className='text-neutral-400 text-xs font-semibold uppercase tracking-wider'>
                  {selectedUser.role}
                </DialogDescription>
              </DialogHeader>

              <div className='flex flex-col items-center justify-center p-6 bg-white rounded-2xl my-4 select-none'>
                {selectedUser.qr_token ? (
                  <div className='w-[200px] h-[200px] relative'>
                    <LazyQRCode
                      value={selectedUser.qr_token}
                      size={200}
                      style={{ width: '100%', height: 'auto' }}
                      level='H'
                      includeMargin={true}
                    />
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-8 text-neutral-400'>
                    <QrCode className='h-12 w-12 text-neutral-300 animate-pulse mb-3' />
                    <p className='text-neutral-900 font-black uppercase text-sm'>
                      Sin Token Configurado
                    </p>
                    <p className='text-neutral-500 text-xs text-center mt-1'>
                      Pedile a un Administrador que genere tu código.
                    </p>
                  </div>
                )}
              </div>

              {selectedUser.qr_token && (
                <p className='text-center text-xs text-neutral-400 mt-2 px-2 leading-relaxed'>
                  Presentá este código QR frente a la cámara de la tablet o celular de asistencia
                  para registrar tu ingreso o salida del local.
                </p>
              )}

              <Button
                onClick={() => setSelectedUser(null)}
                className='w-full mt-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-black font-black uppercase tracking-wider text-xs py-3 rounded-xl transition-all'
              >
                Cerrar Ventana
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
