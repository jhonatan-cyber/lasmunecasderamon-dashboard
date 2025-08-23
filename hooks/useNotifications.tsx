import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from './useCurrentUser';

interface NotificationData {
  id: number;
  codigo: string;
  cliente: string;
  mesero: string;
  total: number;
  timestamp: string;
  createdBy?: number; // ID del usuario que creó el pedido
}

interface NotificationEvent {
  type: string;
  data: NotificationData;
  timestamp: string;
  id?: string;
}

// Variable global para rastrear si ya hay una instancia activa
let isHookActive = false;

export function useNotifications() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);
  const [mounted, setMounted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const maxReconnectAttempts = 5;
  
  // Obtener el usuario actual
  const { user } = useCurrentUser();

  // Marcar como montado después de la hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // Función para reproducir sonido de notificación
  const playNotificationSound = useCallback(() => {
    try {
      // Crear un audio context para generar un sonido más profesional
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('No se pudo reproducir sonido de notificación:', error);
    }
  }, []);

  // Función para mostrar notificación mejorada
  const showNotification = useCallback(
    (data: NotificationData) => {
      // Verificar si el usuario actual es el que creó el pedido
      if (user && data.createdBy && user.id === data.createdBy) {
        // Si el usuario actual creó el pedido, solo actualizar contador sin mostrar notificación
        const event = new CustomEvent('updatePendingOrders');
        window.dispatchEvent(event);
        return;
      }

      // Reproducir sonido para todos los usuarios (excepto el que creó el pedido)
      playNotificationSound();

      // Mostrar toast para todos los usuarios (excepto el que creó el pedido)
      toast.success(`¡NUEVO PEDIDO! #${data.codigo}`, {
        description: (
          <div className='space-y-1 text-sm'>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Cliente:</span>
              <span>{data.cliente}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Mesero:</span>
              <span>{data.mesero}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Total:</span>
              <span className='font-bold text-green-600'>
                ${data.total.toLocaleString('es-ES')}
              </span>
            </div>
          </div>
        ),
        duration: 5000 // 5 segundos
      });

      // Disparar evento para actualizar contador de pedidos pendientes
      const event = new CustomEvent('updatePendingOrders');
      window.dispatchEvent(event);
      
      // También disparar evento para abrir modal del pedido (opcional)
      const openModalEvent = new CustomEvent('openOrderModal', {
        detail: { orderId: data.id }
      });
      window.dispatchEvent(openModalEvent);
    },
    [playNotificationSound, user]
  );

  const connectSSE = useCallback(() => {
    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Crear nueva conexión SSE
    console.log('🔔 useNotifications: Conectando a SSE...');
    const eventSource = new EventSource('/api/notifications/sse');
    eventSourceRef.current = eventSource;


    eventSource.onopen = () => {
      console.log('🔔 useNotifications: Conexión SSE establecida');
      setIsConnected(true);
      isConnectingRef.current = false;
      setConnectionAttempts(0); // Resetear intentos al conectar exitosamente
    };

    eventSource.onmessage = event => {
      try {
        console.log('🔔 useNotifications: Mensaje SSE recibido:', event.data);
        const data: NotificationEvent = JSON.parse(event.data);
        console.log('🔔 useNotifications: Datos parseados:', data);

        if (data.type === 'new_order') {
          // Crear un ID único para la notificación usando más campos
          const notificationId = `${data.data.id}_${data.data.codigo}_${data.data.timestamp}`;

          // Evitar notificaciones duplicadas usando Set
          if (!processedNotificationsRef.current.has(notificationId)) {
            processedNotificationsRef.current.add(notificationId);
            setLastNotification(data.data);
            showNotification(data.data);

            // Disparar evento para actualizar contador de pedidos pendientes
            const event = new CustomEvent('updatePendingOrders');
            window.dispatchEvent(event);

            // Limpiar notificaciones antiguas después de procesar una nueva
            if (processedNotificationsRef.current.size > 50) {
              processedNotificationsRef.current.clear();
            }
          }
        } else if (data.type === 'anulacion_confirmada' || data.type === 'anulacion_rechazada') {
          console.log('🔔 Notificación de anulación recibida:', data);
          
          // Crear un ID único para la notificación de anulación
          const notificationId = `${data.data.id}_${data.data.codigo}_${data.data.timestamp}`;

          // Evitar notificaciones duplicadas usando Set
          if (!processedNotificationsRef.current.has(notificationId)) {
            processedNotificationsRef.current.add(notificationId);
            
            // Mostrar notificación de anulación
            const accion = data.type === 'anulacion_confirmada' ? 'CONFIRMADA' : 'RECHAZADA';
            const icono = data.type === 'anulacion_confirmada' ? '✅' : '❌';
            
            console.log('🔔 Mostrando toast de anulación:', `${icono} ANULACIÓN ${accion}`);
            
            toast.success(`${icono} ANULACIÓN ${accion}`, {
              description: (
                <div className='space-y-1 text-sm'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>Código:</span>
                    <span>{data.data.codigo}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>Cliente:</span>
                    <span>{data.data.cliente}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>Total:</span>
                    <span className='font-bold text-red-600'>
                      ${data.data.total?.toLocaleString('es-ES')}
                    </span>
                  </div>
                </div>
              ),
              duration: 5000
            });

            // Disparar evento para actualizar ventas
            console.log('🔔 Disparando evento updateSales');
            const event = new CustomEvent('updateSales');
            window.dispatchEvent(event);

            // Disparar evento para mostrar modal de anulación
            console.log('🔔 Disparando evento anulacion-notification');
            const modalEvent = new CustomEvent('anulacion-notification', {
              detail: {
                type: data.type,
                data: data.data
              }
            });
            window.dispatchEvent(modalEvent);

            // Limpiar notificaciones antiguas después de procesar una nueva
            if (processedNotificationsRef.current.size > 50) {
              processedNotificationsRef.current.clear();
            }
          } else {
            console.log('🔔 Notificación de anulación duplicada, ignorando');
          }
        } else if (data.type === 'connected') {
          // Conexión establecida
        } else if (data.type === 'ping') {
          // Mantener conexión viva
        }
      } catch (error) {
        console.error('Error al procesar notificación:', error);
      }
    };

    eventSource.onerror = error => {
      setIsConnected(false);
      isConnectingRef.current = false;

      // Limpiar timeout de reconexión anterior
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Reintentar conexión con backoff exponencial
      if (connectionAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Máximo 30 segundos

        reconnectTimeoutRef.current = setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
          connectSSE();
        }, delay);
      } else {
        toast.error('Error de conexión con notificaciones', {
          description: 'Las notificaciones en tiempo real no están disponibles',
          duration: 10000
        });
      }
    };
  }, [connectionAttempts, lastNotification, showNotification]);

  useEffect(() => {
    // Solo conectar cuando esté montado
    if (!mounted) {
      return;
    }

    // Evitar múltiples instancias del hook
    if (isHookActive) {
      return;
    }

    // No conectar si estamos en la página de login
    if (typeof window !== 'undefined' && window.location.pathname.includes('/login')) {
      return;
    }

    // Esperar a que el componente esté completamente montado
    const timer = setTimeout(() => {
      isHookActive = true;

      // Iniciar conexión
      connectSSE();
    }, 100);

    // Limpiar al desmontar
    return () => {
      clearTimeout(timer);
      isHookActive = false;
      isConnectingRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [mounted, connectSSE]);

  // Limpiar Set de notificaciones procesadas cada 5 minutos
  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        if (processedNotificationsRef.current.size > 100) {
          processedNotificationsRef.current.clear();
        }
      },
      5 * 60 * 1000
    ); // 5 minutos

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  // Reconectar cuando la ventana vuelve a estar activa
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !isConnected && connectionAttempts < maxReconnectAttempts) {
        connectSSE();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [mounted, isConnected, connectionAttempts, connectSSE]);

  return {
    isConnected,
    connectionAttempts,
    lastNotification,
    reconnect: connectSSE
  };
}
