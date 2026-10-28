'use client';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Users, Search, UserRoundMinus, Loader2, Check } from 'lucide-react';
import { ServicioIconAction } from './ServicioIconAction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { ServicioWithDetails } from '@/types/servicio';
import { Label } from '@/components/ui/label';
export function ServicioAssignmentActions({
  servicio,
  onUpdate
}: {
  servicio: ServicioWithDetails;
  onUpdate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opciones, setOpciones] = useState<Array<{ id: string; nombre: string }>>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [actuales, setActuales] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const visibleOptions = opciones.filter(a =>
    a.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes(
        search
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLowerCase()
      )
  );
  const retiradas = actuales.filter(uid => !seleccion.includes(uid));
  const nuevas = seleccion.filter(uid => !actuales.includes(uid));
  const changed = retiradas.length > 0 || nuevas.length > 0;
  const id = String(servicio.id_servicio || servicio.id);
  async function abrir() {
    setLoading(true);
    setOpen(true);
    setSearch('');
    setError('');
    const actuales = (servicio.anfitrionas_ids || '')
      .split(',')
      .map(uid => uid.trim())
      .filter(Boolean);
    setActuales(actuales);
    setSeleccion(actuales);
    const nombres = (servicio.anfitrionas_nombres || '').split(',').map(s => s.trim());
    const vigentes = actuales.map((uid, i) => ({
      id: uid,
      nombre: nombres[i] || 'Anfitriona actual'
    }));
    setOpciones(vigentes);
    try {
      const r = await fetch('/api/hostesses/available');
      const res = await r.json();
      if (!r.ok || !res.success) throw new Error('No se pudo cargar las anfitrionas');
      const disponibles = res.data
        .filter(
          (a: any) =>
            actuales.includes(String(a.id_usuario || a.id)) || Number(a.estado_servicio || 0) === 0
        )
        .map((a: any) => ({
          id: String(a.id_usuario || a.id),
          nombre: a.nick || a.nombre || a.name
        }));
      setOpciones([...new Map([...vigentes, ...disponibles].map(a => [a.id, a])).values()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar las anfitrionas');
    } finally {
      setLoading(false);
    }
  }
  async function guardar() {
    if (saving || loading || !changed || error) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/services/${encodeURIComponent(id)}/hostesses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarios: seleccion })
      });
      const res = await r.json();
      if (!r.ok || !res.success)
        throw new Error(res.message || res.error || 'No se pudo actualizar');
      toast.success(seleccion.length ? 'Anfitrionas actualizadas' : 'Anfitrionas liberadas');
      setOpen(false);
      onUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }
  if (![2, 3].includes(Number(servicio.estado))) return null;
  return (
    <>
      <div className='flex flex-wrap gap-2'>
        <ServicioIconAction label='Agregar venta' asChild variant='default'>
          <Link
            href={`/sales/new?servicio_id=${encodeURIComponent(id)}`}
            aria-label='Agregar venta'
          >
            <ShoppingCart className='h-4 w-4' />
          </Link>
        </ServicioIconAction>
        <ServicioIconAction label='Cambiar o liberar anfitrionas' onClick={abrir}>
          <Users className='h-4 w-4' />
        </ServicioIconAction>
      </div>
      <Dialog
        open={open}
        onOpenChange={next => {
          if (!saving) setOpen(next);
        }}
      >
        <DialogContent className='flex max-h-[85dvh] flex-col gap-4 sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5 text-primary' />
              Anfitrionas del privado
            </DialogTitle>
            <DialogDescription>
              {servicio.habitacion_numero || 'Habitación'} · #{servicio.codigo}. Selecciona quiénes
              permanecen o entran al servicio.
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-wrap items-center gap-2 text-xs'>
            <Badge variant='secondary' className='rounded-full'>
              {seleccion.length} seleccionadas
            </Badge>
            {nuevas.length > 0 && (
              <span className='text-emerald-600 dark:text-emerald-400'>{nuevas.length} entran</span>
            )}
            {retiradas.length > 0 && (
              <span className='text-amber-600 dark:text-amber-400'>{retiradas.length} salen</span>
            )}
          </div>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              className='rounded-full pl-9'
              placeholder='Buscar anfitriona...'
              aria-label='Buscar anfitriona'
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto'>
            {loading ? (
              <div
                role='status'
                className='flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground'
              >
                <Loader2 className='h-4 w-4 animate-spin' />
                Cargando anfitrionas...
              </div>
            ) : error ? (
              <ErrorState size='sm' message={error} />
            ) : visibleOptions.length === 0 ? (
              <EmptyState variant='text' title='No hay anfitrionas para esta búsqueda.' />
            ) : (
              visibleOptions.map(a => (
                <Label
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-3 border-b px-2 py-3 transition-colors last:border-0 ${seleccion.includes(a.id) ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  <Checkbox
                    disabled={saving}
                    checked={seleccion.includes(a.id)}
                    onCheckedChange={checked =>
                      setSeleccion(prev =>
                        checked ? [...prev, a.id] : prev.filter(uid => uid !== a.id)
                      )
                    }
                  />
                  <span
                    aria-hidden='true'
                    className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold'
                  >
                    {a.nombre.slice(0, 2).toUpperCase()}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block break-words text-sm font-medium'>{a.nombre}</span>
                    <span className='text-xs text-muted-foreground'>
                      {actuales.includes(a.id)
                        ? seleccion.includes(a.id)
                          ? 'Permanece en el privado'
                          : 'Se liberará al guardar'
                        : seleccion.includes(a.id)
                          ? 'Entrará al privado'
                          : 'Disponible'}
                    </span>
                  </span>
                </Label>
              ))
            )}
          </div>
          <p className='border-t pt-3 text-xs leading-relaxed text-muted-foreground'>
            Las comisiones ganadas se conservan. Liberar todas mantiene el servicio y su tiempo
            activos.
          </p>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <Button
              type='button'
              disabled={loading || saving || !!error || !seleccion.length}
              variant='ghost'
              className='rounded-full text-destructive hover:text-destructive'
              onClick={() => setSeleccion([])}
            >
              <UserRoundMinus className='mr-2 h-4 w-4' />
              Liberar todas
            </Button>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                className='rounded-full'
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type='button'
                disabled={loading || saving || !!error || !changed}
                className='rounded-full'
                onClick={guardar}
              >
                {saving ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Check className='mr-2 h-4 w-4' />
                )}
                {saving
                  ? 'Guardando...'
                  : seleccion.length
                    ? 'Guardar cambios'
                    : 'Confirmar liberación'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
