'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchCollection } from '@/lib/api/fetchCollection';
import { ListLoadError } from '@/components/shared/ListLoadError';
import {
  ModuleTableCard,
  ModuleTable,
  ModuleTableHeader,
  ModuleTableBody,
  ModuleTableRow,
  ModuleTableHead,
  ModuleTableCell
} from '@/components/shared/tables/ModuleTable';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmployeeAdvanceDate } from '@/components/advances/EmployeeAdvanceCells';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
interface Gratification {
  id: string;
  fecha_hora: string;
  descripcion: string;
  monto: number;
  estado_texto: string;
}
export function EmployeeGratifications() {
  const [rows, setRows] = useState<Gratification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRows(await fetchCollection<Gratification>('/api/gratificaciones/me'));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (error)
    return <ListLoadError message='No se pudieron cargar tus gratificaciones.' onRetry={load} />;
  return (
    <ModuleTableCard>
      <CardHeader>
        <CardTitle>Mis gratificaciones</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p role='status'>Cargando gratificaciones...</p>
        ) : (
          <ModuleTable aria-label='Mis gratificaciones'>
            <ModuleTableHeader>
              <ModuleTableRow>
                <ModuleTableHead>Fecha</ModuleTableHead>
                <ModuleTableHead>Descripción</ModuleTableHead>
                <ModuleTableHead>Monto</ModuleTableHead>
                <ModuleTableHead>Estado</ModuleTableHead>
              </ModuleTableRow>
            </ModuleTableHeader>
            <ModuleTableBody>
              {rows.length === 0 ? (
                <ModuleTableRow>
                  <ModuleTableCell colSpan={4} className='py-12 text-center'>
                    No hay gratificaciones para mostrar
                  </ModuleTableCell>
                </ModuleTableRow>
              ) : (
                rows.map(row => (
                  <ModuleTableRow key={row.id}>
                    <ModuleTableCell>
                      <EmployeeAdvanceDate value={row.fecha_hora} />
                    </ModuleTableCell>
                    <ModuleTableCell>{row.descripcion || '—'}</ModuleTableCell>
                    <ModuleTableCell>{formatCurrencyCLP(Number(row.monto))}</ModuleTableCell>
                    <ModuleTableCell>{row.estado_texto}</ModuleTableCell>
                  </ModuleTableRow>
                ))
              )}
            </ModuleTableBody>
          </ModuleTable>
        )}
      </CardContent>
    </ModuleTableCard>
  );
}
