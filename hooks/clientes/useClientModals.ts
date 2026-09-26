'use client';

import { useCallback, useEffect, useState } from 'react';
import { Client } from '@/types/client';
import { toast } from 'sonner';
import { usePrepagoForm } from '@/hooks/personal';
import { formatNumberInput } from '@/lib/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useCashRegister } from '@/hooks/caja/useCashRegister';

const CLIENT_EMPTY = { run: '', name: '', lastName: '', phone: '' };

type PrepagoMixedPayment = {
  metodo: 'efectivo' | 'tarjeta' | 'transferencia';
  monto: number;
  display: string;
};

export function useClientModals() {
  const { user } = useAuth();
  // El prepago descuenta de caja en el backend (`deductFromCaja`): se expone
  // el estado de caja para bloquear la carga si está cerrada (paridad con
  // las apps). `hasOpenCaja === null` = desconocido => no bloquea.
  const { hasOpenCaja, checkCajaStatus } = useCashRegister();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalClientData, setModalClientData] = useState(CLIENT_EMPTY);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editClientId, setEditClientId] = useState<string | number | null>(null);
  const [isPrepagoModalOpen, setIsPrepagoModalOpen] = useState(false);
  const [prepagoClient, setPrepagoClient] = useState<Client | null>(null);
  const [prepagoSubmitting, setPrepagoSubmitting] = useState(false);
  const [prepagoPaymentMethod, setPrepagoPaymentMethod] = useState('efectivo');
  const [prepagoMixedPayments, setPrepagoMixedPayments] = useState<PrepagoMixedPayment[]>([]);
  const [isPrepagoAmountManual, setIsPrepagoAmountManual] = useState(false);
  const [isDevolucionModalOpen, setIsDevolucionModalOpen] = useState(false);
  const [devolucionClient, setDevolucionClient] = useState<Client | null>(null);
  const [devolucionAmount, setDevolucionAmount] = useState('');
  const [devolucionPaymentMethod, setDevolucionPaymentMethod] = useState('transferencia');
  const [devolucionMotivo, setDevolucionMotivo] = useState('');
  const [devolucionSubmitting, setDevolucionSubmitting] = useState(false);

  const {
    amount: prepagoAmount,
    setAmount: setPrepagoAmountRaw,
    numericAmount
  } = usePrepagoForm({
    client: prepagoClient,
    onSubmit: () => {}
  });

  const setPrepagoAmount = useCallback(
    (value: string) => {
      setIsPrepagoAmountManual(value.trim() !== '');
      setPrepagoAmountRaw(value);
    },
    [setPrepagoAmountRaw]
  );

  const setPrepagoAmountAuto = useCallback(
    (value: string) => {
      setPrepagoAmountRaw(value);
    },
    [setPrepagoAmountRaw]
  );

  const buildMixedPayments = useCallback((amount: number): PrepagoMixedPayment[] => {
    const total = Math.max(0, Math.round(Number(amount || 0)));
    if (total <= 0) return [];

    const efectivo = Math.floor(total / 2);
    const tarjeta = total - efectivo;

    return [
      {
        metodo: 'efectivo',
        monto: efectivo,
        display: efectivo > 0 ? formatNumberInput(efectivo) : ''
      },
      {
        metodo: 'tarjeta',
        monto: tarjeta,
        display: tarjeta > 0 ? formatNumberInput(tarjeta) : ''
      }
    ];
  }, []);

  useEffect(() => {
    if (prepagoPaymentMethod !== 'mixto') {
      if (prepagoMixedPayments.length > 0) {
        setPrepagoMixedPayments([]);
      }
      return;
    }

    if (isPrepagoAmountManual) {
      return;
    }

    if (prepagoMixedPayments.length === 0 && numericAmount > 0) {
      setPrepagoMixedPayments(buildMixedPayments(numericAmount));
    }
  }, [
    buildMixedPayments,
    isPrepagoAmountManual,
    numericAmount,
    prepagoMixedPayments.length,
    prepagoPaymentMethod
  ]);

  useEffect(() => {
    if (prepagoPaymentMethod !== 'mixto' || isPrepagoAmountManual) {
      return;
    }

    const mixedTotal = prepagoMixedPayments.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);

    if (mixedTotal <= 0) {
      if (numericAmount > 0) {
        setPrepagoAmountAuto('');
      }
      return;
    }

    if (numericAmount !== mixedTotal) {
      setPrepagoAmountAuto(formatNumberInput(mixedTotal));
    }
  }, [
    isPrepagoAmountManual,
    numericAmount,
    prepagoMixedPayments,
    prepagoPaymentMethod,
    setPrepagoAmountAuto
  ]);

  const openCreateModal = useCallback(() => {
    setModalClientData(CLIENT_EMPTY);
    setEditClientId(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((client: Client) => {
    setModalClientData({
      run: client.run || '',
      name: client.name || '',
      lastName: client.lastName || '',
      phone: client.phone || ''
    });
    setEditClientId(client.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setIsModalOpen(false);
    setModalClientData(CLIENT_EMPTY);
    setIsEditMode(false);
    setEditClientId(null);
  }, []);

  const openDetailsModal = useCallback((client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedClient(null);
  }, []);

  const openPrepagoModal = useCallback(
    (client: Client) => {
      setPrepagoClient(client);
      setPrepagoAmount('');
      setPrepagoPaymentMethod('efectivo');
      setPrepagoMixedPayments([]);
      setIsPrepagoAmountManual(false);
      setIsPrepagoModalOpen(true);
    },
    [setPrepagoAmount]
  );

  const closePrepagoModal = useCallback(() => {
    setIsPrepagoModalOpen(false);
    setPrepagoClient(null);
    setPrepagoAmount('');
    setPrepagoPaymentMethod('efectivo');
    setPrepagoMixedPayments([]);
    setIsPrepagoAmountManual(false);
  }, [setPrepagoAmount]);

  const handlePrepagoSubmit = useCallback(
    async (
      e: React.FormEvent,
      onSuccess?: (clientId: string | number, nuevoSaldo: number) => void
    ) => {
      e.preventDefault();
      if (!prepagoClient || !prepagoAmount) return false;

      // Guard de caja cerrada: la carga de saldo mueve dinero en caja.
      if (hasOpenCaja === false) {
        toast.error('No hay caja abierta. No se pueden realizar ventas sin una caja abierta.');
        return false;
      }

      if (prepagoPaymentMethod === 'mixto') {
        const pagosValidos = prepagoMixedPayments.filter(pago => pago.monto > 0);
        if (pagosValidos.length < 2) {
          toast.error('Agrega al menos 2 metodos para el pago mixto');
          return false;
        }

        const sumaPagos = pagosValidos.reduce((sum, pago) => sum + pago.monto, 0);
        if (Math.abs(sumaPagos - numericAmount) > 1) {
          toast.error('La suma de los pagos mixtos debe ser igual al total');
          return false;
        }
      }

      setPrepagoSubmitting(true);
      try {
        const response = await fetch('/api/clients/prepago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: prepagoClient.id,
            monto: numericAmount,
            tipo: 'CARGA',
            metodo_pago: prepagoPaymentMethod,
            pagos_mixtos:
              prepagoPaymentMethod === 'mixto'
                ? prepagoMixedPayments
                    .filter(pago => pago.monto > 0)
                    .map(pago => ({
                      metodo: pago.metodo,
                      monto: pago.monto
                    }))
                : undefined
          })
        });
        const data = await response.json();
        if (data.success) {
          toast.success('Saldo cargado correctamente');
          onSuccess?.(
            prepagoClient.id,
            data.nuevoSaldo ?? (prepagoClient.saldo || 0) + numericAmount
          );
          closePrepagoModal();
          return true;
        }

        toast.error(data.message || 'Error al cargar saldo');
        return false;
      } catch {
        toast.error('Error al procesar la solicitud');
        return false;
      } finally {
        setPrepagoSubmitting(false);
      }
    },
    [
      closePrepagoModal,
      hasOpenCaja,
      numericAmount,
      prepagoAmount,
      prepagoClient,
      prepagoMixedPayments,
      prepagoPaymentMethod
    ]
  );

  const openDevolucionModal = useCallback((client: Client) => {
    setDevolucionClient(client);
    setDevolucionAmount('');
    setDevolucionPaymentMethod('transferencia');
    setDevolucionMotivo('');
    setIsDevolucionModalOpen(true);
  }, []);

  const closeDevolucionModal = useCallback(() => {
    setIsDevolucionModalOpen(false);
    setDevolucionClient(null);
    setDevolucionAmount('');
    setDevolucionPaymentMethod('transferencia');
    setDevolucionMotivo('');
  }, []);

  const handleDevolucionSubmit = useCallback(
    async (
      e: React.FormEvent,
      onSuccess?: (clientId: string | number, nuevoSaldo: number) => void
    ) => {
      e.preventDefault();
      if (!devolucionClient || !devolucionAmount) return false;
      const monto = Number(String(devolucionAmount).replace(/\./g, '')) || 0;
      if (monto <= 0) {
        toast.error('Monto invalido');
        return false;
      }
      if (monto > Number(devolucionClient.saldo || 0)) {
        toast.error('Saldo insuficiente para la devolucion');
        return false;
      }
      const isCajero =
        user?.role?.toLowerCase().includes('cajero') ||
        user?.role?.toLowerCase().includes('cajera');
      const endpoint = isCajero
        ? '/api/clients/devolucion/recordatorio'
        : '/api/clients/devolucion';
      setDevolucionSubmitting(true);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: devolucionClient.id,
            monto,
            metodo_pago: devolucionPaymentMethod,
            motivo: devolucionMotivo
          })
        });
        const data = await response.json();
        if (data.success) {
          if (isCajero) {
            toast.success('Recordatorio enviado al administrador por WhatsApp');
          } else {
            toast.success('Devolucion realizada correctamente');
            onSuccess?.(devolucionClient.id, Number(devolucionClient.saldo || 0) - monto);
          }
          closeDevolucionModal();
          return true;
        }
        toast.error(data.message || 'Error al realizar devolucion');
        return false;
      } catch {
        toast.error('Error al procesar la solicitud');
        return false;
      } finally {
        setDevolucionSubmitting(false);
      }
    },
    [
      closeDevolucionModal,
      devolucionAmount,
      devolucionClient,
      devolucionMotivo,
      devolucionPaymentMethod,
      user
    ]
  );

  return {
    isModalOpen,
    setIsModalOpen,
    isEditMode,
    modalClientData,
    editClientId,
    closeFormModal,

    isDetailsOpen,
    setIsDetailsOpen,
    selectedClient,
    closeDetailsModal,

    isPrepagoModalOpen,
    setIsPrepagoModalOpen,
    prepagoClient,
    prepagoAmount,
    setPrepagoAmount,
    prepagoPaymentMethod,
    setPrepagoPaymentMethod,
    prepagoMixedPayments,
    setPrepagoMixedPayments,
    prepagoSubmitting,
    closePrepagoModal,

    isDevolucionModalOpen,
    setIsDevolucionModalOpen,
    devolucionClient,
    devolucionAmount,
    setDevolucionAmount,
    devolucionPaymentMethod,
    setDevolucionPaymentMethod,
    devolucionMotivo,
    setDevolucionMotivo,
    devolucionSubmitting,
    closeDevolucionModal,

    openCreateModal,
    openEditModal,
    openDetailsModal,
    openPrepagoModal,
    handlePrepagoSubmit,
    prepagoCajaCerrada: hasOpenCaja === false,
    refreshCajaStatus: checkCajaStatus,
    openDevolucionModal,
    handleDevolucionSubmit
  };
}
