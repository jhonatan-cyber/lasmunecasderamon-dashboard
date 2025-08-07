'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faQuestionCircle,
  faInfoCircle,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

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
        return <FontAwesomeIcon icon={faExclamationTriangle} className='text-yellow-500' />;
      case 'question':
        return <FontAwesomeIcon icon={faQuestionCircle} className='text-blue-500' />;
      case 'info':
        return <FontAwesomeIcon icon={faInfoCircle} className='text-blue-500' />;
      case 'success':
        return <FontAwesomeIcon icon={faCheckCircle} className='text-green-500' />;
      default:
        return <FontAwesomeIcon icon={faQuestionCircle} className='text-blue-500' />;
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
      <DialogContent className={`${sizeClasses[size]} p-0`}>
        <DialogHeader className='p-6 pb-4'>
          <div className='flex items-center gap-3'>
            <div className='text-2xl'>{getIcon()}</div>
            <DialogTitle className='text-lg font-semibold text-gray-900'>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className='px-6 pb-6'>
          <p className='text-gray-600 mb-6 text-center'>{message}</p>

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
