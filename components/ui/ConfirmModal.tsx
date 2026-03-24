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
  hideCancel?: boolean;
}

const modalVariants = {
  warning: {
    icon: <AlertTriangle className='text-yellow-500' size={24} />,
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white'
  },
  question: {
    icon: <HelpCircle className='text-blue-500' size={24} />,
    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  info: {
    icon: <Info className='text-blue-500' size={24} />,
    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  success: {
    icon: <CheckCircle className='text-green-500' size={24} />,
    confirmClass: 'bg-green-600 hover:bg-green-700 text-white'
  }
} as const;

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
  size = 'md',
  hideCancel = false
}: ConfirmModalProps) {
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

  const variantConfig = modalVariants[type] ?? modalVariants.question;
  const showCancelButton = !hideCancel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size]} max-h-[90vh] flex flex-col p-0`}>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <div className='flex items-center gap-3'>
            <div className='text-2xl'>{variantConfig.icon}</div>
            <DialogTitle className='text-lg font-semibold text-gray-900'>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <p className='text-gray-600 text-center'>{message}</p>
        </div>

        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center gap-3'>
            {showCancelButton && (
              <Button
                variant={cancelVariant}
                size='sm'
                onClick={handleCancel}
                className='whitespace-nowrap inline-flex items-center  hover:bg-black hover:text-white rounded-full  hover:scale-105 transition-all duration-200'
              >
                {cancelText}
              </Button>
            )}
            <Button
              variant={confirmVariant}
              size='sm'
              onClick={handleConfirm}
              className={`whitespace-nowrap inline-flex items-center rounded-full hover:scale-105 transition-all duration-200 ${variantConfig.confirmClass}`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
