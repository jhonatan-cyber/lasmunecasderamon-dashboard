import { useQuery } from '@tanstack/react-query';

export const useGarzones = () => {
  return useQuery({
    queryKey: ['garzones'],
    queryFn: async () => {
      const response = await fetch('/api/garzones', {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}; 