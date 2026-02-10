import { useState, useCallback } from 'react';

interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'question' | 'info' | 'success';
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  cancelVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  hideCancel?: boolean;
}

interface ConfirmModalState extends ConfirmModalOptions {
  open: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function useConfirmModal() {
  const [modalState, setModalState] = useState<ConfirmModalState>({
    open: false,
    title: '',
    message: '',
    type: 'question',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    size: 'md',
    hideCancel: false
  });

  const showConfirm = useCallback((options: ConfirmModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        ...options,
        open: true,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, open: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, open: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, open: false }));
  }, []);

  return {
    modalState,
    showConfirm,
    closeModal
  };
} 