import { ClipboardList } from 'lucide-react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ModuleTable,
  ModuleTableCard,
  ModuleTableHeader,
  ModuleTableBody,
  ModuleTableRow,
  ModuleTableHead,
  ModuleTableCell
} from '@/components/shared/tables/ModuleTable';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { EmployeeAdvanceDate, EmployeeAdvanceStatus } from './EmployeeAdvanceCells';

export interface AdvanceRequest {
  id_anticipo: string;
  monto: number;
  motivo: string;
  fecha_crea: string;
  estado: number;
}

export function EmployeeAdvanceRequestsHistory({
  requests,
  loading,
  error
}: {
  requests: AdvanceRequest[];
  loading: boolean;
  error?: string;
}) {
  return (
    <ModuleTableCard className='min-w-0'>
      <CardHeader>
        <CardTitle className='text-lg'>Historial de solicitudes</CardTitle>
        <CardDescription>Revisa el estado de tus solicitudes de anticipo.</CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        <ModuleTable aria-label='Solicitudes de anticipo'>
          <ModuleTableHeader>
            <ModuleTableRow>
              <ModuleTableHead className='text-left'>Fecha</ModuleTableHead>
              <ModuleTableHead className='text-left'>Motivo</ModuleTableHead>
              <ModuleTableHead className='text-right'>Monto</ModuleTableHead>
              <ModuleTableHead>Estado</ModuleTableHead>
            </ModuleTableRow>
          </ModuleTableHeader>
          <ModuleTableBody>
            {loading ? (
              <ModuleTableRow>
                <ModuleTableCell colSpan={4} className='py-12'>
                  <p role='status' className='text-muted-foreground'>
                    Cargando solicitudes…
                  </p>
                </ModuleTableCell>
              </ModuleTableRow>
            ) : error ? (
              <ModuleTableRow>
                <ModuleTableCell colSpan={4} className='py-12 text-muted-foreground'>
                  No se pudo cargar el historial.
                </ModuleTableCell>
              </ModuleTableRow>
            ) : requests.length ? (
              requests.map(request => (
                <ModuleTableRow key={request.id_anticipo}>
                  <ModuleTableCell className='text-left'>
                    <EmployeeAdvanceDate value={request.fecha_crea} />
                  </ModuleTableCell>
                  <ModuleTableCell className='max-w-sm text-left'>
                    <p className='min-w-40 whitespace-normal break-words'>
                      {request.motivo || 'Sin motivo registrado'}
                    </p>
                  </ModuleTableCell>
                  <ModuleTableCell className='whitespace-nowrap text-right font-semibold tabular-nums'>
                    {formatCurrencyCLP(Number(request.monto))}
                  </ModuleTableCell>
                  <ModuleTableCell>
                    <EmployeeAdvanceStatus status={Number(request.estado)} request />
                  </ModuleTableCell>
                </ModuleTableRow>
              ))
            ) : (
              <ModuleTableRow>
                <ModuleTableCell colSpan={4} className='py-12'>
                  <div className='flex flex-col items-center gap-2'>
                    <ClipboardList
                      className='h-8 w-8 text-muted-foreground/60'
                      aria-hidden='true'
                    />
                    <p className='font-medium'>Todavía no tienes solicitudes</p>
                    <p className='text-sm text-muted-foreground'>
                      Tus solicitudes y sus estados aparecerán aquí.
                    </p>
                  </div>
                </ModuleTableCell>
              </ModuleTableRow>
            )}
          </ModuleTableBody>
        </ModuleTable>
      </CardContent>
    </ModuleTableCard>
  );
}
