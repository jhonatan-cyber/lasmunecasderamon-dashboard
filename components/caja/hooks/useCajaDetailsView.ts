'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCajaDetails } from '@/components/caja/hooks/useCajaDetails';
import { useReenviarAvisoCierre } from '@/hooks/caja/useReenviarAvisoCierre';
import { useReabrirCierre } from '@/hooks/caja/useReabrirCierre';
import { generatePrintContent, exportToPDF } from '@/components/caja/cajaExportUtils';
import {
  buildCajaDetailsNumbers,
  buildCajaExportContext,
  getEstadoInfo,
  printHtml,
  retirosTotal,
  type CajaDetailsNumbers
} from '@/components/caja/details/cajaDetailsModel';

export type CajaDetailsTab = 'resumen' | 'ventas' | 'servicios' | 'retiros';

/**
 * Vista del modal de detalles de caja: además del estado de `useCajaDetails`
 * (datos, búsquedas y paginación), calcula los números derivados de la caja,
 * el estado (En curso/Cerrada), el contexto de exportación compartido por
 * Imprimir/Exportar PDF y el colapso de la barra de estadísticas.
 * El shell `CajaDetails.tsx` solo compone esto con los subcomponentes.
 */
export function useCajaDetailsView({ caja, open }: { caja: any; open: boolean }) {
  const details = useCajaDetails({ caja, open });
  const [statsOpen, setStatsOpen] = useState(true);
  const { reenviarAvisoCierre, reenviandoId } = useReenviarAvisoCierre();
  const { reabrirCierre, reabriendoId } = useReabrirCierre();
  const { user } = useAuth();
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  if (!caja) {
    return null;
  }

  const {
    ventas,
    retiros,
    servicios,
    cajaInfo,
    fetchCajaInfo,
    clientesSaldo,
    loadingClientesSaldo,
    loadingVentas,
    retirosLoading,
    loadingServicios,
    ventasTragosChicas,
    ventasChampagne,
    ventasBarras,
    ventasPorProducto,
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
    activeTab: activeTabRaw,
    setActiveTab: setRawTab,
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
  } = details;

  const cajaActual = details.cajaInfo ?? caja;
  // Cierre pedido y sin responder: la caja sigue abierta y el admin todavía no
  // autorizó. Se muestra en la cabecera del detalle para que nadie crea que el
  // turno quedó cerrado.
  const cierrePendiente = cajaActual?.cierre_pendiente
    ? {
        solicitadoPor: (cajaActual.cierre_solicitado_por as string | null) ?? null,
        solicitadoEn: (cajaActual.cierre_solicitado_en as string | null) ?? null,
        // Nadie contestó dentro de la ventana de recordatorios: ya se puede pedir de nuevo.
        estancado: cajaActual.cierre_estancado === true
      }
    : null;
  const fuentes = { ventasTragosChicas, ventasChampagne, ventasBarras };
  const numeros: CajaDetailsNumbers = buildCajaDetailsNumbers(caja, cajaActual, fuentes, retiros);
  const estadoInfo = getEstadoInfo(caja.estado);
  const activeTab = activeTabRaw as CajaDetailsTab;
  // `useCajaDetails` guarda el tab como string; aquí lo exponemos con su unión.
  const setActiveTab = (tab: CajaDetailsTab) => setRawTab(tab);

  const getExportContext = () =>
    buildCajaExportContext({
      caja,
      activeTab: activeTabRaw,
      estadoInfo,
      filteredVentas,
      filteredServicios,
      retiros,
      fuentes,
      numeros
    });

  const handlePrint = () => printHtml(generatePrintContent(getExportContext()));

  // Reenvío del aviso del cierre pendiente desde el detalle del turno: el mismo botón que
  // en la tarjeta, para no obligar a cerrar el modal y buscarla en la lista.
  const handleReenviarAviso = () => reenviarAvisoCierre(caja.id_caja);
  const reenviandoAviso = reenviandoId === caja.id_caja;

  // Segundo pedido del cierre (el administrador no respondió): crea una solicitud nueva y
  // recarga la caja para que el aviso de "sin respuesta" desaparezca del detalle.
  const handleReabrirCierre = async () => {
    const res = await reabrirCierre(caja.id_caja);
    if (res?.reabierto) await fetchCajaInfo();
  };
  const reabriendoCierre = reabriendoId === caja.id_caja;

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    try {
      const response = await fetch(`/api/cashregister/${caja.id_caja}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'No se pudo enviar');
      toast.success('Reporte PDF enviado al WhatsApp del administrador');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al enviar el detalle por WhatsApp'
      );
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const tabCounts = {
    ventas: ventas.length,
    servicios: servicios.length,
    retiros: retiros.length
  };

  return {
    // Datos y fetching (de `useCajaDetails`)
    ventas,
    retiros,
    servicios,
    cajaInfo,
    clientesSaldo,
    loadingClientesSaldo,
    loadingVentas,
    retirosLoading,
    loadingServicios,
    fuentes,
    ventasPorProducto,
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
    totalPages,
    // Vista
    cajaActual,
    cierrePendiente,
    handleReenviarAviso,
    reenviandoAviso,
    handleReabrirCierre,
    reabriendoCierre,
    canSendWhatsApp: user?.role?.toLowerCase() === 'administrador',
    handleSendWhatsApp,
    sendingWhatsApp,
    cajaId: caja.id_caja,
    numeros,
    estadoInfo,
    retirosSum: retirosTotal(retiros),
    tabCounts,
    statsOpen,
    setStatsOpen,
    getExportContext,
    handlePrint,
    exportPdf: () => exportToPDF(getExportContext())
  };
}

export type CajaDetailsView = ReturnType<typeof useCajaDetailsView>;
