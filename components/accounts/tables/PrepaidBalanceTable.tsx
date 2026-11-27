'use client';

import { Eye, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import type { Client } from '@/types/client';

interface PrepaidBalanceTableProps {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenDetails: (client: Client) => void;
  onRecharge: (client: Client) => void;
}

function clientName(client: Client): string {
  return `${client.name} ${client.lastName}`.trim() || 'Cliente sin nombre';
}

function BalanceAmount({ amount }: { amount: number }) {
  return (
    <span className='font-semibold tabular-nums text-emerald-700 dark:text-emerald-400'>
      {formatCurrencyNoDecimals(amount)}
    </span>
  );
}

function ClientActions({
  client,
  onOpenDetails,
  onRecharge
}: {
  client: Client;
  onOpenDetails: (client: Client) => void;
  onRecharge: (client: Client) => void;
}) {
  return (
    <div className='flex flex-wrap justify-end gap-2'>
      <Button
        type='button'
        variant='outline'
        className='min-h-11'
        onClick={() => onOpenDetails(client)}
      >
        <Eye data-icon='inline-start' />
        Ver detalle
      </Button>
      <Button type='button' className='min-h-11' onClick={() => onRecharge(client)}>
        <Wallet data-icon='inline-start' />
        Recargar saldo
      </Button>
    </div>
  );
}

export function PrepaidBalanceTable({
  clients,
  isLoading,
  error,
  onRetry,
  onOpenDetails,
  onRecharge
}: PrepaidBalanceTableProps) {
  if (isLoading) {
    return (
      <div
        role='status'
        aria-label='Cargando saldos prepago'
        className={cn(
          'flex min-h-40 items-center justify-center gap-3 rounded-xl border border-border bg-card px-4',
          'text-sm text-muted-foreground'
        )}
      >
        <span
          className={cn(
            'h-5 w-5 animate-spin rounded-full border-2 border-current',
            'border-r-transparent'
          )}
        />
        Cargando saldos prepago...
      </div>
    );
  }

  if (error) return <ListLoadError message={error} onRetry={onRetry} />;

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title='No hay cuentas prepago para mostrar'
        description='Los clientes con saldo disponible aparecerán aquí.'
      />
    );
  }

  return (
    <>
      <div className='flex flex-col gap-3 md:hidden'>
        {clients.map(client => (
          <Card key={client.id} className='border-border bg-card shadow-sm'>
            <CardContent className='flex items-start justify-between gap-4 p-4'>
              <div className='flex min-w-0 flex-col gap-1'>
                <h2 className='break-words font-medium text-foreground'>{clientName(client)}</h2>
                <p className='text-sm text-muted-foreground'>RUT: {client.run || 'Sin RUT'}</p>
                <p className='text-sm text-muted-foreground'>
                  Teléfono: {client.phone || 'Sin teléfono'}
                </p>
              </div>
              <div className='shrink-0 text-right'>
                <p className='text-xs text-muted-foreground'>Saldo disponible</p>
                <BalanceAmount amount={Number(client.saldo ?? 0)} />
              </div>
            </CardContent>
            <CardContent className='border-t border-border p-3'>
              <ClientActions
                client={client}
                onOpenDetails={onOpenDetails}
                onRecharge={onRecharge}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='hidden overflow-x-auto rounded-xl border border-border bg-card md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className='text-right'>Saldo disponible</TableHead>
              <TableHead className='text-right'>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <TableRow key={client.id}>
                <TableCell className='font-medium'>{clientName(client)}</TableCell>
                <TableCell>{client.run || 'Sin RUT'}</TableCell>
                <TableCell>{client.phone || 'Sin teléfono'}</TableCell>
                <TableCell className='text-right'>
                  <BalanceAmount amount={Number(client.saldo ?? 0)} />
                </TableCell>
                <TableCell>
                  <ClientActions
                    client={client}
                    onOpenDetails={onOpenDetails}
                    onRecharge={onRecharge}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
