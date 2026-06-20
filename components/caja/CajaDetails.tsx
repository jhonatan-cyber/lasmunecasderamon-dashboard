'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import logger from '@/lib/utils/logger';

import { X, Calendar, User, Printer, Download } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUserImage } from '@/contexts/UserImageContext';
import {
  CajaPaymentSummary,
  CajaSummaryMetrics,
  CajaChartsSection,
  CajaFinancialDetails,
  CajaVentasTable,
  CajaServiciosTable,
  CajaRetirosList
} from '@/components/caja/details';
import { generatePrintContent, getPDFData } from '@/components/caja/cajaExportUtils';
import {
  formatCurrencyNoDecimals,
  formatCurrencyCLP,
  formatFechaLarga,
  formatSoloHora
} from '@/lib/utils/formatters';
import type { Caja } from '@/types/caja';

const printStyles = `
  @media print {
    .print\\:overflow-visible {
      overflow: visible !important;
    }
    .print\\:max-h-none {
      max-height: none !important;
    }
    .print\\:block-all {
      display: block !important;
    }
    .print\\:show-all .TableBody {
      display: table-row-group !important;
    }
    .print\\:show-all .TableRow {
      display: table-row !important;
    }
    .print\\:hidden {
      display: none !important;
    }
  }
`;

const getDiaSemana = (fecha: string | Date): string => {
  const date = new Date(fecha);
  const dias = ['Domingo', 'Lunes', 'Martes', 'MiÃ©rcoles', 'Jueves', 'Viernes', 'SÃ¡bado'];
  return dias[date.getDay()];
};

interface CajaDetailsProps {
  caja: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-8 w-full' />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-12 w-full' />
      ))}
    </div>
  );
}

