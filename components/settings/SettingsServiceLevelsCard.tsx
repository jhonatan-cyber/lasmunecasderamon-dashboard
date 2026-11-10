'use client';
import { FormattedNumberInput as Input } from '@/components/shared/FormattedNumberInput';
import { Button } from '@/components/ui/button';

import { useState, useEffect } from 'react';
import {
  Save,
  Users,
  BedDouble,
  ShoppingCart,
  GlassWater,
  Ticket,
  UserCog,
  CupSoda,
  AlertTriangle
} from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { refrescarConfiguraciones, useConfig, useConfigValue } from '@/hooks/shared/useConfigValue';
import { setServiceLevels } from '@/components/orders/productModalRules';
import { Label } from '@/components/ui/label';

/**
 * El rol administrador no recibe colaciones, así que no aparece en la regla por
 * rol ni se puede configurar. Se compara normalizado porque es el mismo nombre
 * reservado que valida el alta de roles en `/api/roles`.
 */
function esRolAdministrador(nombre: string): boolean {
  return nombre.trim().toLowerCase() === 'administrador';
}

export function SettingsServiceLevelsCard() {
  const configSimple = useConfigValue('comisiones', 'umbral_simple_hasta', 10000);
  const configHostess = useConfigValue('comisiones', 'umbral_anfitriona_desde', 20000);
  const configHabitacion = useConfigValue('comisiones', 'umbral_habitacion_desde', 30000);
  const configTragoCover = useConfigValue('comisiones', 'monto_base_trago_cover_cliente', 10000);
  const configCostoEntrada = useConfigValue('comisiones', 'costo_entrada', 10000);
  const configTopeAcompanamiento = useConfigValue('comisiones', 'tope_precio_acompanamiento', 0);
  // Regla "colaciones por rol y turno de caja": map JSON `rol_id → tope` guardado
  // como texto; el rol que no está puesto queda con la regla vigente (1 por
  // trabajador por turno) y 0 significa que el rol no recibe colación.
  const configTopesColaciones = useConfig<string>('colaciones_por_rol_y_turno', '');
  const [topesColaciones, setTopesColaciones] = useState<Record<string, string>>({});
  const [rolesActivos, setRolesActivos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [simpleValue, setSimpleValue] = useState('');
  const [hostessValue, setHostessValue] = useState('');
  const [habitacionValue, setHabitacionValue] = useState('');
  const [tragoCoverValue, setTragoCoverValue] = useState('10000');
  const [costoEntradaValue, setCostoEntradaValue] = useState('10000');
  const [topeAcompanamientoValue, setTopeAcompanamientoValue] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSimpleValue(String(configSimple));
  }, [configSimple]);

  useEffect(() => {
    setHostessValue(String(configHostess));
  }, [configHostess]);

  useEffect(() => {
    setHabitacionValue(String(configHabitacion));
  }, [configHabitacion]);

  useEffect(() => {
    setTragoCoverValue(String(configTragoCover));
  }, [configTragoCover]);

  useEffect(() => {
    setCostoEntradaValue(String(configCostoEntrada));
  }, [configCostoEntrada]);

  useEffect(() => {
    setTopeAcompanamientoValue(String(configTopeAcompanamiento));
  }, [configTopeAcompanamiento]);

  // Roles activos de /api/roles; la sección de colaciones se dibuja para cada uno.
  useEffect(() => {
    let activo = true;
    fetch('/api/roles')
      .then(res => res.json())
      .then(result => {
        const filas = Array.isArray(result?.data)
          ? (result.data as Array<Record<string, unknown>>)
          : [];
        const activos = filas
          .map(fila => ({
            // `roles.id_rol` es varchar(36): conservarlo como texto, nunca como número.
            id: String(fila.id_rol ?? fila.id ?? ''),
            nombre: String(fila.nombre ?? fila.name ?? ''),
            estado: Number(fila.estado ?? fila.status ?? 1)
          }))
          .filter(
            rol =>
              rol.id !== '' && rol.nombre && rol.estado === 1 && !esRolAdministrador(rol.nombre)
          )
          .map(({ id, nombre }) => ({ id, nombre }));
        if (activo) setRolesActivos(activos);
      })
      .catch(() => {
        // Sin roles la sección queda vacía: no bloquea el resto del card.
      });
    return () => {
      activo = false;
    };
  }, []);

  // Guarda los tope por rol como texto de rol_id → número; '' de un rol fuera
  // del mapa (sin tope para ese rol) como del guardado si el rol no está puesto.
  useEffect(() => {
    let parseado: unknown = {};
    try {
      parseado = configTopesColaciones.trim() ? JSON.parse(configTopesColaciones) : {};
    } catch {
      parseado = {};
    }
    const valores: Record<string, string> = {};
    if (parseado && typeof parseado === 'object' && !Array.isArray(parseado)) {
      for (const [rolId, tope] of Object.entries(parseado as Record<string, unknown>)) {
        if (typeof tope === 'number' && Number.isInteger(tope) && tope >= 0) {
          valores[rolId] = String(tope);
        }
      }
    }
    setTopesColaciones(valores);
  }, [configTopesColaciones]);

  // Aplica los valores guardados al runtime en cuanto cargan.
  useEffect(() => {
    setServiceLevels({
      simpleHasta: Number(configSimple),
      hostessDesde: Number(configHostess),
      habitacionDesde: Number(configHabitacion)
    });
  }, [configSimple, configHostess, configHabitacion]);

  const handleSave = async () => {
    const simple = Number(simpleValue.trim());
    const hostess = Number(hostessValue.trim());
    const habitacion = Number(habitacionValue.trim());
    const tragoCover = Number(tragoCoverValue.trim());
    const costoEntrada = Number(costoEntradaValue.trim());
    const topeAcompanamiento = Number(topeAcompanamientoValue.trim());
    if (!Number.isInteger(simple) || simple < 0) {
      toast.error('La venta simple debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(hostess) || hostess < 0) {
      toast.error('El umbral de anfitriona debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(habitacion) || habitacion < 0) {
      toast.error('El umbral de habitación debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(tragoCover) || tragoCover < 0) {
      toast.error('El monto base del cover debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(costoEntrada) || costoEntrada < 0) {
      toast.error('El costo de entrada debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(topeAcompanamiento) || topeAcompanamiento < 0) {
      toast.error('El tope de acompañamiento debe ser un entero mayor o igual a 0');
      return;
    }
    // Tope de colaciones por rol: sólo los roles con número; '' se descarta (sin tope).
    const topesValores: Record<string, number> = {};
    for (const [rolId, crudo] of Object.entries(topesColaciones)) {
      const limpio = crudo.trim();
      if (!limpio) continue;
      const tope = Number(limpio);
      if (!Number.isInteger(tope) || tope < 0) {
        toast.error('El tope de colaciones por rol debe ser un entero mayor o igual a 0');
        return;
      }
      topesValores[rolId] = tope;
    }
    if (hostess < simple) {
      toast.error('El umbral de anfitriona no puede ser menor a la venta simple');
      return;
    }
    if (habitacion < hostess) {
      toast.error('El umbral de habitación no puede ser menor al de anfitriona');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/configurations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [
            { clave: 'umbral_simple_hasta', valor: String(simple) },
            { clave: 'umbral_anfitriona_desde', valor: String(hostess) },
            { clave: 'umbral_habitacion_desde', valor: String(habitacion) },
            { clave: 'monto_base_trago_cover_cliente', valor: String(tragoCover) },
            { clave: 'costo_entrada', valor: String(costoEntrada) },
            { clave: 'tope_precio_acompanamiento', valor: String(topeAcompanamiento) },
            { clave: 'colaciones_por_rol_y_turno', valor: JSON.stringify(topesValores) }
          ]
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.message || 'Error al guardar');
      setServiceLevels({ simpleHasta: simple, hostessDesde: hostess, habitacionDesde: habitacion });
      await refrescarConfiguraciones();
      toast.success('Reglas actualizadas');
    } catch (error) {
      logger.captureException(error, { context: 'SettingsServiceLevelsCard:save' });
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // El modelo de Entradas asume que el precio de la entrada y el tope del cover
  // son el mismo dinero: el cliente paga la entrada en la puerta y esa plata se
  // acredita a la bebida que elige en la barra. Si no coinciden, avisamos sin
  // bloquear el guardado (es una decisión de negocio, no un error de datos).
  const topeCover = Number(tragoCoverValue.trim());
  const costoEntrada = Number(costoEntradaValue.trim());
  const avisoTopeDistinto =
    Number.isInteger(topeCover) && Number.isInteger(costoEntrada) && topeCover !== costoEntrada;

  const reglas = [
    {
      id: 'service-simple',
      title: 'Venta simple hasta',
      description: 'Sin comisión ni anfitriona hasta este precio.',
      icon: ShoppingCart,
      value: simpleValue,
      onChange: setSimpleValue,
      tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
    },
    {
      id: 'service-hostess',
      title: 'Anfitriona desde',
      description: 'Precio mínimo para asignar anfitriona.',
      icon: Users,
      value: hostessValue,
      onChange: setHostessValue,
      tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
    },
    {
      id: 'service-habitacion',
      title: 'Habitación desde',
      description: 'Precio mínimo para exigir habitación.',
      icon: BedDouble,
      value: habitacionValue,
      onChange: setHabitacionValue,
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    },
    {
      id: 'service-trago-cover-cliente',
      title: 'Covers de entradas',
      description: 'El cliente puede elegir una bebida de este precio o menos.',
      icon: GlassWater,
      value: tragoCoverValue,
      onChange: setTragoCoverValue,
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    },
    {
      id: 'service-costo-entrada',
      title: 'Costo de entrada',
      description: 'Monto predeterminado al registrar una entrada.',
      icon: Ticket,
      value: costoEntradaValue,
      onChange: setCostoEntradaValue,
      tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    },
    {
      id: 'service-tope-acompanamiento',
      title: 'Tope de acompañamiento',
      description:
        'Precio máximo por unidad de acompañamiento; el exceso se suma al subtotal. 0 = sin tope.',
      icon: CupSoda,
      value: topeAcompanamientoValue,
      onChange: setTopeAcompanamientoValue,
      tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
    }
  ];

  return (
    <CollapsibleCard
      defaultOpen
      aria-label='Reglas de venta'
      className='rounded-2xl border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      headerClassName='p-4 sm:px-5 sm:py-4'
      contentClassName='space-y-4 px-4 pb-4 sm:px-5 sm:pb-5'
      title={
        <div className='flex items-center gap-3'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'>
            <Users className='h-4 w-4' aria-hidden='true' />
          </div>
          <span className='text-base font-semibold leading-tight text-neutral-900 sm:text-lg dark:text-white'>
            Reglas de venta
          </span>
        </div>
      }
      description='Define los umbrales de precios y las condiciones de atención.'
    >
      <div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3'>
        {reglas.map(({ id, title, description, icon: Icon, value, onChange, tone }) => (
          <div
            key={id}
            className='flex min-w-0 flex-col rounded-xl border border-neutral-200/70 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-950/40'
          >
            <div className='flex items-center gap-2'>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
              >
                <Icon className='h-4 w-4' aria-hidden='true' />
              </span>
              <Label
                htmlFor={id}
                className='min-w-0 text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100'
              >
                {title}
              </Label>
            </div>
            <p className='mt-2 min-h-8 text-xs leading-4 text-neutral-600 dark:text-neutral-400'>
              {description}
            </p>
            <div className='mt-3 flex items-center gap-2'>
              <span className='shrink-0 rounded-md bg-white px-2 py-1.5 text-xs font-semibold text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400'>
                $
              </span>
              <Input
                id={id}
                type='number'
                min='0'
                value={value}
                onChange={event => onChange(event.target.value)}
                className='h-10 min-w-0 flex-1 rounded-lg border-neutral-300 bg-white text-right text-sm font-semibold tabular-nums dark:border-neutral-700 dark:bg-neutral-900'
              />
            </div>
          </div>
        ))}
      </div>

      <section
        aria-labelledby='role-meal-limits-title'
        className='border-t border-neutral-200 pt-4 dark:border-neutral-800'
      >
        <div className='flex items-center gap-3'>
          <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'>
            <UserCog className='h-4 w-4' aria-hidden='true' />
          </span>
          <div className='min-w-0 flex-1'>
            <p
              id='role-meal-limits-title'
              className='text-sm font-semibold text-neutral-900 dark:text-neutral-100'
            >
              Colaciones por rol y turno
            </p>
            <p className='mt-0.5 text-xs leading-4 text-neutral-500 dark:text-neutral-400'>
              Colaciones que puede recibir cada trabajador del rol durante un turno de caja. Vacío =
              1 (regla vigente); 0 = sin colación para ese rol.
            </p>
          </div>
        </div>
        {rolesActivos.length > 0 ? (
          <div className='mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2'>
            {rolesActivos.map(rol => (
              <div
                key={rol.id}
                className='flex min-w-0 items-center gap-3 rounded-lg bg-neutral-50/70 px-3 py-2 dark:bg-neutral-800/40'
              >
                <span className='text-sm font-medium text-neutral-700 dark:text-neutral-300 flex-1 truncate'>
                  {rol.nombre}
                </span>
                <div className='flex items-center gap-2 shrink-0'>
                  <Input
                    aria-label={`Colaciones por turno de caja para ${rol.nombre}`}
                    placeholder='1'
                    min='0'
                    value={topesColaciones[String(rol.id)] ?? ''}
                    onChange={e =>
                      setTopesColaciones(actual => ({
                        ...actual,
                        [String(rol.id)]: e.target.value
                      }))
                    }
                    className='h-9 w-20 rounded-lg border-neutral-300 bg-neutral-50 text-center text-sm tabular-nums dark:border-neutral-700 dark:bg-neutral-950'
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-xs text-neutral-500 dark:text-neutral-400'>
            No hay roles activos para configurar.
          </p>
        )}
      </section>

      {avisoTopeDistinto && (
        <div
          role='status'
          className='flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-950/30'
        >
          <AlertTriangle className='h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400' />
          <p className='text-xs text-amber-800 dark:text-amber-200'>
            Los covers de entradas ($ {topeCover.toLocaleString('es-CL')}) no coinciden con el costo
            de entrada ($ {costoEntrada.toLocaleString('es-CL')}). En Entradas el precio de la
            entrada se acredita a la bebida que el cliente elige en la barra: con un tope mayor la
            diferencia la absorbe el negocio, y con un tope menor ninguna bebida puede costar menos
            que la entrada y nunca se cobra adicional. Podés guardarlo igual.
          </p>
        </div>
      )}

      <div className='flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-800'>
        <Button
          variant='unstyled'
          onClick={handleSave}
          disabled={saving}
          className='inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-black dark:hover:bg-neutral-200'
        >
          <Save className='h-4 w-4' aria-hidden='true' />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </CollapsibleCard>
  );
}
