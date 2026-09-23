'use client';

import { useEffect, useState } from 'react';
import { Users as UsersIcon, Loader2 } from 'lucide-react';
import type { Role } from '@/hooks/personal';

interface RoleUser {
  id: string | number;
  nick: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  estado?: number | null;
}

export function RoleUsersList({ role }: { role: Role | null }) {
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!role) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/roles/${role.id}/users`)
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (!cancelled && data.success && Array.isArray(data.data)) setUsers(data.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  return (
    <div className='bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-gray-200 dark:border-neutral-800 p-4 sm:p-6'>
      <div className='flex items-center gap-2 mb-3'>
        <UsersIcon className='h-4 w-4 text-zinc-500 dark:text-neutral-400' />
        <h3 className='text-sm sm:text-base font-semibold text-black dark:text-neutral-100'>
          Usuarios asignados
          {role ? ` — ${role.name}` : ''}
          {!isLoading && role ? ` (${users.length})` : ''}
        </h3>
      </div>

      {!role ? (
        <p className='text-xs sm:text-sm text-zinc-500 dark:text-neutral-400'>
          Selecciona un rol para ver sus usuarios.
        </p>
      ) : isLoading ? (
        <div className='flex items-center justify-center py-4 text-zinc-400'>
          <Loader2 className='h-5 w-5 animate-spin' />
        </div>
      ) : users.length === 0 ? (
        <p className='text-xs sm:text-sm text-zinc-500 dark:text-neutral-400'>
          Este rol no tiene usuarios asignados.
        </p>
      ) : (
        <ul className='space-y-2 max-h-56 overflow-y-auto pr-1'>
          {users.map(u => (
            <li
              key={u.id}
              className='flex items-center justify-between gap-2 rounded-lg bg-zinc-50 dark:bg-neutral-800 px-3 py-2'
            >
              <div className='min-w-0'>
                <p className='text-xs sm:text-sm font-medium text-black dark:text-neutral-100 truncate'>
                  {[u.nombre, u.apellido].filter(Boolean).join(' ') || u.nick}
                </p>
                <p className='text-[11px] sm:text-xs text-zinc-500 dark:text-neutral-400 truncate'>
                  @{u.nick}
                </p>
              </div>
              <span
                className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full whitespace-nowrap ${
                  u.estado === 1 || u.estado === null || u.estado === undefined
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                {u.estado === 0 ? 'Inactivo' : 'Activo'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
