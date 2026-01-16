'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  HelpCircle, 
  Info, 
  CheckCircle 
} from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'question' | 'info' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  cancelVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'question',
  onConfirm,
  onCancel,
  confirmVariant = 'default',
  cancelVariant = 'outline',
  size = 'md'
}: ConfirmModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className='text-yellow-500' size={24} />;
      case 'question':
        return <HelpCircle className='text-blue-500' size={24} />;
      case 'info':
        return <Info className='text-blue-500' size={24} />;
      case 'success':
        return <CheckCircle className='text-green-500' size={24} />;
      default:
        return <HelpCircle className='text-blue-500' size={24} />;
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'warning':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'question':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size]} max-h-[90vh] flex flex-col p-0`}>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <div className='flex items-center gap-3'>
            <div className='text-2xl'>{getIcon()}</div>
            <DialogTitle className='text-lg font-semibold text-gray-900'>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <p className='text-gray-600 text-center'>{message}</p>
        </div>

        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleCancel}
              className='whitespace-nowrap inline-flex items-center  hover:bg-black hover:text-white rounded-full  hover:scale-105 transition-all duration-200'
            >
              {cancelText}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleConfirm}
              className={`whitespace-nowrap inline-flex items-center  bg-black text-white rounded-full  hover:scale-105 transition-all duration-200 `}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
