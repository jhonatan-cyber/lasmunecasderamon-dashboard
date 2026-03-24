/* eslint-disable */
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useSSE } from '@/hooks/shared/useSSE';

interface AnulacionContextType {
  showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  setRefreshCallback: (callback: () => void) => void;
  // Nuevo estado para modal de servicios
  modalData: {
    tipo: 'confirmada' | 'rechazada';
    tipo_operacion: 'venta' | 'servicio';
    venta?: {
      codigo: string;
      cliente: string;
      total: number;
    };
    servicio?: {
      codigo: string;
      cliente: string;
      habitacion?: string;
      tiempo?: number;
      total: number;
      anfitrionas?: string;
    };
  } | null;
  isModalOpen: boolean;
  openModal: (data: any) => void;
  closeModal: () => void;
}

const AnulacionContext = createContext<AnulacionContextType | undefined>(undefined);

export function AnulacionProvider({ children }: { children: React.ReactNode }) {
  const [modalData, setModalData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Usar useRef para mantener una referencia estable al callback
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        default:
          toast.info(message);
          break;
      }
    },
    []
  );

  const setRefreshCallback = useCallback((callback: () => void) => {
    refreshCallbackRef.current = callback;
  }, []);

  const openModal = useCallback((data: any) => {
    setModalData(data);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalData(null);
  }, []);

  // Escuchar notificaciones SSE para servicios
  useSSE('/api/notifications/sse', (data) => {
    // Manejar notificaciones de anulación de servicios
    if (
      data.type === 'anulacion_servicio_confirmada' ||
      data.type === 'anulacion_servicio_rechazada'
    ) {
      const modalData = {
        tipo: data.type === 'anulacion_servicio_confirmada' ? 'confirmada' : 'rechazada',
        tipo_operacion: 'servicio',
        servicio: {
          codigo: data.data.codigo,
          cliente: data.data.cliente,
          habitacion: data.data.habitacion,
          tiempo: data.data.tiempo,
          total: data.data.total,
          anfitrionas: data.data.anfitrionas
        }
      };

      openModal(modalData);

      // Ejecutar callback de actualización si existe
      if (refreshCallbackRef.current) {
        try {
          refreshCallbackRef.current();
        } catch (error) {
          console.error('🔔 Contexto: Error ejecutando callback de actualización:', error);
        }
      }

      // Mostrar toast
      showNotification(
        data.type === 'anulacion_servicio_confirmada'
          ? '✅ Anulación de servicio confirmada'
          : '❌ Anulación de servicio rechazada',
        'success'
      );
    }

    // Manejar notificaciones de anulación de ventas (mantener compatibilidad)
    if (data.type === 'anulacion_confirmada' || data.type === 'anulacion_rechazada') {
      const modalData = {
        tipo: data.type === 'anulacion_confirmada' ? 'confirmada' : 'rechazada',
        tipo_operacion: 'venta',
        venta: {
          codigo: data.data.codigo,
          cliente: data.data.cliente,
          total: data.data.total
        }
      };

      openModal(modalData);

      // Ejecutar callback de actualización si existe
      if (refreshCallbackRef.current) {
        try {
          refreshCallbackRef.current();
        } catch (error) {
          console.error('🔔 Contexto: Error ejecutando callback de actualización:', error);
        }
      }

      // Mostrar toast
      showNotification(
        data.type === 'anulacion_confirmada'
          ? '✅ Anulación de venta confirmada'
          : '❌ Anulación de venta rechazada',
        'success'
      );
    }
  });

  // Verificar notificaciones pendientes al cargar
  useEffect(() => {
    const checkPendingNotifications = async () => {
      try {
        const response = await fetch('/api/notifications/pending');
        const data = await response.json();

        if (data.success && data.notifications.length > 0) {
          // Procesar cada notificación pendiente
          data.notifications.forEach((notification: any) => {
            try {
              const notificationData = JSON.parse(notification.datos);

              // Procesar según el tipo
              if (
                notification.tipo === 'anulacion_confirmada' ||
                notification.tipo === 'anulacion_rechazada'
              ) {
                const modalData = {
                  tipo: notification.tipo === 'anulacion_confirmada' ? 'confirmada' : 'rechazada',
                  tipo_operacion: 'venta',
                  venta: {
                    codigo: notificationData.codigo,
                    cliente: notificationData.cliente,
                    total: notificationData.total
                  }
                };

                openModal(modalData);

                // Mostrar toast
                showNotification(
                  notification.tipo === 'anulacion_confirmada'
                    ? '✅ Anulación de venta confirmada'
                    : '❌ Anulación de venta rechazada',
                  'success'
                );
              } else if (
                notification.tipo === 'anulacion_servicio_confirmada' ||
                notification.tipo === 'anulacion_servicio_rechazada'
              ) {
                const modalData = {
                  tipo:
                    notification.tipo === 'anulacion_servicio_confirmada'
                      ? 'confirmada'
                      : 'rechazada',
                  tipo_operacion: 'servicio',
                  servicio: {
                    codigo: notificationData.codigo,
                    cliente: notificationData.cliente,
                    habitacion: notificationData.habitacion,
                    tiempo: notificationData.tiempo,
                    total: notificationData.total,
                    anfitrionas: notificationData.anfitrionas
                  }
                };

                openModal(modalData);

                // Mostrar toast
                showNotification(
                  notification.tipo === 'anulacion_servicio_confirmada'
                    ? '✅ Anulación de servicio confirmada'
                    : '❌ Anulación de servicio rechazada',
                  'success'
                );
              }
            } catch (parseError) {
              console.error('🔔 Contexto: Error parseando notificación pendiente:', parseError);
            }
          });
        }
      } catch (error) {
        console.error('🔔 Contexto: Error verificando notificaciones pendientes:', error);
      }
    };

    // Verificar notificaciones pendientes después de un pequeño delay
    const timer = setTimeout(checkPendingNotifications, 1000);

    return () => clearTimeout(timer);
  }, [openModal, showNotification]);

  // Listener para eventos de test
  useEffect(() => {
    const handleTestNotification = (event: CustomEvent) => {
      const data = event.detail;

      if (data.type === 'anulacion_confirmada' || data.type === 'anulacion_rechazada') {
        const modalData = {
          tipo: data.type === 'anulacion_confirmada' ? 'confirmada' : 'rechazada',
          tipo_operacion: 'venta',
          venta: {
            codigo: data.data.codigo,
            cliente: data.data.cliente,
            total: data.data.total
          }
        };

        openModal(modalData);

        // Mostrar toast
        showNotification(
          data.type === 'anulacion_confirmada'
            ? '✅ Test: Anulación de venta confirmada'
            : '❌ Test: Anulación de venta rechazada',
          'success'
        );
      }
    };

    window.addEventListener('test-notification', handleTestNotification as EventListener);

    return () => {
      window.removeEventListener('test-notification', handleTestNotification as EventListener);
    };
  }, [openModal, showNotification]); // Removido refreshCallback de las dependencias

  // Memoizar el valor del contexto para evitar re-renders innecesarios
  const contextValue = useMemo(() => ({
    showNotification,
    setRefreshCallback,
    modalData,
    isModalOpen,
    openModal,
    closeModal
  }), [
    showNotification,
    setRefreshCallback,
    modalData,
    isModalOpen,
    openModal,
    closeModal
  ]);

  return (
    <AnulacionContext.Provider value={contextValue}>
      {children}
    </AnulacionContext.Provider>
  );
}

export function useAnulacionContext() {
  const context = useContext(AnulacionContext);
  if (context === undefined) {
    throw new Error('useAnulacionContext must be used within an AnulacionProvider');
  }
  return context;
}

