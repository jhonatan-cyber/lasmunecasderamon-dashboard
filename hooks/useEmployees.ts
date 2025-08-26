import { useQuery } from '@tanstack/react-query';

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      // Use existing endpoint that returns garzones/cajeros activos
      const response = await fetch('/api/garzones', {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      // Normalize: some callers expect shape { data: User[] }
      return json?.data ? json : { data: json };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });
};
