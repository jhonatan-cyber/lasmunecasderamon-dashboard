'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Search, Users, DollarSign, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import logger from '@/lib/utils/logger';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { setExpensiveDrinkThreshold, setCardSplit } from '@/components/orders/productModalRules';

interface Producto {
  id: string;
  code: string;
  name: string;
  category_id: string;
  price: number;
  commission: number;
  max_anfitrionas: number | null;
  categoria?: string;
  status: number;
}

export function SettingsComisionesTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [thresholdValue, setThresholdValue] = useState('');
  const [splitVentaValue, setSplitVentaValue] = useState('');
  const [splitPropinaValue, setSplitPropinaValue] = useState('');
  const [adminWhatsAppValue, setAdminWhatsAppValue] = useState('');
  const configThreshold = useConfigValue('comisiones', 'threshold_producto_caro', '30000');
  const configSplitVenta = useConfigValue('comisiones', 'split_tarjeta_venta', '51');
  const configSplitPropina = useConfigValue('comisiones', 'split_tarjeta_propina', '49');
  const configAdminWhatsApp = useConfigValue('sistema', 'admin_whatsapp', '');

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setProductos(result.data);
        const values: Record<string, string> = {};
        for (const p of result.data) {
          values[p.id] = p.max_anfitrionas !== null && p.max_anfitrionas !== undefined ? String(p.max_anfitrionas) : '';
        }
        setEditValues(values);
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsComisionesTab:fetch' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  useEffect(() => {
    setThresholdValue(String(configThreshold));
  }, [configThreshold]);

  useEffect(() => {
    setSplitVentaValue(String(configSplitVenta));
  }, [configSplitVenta]);

  useEffect(() => {
    setSplitPropinaValue(String(configSplitPropina));
  }, [configSplitPropina]);

  useEffect(() => {
    setAdminWhatsAppValue(String(configAdminWhatsApp));
  }, [configAdminWhatsApp]);

  const filteredProductos = useMemo(
    () =>
      productos.filter(p => {
        if (p.commission <= 0) return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          (p.categoria || '').toLowerCase().includes(term)
        );
      }),
    [productos, searchTerm]
  );

  const handleSave = async () => {
    const changes: { id: string; max_anfitrionas: number | null }[] = [];

    for (const producto of productos) {
      const newVal = editValues[producto.id]?.trim() || '';
      const oldVal = producto.max_anfitrionas !== null && producto.max_anfitrionas !== undefined ? String(producto.max_anfitrionas) : '';
      if (newVal !== oldVal) {
        const num = newVal === '' ? null : Number(newVal);
        if (num !== null && (isNaN(num) || num < 0 || !Number.isInteger(num))) {
          toast.error(`"${producto.name}": debe ser un número entero positivo o vacío`);
          return;
        }
        changes.push({ id: producto.id, max_anfitrionas: num });
      }
    }

    const thresholdChanged = thresholdValue.trim() !== String(configThreshold);
    const splitVentaChanged = splitVentaValue.trim() !== String(configSplitVenta);
    const splitPropinaChanged = splitPropinaValue.trim() !== String(configSplitPropina);
    const splitChanged = splitVentaChanged || splitPropinaChanged;
    const adminWhatsAppChanged = adminWhatsAppValue.trim() !== String(configAdminWhatsApp);
    if (changes.length === 0 && !thresholdChanged && !splitChanged && !adminWhatsAppChanged) {
      toast.info('No hay cambios para guardar');
      return;
    }

    try {
      setSaving(true);

      // Save per-product max_anfitrionas
      for (const change of changes) {
        const response = await fetch(`/api/products?id=${change.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ max_anfitrionas: change.max_anfitrionas })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Error al guardar');
      }

      // Save threshold config
      const configUpdates: { clave: string; valor: string }[] = [];
      if (thresholdChanged) {
        const num = Number(thresholdValue.trim());
        if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
          toast.error('El umbral debe ser un número entero positivo');
          setSaving(false);
          return;
        }
        configUpdates.push({ clave: 'threshold_producto_caro', valor: String(num) });
      }
      if (splitVentaChanged || splitPropinaChanged) {
        const v = Number(splitVentaValue.trim());
        const p = Number(splitPropinaValue.trim());
        if (isNaN(v) || isNaN(p) || v < 0 || p < 0 || !Number.isInteger(v) || !Number.isInteger(p)) {
          toast.error('Los porcentajes de split deben ser números enteros positivos');
          setSaving(false);
          return;
        }
        if (v + p !== 100) {
          toast.error('Venta + Propina debe sumar 100');
          setSaving(false);
          return;
        }
        configUpdates.push({ clave: 'split_tarjeta_venta', valor: String(v) });
        configUpdates.push({ clave: 'split_tarjeta_propina', valor: String(p) });
      }
      if (adminWhatsAppChanged) {
        configUpdates.push({ clave: 'admin_whatsapp', valor: adminWhatsAppValue.trim() });
      }
      if (configUpdates.length > 0) {
        const configRes = await fetch('/api/configurations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configs: configUpdates })
        });
        const configResult = await configRes.json();
        if (!configResult.success) throw new Error(configResult.message || 'Error al guardar configuración');
        if (thresholdChanged) setExpensiveDrinkThreshold(Number(thresholdValue.trim()));
        if (splitChanged) setCardSplit(Number(splitVentaValue.trim()) / 100, Number(splitPropinaValue.trim()) / 100);
      }

      const msg = [];
      if (changes.length > 0) msg.push(`${changes.length} producto${changes.length !== 1 ? 's' : ''} actualizado${changes.length !== 1 ? 's' : ''}`);
      if (thresholdChanged) msg.push('Umbral actualizado');
      if (splitChanged) msg.push('Split tarjeta actualizado');
      if (adminWhatsAppChanged) msg.push('WhatsApp admin actualizado');
      toast.success(msg.join(' y '));
      fetchProductos();
    } catch (error) {
      logger.captureException(error, { context: 'SettingsComisionesTab:save' });
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className='border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold dark:text-white'>
          <Users className='h-5 w-5 text-neutral-500' />
          Límite de Anfitrionas por Producto
        </CardTitle>
        <CardDescription className='text-neutral-500 dark:text-neutral-400'>
          Configurá cuántas anfitrionas puede tener cada producto. Si está vacío, usa el valor
          por defecto según el precio (champañas) o 1 anfitriona (otros productos).
        </CardDescription>

        <div className='mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
          <div className='flex items-center gap-3'>
            <DollarSign className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label className='text-sm font-bold text-neutral-700 dark:text-neutral-300'>
                Producto &apos;Caro&apos; — umbral de precio mínimo
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                Productos con precio mayor o igual a este valor requerirán selección de habitación y anfitriona.
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-sm text-neutral-500'>$</span>
              <input
                type='number'
                min='0'
                value={thresholdValue}
                onChange={e => setThresholdValue(e.target.value)}
                className='w-28 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
            </div>
          </div>
        </div>

        <div className='mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
          <div className='flex items-center gap-3'>
            <DollarSign className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label className='text-sm font-bold text-neutral-700 dark:text-neutral-300'>
                Split Pago con Tarjeta — venta / propina
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                Porcentajes en que se divide un pago con tarjeta. Deben sumar 100.
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-sm text-neutral-500'>Venta</span>
              <input
                type='number'
                min='0'
                max='100'
                value={splitVentaValue}
                onChange={e => setSplitVentaValue(e.target.value)}
                className='w-20 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
              <span className='text-sm text-neutral-400'>%</span>
              <span className='text-sm text-neutral-500 ml-2'>Propina</span>
              <input
                type='number'
                min='0'
                max='100'
                value={splitPropinaValue}
                onChange={e => setSplitPropinaValue(e.target.value)}
                className='w-20 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
              />
              <span className='text-sm text-neutral-400'>%</span>
            </div>
          </div>
        </div>

        <div className='mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700'>
          <div className='flex items-center gap-3'>
            <Phone className='h-5 w-5 text-neutral-500 shrink-0' />
            <div className='flex-1'>
              <label className='text-sm font-bold text-neutral-700 dark:text-neutral-300'>
                WhatsApp Administrador
              </label>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
                Número para recibir notificaciones de anulaciones, anticipos y gratificaciones.
              </p>
            </div>
            <input
              type='text'
              value={adminWhatsAppValue}
              onChange={e => setAdminWhatsAppValue(e.target.value)}
              placeholder='ej: 59172419112'
              className='w-44 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm text-center'
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500 mx-auto' />
            <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-2'>
              Cargando productos...
            </p>
          </div>
        ) : (
          <div className='space-y-6'>
            <div className='relative max-w-xs'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500' />
              <Input
                placeholder='Buscar producto...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-10 pr-4 py-2 rounded-full text-sm'
              />
            </div>

            <div className='overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800'>
              <table className='w-full text-sm'>
                <thead className='bg-neutral-100 dark:bg-neutral-800/50'>
                  <tr>
                    <th className='text-left px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs'>
                      Producto
                    </th>
                    <th className='text-left px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs'>
                      Categoría
                    </th>
                    <th className='text-right px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs'>
                      Precio
                    </th>
                    <th className='text-center px-4 py-3 font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-xs'>
                      Máx. Anfitrionas
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {filteredProductos.map(p => (
                    <tr
                      key={p.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors'
                    >
                      <td className='px-4 py-3 font-medium text-neutral-900 dark:text-white'>
                        {p.name}
                      </td>
                      <td className='px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs'>
                        {p.categoria || '—'}
                      </td>
                      <td className='px-4 py-3 text-right text-neutral-700 dark:text-neutral-300'>
                        ${(p.price || 0).toLocaleString('es-CL')}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <input
                          type='number'
                          min='0'
                          max='99'
                          value={editValues[p.id] ?? ''}
                          onChange={e =>
                            setEditValues(prev => ({ ...prev, [p.id]: e.target.value }))
                          }
                          placeholder='Default'
                          className='w-20 px-3 py-1.5 text-center bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent text-neutral-900 dark:text-white text-sm'
                        />
                      </td>
                    </tr>
                  ))}
                  {filteredProductos.length === 0 && (
                    <tr>
                      <td colSpan={4} className='text-center py-8 text-neutral-400'>
                        No se encontraron productos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className='flex justify-end pt-2'>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:scale-105 active:scale-95 transition-all duration-200 rounded-full font-bold disabled:opacity-50'
              >
                <Save className='h-4 w-4' />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}