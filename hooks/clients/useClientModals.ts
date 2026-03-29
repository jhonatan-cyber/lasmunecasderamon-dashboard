'use client';

import { useState, useCallback } from 'react';
import { Client } from '@/types/client';
import { toast } from 'sonner';
import { usePrepagoForm } from '@/hooks/personal/usePrepagoForm';

const CLIENT_EMPTY = { run: '', name: '', lastName: '', phone: '' };

export function useClientModals() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [modalClientData, setModalClientData] = useState(CLIENT_EMPTY);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [editClientId, setEditClientId] = useState<string | number | null>(null);
    const [isPrepagoModalOpen, setIsPrepagoModalOpen] = useState(false);
    const [prepagoClient, setPrepagoClient] = useState<Client | null>(null);
    const [prepagoSubmitting, setPrepagoSubmitting] = useState(false);

    const {
        amount: prepagoAmount,
        setAmount: setPrepagoAmount,
        numericAmount
    } = usePrepagoForm({
        client: prepagoClient,
        onSubmit: () => { }
    });

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

    const openPrepagoModal = useCallback((client: Client) => {
        setPrepagoClient(client);
        setPrepagoAmount('');
        setIsPrepagoModalOpen(true);
    }, [setPrepagoAmount]);

    const closePrepagoModal = useCallback(() => {
        setIsPrepagoModalOpen(false);
        setPrepagoClient(null);
        setPrepagoAmount('');
    }, [setPrepagoAmount]);

    const handlePrepagoSubmit = useCallback(async (e: React.FormEvent, onSuccess?: (clientId: string | number, nuevoSaldo: number) => void) => {
        e.preventDefault();
        if (!prepagoClient || !prepagoAmount) return false;
        setPrepagoSubmitting(true);
        try {
            const response = await fetch('/api/clients/prepago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente_id: prepagoClient.id,
                    monto: numericAmount,
                    tipo: 'CARGA'
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Saldo cargado correctamente');
                onSuccess?.(prepagoClient.id, data.nuevoSaldo ?? (prepagoClient.saldo || 0) + numericAmount);
                closePrepagoModal();
                return true;
            } else {
                toast.error(data.message || 'Error al cargar saldo');
                return false;
            }
        } catch {
            toast.error('Error al procesar la solicitud');
            return false;
        } finally {
            setPrepagoSubmitting(false);
        }
    }, [prepagoClient, prepagoAmount, closePrepagoModal, numericAmount]);

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
        prepagoSubmitting,
        closePrepagoModal,

        openCreateModal,
        openEditModal,
        openDetailsModal,
        openPrepagoModal,
        handlePrepagoSubmit,
    };
}