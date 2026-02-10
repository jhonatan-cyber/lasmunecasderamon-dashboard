import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook genérico para operaciones CRUD (Create, Update, Delete)
 * Consolida la lógica repetida de mutaciones en múltiples hooks
 */
export function useGenericMutations<T>(
  endpoint: string,
  options?: {
    onSuccess?: () => void | Promise<void>;
    showToasts?: boolean;
    entityName?: string;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showToasts = options?.showToasts !== false;
  const entityName = options?.entityName || 'registro';

  const create = useCallback(async (data: Partial<T> | FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      let body: BodyInit;
      let headers: Record<string, string> = {};
      
      if (data instanceof FormData) {
        body = data;
      } else {
        body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al crear ${entityName}`);
      }

      if (showToasts) {
        toast.success(`${entityName} creado correctamente`);
      }

      if (options?.onSuccess) {
        await options.onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Error al crear ${entityName}`;
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, entityName, showToasts, options]);

  const update = useCallback(async (data: Partial<T> & { id: number } | FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      let body: BodyInit;
      let headers: Record<string, string> = {};
      let id: number;

      if (data instanceof FormData) {
        body = data;
        id = Number(data.get('id'));
      } else {
        body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
        id = data.id;
      }

      const response = await fetch(`${endpoint}?id=${id}`, {
        method: 'PUT',
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al actualizar ${entityName}`);
      }

      if (showToasts) {
        toast.success(`${entityName} actualizado correctamente`);
      }

      if (options?.onSuccess) {
        await options.onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Error al actualizar ${entityName}`;
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, entityName, showToasts, options]);

  const remove = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${endpoint}?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al eliminar ${entityName}`);
      }

      if (showToasts) {
        toast.success(`${entityName} eliminado correctamente`);
      }

      if (options?.onSuccess) {
        await options.onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Error al eliminar ${entityName}`;
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, entityName, showToasts, options]);

  return {
    create,
    update,
    remove,
    isLoading,
    error,
  };
}
