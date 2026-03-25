 
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useGenericMutations<T>(
  endpoint: string,
  options?: {
    onSuccess?: () => void | Promise<void>;
    showToasts?: boolean;
    entityName?: string;
    invalidateKey?: string;
  }
) {
  const queryClient = useQueryClient();
  const showToasts = options?.showToasts !== false;
  const entityName = options?.entityName || 'registro';

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: [options?.invalidateKey ?? endpoint] });
  };

  const handleSuccess = async (successMessage: string) => {
    if (showToasts) {
      toast.success(successMessage);
    }

    await invalidate();
    await options?.onSuccess?.();
  };

  const request = async (method: 'POST' | 'PUT' | 'DELETE', path: string, body?: BodyInit) => {
    const response = await fetch(`${endpoint}${path}`, {
      method,
      headers:
        body instanceof FormData
          ? {}
          : body
            ? { 'Content-Type': 'application/json' }
            : {},
      body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error con ${entityName}`);
    }

    return response.json();
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<T> | FormData) => {
      const body = data instanceof FormData ? data : JSON.stringify(data);
      return request('POST', '', body);
    },
    onSuccess: async () => {
      await handleSuccess(`${entityName} creado correctamente`);
    },
    onError: (err: Error) => {
      if (showToasts) toast.error(err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: (Omit<Partial<T>, 'id'> & { id: number | string }) | FormData) => {
      if (data instanceof FormData) {
        const id = data.get('id') as string;
        return request('PUT', `?id=${id}`, data);
      }

      const { id, ...payload } = data;
      return request('PUT', `?id=${id}`, JSON.stringify(payload));
    },
    onSuccess: async (data) => {
      await handleSuccess(`${entityName} actualizado correctamente`);
    },
    onError: (err: Error) => {
      if (showToasts) toast.error(err.message);
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number | string) => {
      return request('DELETE', `?id=${id}`);
    },
    onSuccess: async () => {
      await handleSuccess(`${entityName} eliminado correctamente`);
    },
    onError: (err: Error) => {
      if (showToasts) toast.error(err.message);
    }
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    isLoading: createMutation.isPending || updateMutation.isPending || removeMutation.isPending,
    error: (createMutation.error || updateMutation.error || removeMutation.error)?.message || null
  };
}

