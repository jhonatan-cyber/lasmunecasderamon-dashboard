import { useState, useEffect } from 'react';

interface AttendanceStats {
  total: number;
  presentes: number;
  ausentes: number;
  porcentajeAsistencia: number;
  fechaApertura: string | null;
  fechaCierre: string | null;
}

export const useAttendanceStats = () => {
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    presentes: 0,
    ausentes: 0,
    porcentajeAsistencia: 0,
    fechaApertura: null,
    fechaCierre: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/attendance-stats');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al cargar estadísticas: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error al obtener estadísticas de asistencia:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};
