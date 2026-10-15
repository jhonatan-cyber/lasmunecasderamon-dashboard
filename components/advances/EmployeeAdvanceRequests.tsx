'use client';
import { useCallback, useEffect, useId, useState } from 'react';
import { SELECT_INPUT_CLASS, SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';
import { ModuleTableCard } from '@/components/shared/tables/ModuleTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, Clock3, Send, Loader2, AlertCircle } from 'lucide-react';
import { formatCurrencyCLP, formatNumberInput } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import {
  EmployeeAdvanceRequestsHistory,
  type AdvanceRequest
} from './EmployeeAdvanceRequestsHistory';
export function EmployeeAdvanceRequests({ onRequested }: { onRequested: () => void }) {
  const formId = useId();
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [maximum, setMaximum] = useState(0);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [requestResponse, balanceResponse] = await Promise.all([
        fetch('/api/anticipos/solicitudes'),
        fetch('/api/anticipos/maximo')
      ]);
      const [history, balance] = await Promise.all([
        requestResponse.json(),
        balanceResponse.json()
      ]);
      if (!requestResponse.ok || !balanceResponse.ok || !history.success || !balance.success)
        throw new Error(
          history.message || balance.message || 'No se pudieron cargar las solicitudes'
        );
      setRequests(history.data || []);
      setMaximum(Number(balance.data.monto_maximo || 0));
      setPending(Boolean(balance.data.tiene_solicitud_pendiente));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const disabled = loading || saving || pending || maximum <= 0 || !!loadError;
  return (
    <div className='space-y-5'>
      {loadError && (
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
        >
          <p className='flex items-center gap-2'>
            <AlertCircle className='h-4 w-4' aria-hidden='true' />
            {loadError}
          </p>
          <Button
            type='button'
            variant='outline'
            className='rounded-full'
            onClick={() => void load()}
          >
            Reintentar
          </Button>
        </div>
      )}
      <div className='grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]'>
        <ModuleTableCard className='min-w-0'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-lg'>Nueva solicitud</CardTitle>
            <CardDescription>
              Indica el monto y el motivo para solicitar un anticipo.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='rounded-2xl bg-gray-50 p-4 dark:bg-slate-800/50'>
              <div className='mb-2 flex items-center gap-2 text-muted-foreground'>
                <Wallet className='h-4 w-4' aria-hidden='true' />
                <p className='text-xs font-medium uppercase tracking-wide'>
                  Disponible para solicitar
                </p>
              </div>
              {loading ? (
                <Skeleton className='h-8 w-32' />
              ) : (
                <p className='text-2xl font-semibold tabular-nums text-foreground'>
                  {formatCurrencyCLP(maximum)}
                </p>
              )}
            </div>
            {pending && (
              <div className='flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'>
                <Clock3 className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
                <p>Ya tienes una solicitud pendiente de aprobación.</p>
              </div>
            )}
            <form
              aria-label='Solicitar anticipo'
              className='space-y-4'
              onSubmit={async event => {
                event.preventDefault();
                const value = Number(amount);
                if (saving || loading || pending || !!loadError) return;
                if (!Number.isFinite(value) || value <= 0 || value > maximum || !reason.trim()) {
                  setMessageKind('error');
                  setMessage('Ingresa un monto dentro del disponible y un motivo.');
                  return;
                }
                setSaving(true);
                setMessage('');
                try {
                  const response = await fetch('/api/anticipos/solicitudes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monto: value, motivo: reason.trim() })
                  });
                  const result = await response.json();
                  if (!response.ok || !result.success)
                    throw new Error(result.message || 'No se pudo enviar la solicitud');
                  setAmount('');
                  setReason('');
                  setMessageKind('success');
                  setMessage('Solicitud enviada correctamente.');
                  await load();
                  onRequested();
                } catch (error) {
                  setMessageKind('error');
                  setMessage(error instanceof Error ? error.message : 'Error de conexión');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div>
                <label htmlFor={`${formId}-amount`} className={SELECT_LABEL_CLASS}>
                  Monto
                </label>
                <Input
                  id={`${formId}-amount`}
                  type='text'
                  inputMode='numeric'
                  pattern='[0-9.]+'
                  value={amount ? formatNumberInput(amount) : ''}
                  onChange={event => setAmount(event.target.value.replace(/\D/g, ''))}
                  required
                  disabled={disabled}
                  placeholder='Ingresa el monto'
                  className={SELECT_INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor={`${formId}-reason`} className={SELECT_LABEL_CLASS}>
                  Motivo
                </label>
                <Input
                  id={`${formId}-reason`}
                  value={reason}
                  maxLength={500}
                  onChange={event => setReason(event.target.value)}
                  required
                  disabled={disabled}
                  placeholder='¿Para qué necesitas el anticipo?'
                  className={SELECT_INPUT_CLASS}
                />
              </div>
              <Button type='submit' disabled={disabled} className='h-11 w-full gap-2 rounded-full'>
                {saving ? (
                  <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
                ) : (
                  <Send className='h-4 w-4' aria-hidden='true' />
                )}
                {saving ? 'Enviando…' : 'Solicitar anticipo'}
              </Button>
            </form>
            {!loading && !pending && !loadError && maximum <= 0 && (
              <p className='text-sm text-muted-foreground'>
                Actualmente no tienes saldo disponible para solicitar.
              </p>
            )}
            {message && (
              <p
                role='status'
                className={cn(
                  'rounded-2xl p-3 text-sm',
                  messageKind === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                )}
              >
                {message}
              </p>
            )}
          </CardContent>
        </ModuleTableCard>
        <EmployeeAdvanceRequestsHistory requests={requests} loading={loading} error={loadError} />
      </div>
    </div>
  );
}