export default function CajaDetails({ caja, open, onOpenChange }: CajaDetailsProps) {
  const cajaId = caja?.id_caja;
  const { imageVersion } = useUserImage();

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

  const [ventas, setVentas] = useState<any[]>([]);
  const [retiros, setRetiros] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);

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

  useEffect(() => {
    if (open && cajaId) {
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

  if (!caja) return null;

  const fetchRetiros = async () => {
    setRetirosLoading(true);
    try {
      const resp = await fetch(`/api/cashregister/retiros?id_caja=${caja.id_caja}`);
      const data = await resp.json();
      if (data.success) setRetiros(data.data || []);
    } catch (error) {
      logger.captureException(error, { context: 'CajaDetails:fetchRetiros' });
    } finally {
      setRetirosLoading(false);
    }
  };

  const fetchResumenFinanciero = async () => {
    setLoadingTragosChicas(true);
    setLoadingChampagne(true);
    setLoadingBarras(true);
    try {
      const [resChicas, resChampagne, resBarras] = await Promise.all([
        fetch(`/api/caja/ventas-tragos-chicas?caja_id=${caja.id_caja}`),
        fetch(`/api/caja/ventas-champagne?caja_id=${caja.id_caja}`),
        fetch(`/api/caja/ventas-barras?caja_id=${caja.id_caja}`)
      ]);
      const dataChicas = await resChicas.json();
      const dataChampagne = await resChampagne.json();
      const dataBarras = await resBarras.json();
      setVentasTragosChicas(dataChicas || { total_venta: 0, propinas: 0 });
      setVentasChampagne(dataChampagne || { total_venta: 0, propinas: 0 });
      setVentasBarras(dataBarras || { total_venta: 0, propinas: 0 });
    } catch (error) {
      logger.captureException(error, { context: 'CajaDetails:fetchResumenFinanciero' });
    } finally {
      setLoadingTragosChicas(false);
      setLoadingChampagne(false);
      setLoadingBarras(false);
    }
  };

  const fetchVentas = async () => {
    setLoadingVentas(true);
    try {
      const resp = await fetch(`/api/ventas?caja_id=${caja.id_caja}`);
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
      if (ventasData.length > 0) {
        logger.info('Estructura de venta:', ventasData[0]);
      }
    } catch (error) {
      logger.captureException(error, { context: 'CajaDetails:fetchVentas' });
      setVentas([]);
    } finally {
      setLoadingVentas(false);
    }
  };

  const fetchServicios = async () => {
    setLoadingServicios(true);
    try {
      const resp = await fetch(`/api/servicios?caja_id=${caja.id_caja}`);
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
      logger.info('Servicios cargados:', serviciosData.length);
    } catch (error) {
      logger.captureException(error, { context: 'CajaDetails:fetchServicios' });
    } finally {
      setLoadingServicios(false);
    }
  };

  const totalPropinas =
    Number(ventasTragosChicas?.propinas || 0) +
    Number(ventasChampagne?.propinas || 0) +
    Number(ventasBarras?.propinas || 0);
  const totalVentas =
    Number(ventasTragosChicas?.total_venta || 0) +
    Number(ventasChampagne?.total_venta || 0) +
    Number(ventasBarras?.total_venta || 0);
  const totalIngresos = totalVentas + Number(caja?.servicios || 0);
  const ingresosReales =
    Number(caja?.efectivo || 0) + Number(caja?.tarjeta || 0) + Number(caja?.transferencia || 0);
  const efectivoCaja = Number(caja?.efectivo || 0);
  const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
  const tarjetaCaja = Number(caja?.tarjeta || 0);
  const transferenciaCaja = Number(caja?.transferencia || 0);
  const prepagoCargado = Number(caja?.prepago_cargado || 0);
  const prepagoConsumido = Number(caja?.prepago_consumido || 0);
  const prepagoPendienteClientes = Number(caja?.prepago_pendiente_clientes || 0);
  const totalEgresos =
    Number(caja?.devoluciones || 0) +
    Number(caja?.anticipo || 0) +
    retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0);
  const efectivoNeto = efectivoTotal - totalEgresos;
  const totalMetodosPago = efectivoTotal + tarjetaCaja + transferenciaCaja;
  const totalReal = efectivoNeto + tarjetaCaja + transferenciaCaja;
  const distribucionDinero = [
    { concepto: 'Efectivo neto', monto: efectivoNeto },
    { concepto: 'Tarjeta', monto: tarjetaCaja },
    { concepto: 'Transferencia', monto: transferenciaCaja },
    { concepto: 'Subtotal antes de egresos', monto: totalMetodosPago }
  ];

  const getPaginatedItems = (items: any[], page: number) => {
    const safeItems = Array.isArray(items) ? items : [];
    const startIndex = (page - 1) * itemsLimit;
    return safeItems.slice(startIndex, startIndex + itemsLimit);
  };

  const totalPages = (items: any[]) => {
    const safeItems = Array.isArray(items) ? items : [];
    return Math.ceil(safeItems.length / itemsLimit);
  };

  const isLoadingSummary = loadingTragosChicas || loadingChampagne || loadingBarras;

  const estadoInfo =
    caja.estado === 1
      ? { label: 'En curso', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
      : { label: 'Cerrada', color: 'bg-slate-500/10 text-slate-600 border-slate-200' };

  const getCajaExportContext = () => ({
    caja,
    activeTab,
    estadoInfo,
    filteredVentas,
    filteredServicios,
    retiros,
    ventasTragosChicas,
    ventasChampagne,
    ventasBarras,
    prepagoCargado,
    prepagoConsumido,
    ingresosReales,
    efectivoNeto,
    tarjetaCaja,
    transferenciaCaja,
    totalMetodosPago,
    totalReal,
    distribucionDinero
  });

  const handlePrint = () => {
    const printContent = generatePrintContent(getCajaExportContext());
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const formatFechaCorta = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const html2canvas = (await import('html2canvas')).default;

      const doc = new jsPDF();
      const exportContext = getCajaExportContext();

      const logoUrl = '/img/system/logo2.png';
      const logoResponse = await fetch(logoUrl);
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });

      doc.addImage(logoBase64, 'PNG', 14, 8, 40, 20);
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('REPORTE DE CAJA', 160, 18, { align: 'right' });
      doc.setDrawColor(41, 41, 41);
      doc.setLineWidth(0.5);
      doc.line(14, 32, 196, 32);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Fecha: ${getDiaSemana(exportContext.caja.fecha_apertura)}, ${formatFechaLarga(exportContext.caja.fecha_apertura)}`,
        14,
        40
      );
      doc.text(`Cajero: ${exportContext.caja.cajero_nombre}`, 14, 46);
      doc.text(
        `Pestaña: ${exportContext.activeTab.charAt(0).toUpperCase() + exportContext.activeTab.slice(1)}`,
        120,
        40
      );
      doc.text(`Estado: ${exportContext.estadoInfo.label}`, 120, 46);

      if (exportContext.activeTab === 'resumen') {
        const chartBarsElement = document.getElementById('chart-bars');
        const chartPieElement = document.getElementById('chart-pie');

        if (chartBarsElement) {
          const barsCanvas = await html2canvas(chartBarsElement, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
          });
          const barsImg = barsCanvas.toDataURL('image/png');
          doc.addImage(barsImg, 'PNG', 14, 54, 90, 50);
        }

        if (chartPieElement) {
          const pieCanvas = await html2canvas(chartPieElement, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
          });
          const pieImg = pieCanvas.toDataURL('image/png');
          doc.addImage(pieImg, 'PNG', 108, 54, 90, 50);
        }
      }

      const startY = exportContext.activeTab === 'resumen' ? 110 : 62;
      let mainTableStartY = startY;

      if (exportContext.activeTab === 'resumen') {
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text('Distribucion del dinero', 14, startY);
        const cardsBottomY = drawResumenDistribucionCards(doc, startY + 4);
        mainTableStartY = cardsBottomY + 10;
      }

      const tableData = getPDFData(exportContext);
      const { headers, body } = tableData;

      autoTable(doc, {
        head: [headers],
        body,
        startY: mainTableStartY,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [41, 41, 41],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        },
        columnStyles: {
          0: { cellWidth: 12 },
          7: { halign: 'right' },
          8: { halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      if (exportContext.activeTab === 'ventas' && exportContext.filteredVentas.length > 0) {
        const lastTable = (doc as any).lastAutoTable;
        const finalY = lastTable?.finalY || 100;
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        const totalVentas = exportContext.filteredVentas.reduce(
          (sum, v) => sum + (v.total || 0),
          0
        );
        const totalPropinas = exportContext.filteredVentas.reduce(
          (sum, v) => sum + (v.propina || 0),
          0
        );
        doc.text(`Total Ventas: $${totalVentas.toLocaleString('es-CL')}`, 14, finalY + 12);
        doc.text(`Total Propinas: $${totalPropinas.toLocaleString('es-CL')}`, 14, finalY + 19);
      }

      if (exportContext.activeTab === 'servicios' && exportContext.filteredServicios.length > 0) {
        const lastTable = (doc as any).lastAutoTable;
        const finalY = lastTable?.finalY || 100;
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        const totalServicios = exportContext.filteredServicios.reduce(
          (sum, s) => sum + (s.total || 0),
          0
        );
        doc.text(`Total Servicios: $${totalServicios.toLocaleString('es-CL')}`, 14, finalY + 12);
      }

      if (exportContext.activeTab !== 'resumen') {
        const lastTable = (doc as any).lastAutoTable;
        const distributionStartY = Math.min((lastTable?.finalY || startY) + 18, 250);

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text('Distribución del dinero', 14, distributionStartY);

        autoTable(doc, {
          head: [['Concepto', 'Monto']],
          body: exportContext.distribucionDinero.map(row => [row.concepto, row.monto]),
          startY: distributionStartY + 4,
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [41, 41, 41],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            1: { halign: 'right' }
          },
          margin: { left: 14, right: 14 }
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount} - Las Muñecas de Ramón - Generado: ${formatFechaLarga(new Date().toISOString())}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      doc.save(
        `caja-${exportContext.activeTab}-${formatFechaCorta(exportContext.caja.fecha_apertura)}.pdf`
      );
    } catch (error) {
      logger.captureException(error, { context: 'CajaDetails:exportToPDF' });
    }
  };

  const drawResumenDistribucionCards = (doc: any, startY: number) => {
    const cards = [
      {
        title: 'EFECTIVO NETO',
        value: formatCurrencyNoDecimals(efectivoNeto),
        bg: [30, 41, 59],
        border: [51, 65, 85],
        label: [226, 232, 240],
        valueColor: [255, 255, 255]
      },
      {
        title: 'TARJETA',
        value: formatCurrencyNoDecimals(tarjetaCaja),
        bg: [30, 41, 59],
        border: [51, 65, 85],
        label: [226, 232, 240],
        valueColor: [255, 255, 255]
      },
      {
        title: 'TRANSFERENCIA',
        value: formatCurrencyNoDecimals(transferenciaCaja),
        bg: [30, 41, 59],
        border: [51, 65, 85],
        label: [226, 232, 240],
        valueColor: [255, 255, 255]
      },
      {
        title: 'TOTAL MEDIOS DE PAGO',
        value: formatCurrencyNoDecimals(totalMetodosPago),
        bg: [36, 28, 68],
        border: [124, 58, 237],
        label: [167, 139, 250],
        valueColor: [255, 255, 255]
      }
    ];

    const cardWidth = 43;
    const cardHeight = 18;
    const gap = 3;
    const startX = 14;

    cards.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
      doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
      doc.roundedRect(x, startY, cardWidth, cardHeight, 3, 3, 'FD');

      doc.setFontSize(7);
      doc.setTextColor(card.label[0], card.label[1], card.label[2]);
      doc.text(card.title, x + 3, startY + 5.5);

      doc.setFontSize(12);
      doc.setTextColor(card.valueColor[0], card.valueColor[1], card.valueColor[2]);
      doc.text(card.value, x + 3, startY + 12.8);
    });

    return startY + cardHeight;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-7xl max-h-[95vh] flex flex-col p-0 w-[95vw] overflow-hidden rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900 print:max-w-full print:w-full print:h-auto print:overflow-visible print:max-h-none'>
          <DialogHeader className='p-6 pb-2 border-b flex-shrink-0 bg-white dark:bg-slate-900 print:hidden'>
            <div className='flex items-center justify-between'>
              <DialogTitle className='text-xl font-bold text-slate-900 dark:text-white flex items-center gap-4'>
                <Calendar className='w-5 h-5 text-gray-500' />
                Detalles de Caja - {getDiaSemana(caja.fecha_apertura)}{' '}
                <Badge
                  variant='secondary'
                  className={`${estadoInfo.color} rounded-xl px-4 py-1 text-xs font-black uppercase tracking-widest border shadow-sm`}
                >
                  {estadoInfo.label}
                </Badge>
              </DialogTitle>
              <div className='flex items-center gap-3 ml-auto'>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full gap-2'
                  onClick={handlePrint}
                >
                  <Printer className='w-4 h-4' />
                  <span className='hidden sm:inline'>Imprimir</span>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full gap-2'
                  onClick={exportToPDF}
                >
                  <Download className='w-4 h-4' />
                  <span className='hidden sm:inline'>Exportar PDF</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {}
          <div className='sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-6 py-4 print:hidden'>
            <div className='space-y-4'>
              <CajaPaymentSummary
                isLoading={isLoadingSummary}
                efectivoNeto={efectivoNeto}
                tarjetaCaja={tarjetaCaja}
                transferenciaCaja={transferenciaCaja}
              />

              <CajaSummaryMetrics
                isLoading={isLoadingSummary}
                totalMetodosPago={totalMetodosPago}
                totalEgresos={totalEgresos}
                totalReal={totalReal}
              />
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex-1 flex flex-col min-h-0'
          >
            <TabsList className='mx-6 mt-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl print:hidden'>
              <TabsTrigger
                value='resumen'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Resumen
              </TabsTrigger>
              <TabsTrigger
                value='ventas'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Ventas ({ventas.length})
              </TabsTrigger>
              <TabsTrigger
                value='servicios'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Servicios ({servicios.length})
              </TabsTrigger>
              <TabsTrigger
                value='retiros'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Retiros ({retiros.length})
              </TabsTrigger>
            </TabsList>

            <div className='flex-1 overflow-y-auto custom-scrollbar p-6 print:overflow-visible print:max-h-none'>
              {}
              <TabsContent value='resumen' className='mt-0 space-y-8'>
                {}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2'>
                  <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700'>
                    <div className='mb-3'>
                      <p className='text-xs font-bold text-gray-500 uppercase mb-2'>Abierta por</p>
                      <div className='flex items-center gap-2'>
                        <Avatar className='h-8 w-8'>
                          {caja.cajero_foto && caja.cajero_foto !== '' ? (
                            <Image
                              src={`/img/users/${caja.cajero_foto}?v=${imageVersion}`}
                              alt={caja.cajero_nombre || 'Usuario'}
                              width={32}
                              height={32}
                              className='w-full h-full object-cover rounded-full'
                            />
                          ) : (
                            <AvatarImage
                              src='/img/users/default.png'
                              alt={caja.cajero_nombre || 'Usuario'}
                            />
                          )}
                          <AvatarFallback className='bg-emerald-100 text-emerald-700 font-bold text-xs'>
                            {caja.cajero_nombre?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className='font-bold text-gray-900 dark:text-white'>
                          {caja.cajero_nombre || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {formatFechaLarga(caja.fecha_apertura)} â€¢{' '}
                      {formatSoloHora(caja.fecha_apertura)}
                    </p>
                  </div>
                  {caja.fecha_cierre && (
                    <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700'>
                      <div className='mb-3'>
                        <p className='text-xs font-bold text-gray-500 uppercase mb-2'>
                          Cerrada por
                        </p>
                        <div className='flex items-center gap-2'>
                          <Avatar className='h-8 w-8'>
                            {caja.cajero_cierre_foto && caja.cajero_cierre_foto !== '' ? (
                              <Image
                                src={`/img/users/${caja.cajero_cierre_foto}?v=${imageVersion}`}
                                alt={caja.cajero_cierre_nombre || 'Usuario'}
                                width={32}
                                height={32}
                                className='w-full h-full object-cover rounded-full'
                              />
                            ) : (
                              <AvatarImage
                                src='/img/users/default.png'
                                alt={caja.cajero_cierre_nombre || 'Usuario'}
                              />
                            )}
                            <AvatarFallback className='bg-slate-100 text-slate-700 font-bold text-xs'>
                              {caja.cajero_cierre_nombre?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className='font-bold text-gray-900 dark:text-white'>
                            {caja.cajero_cierre_nombre || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {formatFechaLarga(caja.fecha_cierre)} â€¢{' '}
                        {formatSoloHora(caja.fecha_cierre)}
                      </p>
                    </div>
                  )}
                </div>

                <CajaChartsSection
                  isLoading={isLoadingSummary}
                  totalIngresos={totalIngresos}
                  totalEgresos={totalEgresos}
                  ventasTragos={ventasTragosChicas?.total_venta || 0}
                  ventasChampagne={ventasChampagne?.total_venta || 0}
                  ventasBarras={ventasBarras?.total_venta || 0}
                  servicios={caja?.servicios || 0}
                />

                <CajaFinancialDetails
                  isLoading={isLoadingSummary}
                  efectivoNeto={efectivoNeto}
                  ventasTragos={ventasTragosChicas?.total_venta || 0}
                  ventasChampagne={ventasChampagne?.total_venta || 0}
                  ventasBarras={ventasBarras?.total_venta || 0}
                  servicios={caja?.servicios || 0}
                  prepagoCargado={prepagoCargado}
                  prepagoConsumido={prepagoConsumido}
                  ingresosReales={ingresosReales}
                  devoluciones={Number(caja?.devoluciones || 0)}
                  anticipos={Number(caja?.anticipo || 0)}
                  retirosTotal={retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0)}
                  totalReal={totalReal}
                  prepagoPendienteClientes={prepagoPendienteClientes}
                />
              </TabsContent>

              {}
              <TabsContent value='ventas' className='mt-0 space-y-4'>
                <CajaVentasTable
                  loading={loadingVentas}
                  ventas={ventas}
                  filteredVentas={filteredVentas}
                  search={searchVentas}
                  onSearchChange={setSearchVentas}
                  getRows={getVentasForDisplay}
                  page={ventasPage}
                  totalPages={totalPages(filteredVentas)}
                  onPageChange={setVentasPage}
                  onRetry={fetchVentas}
                />
              </TabsContent>

              {}
              <TabsContent value='servicios' className='mt-0 space-y-4'>
                <CajaServiciosTable
                  loading={loadingServicios}
                  servicios={servicios}
                  filteredServicios={filteredServicios}
                  search={searchServicios}
                  onSearchChange={setSearchServicios}
                  getRows={getServiciosForDisplay}
                  page={serviciosPage}
                  totalPages={totalPages(filteredServicios)}
                  onPageChange={setServiciosPage}
                />
              </TabsContent>

              {}
              <TabsContent value='retiros' className='mt-0 space-y-4'>
                <CajaRetirosList
                  loading={retirosLoading}
                  retiros={retiros}
                  getRows={getRetirosForDisplay}
                  page={retirosPage}
                  totalPages={totalPages(retiros)}
                  onPageChange={setRetirosPage}
                />
              </TabsContent>
            </div>
          </Tabs>

          {}
          <div className='flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center px-6 rounded-b-2xl print:hidden'>
            <Button
              variant='outline'
              size='sm'
              className='rounded-full px-8 bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200 font-bold gap-2'
              onClick={() => onOpenChange(false)}
            >
              <X className='w-4 h-4' />
              Cerrar Detalles
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
