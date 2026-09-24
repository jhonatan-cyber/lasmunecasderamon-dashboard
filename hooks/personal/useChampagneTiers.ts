'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface ChampagneTier {
  anfitrionas: number;
  precio: string;
  comision: string;
}

const formatMiles = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const DEFAULT_TIERS: Array<{ anfitrionas: number; precio: number; comision: number }> = [
  { anfitrionas: 1, precio: 120000, comision: 40000 },
  { anfitrionas: 2, precio: 120000, comision: 40000 },
  { anfitrionas: 3, precio: 160000, comision: 60000 },
  { anfitrionas: 4, precio: 180000, comision: 80000 },
  { anfitrionas: 5, precio: 200000, comision: 100000 }
];

interface UseChampagneTiersOptions {
  open: boolean;
  mostrarTiers: boolean;
  productId?: string | number | null;
}

export function useChampagneTiers({ open, mostrarTiers, productId }: UseChampagneTiersOptions) {
  const [tiers, setTiers] = useState<ChampagneTier[]>([]);
  const [cargandoTiers, setCargandoTiers] = useState(false);
  const [guardandoTiers, setGuardandoTiers] = useState(false);

  useEffect(() => {
    if (!mostrarTiers || !open || !productId) return;
    let cancelled = false;
    setCargandoTiers(true);
    fetch(`/api/products/${productId}/tiers`)
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (cancelled) return;
        const rows = data.success && Array.isArray(data.data) ? data.data : [];
        const base = rows.length > 0 ? rows : DEFAULT_TIERS;
        setTiers(
          base.map((t: any) => ({
            anfitrionas: Number(t.anfitrionas),
            precio: formatMiles(String(t.precio ?? '')),
            comision: formatMiles(String(t.comision ?? ''))
          }))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCargandoTiers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mostrarTiers, open, productId]);

  const guardarTiers = async () => {
    if (!productId) return;
    setGuardandoTiers(true);
    try {
      const res = await fetch(`/api/products/${productId}/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: tiers.map(t => ({
            anfitrionas: t.anfitrionas,
            precio: Number(String(t.precio).replace(/\./g, '')) || 0,
            comision: Number(String(t.comision).replace(/\./g, '')) || 0
          }))
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo guardar la tabla');
        return;
      }
      toast.success('Tabla de precios actualizada');
    } catch {
      toast.error('Error de red al guardar la tabla');
    } finally {
      setGuardandoTiers(false);
    }
  };

  const updateTierField = (index: number, field: 'precio' | 'comision', rawValue: string) => {
    const value = formatMiles(rawValue);
    setTiers(prev => prev.map((x, j) => (j === index ? { ...x, [field]: value } : x)));
  };

  return {
    tiers,
    cargandoTiers,
    guardandoTiers,
    guardarTiers,
    updateTierField,
    formatMiles
  };
}
