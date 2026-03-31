'use client';

import { useState, useEffect } from 'react';
import { Loader2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  description: string;
}

interface PermissionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  permissionData: Permission | null;
  onSubmit: (data: { name: string; module: string; action: string; description: string }) => Promise<void>;
  isLoading: boolean;
}

export function PermissionModal({
  isOpen,
  onOpenChange,
  isEditMode,
  permissionData,
  onSubmit,
  isLoading
}: PermissionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    module: '',
    action: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (permissionData) {
        setFormData({
          name: permissionData.name || '',
          module: permissionData.module || '',
          action: permissionData.action || '',
          description: permissionData.description || ''
        });
      } else {
        setFormData({ name: '', module: '', action: '', description: '' });
      }
    }
  }, [isOpen, permissionData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.module || !formData.action) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permission:', error);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Key className='h-5 w-5' />
            {isEditMode ? 'Editar Permiso' : 'Nuevo Permiso'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {isEditMode ? 'Formulario para editar permiso' : 'Formulario para crear nuevo permiso'}
          </DialogDescription>
        </DialogHeader>

        <form id='permission-form' onSubmit={handleSubmit} className='flex-1 overflow-y-auto p-6 space-y-4 sm:space-y-6'>
          {/* Nombre */}
          <div>
            <Label htmlFor='permission-name' className='mb-2 text-sm sm:text-base'>
              Nombre
            </Label>
            <span className='text-xs text-red-500'> *</span>
            <div className='relative'>
              <Input
                id='permission-name'
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder='Ver usuarios'
                disabled={isLoading}
                className='rounded-full px-4'
              />
            </div>
          </div>

          {/* Módulo */}
          <div>
            <Label htmlFor='permission-module' className='mb-2 text-sm sm:text-base'>
              Módulo
            </Label>
            <span className='text-xs text-red-500'> *</span>
            <div className='relative'>
              <Input
                id='permission-module'
                value={formData.module}
                onChange={e => setFormData(prev => ({ ...prev, module: e.target.value }))}
                placeholder='usuarios'
                disabled={isLoading}
                className='rounded-full px-4'
              />
            </div>
          </div>

          {/* Acción */}
          <div>
            <Label htmlFor='permission-action' className='mb-2 text-sm sm:text-base'>
              Acción
            </Label>
            <span className='text-xs text-red-500'> *</span>
            <div className='relative'>
              <select
                id='permission-action'
                value={formData.action}
                onChange={e => setFormData(prev => ({ ...prev, action: e.target.value }))}
                disabled={isLoading}
                className='w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent bg-white dark:bg-neutral-800 text-black dark:text-neutral-100'
                required
              >
                <option value=''>Seleccionar acción</option>
                <option value='create'>create</option>
                <option value='read'>read</option>
                <option value='update'>update</option>
                <option value='delete'>delete</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor='permission-description' className='mb-2 text-sm sm:text-base'>
              Descripción
            </Label>
            <span className='text-xs text-gray-500'> (Opcional)</span>
            <div className='relative'>
              <textarea
                id='permission-description'
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder='Descripción opcional del permiso'
                disabled={isLoading}
                rows={3}
                className='w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent bg-white dark:bg-neutral-800 text-black dark:text-neutral-100 resize-none'
              />
            </div>
          </div>
        </form>

        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            variant='outline'
            onClick={handleCancel}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='permission-form'
            className='bg-black text-white dark:bg-black dark:text-white dark:hover:!bg-white dark:hover:!text-black rounded-full px-8 hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
            disabled={isLoading}
          >
            {isLoading ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>{isEditMode ? 'Actualizando...' : 'Guardando...'}</span>
              </div>
            ) : (
              <span>{isEditMode ? 'Actualizar' : 'Guardar'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}