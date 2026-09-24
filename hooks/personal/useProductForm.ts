'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Product, Presentacion } from '@/types/product';

import { generateRandomCode } from '@/lib/utils/codeUtils';
import logger from '@/lib/utils/logger';

export interface ProductFormValues {
  code: string;
  name: string;
  description: string;
}

export interface PresentacionFormItem {
  nombre: string;
  codigo_barras: string;
  precio_compra: string;
  stock: string;
  foto: File | null;
  fotoPreview: string;
  fotoUrl: string;
}

export interface UnidadCodigoItem {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  compra_folio?: string | null;
  fecha_crea?: string | null;
  fecha_impresion?: string | null;
  presentacion_id?: string | null;
  estado?: string;
}

const FOTOS_PERMITIDAS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const FOTO_MAX_BYTES = 5 * 1024 * 1024;

const emptyPresentacion = (): PresentacionFormItem => ({
  nombre: '',
  codigo_barras: '',
  precio_compra: '',
  stock: '',
  foto: null,
  fotoPreview: '',
  fotoUrl: ''
});

const formatNumber = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const getNumericValue = (v: string) => v.replace(/\./g, '');

const initialFormState: ProductFormValues = {
  code: '',
  name: '',
  description: ''
};

interface UseProductFormProps {
  open: boolean;
  initialValues?: Product | null;
  categoryId: string | number;
  onSubmit: (form: FormData) => void;
  autoEditPresentation?: Presentacion | null;
}

