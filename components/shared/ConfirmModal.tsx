'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, HelpCircle, Info, CheckCircle, Loader2 } from 'lucide-react';

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
  isLoading?: boolean;
}

const modalVariants = {
  warning: {
    icon: <AlertTriangle className='text-yellow-500 w-5 h-5' />,
    iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
    confirmClass:
      'bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all duration-200 rounded-full px-6 dark:hover:bg-gray-200 w-full sm:w-auto'
  },
  question: {
    icon: <HelpCircle className='text-blue-500 w-5 h-5' />,
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    confirmClass:
      'bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all duration-200 rounded-full px-6 dark:hover:bg-gray-200 w-full sm:w-auto'
  },
  info: {
    icon: <Info className='text-blue-500 w-5 h-5' />,
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    confirmClass:
      'bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all duration-200 rounded-full px-6 dark:hover:bg-gray-200 w-full sm:w-auto'
  },
  success: {
    icon: <CheckCircle className='text-green-500 w-5 h-5' />,
    iconBg: 'bg-green-50 dark:bg-green-900/20',
    confirmClass:
      'bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all duration-200 rounded-full px-6 dark:hover:bg-gray-200 w-full sm:w-auto'
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
  size = 'md',
  hideCancel = false,
  isLoading = false
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-[425px]',
    lg: 'sm:max-w-lg'
  };

  const variantConfig = modalVariants[type] ?? modalVariants.question;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${sizeClasses[size]} flex flex-col p-0 overflow-hidden rounded-2xl`}
      >
        {}
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-slate-800'>
          <DialogTitle className='flex items-center gap-2'>
            <span className={`p-1.5 rounded-lg ${variantConfig.iconBg}`}>{variantConfig.icon}</span>
            <span className='text-gray-900 dark:text-neutral-100 text-base font-semibold'>
              {title}
            </span>
          </DialogTitle>
        </DialogHeader>

        {}
        <div className='flex-1 px-6 py-6'>
          <div className='bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700'>
            <p className='text-sm text-gray-700 dark:text-gray-300 text-center leading-relaxed'>
              {message.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < message.split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>
        </div>

        {}
        <div className='flex-shrink-0 border-t dark:border-slate-800 px-6 py-4 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl'>
          <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 w-full'>
            {!hideCancel && (
              <Button
                variant='outline'
                onClick={handleCancel}
                disabled={isLoading}
                className='flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-6 text-sm w-full sm:w-auto'
              >
                {cancelText}
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              variant='outline'
              className={variantConfig.confirmClass}
            >
              {isLoading ? (
                <span className='flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Procesando...
                </span>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
