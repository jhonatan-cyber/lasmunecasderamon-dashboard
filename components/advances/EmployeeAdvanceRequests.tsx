'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';

interface AdvanceRequest {
  id_anticipo: string;
  monto: number;
  motivo: string;
  fecha_crea: string;
  estado: number;
}

export function EmployeeAdvanceRequests({ onRequested }: { onRequested: () => void }) {
  const formId = useId();
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [maximum, setMaximum] = useState(0);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
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
      setMessage(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes de anticipo</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <p>Disponible para solicitar: {formatCurrencyCLP(maximum)}</p>
        {pending && <p>Ya tienes una solicitud pendiente de aprobación.</p>}
        <form
          className='flex flex-wrap gap-3'
          onSubmit={async event => {
            event.preventDefault();
            const value = Number(amount);
            if (saving || loading || pending) return;
            if (!Number.isFinite(value) || value <= 0 || value > maximum || !reason.trim()) {
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
              setMessage('Solicitud enviada correctamente.');
              await load();
              onRequested();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Error de conexión');
            } finally {
              setSaving(false);
            }
          }}
        >
          <div>
            <label htmlFor={`${formId}-amount`}>Monto</label>
            <Input
              id={`${formId}-amount`}
              type='number'
              min='1'
              max={maximum}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${formId}-reason`}>Motivo</label>
            <Input
              id={`${formId}-reason`}
              value={reason}
              maxLength={500}
              onChange={e => setReason(e.target.value)}
              required
            />
          </div>
          <Button type='submit' disabled={loading || saving || pending || maximum <= 0}>
            {saving ? 'Enviando…' : 'Solicitar anticipo'}
          </Button>
        </form>
        {message && <p role='status'>{message}</p>}
        {loading ? (
          <p>Cargando solicitudes…</p>
        ) : (
          <ul className='space-y-3'>
            {requests.map(request => (
              <li
                key={request.id_anticipo}
                className='flex flex-wrap justify-between gap-2 border-b pb-2'
              >
                <span>
                  {formatDateTimeDmyLabel(request.fecha_crea).date} · {request.motivo}
                </span>
                <span>
                  {formatCurrencyCLP(Number(request.monto))} ·{' '}
                  {(
                    {
                      1: 'Confirmado, pendiente de entrega',
                      2: 'Pendiente de aprobación',
                      3: 'Rechazado'
                    } as Record<number, string>
                  )[Number(request.estado)] || 'Desconocido'}
                </span>
              </li>
            ))}
            {!requests.length && <li>No hay solicitudes.</li>}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
