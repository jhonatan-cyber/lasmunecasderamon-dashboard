/* eslint-disable */
import { useCallback } from 'react';
import {
  Cuenta,
  CuentaWithDetails,
  CreateCuentaRequest,
  UpdateCuentaRequest
} from '@/types/cuenta';
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericMutations } from '../shared/useGenericMutations';

export const useCuentas = () => {
  const { data: cuentas, isLoading, error, refetch } = useGenericFetch<CuentaWithDetails>('/api/cuentas');

  const { create, update, remove } = useGenericMutations<CuentaWithDetails>('/api/cuentas', {
    onSuccess: () => {
      refetch();
    }
  });

  const createCuenta = useCallback(async (cuentaData: CreateCuentaRequest) => {
    return await create(cuentaData as any);
  }, [create]);

  const updateCuenta = useCallback(async (cuentaData: UpdateCuentaRequest) => {
    return await update(cuentaData as any);
  }, [update]);

  const deleteCuenta = useCallback(async (id: string | number) => {
    return await remove(id);
  }, [remove]);

  const getCuentaById = useCallback(async (id: string | number) => {
    try {
      const response = await fetch(`/api/cuentas/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener la cuenta');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    cuentas: cuentas || [],
    isLoading,
    error,
    getCuentas: refetch,
    createCuenta,
    updateCuenta,
    deleteCuenta,
    getCuentaById
  };
};

