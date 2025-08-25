'use client';

import { useAnulacionContext } from '@/contexts/AnulacionContext';
import { AnulacionConfirmModal } from './AnulacionConfirmModal';
import { useRef, useEffect } from 'react';

export default function AnulacionNotificationModal() {
  const { modalData, isModalOpen, closeModal, refreshCallback } = useAnulacionContext();
  
  // Usar useRef para mantener una referencia estable al callback
  const refreshCallbackRef = useRef<(() => void) | null>(null);
  
  // Actualizar la referencia cuando cambie el callback
  useEffect(() => {
    refreshCallbackRef.current = refreshCallback;
  }, [refreshCallback]);

  const handleAccept = () => {
    // Ejecutar callback de actualización si existe
    if (refreshCallbackRef.current) {

      try {
        refreshCallbackRef.current();
      } catch (error) {
        console.error('🔔 Modal: Error ejecutando callback de actualización:', error);
      }
    } else {
      
    }
    
    closeModal();
  };

  return (
    <AnulacionConfirmModal
      open={isModalOpen}
      onOpenChange={closeModal}
      onAccept={handleAccept}
      data={modalData}
    />
  );
}
