import { useGenericFetch } from '../shared/useGenericFetch';

interface AttendanceStats {
  total: number;
  presentes: number;
  ausentes: number;
  porcentajeAsistencia: number;
  fechaApertura: string | null;
  fechaCierre: string | null;
}

export const useAttendanceStats = () => {
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useGenericFetch<AttendanceStats>('/api/attendance/stats', {
    initialFetch: true,
    transform: (data) => (data.success ? data.data : {
      total: 0,
      presentes: 0,
      ausentes: 0,
      porcentajeAsistencia: 0,
      fechaApertura: null,
      fechaCierre: null
    }),
  });

  const stats = data?.[0] || {
    total: 0,
    presentes: 0,
    ausentes: 0,
    porcentajeAsistencia: 0,
    fechaApertura: null,
    fechaCierre: null
  };

  return { stats, loading, error, refetch };
};
