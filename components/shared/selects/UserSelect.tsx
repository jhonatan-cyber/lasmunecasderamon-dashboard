'use client';

import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User as UserIcon } from 'lucide-react';
import { User } from '@/types/user';
import {
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_SEARCH_INPUT_CLASS,
  ORDER_FIELD_SEARCH_WRAPPER_CLASS,
  ORDER_MULTISELECT_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

interface UserSelectProps {
  users: User[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  
  roles?: string[];
  
  onlyActive?: boolean;
  
  className?: string;
  
  showNick?: boolean;
  disabled?: boolean;
  required?: boolean;
}


export default function UserSelect({
  users = [],
  value,
  onChange,
  label = 'Usuario',
  placeholder = 'Selecciona un usuario',
  searchPlaceholder = 'Buscar usuario...',
  roles,
  onlyActive = true,
  showNick = true,
  disabled = false,
  required = false,
  className = ''
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const uniqueId = React.useId();

  
  const eligibleUsers = useMemo(() => {
    return (users || []).filter(u => {
      
      const isActive = u.status === 1 || u.status === undefined || u.status === null;
      if (onlyActive && !isActive) return false;

      
      const userRole = (u.role || '').toLowerCase();
      if (userRole === 'administrador' || userRole === 'admin') return false;

      
      if (roles && roles.length > 0) {
        return roles.some(r => r.toLowerCase() === userRole);
      }

      return true;
    });
  }, [users, roles, onlyActive]);

  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return eligibleUsers;
    const s = searchTerm.toLowerCase();
    return eligibleUsers.filter(u => {
      const fullName = `${u.name} ${u.lastName}`.toLowerCase();
      const nick = (u.nick || '').toLowerCase();
      return fullName.includes(s) || nick.includes(s);
    });
  }, [eligibleUsers, searchTerm]);

  const displayUsers = (() => {
    if (!value) return filteredUsers;

    const isSelectedInFiltered = filteredUsers.some(u => {
      return u.id && u.id.toString() === value;
    });

    if (isSelectedInFiltered) return filteredUsers;

    const selectedUser = eligibleUsers.find(u => {
      return u.id && u.id.toString() === value;
    });

    return selectedUser ? [selectedUser, ...filteredUsers] : filteredUsers;
  })();

  const selectedUser = eligibleUsers.find(u => {
    return u.id && u.id.toString() === value;
  });

  const selectedLabel = selectedUser
    ? `${selectedUser.name} ${selectedUser.lastName}${showNick && selectedUser.nick ? ` (${selectedUser.nick})` : ''}${selectedUser.role ? ` - ${selectedUser.role}` : ''}`
    : '';

  const handleValueChange = (newValue: string) => {
    setSearchTerm('');
    setOpen(false);
    onChange(newValue);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label htmlFor={uniqueId} className={ORDER_FIELD_LABEL_CLASS}>
        {label}
        {required && <span className='ml-1 text-red-500'>*</span>}
      </Label>

      <div className='relative'>
        <Popover open={open} onOpenChange={nextOpen => !disabled && setOpen(nextOpen)}>
          <PopoverTrigger asChild>
            <button
              id={uniqueId}
              type='button'
              className={`${ORDER_MULTISELECT_TRIGGER_CLASS} flex items-center gap-2 pr-10`}
              onClick={() => !disabled && setOpen(!open)}
              disabled={disabled}
            >
              <UserIcon className='w-4 h-4 text-gray-400 shrink-0' />
              {selectedLabel ? (
                <span className='truncate text-sm text-gray-900 dark:text-white'>
                  {selectedLabel}
                </span>
              ) : (
                <span className='text-sm text-gray-400 truncate'>{placeholder}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align='start' className={ORDER_FIELD_POPOVER_CLASS} sideOffset={5}>
            <div className={ORDER_FIELD_SEARCH_WRAPPER_CLASS}>
              <label htmlFor={`${uniqueId}-search`} className='sr-only'>
                Buscar usuario
              </label>
              <Input
                id={`${uniqueId}-search`}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={e => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                className={ORDER_FIELD_SEARCH_INPUT_CLASS}
                disabled={disabled}
                onClick={e => e.stopPropagation()}
              />
            </div>

            <div className='max-h-60 overflow-y-auto p-1'>
              {displayUsers.length === 0 ? (
                <div className='p-4 text-center text-sm text-gray-500'>
                  {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                </div>
              ) : (
                displayUsers.map(u => {
                  const stringId = u.id ? u.id.toString() : 'none';
                  const isSelected = stringId === value;
                  const displayName = `${u.name} ${u.lastName}${showNick && u.nick ? ` (${u.nick})` : ''}${u.role ? ` - ${u.role}` : ''}`;

                  return (
                    <button
                      key={stringId}
                      type='button'
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${isSelected ? 'bg-gray-100' : ''}`}
                      onClick={() => handleValueChange(stringId)}
                      disabled={disabled}
                    >
                      <span className='text-gray-700'>{displayName || 'Sin nombre'}</span>
                      {isSelected ? (
                        <span className='text-xs font-semibold text-gray-500'>SELECCIONADO</span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
