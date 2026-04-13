'use client';

import { ClientFormModal } from './ClientFormModal';
import { ClientDetailsModal } from './ClientDetailsModal';
import { PrepagoModal } from './PrepagoModal';
import { Client } from '@/types/client';
import { type ClientFormValues } from '@/hooks/personal/useClientForm';

interface ClientModalsProps {
  isFormModalOpen: boolean;
  onFormModalChange: (open: boolean) => void;
  isEditMode: boolean;
  clientData: { run: string; name: string; lastName: string; phone: string };
  onFormSubmit: (data: ClientFormValues) => Promise<void>;
  onFormCancel: () => void;
  isFormLoading: boolean;

  isDetailsModalOpen: boolean;
  onDetailsModalChange: (open: boolean) => void;
  selectedClient: Client | null;

  isPrepagoModalOpen: boolean;
  onPrepagoModalChange: (open: boolean) => void;
  prepagoClient: Client | null;
  prepagoAmount: string;
  onPrepagoAmountChange: (amount: string) => void;
  prepagoPaymentMethod: string;
  onPrepagoPaymentMethodChange: (method: string) => void;
  prepagoMixedPayments: Array<{
    metodo: 'efectivo' | 'tarjeta' | 'transferencia';
    monto: number;
    display: string;
  }>;
  onPrepagoMixedPaymentsChange: (
    payments: Array<{
      metodo: 'efectivo' | 'tarjeta' | 'transferencia';
      monto: number;
      display: string;
    }>
  ) => void;
  onPrepagoSubmit: (e: React.FormEvent) => Promise<boolean>;
  isPrepagoSubmitting: boolean;
}

export function ClientModals({
  isFormModalOpen,
  onFormModalChange,
  isEditMode,
  clientData,
  onFormSubmit,
  onFormCancel,
  isFormLoading,

  isDetailsModalOpen,
  onDetailsModalChange,
  selectedClient,

  isPrepagoModalOpen,
  onPrepagoModalChange,
  prepagoClient,
  prepagoAmount,
  onPrepagoAmountChange,
  prepagoPaymentMethod,
  onPrepagoPaymentMethodChange,
  prepagoMixedPayments,
  onPrepagoMixedPaymentsChange,
  onPrepagoSubmit,
  isPrepagoSubmitting
}: ClientModalsProps) {
  return (
    <>
      <ClientFormModal
        isOpen={isFormModalOpen}
        onOpenChange={onFormModalChange}
        isEditMode={isEditMode}
        clientData={clientData}
        onSubmit={onFormSubmit}
        onCancel={onFormCancel}
        isLoading={isFormLoading}
      />

      <ClientDetailsModal
        isOpen={isDetailsModalOpen}
        onOpenChange={onDetailsModalChange}
        client={selectedClient}
      />

      <PrepagoModal
        isOpen={isPrepagoModalOpen}
        onOpenChange={onPrepagoModalChange}
        client={prepagoClient}
        amount={prepagoAmount}
        onAmountChange={onPrepagoAmountChange}
        paymentMethod={prepagoPaymentMethod}
        onPaymentMethodChange={onPrepagoPaymentMethodChange}
        mixedPayments={prepagoMixedPayments}
        onMixedPaymentsChange={onPrepagoMixedPaymentsChange}
        onSubmit={onPrepagoSubmit}
        isSubmitting={isPrepagoSubmitting}
      />
    </>
  );
}
