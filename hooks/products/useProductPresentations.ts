'use client';

import { useCallback, useState } from 'react';
import type { PresentacionFormItem } from './productFormTypes';
import { emptyPresentacion, validarArchivoFoto } from './productFormFormat';

export function useProductPresentations() {
  const [presentaciones, setPresentaciones] = useState<PresentacionFormItem[]>([]);
  const [presentacionesError, setPresentacionesError] = useState<string>('');

  const revocarPreviews = (items: PresentacionFormItem[]) =>
    items.forEach(p => {
      if (p.fotoPreview.startsWith('blob:')) URL.revokeObjectURL(p.fotoPreview);
    });

  const resetPresentaciones = useCallback(() => {
    setPresentaciones(prev => {
      revocarPreviews(prev);
      return [];
    });
    setPresentacionesError('');
  }, []);

  const addPresentacion = () => setPresentaciones(prev => [...prev, emptyPresentacion()]);

  const removePresentacion = (index: number) =>
    setPresentaciones(prev => {
      const target = prev[index];
      if (target?.fotoPreview.startsWith('blob:')) URL.revokeObjectURL(target.fotoPreview);
      return prev.filter((_, i) => i !== index);
    });

  const updatePresentacion = (index: number, field: keyof PresentacionFormItem, value: string) => {
    const formatted =
      field === 'precio_compra' ||
      field === 'stock' ||
      field === 'stock_minimo' ||
      field === 'stock_maximo'
        ? value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        : value;
    setPresentaciones(prev => prev.map((p, i) => (i === index ? { ...p, [field]: formatted } : p)));
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
    const problema = validarArchivoFoto(file);
    if (problema === 'tipo') {
      setPresentacionesError('Solo se permiten imágenes JPG, PNG, GIF o WEBP');
      return;
    }
    if (problema === 'tamano') {
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

  return {
    presentaciones,
    presentacionesError,
    setPresentacionesError,
    resetPresentaciones,
    addPresentacion,
    removePresentacion,
    updatePresentacion,
    setPresentacionFoto,
    setPresentacionFotoUrl
  };
}
