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

  const mutationOptions = {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [options?.invalidateKey ?? endpoint] });

      if (options?.onSuccess) {
        await options.onSuccess();
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<T> | FormData) => {
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
        body
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al crear ${entityName}`);
      }

      return response.json();
    },
    ...mutationOptions,
    onSuccess: async (data) => {
      if (showToasts) toast.success(`${entityName} creado correctamente`);
      await mutationOptions.onSuccess();
    },
    onError: (err: Error) => {
      if (showToasts) toast.error(err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: (Omit<Partial<T>, 'id'> & { id: number | string }) | FormData) => {
      let body: BodyInit;
      let headers: Record<string, string> = {};
      let id: number | string;

      if (data instanceof FormData) {
        body = data;
        id = data.get('id') as string;
      } else {
        body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
        id = data.id;
      }

      const response = await fetch(`${endpoint}?id=${id}`, {
        method: 'PUT',
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al actualizar ${entityName}`);
      }

      return response.json();
    },
    ...mutationOptions,
    onSuccess: async (data) => {
      if (showToasts) toast.success(`${entityName} actualizado correctamente`);
      await mutationOptions.onSuccess();
    },
    onError: (err: Error) => {
      if (showToasts) toast.error(err.message);
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const response = await fetch(`${endpoint}?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al eliminar ${entityName}`);
      }

      return response.json();
    },
    ...mutationOptions,
    onSuccess: async (data) => {
      if (showToasts) toast.success(`${entityName} eliminado correctamente`);
      await mutationOptions.onSuccess();
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
