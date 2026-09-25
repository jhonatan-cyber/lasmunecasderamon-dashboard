'use client';

import { useState, useEffect, useMemo } from 'react';
import logger from '@/lib/utils/logger';

interface UseCajaDetailsParams {
  caja: any;
  open: boolean;
}

export function useCajaDetails({ caja, open }: UseCajaDetailsParams) {
  const cajaId = caja?.id_caja;

  const [ventas, setVentas] = useState<any[]>([]);
  const [retiros, setRetiros] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [cajaInfo, setCajaInfo] = useState<any>(null);
  const [clientesSaldo, setClientesSaldo] = useState<any[]>([]);
  const [loadingClientesSaldo, setLoadingClientesSaldo] = useState(false);

  const [loadingVentas, setLoadingVentas] = useState(false);
  const [retirosLoading, setRetirosLoading] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  const [ventasTragosChicas, setVentasTragosChicas] = useState<any>({
    total_venta: 0,
    propinas: 0
  });
  const [ventasChampagne, setVentasChampagne] = useState<any>({ total_venta: 0, propinas: 0 });
  const [ventasBarras, setVentasBarras] = useState<any>({ total_venta: 0, propinas: 0 });
  const [loadingTragosChicas, setLoadingTragosChicas] = useState(false);
  const [loadingChampagne, setLoadingChampagne] = useState(false);
  const [loadingBarras, setLoadingBarras] = useState(false);

  const [searchVentas, setSearchVentas] = useState('');
  const [searchServicios, setSearchServicios] = useState('');

  const [ventasPage, setVentasPage] = useState(1);
  const [serviciosPage, setServiciosPage] = useState(1);
  const [retirosPage, setRetirosPage] = useState(1);
  const itemsLimit = 10;

  const [activeTab, setActiveTab] = useState('resumen');

  const fetchCajaInfo = async () => {
    if (!cajaId) return;
    try {
      const resp = await fetch(`/api/cashregister/${cajaId}`);
      const data = await resp.json();
      if (data.success && data.data) setCajaInfo(data.data);
    } catch (error) {
      logger.captureException(error, { context: 'useCajaDetails:fetchCajaInfo' });
    }
  };

  const fetchClientesSaldo = async () => {
    setLoadingClientesSaldo(true);
    try {
      const resp = await fetch('/api/clients?con_saldo=1&limit=200');
      const data = await resp.json();
      if (data.success) setClientesSaldo(data.data || []);
    } catch (error) {
      logger.captureException(error, { context: 'useCajaDetails:fetchClientesSaldo' });
    } finally {
      setLoadingClientesSaldo(false);
    }
  };

  const fetchRetiros = async () => {
    if (!cajaId) return;
    setRetirosLoading(true);
    try {
      const resp = await fetch(`/api/cashregister/retiros?id_caja=${cajaId}`);
      const data = await resp.json();
      if (data.success) setRetiros(data.data || []);
    } catch (error) {
      logger.captureException(error, { context: 'useCajaDetails:fetchRetiros' });
    } finally {
      setRetirosLoading(false);
    }
  };

  const fetchResumenFinanciero = async () => {
    if (!cajaId) return;
    setLoadingTragosChicas(true);
    setLoadingChampagne(true);
    setLoadingBarras(true);
    try {
      const [resChicas, resChampagne, resBarras] = await Promise.all([
        fetch(`/api/caja/ventas-tragos-chicas?caja_id=${cajaId}`),
        fetch(`/api/caja/ventas-champagne?caja_id=${cajaId}`),
        fetch(`/api/caja/ventas-barras?caja_id=${cajaId}`)
      ]);
      const dataChicas = await resChicas.json();
      const dataChampagne = await resChampagne.json();
      const dataBarras = await resBarras.json();
      setVentasTragosChicas(dataChicas || { total_venta: 0, propinas: 0 });
      setVentasChampagne(dataChampagne || { total_venta: 0, propinas: 0 });
      setVentasBarras(dataBarras || { total_venta: 0, propinas: 0 });
    } catch (error) {
      logger.captureException(error, { context: 'useCajaDetails:fetchResumenFinanciero' });
    } finally {
      setLoadingTragosChicas(false);
      setLoadingChampagne(false);
      setLoadingBarras(false);
    }
  };

  const fetchVentas = async () => {
    if (!cajaId) return;
    setLoadingVentas(true);
    try {
      const resp = await fetch(`/api/sales?caja_id=${cajaId}`);
      const data = await resp.json().catch(() => ({ success: false }));
      logger.info('API Ventas response:', data);

      let ventasData = [];
      if (data.success) {
        if (Array.isArray(data.data)) {
          ventasData = data.data;
        } else if (data.data?.data && Array.isArray(data.data.data)) {
          ventasData = data.data.data;
        } else if (data.data?.data && Array.isArray(data.data.data.data)) {
          ventasData = data.data.data.data;
        }
      } else if (Array.isArray(data)) {
        ventasData = data;
      }

      setVentas(ventasData);
      logger.info('Ventas cargadas:', ventasData.length);
    } catch (error) {
      logger.captureException(error, { context: 'useCajaDetails:fetchVentas' });
      setVentas([]);
    } finally {
      setLoadingVentas(false);
    }
  };

  const fetchServicios = async () => {
    if (!cajaId) return;
    setLoadingServicios(true);
    try {
      const resp = await fetch(`/api/servicios?caja_id=${cajaId}`);
      const data = await resp.json().catch(() => ({ success: false }));
      logger.info('API Servicios response:', data);

      let serviciosData = [];
      if (data.success) {
        if (Array.isArray(data.data)) {
          serviciosData = data.data;
        } else if (data.data?.data && Array.isArray(data.data.data)) {
          serviciosData = data.data.data;
        } else if (data.data?.data?.data && Array.isArray(data.data.data.data)) {
          serviciosData = data.data.data.data;
        }
      } else if (Array.isArray(data)) {
        serviciosData = data;
      }

      setServicios(serviciosData);
      logger.info('Servicios cargadas:', serviciosData.length);
    } catch (error) {
      logger.captureException(error, { context: 'useCajaDetails:fetchServicios' });
    } finally {
      setLoadingServicios(false);
    }
  };

  useEffect(() => {
    if (open && cajaId) {
      fetchCajaInfo();
      fetchClientesSaldo();
      fetchRetiros();
      fetchVentas();
      fetchServicios();
      fetchResumenFinanciero();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cajaId]);

  const filteredVentas = useMemo(() => {
    if (!searchVentas.trim()) return ventas;
    return ventas.filter(
      (v: any) =>
        (v.cliente_nombre || '').toLowerCase().includes(searchVentas.toLowerCase()) ||
        (v.habitacion_nombre || '').toLowerCase().includes(searchVentas.toLowerCase()) ||
        (v.categoria || '').toLowerCase().includes(searchVentas.toLowerCase())
    );
  }, [ventas, searchVentas]);

  const filteredServicios = useMemo(() => {
    if (!searchServicios.trim()) return servicios;
    return servicios.filter(
      (s: any) =>
        (s.cliente_nombre || '').toLowerCase().includes(searchServicios.toLowerCase()) ||
        (s.anfitrionas_nombres || '').toLowerCase().includes(searchServicios.toLowerCase()) ||
        (s.habitacion_nombre || '').toLowerCase().includes(searchServicios.toLowerCase())
    );
  }, [servicios, searchServicios]);

  const getPaginatedItems = (items: any[], page: number) => {
    const safeItems = Array.isArray(items) ? items : [];
    const startIndex = (page - 1) * itemsLimit;
    return safeItems.slice(startIndex, startIndex + itemsLimit);
  };

  const isPrinting = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('print').matches;
    }
    return false;
  };

  const getVentasForDisplay = () => {
    return isPrinting() ? filteredVentas : getPaginatedItems(filteredVentas, ventasPage);
  };

  const getServiciosForDisplay = () => {
    return isPrinting() ? filteredServicios : getPaginatedItems(filteredServicios, serviciosPage);
  };

  const getRetirosForDisplay = () => {
    return isPrinting() ? retiros : getPaginatedItems(retiros, retirosPage);
  };

  const isLoadingSummary = loadingTragosChicas || loadingChampagne || loadingBarras;

  const totalPages = (items: any[]) => {
    const safeItems = Array.isArray(items) ? items : [];
    return Math.ceil(safeItems.length / itemsLimit);
  };

  return {
    ventas,
    retiros,
    servicios,
    cajaInfo,
    clientesSaldo,
    loadingClientesSaldo,
    fetchClientesSaldo,
    loadingVentas,
    retirosLoading,
    loadingServicios,
    ventasTragosChicas,
    ventasChampagne,
    ventasBarras,
    loadingTragosChicas,
    loadingChampagne,
    loadingBarras,
    searchVentas,
    setSearchVentas,
    searchServicios,
    setSearchServicios,
    ventasPage,
    setVentasPage,
    serviciosPage,
    setServiciosPage,
    retirosPage,
    setRetirosPage,
    itemsLimit,
    activeTab,
    setActiveTab,
    filteredVentas,
    filteredServicios,
    fetchRetiros,
    fetchResumenFinanciero,
    fetchVentas,
    fetchServicios,
    isLoadingSummary,
    getVentasForDisplay,
    getServiciosForDisplay,
    getRetirosForDisplay,
    totalPages
  };
}