export function useProductForm({
  open,
  initialValues,
  categoryId,
  onSubmit,
  autoEditPresentation = null
}: UseProductFormProps) {
  const [form, setForm] = useState<ProductFormValues>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [presentaciones, setPresentaciones] = useState<PresentacionFormItem[]>([]);
  const [presentacionesError, setPresentacionesError] = useState<string>('');
  const [existentes, setExistentes] = useState<Presentacion[]>([]);
  const [stockExtra, setStockExtra] = useState<Record<string, string>>({});
  const [agregandoStock, setAgregandoStock] = useState<boolean>(false);
  const [editingPresId, setEditingPresId] = useState<string | null>(null);
  const [editPresDraft, setEditPresDraft] = useState({
    nombre: '',
    codigo_barras: '',
    precio_compra: '',
    precio_venta: '',
    comision: '',
    stock: ''
  });
  const [guardandoPres, setGuardandoPres] = useState<boolean>(false);
  const [codigosSeleccionados, setCodigosSeleccionados] = useState<string[]>([]);
  const [unidadesTotal, setUnidadesTotal] = useState<number>(0);
  const [unidadesInactivas, setUnidadesInactivas] = useState<number>(0);
  const [unidadesCodigos, setUnidadesCodigos] = useState<
    {
      id: string;
      codigo: string;
      codigo_barras: string | null;
      compra_folio?: string | null;
      fecha_crea?: string | null;
      fecha_impresion?: string | null;
      presentacion_id?: string | null;
      estado?: string;
    }[]
  >([]);
  const [cargandoInventario, setCargandoInventario] = useState<boolean>(false);

  const isEdit = Boolean(initialValues?.id);

  const fetchInventario = async (productoId: string) => {
    setCargandoInventario(true);
    try {
      const [presRes, uniRes] = await Promise.all([
        fetch(`/api/products/presentations?producto_id=${productoId}`),
        fetch(`/api/products/units?producto_id=${productoId}`)
      ]);
      const presData = await presRes.json().catch(() => ({}));
      const uniData = await uniRes.json().catch(() => ({}));
      if (presData.success && Array.isArray(presData.data)) setExistentes(presData.data);
      if (uniData.success && uniData.data) {
        setUnidadesTotal(Number(uniData.data.total ?? 0));
        setUnidadesInactivas(Number(uniData.data.inactivas ?? 0));
        setUnidadesCodigos(
          Array.isArray(uniData.data.unidades)
            ? uniData.data.unidades.map((u: any) => ({
                id: String(u.id),
                codigo: String(u.codigo),
                codigo_barras: u.codigo_barras ? String(u.codigo_barras) : null,
                compra_folio: u.compra_folio ?? null,
                fecha_crea: u.fecha_crea ?? null,
                fecha_impresion: u.fecha_impresion ?? null,
                presentacion_id: u.presentacion_id ?? null,
                estado: u.estado || 'almacen'
              }))
            : []
        );
      }
    } catch (err) {
      logger.warn('[useProductForm] No se pudo cargar inventario del producto', err);
    } finally {
      setCargandoInventario(false);
    }
  };

  useEffect(() => {
    if (open && initialValues) {
      setForm({
        code: initialValues.code || '',
        name: initialValues.name || '',
        description: initialValues.description || ''
      });
    } else if (open) {
      setForm({ ...initialFormState, code: generateRandomCode() });
    }
    setErrors({});
    setPresentaciones(prev => {
      prev.forEach(p => {
        if (p.fotoPreview.startsWith('blob:')) URL.revokeObjectURL(p.fotoPreview);
      });
      return [];
    });
    setPresentacionesError('');
    if (autoEditPresentation?.id) {
      // Apertura directa en modo edición de la presentación.
      setEditingPresId(autoEditPresentation.id);
      setEditPresDraft({
        nombre: autoEditPresentation.nombre || '',
        codigo_barras: autoEditPresentation.codigo_barras || '',
        precio_compra:
          autoEditPresentation.precio_compra !== undefined &&
          autoEditPresentation.precio_compra !== null
            ? formatNumber(String(autoEditPresentation.precio_compra))
            : '',
        precio_venta:
          (autoEditPresentation as any).precio_venta !== undefined &&
          (autoEditPresentation as any).precio_venta !== null
            ? formatNumber(String((autoEditPresentation as any).precio_venta))
            : '',
        comision:
          (autoEditPresentation as any).comision !== undefined &&
          (autoEditPresentation as any).comision !== null
            ? formatNumber(String((autoEditPresentation as any).comision))
            : '',
        stock:
          autoEditPresentation.stock !== undefined && autoEditPresentation.stock !== null
            ? formatNumber(String(autoEditPresentation.stock))
            : ''
      });
      setCodigosSeleccionados([]);
    } else {
      setEditingPresId(null);
      setEditPresDraft({
        nombre: '',
        codigo_barras: '',
        precio_compra: '',
        precio_venta: '',
        comision: '',
        stock: ''
      });
      setCodigosSeleccionados([]);
    }
    if (open && initialValues?.id) {
      setExistentes([]);
      setUnidadesTotal(0);
      setUnidadesInactivas(0);
      setUnidadesCodigos([]);
      fetchInventario(String(initialValues.id));
    } else {
      setExistentes([]);
      setUnidadesTotal(0);
      setUnidadesInactivas(0);
      setUnidadesCodigos([]);
    }
  }, [open, initialValues, autoEditPresentation]);

  const validate = () => {
    const newErrors: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!form.code.trim()) newErrors.code = 'El código es requerido';
    if (!form.name.trim()) newErrors.name = 'El nombre es requerido';
    setErrors(newErrors);

    const presError = validatePresentaciones(presentaciones);
    setPresentacionesError(presError);
    return Object.keys(newErrors).length === 0 && !presError;
  };

  const validatePresentaciones = (items: PresentacionFormItem[]): string => {
    if (!isEdit && items.length === 0) return 'Agrega al menos una presentación (ej. 750 ml)';
    const vistos = new Set<string>();
    for (const item of items) {
      if (!item.nombre.trim()) return 'Cada presentación requiere un nombre (ej. 750 ml)';
      if (
        item.precio_compra.trim() &&
        (isNaN(Number(getNumericValue(item.precio_compra))) ||
          Number(getNumericValue(item.precio_compra)) < 0)
      )
        return `Precio de compra inválido en "${item.nombre.trim() || 'presentación'}"`;
      if (!/^\d*$/.test(getNumericValue(item.stock)))
        return `Stock inválido en "${item.nombre.trim() || 'presentación'}": entero mayor o igual a 0`;
      const codigo = item.codigo_barras.trim();
      if (codigo) {
        if (vistos.has(codigo)) return `Código de barras duplicado: ${codigo}`;
        vistos.add(codigo);
        if (existentes.some(e => (e.codigo_barras || '') === codigo))
          return `El código ${codigo} ya existe en este producto`;
      }
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const target = e.target;
    const name = target?.name;
    const value = target?.value;

    if (name === 'name') {
      setForm(prev => ({
        ...prev,
        name: value
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      }));
    } else if (name === 'description') {
      setForm(prev => ({
        ...prev,
        description: value ? value.charAt(0).toUpperCase() + value.slice(1) : value
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const addPresentacion = () => setPresentaciones(prev => [...prev, emptyPresentacion()]);

  const removePresentacion = (index: number) =>
    setPresentaciones(prev => {
      const target = prev[index];
      if (target?.fotoPreview.startsWith('blob:')) URL.revokeObjectURL(target.fotoPreview);
      return prev.filter((_, i) => i !== index);
    });

  const updatePresentacion = (index: number, field: keyof PresentacionFormItem, value: string) => {
    const formatted =
      field === 'precio_compra' || field === 'stock'
        ? value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        : value;
    setPresentaciones(prev => prev.map((p, i) => (i === index ? { ...p, [field]: formatted } : p)));
  };

  const changeStockExtra = (presentacionId: string, value: string) =>
    setStockExtra(prev => ({
      ...prev,
      [presentacionId]: value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }));

  const agregarStockCantidad = async (
    presentacionId: string,
    cantidad: number
  ): Promise<boolean> => {
    if (!initialValues?.id) return false;
    setAgregandoStock(true);
    try {
      const res = await fetch('/api/products/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: String(initialValues.id),
          presentacion_id: presentacionId,
          cantidad
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo agregar stock');
        return false;
      }
      toast.success(data.message || `${cantidad} códigos generados`);
      return true;
    } catch {
      toast.error('Error de red al agregar stock');
      return false;
    } finally {
      setAgregandoStock(false);
    }
  };

  const agregarStock = async (presentacionId: string) => {
    const cantidad = Number(getNumericValue(stockExtra[presentacionId] || ''));
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 1000) {
      toast.error('Indica una cantidad entre 1 y 1000');
      return;
    }
    if (!initialValues?.id) return;
    const ok = await agregarStockCantidad(presentacionId, cantidad);
    if (ok) {
      setStockExtra(prev => ({ ...prev, [presentacionId]: '' }));
      await fetchInventario(String(initialValues.id));
    }
  };

  const setPresentacionFoto = (index: number, file: File | null) => {
    if (!file) {
      setPresentaciones(prev =>
        prev.map((p, i) => {
          if (i !== index) return p;
          if (p.fotoPreview.startsWith('blob:')) URL.revokeObjectURL(p.fotoPreview);
          return { ...p, foto: null, fotoPreview: '' };
        })
      );
      return;
    }
    if (!FOTOS_PERMITIDAS.includes(file.type)) {
      setPresentacionesError('Solo se permiten imágenes JPG, PNG, GIF o WEBP');
      return;
    }
    if (file.size > FOTO_MAX_BYTES) {
      setPresentacionesError('La imagen de presentación no puede superar los 5MB');
      return;
    }
    setPresentaciones(prev =>
      prev.map((p, i) => {
        if (i !== index) return p;
        if (p.fotoPreview.startsWith('blob:')) URL.revokeObjectURL(p.fotoPreview);
        return { ...p, foto: file, fotoPreview: URL.createObjectURL(file) };
      })
    );
    setPresentacionesError('');
  };

  const setPresentacionFotoUrl = (index: number, url: string) => {
    setPresentaciones(prev =>
      prev.map((p, i) => {
        if (i !== index) return p;
        if (url.trim()) {
          if (p.fotoPreview.startsWith('blob:')) URL.revokeObjectURL(p.fotoPreview);
          return { ...p, foto: null, fotoPreview: url.trim(), fotoUrl: url.trim() };
        }
        return {
          ...p,
          fotoUrl: '',
          ...(p.foto ? {} : { fotoPreview: '' })
        };
      })
    );
  };

  const updateExistenteFoto = async (id: string, file: File) => {
    if (!FOTOS_PERMITIDAS.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPG, PNG, GIF o WEBP');
      return;
    }
    if (file.size > FOTO_MAX_BYTES) {
      toast.error('La imagen no puede superar los 5MB');
      return;
    }
    const data = new FormData();
    data.append('id', id);
    data.append('foto', file);
    try {
      const res = await fetch('/api/products/presentations', { method: 'PATCH', body: data });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        toast.error(result.message || 'No se pudo actualizar la foto');
        return;
      }
      toast.success('Foto actualizada correctamente');
      if (initialValues?.id) await fetchInventario(String(initialValues.id));
    } catch {
      toast.error('Error de red al actualizar la foto');
    }
  };

  const updateExistenteFotoUrl = async (id: string, url: string) => {
    const clean = url.trim();
    if (!clean) {
      toast.error('Pega la URL de la imagen');
      return;
    }
    try {
      const res = await fetch('/api/products/presentations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, foto: clean })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        toast.error(result.message || 'No se pudo actualizar la foto');
        return;
      }
      toast.success('Foto actualizada correctamente');
      if (initialValues?.id) await fetchInventario(String(initialValues.id));
    } catch {
      toast.error('Error de red al actualizar la foto');
    }
  };

  const startEditPres = (p: Presentacion) => {
    setEditingPresId(p.id);
    setCodigosSeleccionados([]);
    setEditPresDraft({
      nombre: p.nombre || '',
      codigo_barras: p.codigo_barras || '',
      precio_compra:
        p.precio_compra !== undefined && p.precio_compra !== null
          ? formatNumber(String(p.precio_compra))
          : '',
      precio_venta:
        p.precio_venta !== undefined && p.precio_venta !== null
          ? formatNumber(String(p.precio_venta))
          : '',
      comision:
        p.comision !== undefined && p.comision !== null ? formatNumber(String(p.comision)) : '',
      stock: p.stock !== undefined && p.stock !== null ? formatNumber(String(p.stock)) : ''
    });
  };

  const cancelEditPres = () => {
    setEditingPresId(null);
    setCodigosSeleccionados([]);
    setEditPresDraft({
      nombre: '',
      codigo_barras: '',
      precio_compra: '',
      precio_venta: '',
      comision: '',
      stock: ''
    });
  };

  const changeEditPresDraft = (field: keyof typeof editPresDraft, value: string) =>
    setEditPresDraft(prev => ({
      ...prev,
      [field]:
        field === 'precio_compra' || field === 'precio_venta' || field === 'comision'
          ? value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
          : value
    }));

  const toggleCodigoSeleccionado = (unidadId: string) =>
    setCodigosSeleccionados(prev =>
      prev.includes(unidadId) ? prev.filter(id => id !== unidadId) : [...prev, unidadId]
    );

  const saveEditPres = async () => {
    if (!editingPresId) return;
    if (!editPresDraft.nombre.trim()) {
      toast.error('El nombre de la presentación es requerido');
      return;
    }
    const actual = existentes.find(e => e.id === editingPresId);
    const stockActual = actual?.stock ?? 0;
    const stockDeseadoRaw = getNumericValue(editPresDraft.stock);
    if (stockDeseadoRaw && !/^\d+$/.test(stockDeseadoRaw)) {
      toast.error('Stock debe ser un número entero mayor o igual a 0');
      return;
    }
    const stockDeseado = stockDeseadoRaw ? Number(stockDeseadoRaw) : stockActual;
    const diferencia = stockDeseado - stockActual;
    if (diferencia < 0 && codigosSeleccionados.length !== Math.abs(diferencia)) {
      toast.error(
        `Selecciona ${Math.abs(diferencia)} código(s) para desactivar (llevas ${codigosSeleccionados.length})`
      );
      return;
    }
    setGuardandoPres(true);
    try {
      const res = await fetch('/api/products/presentations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPresId,
          nombre: editPresDraft.nombre.trim(),
          codigo_barras: editPresDraft.codigo_barras.trim(),
          precio_compra: getNumericValue(editPresDraft.precio_compra) || '0',
          precio_venta: getNumericValue(editPresDraft.precio_venta) || '0',
          comision: getNumericValue(editPresDraft.comision) || '0'
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        toast.error(result.message || 'No se pudo actualizar la presentación');
        return;
      }
      if (diferencia > 0 && initialValues?.id) {
        await agregarStockCantidad(editingPresId, diferencia);
      } else if (diferencia < 0 && initialValues?.id) {
        const resUni = await fetch('/api/products/units', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producto_id: String(initialValues.id),
            ids: codigosSeleccionados,
            estado: 'inactivo'
          })
        });
        const dataUni = await resUni.json().catch(() => ({}));
        if (!resUni.ok || !dataUni.success) {
          toast.error(dataUni.message || 'No se pudieron desactivar los códigos');
          return;
        }
        toast.success(`${codigosSeleccionados.length} código(s) desactivados`);
      } else {
        toast.success('Presentación actualizada correctamente');
      }
      cancelEditPres();
      if (initialValues?.id) await fetchInventario(String(initialValues.id));
    } catch {
      toast.error('Error de red al actualizar la presentación');
    } finally {
      setGuardandoPres(false);
    }
  };

  const deleteExistente = async (id: string) => {
    const pres = existentes.find(e => e.id === id);
    if (pres && (pres.stock ?? 0) > 0) {
      toast.error(
        `No se puede eliminar: esta presentación tiene ${pres.stock} unidades con códigos generados`
      );
      return;
    }
    await fetch(`/api/products/presentations?id=${id}`, { method: 'DELETE' });
    if (initialValues?.id) await fetchInventario(String(initialValues.id));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    const data = new FormData();
    data.append('code', form.code);
    data.append('name', form.name);

    const finalCategoryId = initialValues?.category_id ?? categoryId;

    if (
      finalCategoryId !== undefined &&
      finalCategoryId !== null &&
      String(finalCategoryId) !== 'NaN'
    ) {
      data.append('category_id', String(finalCategoryId));
    } else {
      logger.warn('[useProductForm] Intento de submit sin category_id válido:', {
        initialCategoryId: initialValues?.category_id,
        propCategoryId: categoryId
      });
    }

    data.append('description', form.description);
    data.append('status', '1');
    if (presentaciones.length > 0) {
      data.append(
        'presentaciones',
        JSON.stringify(
          presentaciones.map(p => ({
            nombre: p.nombre.trim(),
            codigo_barras: p.codigo_barras.trim() || undefined,
            precio_compra: getNumericValue(p.precio_compra) || '0',
            cantidad: getNumericValue(p.stock) || '0'
          }))
        )
      );
      presentaciones.forEach((p, i) => {
        // Siempre se envían las claves para mantener el índice alineado con la fila.
        if (p.foto) data.append(`presentacion_foto_${i}`, p.foto);
        else data.append(`presentacion_foto_${i}`, '');
        data.append(`presentacion_fotourl_${i}`, p.fotoUrl.trim());
      });
    }
    if (initialValues?.id) data.append('id', String(initialValues.id));
    onSubmit(data);
  };

  return {
    form,
    errors,
    handleChange,
    handleSubmit,
    presentaciones,
    presentacionesError,
    addPresentacion,
    removePresentacion,
    updatePresentacion,
    setPresentacionFoto,
    setPresentacionFotoUrl,
    updateExistenteFoto,
    updateExistenteFotoUrl,
    existentes,
    unidadesTotal,
    unidadesCodigos,
    cargandoInventario,
    deleteExistente,
    editingPresId,
    editPresDraft,
    guardandoPres,
    startEditPres,
    cancelEditPres,
    changeEditPresDraft,
    saveEditPres,
    codigosSeleccionados,
    toggleCodigoSeleccionado,
    unidadesInactivas,
    stockExtra,
    changeStockExtra,
    agregarStock,
    agregandoStock,
    isEdit,
    refreshInventario: () => {
      if (initialValues?.id) fetchInventario(String(initialValues.id));
    }
  };
}
