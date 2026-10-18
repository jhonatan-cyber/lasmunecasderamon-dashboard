'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ReceiptText, Users, Wine } from 'lucide-react';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/bar/ColacionesTab';
import { cn } from '@/lib/utils/utils';
import { MetricCard } from '@/components/shared/MetricCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Colacion = {
  id: string;
  usuario_id: string;
  trabajador: string;
  nick?: string | null;
  nombre_bebida?: string | null;
  ml_bebida: number;
  acompanamiento?: 'gaseosa' | 'soda' | null;
  registrado_por_nombre: string;
  fecha_crea: string;
};

type Trabajador = { id: string; name: string; lastName: string; nick?: string; role?: string };
type BebidaColacion = {
  presentacion_id: string;
  presentacion_nombre: string;
  producto_nombre: string;
  ml_botella?: number | null;
  opciones_venta?: {
    tipo: string;
    colacion_habilitada?: boolean;
    acompanamiento?: { tipo?: 'gaseosa' | 'soda'; unidades: number };
  }[];
};

const hoy = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export default function ColacionesPage() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [registros, setRegistros] = useState<Colacion[]>([]);
  const [bebidas, setBebidas] = useState<BebidaColacion[]>([]);
  const [presentacionId, setPresentacionId] = useState('');
  const [mlBebida, setMlBebida] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [acompanamiento, setAcompanamiento] = useState<'ninguno' | 'gaseosa' | 'soda'>('ninguno');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasOpenCaja, cajaInfo } = useCashRegisterStatus();
  const { hasPermission } = useUserPermissions();
  const canCreate = hasPermission('products', 'write');
  const isToday = true;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const colacionesParams = new URLSearchParams({ fecha: hoy() });
      if (cajaInfo?.id_caja) {
        colacionesParams.set('caja_id', String(cajaInfo.id_caja));
      }
      const [personalResponse, bebidasResponse, colacionesResponse] = await Promise.all([
        fetch('/api/users?status=active&limit=500', { cache: 'no-store' }),
        fetch('/api/products/for-sale?solo_colaciones=true', { cache: 'no-store' }),
        fetch(`/api/colaciones?${colacionesParams.toString()}`, { cache: 'no-store' })
      ]);
      const [personalJson, bebidasJson, colacionesJson] = await Promise.all([
        personalResponse.json(),
        bebidasResponse.json(),
        colacionesResponse.json()
      ]);
      if (!personalResponse.ok || !personalJson.success)
        throw new Error('No se pudo cargar el personal');
      if (!colacionesResponse.ok || !colacionesJson.success)
        throw new Error('No se pudieron cargar las colaciones');
      if (!bebidasResponse.ok || !bebidasJson.success)
        throw new Error('No se pudieron cargar las bebidas habilitadas');
      setTrabajadores(
        (personalJson.data || []).filter(
          (item: Trabajador) => item.role?.toLowerCase() !== 'administrador'
        )
      );
      setRegistros(colacionesJson.data || []);
      setBebidas(bebidasJson.data || []);
      setPresentacionId(current =>
        (bebidasJson.data || []).some((drink: BebidaColacion) => drink.presentacion_id === current)
          ? current
          : String(bebidasJson.data?.[0]?.presentacion_id || '')
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar colaciones');
    } finally {
      setLoading(false);
    }
  }, [cajaInfo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const atendidos = useMemo(() => new Set(registros.map(row => row.usuario_id)), [registros]);
  const disponibles = trabajadores.filter(persona => !atendidos.has(persona.id)).length;
  const bebidaSeleccionada = bebidas.find(item => item.presentacion_id === presentacionId);
  const configBotella = bebidaSeleccionada?.opciones_venta?.find(
    option => option.tipo === 'botella'
  );
  const unidadesAcompanamiento = Number(configBotella?.acompanamiento?.unidades ?? 0);

  useEffect(() => {
    setAcompanamiento('ninguno');
    const capacidad = Number(
      bebidas.find(item => item.presentacion_id === presentacionId)?.ml_botella ?? 0
    );
    setMlBebida(capacidad > 0 ? String(capacidad) : '');
  }, [presentacionId]);

  const registrar = async (event: FormEvent) => {
    event.preventDefault();
    if (!usuarioId) return toast.error('Selecciona un trabajador');
    if (!presentacionId) return toast.error('Selecciona una bebida habilitada');
    const ml = Number(mlBebida);
    if (!Number.isInteger(ml) || ml < 1 || ml > 10000)
      return toast.error('Indica entre 1 y 10000 ml para la bebida');
    setSaving(true);
    try {
      const response = await fetch('/api/colaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioId,
          presentacion_id: presentacionId,
          ml_bebida: ml,
          nombre_bebida:
            `${bebidaSeleccionada?.producto_nombre} ${bebidaSeleccionada?.presentacion_nombre}`.trim(),
          acompanamiento: acompanamiento === 'ninguno' ? null : acompanamiento
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo registrar la colación');
      toast.success('Colación registrada');
      setUsuarioId('');
      await cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar la colación');
      await cargar();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className='mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8'>
      <CajaStatusBanner entityName='colaciones' />
      <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <div className='rounded-xl border bg-card p-3 text-primary shadow-xs'>
            <ReceiptText className='h-6 w-6' />
          </div>
          <div>
            <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>Colaciones</h1>
            <p className='text-sm text-muted-foreground'>
              Registro de un corto por trabajador durante el turno de caja.
            </p>
          </div>
        </div>
      </header>

      <section
        aria-label='Resumen de colaciones'
        className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
      >
        <MetricCard
          icon={<Users />}
          badge='Turno'
          label='Atendidos en el turno'
          value={registros.length}
          tone='blue'
        />
        <MetricCard
          icon={<ReceiptText />}
          badge='Por registrar'
          label='Pendientes'
          value={disponibles}
          tone='amber'
        />
        <MetricCard
          icon={<Wine />}
          badge='Disponibles'
          label='Bebidas habilitadas'
          value={bebidas.length}
          tone='purple'
        />
      </section>

      {canCreate && isToday && (
        <form
          onSubmit={registrar}
          className='space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5'
        >
          <div className='flex flex-col gap-1'>
            <h2 className='text-base font-semibold'>Registrar colación</h2>
            <p className='text-sm text-muted-foreground'>
              Cada trabajador puede recibir un corto por turno.
            </p>
          </div>
          <div className='grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='colacion-trabajador'>Trabajador</Label>
              <SearchableSelect
                id='colacion-trabajador'
                value={usuarioId}
                onChange={setUsuarioId}
                placeholder='Seleccionar trabajador'
                searchPlaceholder='Buscar trabajador…'
                options={trabajadores
                  .filter(persona => !atendidos.has(persona.id))
                  .map(persona => ({
                    value: persona.id,
                    label: `${persona.name} ${persona.lastName}${persona.nick ? ` · ${persona.nick}` : ''}`,
                    keywords: [persona.nick ?? '']
                  }))}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='colacion-ml'>Ml de bebida analcohólica</Label>
              <Input
                id='colacion-ml'
                type='number'
                min={1}
                max={10000}
                step={1}
                inputMode='numeric'
                value={mlBebida}
                onChange={event => setMlBebida(event.target.value.replace(/\D/g, ''))}
                placeholder='Ej. 350'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='colacion-bebida'>Bebida habilitada</Label>
              <SearchableSelect
                id='colacion-bebida'
                value={presentacionId}
                onChange={setPresentacionId}
                placeholder='Seleccionar bebida'
                searchPlaceholder='Buscar producto o presentación…'
                options={bebidas.map(bebida => ({
                  value: bebida.presentacion_id,
                  label: `${bebida.producto_nombre} · ${bebida.presentacion_nombre}`,
                  keywords: [bebida.producto_nombre, bebida.presentacion_nombre]
                }))}
              />
            </div>
            {presentacionId && unidadesAcompanamiento > 0 && (
              <div className='space-y-2'>
                <Label htmlFor='colacion-acompanamiento'>Acompañamiento</Label>
                <SearchableSelect
                  id='colacion-acompanamiento'
                  value={acompanamiento}
                  onChange={value => setAcompanamiento(value as typeof acompanamiento)}
                  placeholder='Seleccionar bebida analcohólica'
                  searchPlaceholder='Buscar bebida analcohólica…'
                  options={[
                    { value: 'gaseosa', label: 'Gaseosa' },
                    { value: 'soda', label: 'Soda' }
                  ]}
                />
                <p className='text-xs text-muted-foreground'>
                  Incluye {unidadesAcompanamiento} unidad{unidadesAcompanamiento === 1 ? '' : 'es'}{' '}
                  configurada{unidadesAcompanamiento === 1 ? '' : 's'}.
                </p>
              </div>
            )}
          </div>
          <div className='flex justify-center pt-1'>
            <Button
              type='submit'
              disabled={saving || !hasOpenCaja || !usuarioId || !presentacionId || !mlBebida}
              className='w-full rounded-full sm:w-auto'
            >
              <ReceiptText className='mr-2 h-4 w-4' />
              {saving ? 'Registrando…' : 'Registrar corto'}
            </Button>
          </div>
        </form>
      )}
      <section className='overflow-hidden rounded-2xl border bg-card shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b p-4'>
          <div>
            <h2 className='font-semibold'>Colaciones registradas</h2>
            <p className='text-sm text-muted-foreground'>Listado del turno seleccionado</p>
          </div>
          <p className='font-semibold tabular-nums'>{registros.length} cortos registrados</p>
        </div>
        {loading ? (
          <p className='p-6 text-sm text-muted-foreground'>Cargando colaciones…</p>
        ) : registros.length === 0 ? (
          <p className='p-6 text-sm text-muted-foreground'>
            Todavía no hay colaciones registradas para este día.
          </p>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='min-w-[720px] text-sm'>
              <TableHeader className='bg-muted/50 text-muted-foreground'>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>Colación</TableHead>
                  <TableHead>Ml</TableHead>
                  <TableHead>Acompañamiento</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>
                      {row.trabajador}
                      {row.nick ? (
                        <span className='ml-1 text-muted-foreground'>({row.nick})</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.nombre_bebida || 'Corto'}</TableCell>
                    <TableCell className='tabular-nums'>{row.ml_bebida} ml</TableCell>
                    <TableCell className='capitalize'>{row.acompanamiento || '—'}</TableCell>
                    <TableCell>{row.registrado_por_nombre}</TableCell>
                    <TableCell>
                      {new Date(row.fecha_crea).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
