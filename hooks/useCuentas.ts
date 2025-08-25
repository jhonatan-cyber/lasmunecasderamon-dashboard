import { useState, useEffect } from 'react';
import {
  Cuenta,
  CuentaWithDetails,
  CreateCuentaRequest,
  UpdateCuentaRequest
} from '@/types/cuenta';

export const useCuentas = () => {
  const [cuentas, setCuentas] = useState<CuentaWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCuentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cuentas');

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Error al cargar las cuentas: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // Asegurar que data sea un array
      setCuentas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setCuentas([]); // En caso de error, establecer array vacío
    } finally {
      setLoading(false);
    }
  };

  const createCuenta = async (cuentaData: CreateCuentaRequest) => {
    try {
      const response = await fetch('/api/cuentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cuentaData)
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.message || 'Error al crear la cuenta');
      }

      const result = await response.json();

      // Recargar la lista después de crear
      await getCuentas();

      return result;
    } catch (err) {
      throw err;
    }
  };

  const updateCuenta = async (cuentaData: UpdateCuentaRequest) => {
    try {
  

      const response = await fetch(`/api/cuentas/${cuentaData.id_cuenta}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cuentaData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la cuenta');
      }

      const result = await response.json();
  

      // Recargar la lista después de actualizar
      await getCuentas();

      return result;
    } catch (err) {
    
      throw err;
    }
  };

  const deleteCuenta = async (id: number) => {
    try {
  

      const response = await fetch(`/api/cuentas/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la cuenta');
      }

      const result = await response.json();
    

      // Recargar la lista después de eliminar
      await getCuentas();

      return result;
    } catch (err) {
     
      throw err;
    }
  };

  const getCuentaById = async (id: number) => {
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
  };

  useEffect(() => {
    getCuentas();
  }, []);

  return {
    cuentas,
    loading,
    error,
    getCuentas,
    createCuenta,
    updateCuenta,
    deleteCuenta,
    getCuentaById
  };
};
