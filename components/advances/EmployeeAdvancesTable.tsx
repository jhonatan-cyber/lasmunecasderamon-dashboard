import { Inbox } from 'lucide-react';
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

export interface EmployeeAdvance {
  id_anticipo: number;
  monto: number;
  fecha_crea: string;
  fecha_mod: string;
  estado: number;
  motivo: string;
}

interface Props {
  advances: EmployeeAdvance[];
  count: number;
  startIndex: number;
  total: number;
  loading: boolean;
  deliveredOnly: boolean;
}

export function EmployeeAdvancesTable({
  advances,
  count,
  startIndex,
  total,
  loading,
  deliveredOnly
}: Props) {
  return (
    <ModuleTableCard>
      <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1'>
          <CardTitle className='text-lg'>
            {deliveredOnly ? 'Anticipos entregados' : 'Mis anticipos'}
          </CardTitle>
          <CardDescription aria-live='polite'>
            {count} {count === 1 ? 'registro' : 'registros'}
          </CardDescription>
        </div>
        <div className='space-y-1 sm:text-right'>
          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            {deliveredOnly ? 'Total entregado' : 'Total a pagar'}
          </p>
          <p className='text-2xl font-semibold tabular-nums text-foreground'>
            {formatCurrencyCLP(total)}
          </p>
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        <ModuleTable aria-label={deliveredOnly ? 'Anticipos entregados' : 'Mis anticipos'}>
          <ModuleTableHeader>
            <ModuleTableRow>
              <ModuleTableHead className='w-16'>#</ModuleTableHead>
              <ModuleTableHead className='text-left'>Solicitud</ModuleTableHead>
              <ModuleTableHead className='text-left'>Motivo</ModuleTableHead>
              <ModuleTableHead className='text-left'>
                {deliveredOnly ? 'Fecha de entrega' : 'Fecha de pago'}
              </ModuleTableHead>
              <ModuleTableHead className='text-right'>Monto</ModuleTableHead>
              <ModuleTableHead>Estado</ModuleTableHead>
            </ModuleTableRow>
          </ModuleTableHeader>
          <ModuleTableBody>
            {loading ? (
              <ModuleTableRow>
                <ModuleTableCell colSpan={6} className='py-12 text-muted-foreground'>
                  <p role='status'>Cargando anticipos...</p>
                </ModuleTableCell>
              </ModuleTableRow>
            ) : advances.length ? (
              advances.map((advance, index) => (
                <ModuleTableRow key={advance.id_anticipo}>
                  <ModuleTableCell className='text-muted-foreground'>
                    {startIndex + index + 1}
                  </ModuleTableCell>
                  <ModuleTableCell className='text-left'>
                    <EmployeeAdvanceDate value={advance.fecha_crea} />
                  </ModuleTableCell>
                  <ModuleTableCell className='max-w-sm text-left'>
                    <p className='min-w-40 whitespace-normal break-words text-foreground'>
                      {advance.motivo || 'Sin motivo registrado'}
                    </p>
                  </ModuleTableCell>
                  <ModuleTableCell className='text-left'>
                    <EmployeeAdvanceDate value={advance.fecha_mod} />
                  </ModuleTableCell>
                  <ModuleTableCell className='whitespace-nowrap text-right font-semibold tabular-nums'>
                    {formatCurrencyCLP(advance.monto)}
                  </ModuleTableCell>
                  <ModuleTableCell>
                    <EmployeeAdvanceStatus status={advance.estado} />
                  </ModuleTableCell>
                </ModuleTableRow>
              ))
            ) : (
              <ModuleTableRow>
                <ModuleTableCell colSpan={6} className='py-12'>
                  <div className='flex flex-col items-center gap-2'>
                    <Inbox className='h-8 w-8 text-muted-foreground/60' aria-hidden='true' />
                    <p className='font-medium text-foreground'>No hay anticipos para mostrar</p>
                    <p className='text-sm text-muted-foreground'>
                      Los anticipos aparecerán aquí cuando sean entregados. Si aplicaste filtros,
                      prueba cambiarlos.
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
