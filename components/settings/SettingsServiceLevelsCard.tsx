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
  AlertTriangle
} from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { refrescarConfiguraciones, useConfig, useConfigValue } from '@/hooks/shared/useConfigValue';
import { setServiceLevels } from '@/components/orders/productModalRules';

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
  const configTragoCortesia = useConfigValue(
    'comisiones',
    'monto_base_trago_cortesia_cliente',
    10000
  );
  const configCostoEntrada = useConfigValue('comisiones', 'costo_entrada', 10000);
  // Regla "colaciones por rol y turno de caja": map JSON `rol_id → tope` guardado
  // como texto; el rol que no está puesto queda con la regla vigente (1 por
  // trabajador por turno) y 0 significa que el rol no recibe colación.
  const configTopesColaciones = useConfig<string>('colaciones_por_rol_y_turno', '');
  const [topesColaciones, setTopesColaciones] = useState<Record<string, string>>({});
  const [rolesActivos, setRolesActivos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [simpleValue, setSimpleValue] = useState('');
  const [hostessValue, setHostessValue] = useState('');
  const [habitacionValue, setHabitacionValue] = useState('');
  const [tragoCortesiaValue, setTragoCortesiaValue] = useState('10000');
  const [costoEntradaValue, setCostoEntradaValue] = useState('10000');
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
    setTragoCortesiaValue(String(configTragoCortesia));
  }, [configTragoCortesia]);

  useEffect(() => {
    setCostoEntradaValue(String(configCostoEntrada));
  }, [configCostoEntrada]);

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
    const tragoCortesia = Number(tragoCortesiaValue.trim());
    const costoEntrada = Number(costoEntradaValue.trim());
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
    if (!Number.isInteger(tragoCortesia) || tragoCortesia < 0) {
      toast.error('El monto base del trago de cortesía debe ser un entero mayor o igual a 0');
      return;
    }
    if (!Number.isInteger(costoEntrada) || costoEntrada < 0) {
      toast.error('El costo de entrada debe ser un entero mayor o igual a 0');
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
            { clave: 'monto_base_trago_cortesia_cliente', valor: String(tragoCortesia) },
            { clave: 'costo_entrada', valor: String(costoEntrada) },
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
  const topeCortesia = Number(tragoCortesiaValue.trim());
  const costoEntrada = Number(costoEntradaValue.trim());
  const avisoTopeDistinto =
    Number.isInteger(topeCortesia) &&
    Number.isInteger(costoEntrada) &&
    topeCortesia !== costoEntrada;

  return (
    <CollapsibleCard
      defaultOpen
      aria-label='Reglas de venta'
      title={
        <>
          <Users className='h-5 w-5 text-neutral-500' />
          Reglas de venta
        </>
      }
      contentClassName='space-y-4'
    >
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4'>
        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'>
          <div className='flex items-center gap-3'>
            <ShoppingCart className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label
                htmlFor='service-simple'
                className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
              >
                Venta simple hasta
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                Sin comisión ni anfitriona hasta este precio.
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-sm text-neutral-500'>$</span>
              <Input
                id='service-simple'
                type='number'
                min='0'
                value={simpleValue}
                onChange={e => setSimpleValue(e.target.value)}
                className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
            </div>
          </div>
        </div>

        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'>
          <div className='flex items-center gap-3'>
            <Users className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label
                htmlFor='service-hostess'
                className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
              >
                Anfitriona desde
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                Precio mínimo para asignar anfitriona.
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-sm text-neutral-500'>$</span>
              <Input
                id='service-hostess'
                type='number'
                min='0'
                value={hostessValue}
                onChange={e => setHostessValue(e.target.value)}
                className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
            </div>
          </div>
        </div>

        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'>
          <div className='flex items-center gap-3'>
            <BedDouble className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label
                htmlFor='service-habitacion'
                className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
              >
                Habitación desde
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                Precio mínimo para exigir habitación.
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-sm text-neutral-500'>$</span>
              <Input
                id='service-habitacion'
                type='number'
                min='0'
                value={habitacionValue}
                onChange={e => setHabitacionValue(e.target.value)}
                className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
            </div>
          </div>
        </div>

        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'>
          <div className='flex items-center gap-3'>
            <GlassWater className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label
                htmlFor='service-trago-cortesia-cliente'
                className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
              >
                Covers de entradas
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                En Entradas, el cliente puede elegir como cover una bebida de este precio o menos.
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-sm text-neutral-500'>$</span>
              <Input
                id='service-trago-cortesia-cliente'
                type='number'
                min='0'
                value={tragoCortesiaValue}
                onChange={e => setTragoCortesiaValue(e.target.value)}
                className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
            </div>
          </div>
        </div>

        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-xl'>
          <div className='flex items-center gap-3'>
            <Ticket className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label
                htmlFor='service-costo-entrada'
                className='text-sm font-bold text-neutral-700 dark:text-neutral-300'
              >
                Costo de entrada
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                Monto predeterminado al registrar una entrada.
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-sm text-neutral-500'>$</span>
              <Input
                id='service-costo-entrada'
                type='number'
                min='0'
                value={costoEntradaValue}
                onChange={e => setCostoEntradaValue(e.target.value)}
                className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
            </div>
          </div>
        </div>
      </div>

      {/* Colaciones por rol: cada trabajador del rol tiene un tope de colaciones por turno de caja. */}
      <div className='p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3'>
        <div className='flex items-center gap-3'>
          <UserCog className='h-5 w-5 text-neutral-500 shrink-0' />
          <div className='flex-1'>
            <p className='text-sm font-bold text-neutral-700 dark:text-neutral-300'>
              Colaciones por rol y turno de caja
            </p>
            <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
              Colaciones que puede recibir cada trabajador del rol durante un turno de caja. Vacío =
              1 (regla vigente); 0 = sin colación para ese rol.
            </p>
          </div>
        </div>
        {rolesActivos.length > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {rolesActivos.map(rol => (
              <div
                key={rol.id}
                className='flex items-center gap-3 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/30 rounded-full'
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
                    className='w-24 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
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
      </div>

      {avisoTopeDistinto && (
        <div
          role='status'
          className='flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-950/30'
        >
          <AlertTriangle className='h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400' />
          <p className='text-xs text-amber-800 dark:text-amber-200'>
            Los covers de entradas ($ {topeCortesia.toLocaleString('es-CL')}) no coinciden con el
            costo de entrada ($ {costoEntrada.toLocaleString('es-CL')}). En Entradas el precio de la
            entrada se acredita a la bebida que el cliente elige en la barra: con un tope mayor la
            diferencia la absorbe el negocio, y con un tope menor ninguna bebida puede costar menos
            que la entrada y nunca se cobra adicional. Podés guardarlo igual.
          </p>
        </div>
      )}

      <div className='flex justify-end pt-4'>
        <Button
          variant='unstyled'
          onClick={handleSave}
          disabled={saving}
          className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
        >
          <Save className='h-4 w-4' />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </CollapsibleCard>
  );
}
