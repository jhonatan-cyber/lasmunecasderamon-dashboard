import { useState, useEffect } from 'react';
import { Login } from '@/types/asistencia';

interface UseLoginsReturn {
  logins: Login[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  cerrarSesiones: () => Promise<boolean>;
}

export const useLogins = (): UseLoginsReturn => {
  const [logins, setLogins] = useState<Login[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogins = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/logins');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al obtener logins');
      }

      setLogins(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesiones = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/logins/cerrar-sesiones', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al cerrar sesiones');
      }

      await fetchLogins();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar sesiones');
      return false;
    }
  };

  useEffect(() => {
    fetchLogins();
  }, []);

  return {
    logins,
    loading,
    error,
    refetch: fetchLogins,
    cerrarSesiones,
  };
}; 