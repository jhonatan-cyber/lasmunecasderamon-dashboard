'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownCircle,
  ShoppingCart,
  Home,
  Calendar,
  User,
  CreditCard,
  Printer,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { useUserImage } from '@/contexts/UserImageContext';
import {
  formatCurrencyNoDecimals,
  formatCurrencyCLP,
  formatFechaLarga,
  formatSoloHora
} from '@/lib/utils/formatters';
import type { Caja } from '@/types/caja';

// Colores para gráficos
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

// Estilos para impresión
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

// Función para obtener el día de la semana en español
const getDiaSemana = (fecha: string | Date): string => {
  const date = new Date(fecha);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[date.getDay()];
};

interface CajaDetailsProps {
  caja: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Skeleton para tarjetas de resumen
function SummaryCardSkeleton() {
  return (
    <div className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700'>
      <div className='flex items-center gap-4'>
        <Skeleton className='w-12 h-12 rounded-xl' />
        <div className='flex-1'>
          <Skeleton className='h-3 w-24 mb-2' />
          <Skeleton className='h-6 w-32' />
        </div>
      </div>
    </div>
  );
}

// Skeleton para tabla
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

  // Función para determinar si estamos en modo impresión
  const isPrinting = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('print').matches;
    }
    return false;
  };

  // Obtener todos los items para impresión o paginados para vista normal
  const getVentasForDisplay = () => {
    return isPrinting() ? filteredVentas : getPaginatedItems(filteredVentas, ventasPage);
  };

  const getServiciosForDisplay = () => {
    return isPrinting() ? filteredServicios : getPaginatedItems(filteredServicios, serviciosPage);
  };

  const getRetirosForDisplay = () => {
    return isPrinting() ? retiros : getPaginatedItems(retiros, retirosPage);
  };

  // Estados para ventas, retiros y servicios
  const [ventas, setVentas] = useState<any[]>([]);
  const [retiros, setRetiros] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);

  // Estados de carga
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [retirosLoading, setRetirosLoading] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // Estados para ventas por categoría
  const [ventasTragosChicas, setVentasTragosChicas] = useState<any>({
    total_venta: 0,
    propinas: 0
  });
  const [ventasChampagne, setVentasChampagne] = useState<any>({ total_venta: 0, propinas: 0 });
  const [ventasBarras, setVentasBarras] = useState<any>({ total_venta: 0, propinas: 0 });
  const [loadingTragosChicas, setLoadingTragosChicas] = useState(false);
  const [loadingChampagne, setLoadingChampagne] = useState(false);
  const [loadingBarras, setLoadingBarras] = useState(false);

  // Estados para filtros
  const [searchVentas, setSearchVentas] = useState('');
  const [searchServicios, setSearchServicios] = useState('');

  // Paginación
  const [ventasPage, setVentasPage] = useState(1);
  const [serviciosPage, setServiciosPage] = useState(1);
  const [retirosPage, setRetirosPage] = useState(1);
  const itemsLimit = 10;

  // Tab activa
  const [activeTab, setActiveTab] = useState('resumen');

  // Efecto para cargar datos cuando el modal abre
  useEffect(() => {
    if (open && cajaId) {
      fetchRetiros();
      fetchVentas();
      fetchServicios();
      fetchResumenFinanciero();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cajaId]);

  // Filtrar ventas
  const filteredVentas = useMemo(() => {
    if (!searchVentas.trim()) return ventas;
    return ventas.filter(
      (v: any) =>
        (v.cliente_nombre || '').toLowerCase().includes(searchVentas.toLowerCase()) ||
        (v.habitacion_nombre || '').toLowerCase().includes(searchVentas.toLowerCase()) ||
        (v.categoria || '').toLowerCase().includes(searchVentas.toLowerCase())
    );
  }, [ventas, searchVentas]);

  // Filtrar servicios
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
      console.error('Error cargando retiros:', error);
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
      console.error('Error fetching financial summary:', error);
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
      console.log('API Ventas response:', data);

      // Manejar diferentes estructuras de respuesta
      let ventasData = [];
      if (data.success) {
        if (Array.isArray(data.data)) {
          ventasData = data.data;
        } else if (data.data?.data && Array.isArray(data.data.data)) {
          // Estructura anidada: {success: true, data: {data: [...], total: N}}
          ventasData = data.data.data;
        } else if (data.data?.data && Array.isArray(data.data.data.data)) {
          // Doble anidación
          ventasData = data.data.data.data;
        }
      } else if (Array.isArray(data)) {
        ventasData = data;
      }

      setVentas(ventasData);
      console.log('Ventas cargadas:', ventasData.length);
      if (ventasData.length > 0) {
        console.log('Estructura de venta:', ventasData[0]);
      }
    } catch (error) {
      console.error('Error cargando ventas:', error);
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
      console.log('API Servicios response:', data);

      // Manejar diferentes estructuras de respuesta
      let serviciosData = [];
      if (data.success) {
        if (Array.isArray(data.data)) {
          serviciosData = data.data;
        } else if (data.data?.data && Array.isArray(data.data.data)) {
          // Estructura anidada: {success: true, data: {data: [...], total: N}}
          serviciosData = data.data.data;
        } else if (data.data?.data?.data && Array.isArray(data.data.data.data)) {
          // Doble anidación
          serviciosData = data.data.data.data;
        }
      } else if (Array.isArray(data)) {
        serviciosData = data;
      }

      setServicios(serviciosData);
      console.log('Servicios cargados:', serviciosData.length);
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setLoadingServicios(false);
    }
  };

  // Cálculos financieros
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
  const totalMetodosPago = ingresosReales;
  const efectivoCaja = Number(caja?.efectivo || 0);
  const tarjetaCaja = Number(caja?.tarjeta || 0);
  const transferenciaCaja = Number(caja?.transferencia || 0);
  const prepagoCargado = Number(caja?.prepago_cargado || 0);
  const prepagoConsumido = Number(caja?.prepago_consumido || 0);
  const prepagoPendienteClientes = Number(caja?.prepago_pendiente_clientes || 0);
  const totalEgresos =
    Number(caja?.devoluciones || 0) +
    Number(caja?.anticipo || 0) +
    retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0);
  const balanceActual = Number(caja?.monto_apertura || 0) + ingresosReales - totalEgresos;

  // Datos para gráfico de barras
  const chartData = [
    {
      name: 'Tragos',
      valor: ventasTragosChicas?.total_venta || 0,
      propinas: ventasTragosChicas?.propinas || 0
    },
    {
      name: 'Champaña',
      valor: ventasChampagne?.total_venta || 0,
      propinas: ventasChampagne?.propinas || 0
    },
    {
      name: 'Barras',
      valor: ventasBarras?.total_venta || 0,
      propinas: ventasBarras?.propinas || 0
    },
    { name: 'Servicios', valor: caja?.servicios || 0, propinas: 0 }
  ];

  // Datos para gráfico de pie (distribución de ingresos)
  const pieData = [
    { name: 'Tragos', value: ventasTragosChicas?.total_venta || 0 },
    { name: 'Champaña', value: ventasChampagne?.total_venta || 0 },
    { name: 'Barras', value: ventasBarras?.total_venta || 0 },
    { name: 'Servicios', value: caja?.servicios || 0 }
  ].filter(d => d.value > 0);

  // Pagination
  const getPaginatedItems = (items: any[], page: number) => {
    const safeItems = Array.isArray(items) ? items : [];
    const startIndex = (page - 1) * itemsLimit;
    return safeItems.slice(startIndex, startIndex + itemsLimit);
  };

  const totalPages = (items: any[]) => {
    const safeItems = Array.isArray(items) ? items : [];
    return Math.ceil(safeItems.length / itemsLimit);
  };

  // Estados de carga combinados
  const isLoadingSummary = loadingTragosChicas || loadingChampagne || loadingBarras;

  const estadoInfo =
    caja.estado === 1
      ? { label: 'En curso', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
      : { label: 'Cerrada', color: 'bg-slate-500/10 text-slate-600 border-slate-200' };

  // Función para imprimir tabla completa con título personalizado
  const handlePrint = () => {
    const printContent = generatePrintContent();
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

  // Generar contenido HTML para impresión
  const generatePrintContent = () => {
    const getTitle = () => {
      switch (activeTab) {
        case 'resumen':
          return `Resumen de Caja - ${getDiaSemana(caja.fecha_apertura)} ${formatFechaLarga(caja.fecha_apertura)}`;
        case 'ventas':
          return `Ventas - ${formatFechaLarga(caja.fecha_apertura)}`;
        case 'servicios':
          return `Servicios - ${formatFechaLarga(caja.fecha_apertura)}`;
        case 'retiros':
          return `Retiros - ${formatFechaLarga(caja.fecha_apertura)}`;
        default:
          return `Detalles de Caja ${caja.id_caja}`;
      }
    };

    const getTableHTML = () => {
      switch (activeTab) {
        case 'ventas':
          return generateVentasTableHTML();
        case 'servicios':
          return generateServiciosTableHTML();
        case 'retiros':
          return generateRetirosTableHTML();
        case 'resumen':
        default:
          return generateResumenHTML();
      }
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${getTitle()}</title>
          <style>
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: flex-start;
              gap: 20px;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .logo {
              height: 50px;
              width: auto;
            }
            .header-content {
              flex: 1;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-card {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 8px;
            }
            .info-label {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 14px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              text-align: left;
              padding: 10px 8px;
              border: 1px solid #ddd;
              font-size: 11px;
              text-transform: uppercase;
            }
            td {
              padding: 8px;
              border: 1px solid #ddd;
              font-size: 12px;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .font-bold {
              font-weight: bold;
            }
            .summary-row {
              background-color: #f9f9f9;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/img/system/logo2.png" alt="Las Muñecas de Ramón" class="logo" />
            <div class="header-content">
              <div class="title">${getTitle()}</div>
              <div class="subtitle">Estado: ${estadoInfo.label}</div>
            </div>
          </div>
          
          ${getTableHTML()}
          
          <div class="footer">
            Generado el ${new Date().toLocaleString('es-CL')}
          </div>
        </body>
      </html>
    `;
  };

  // Generar HTML para tabla de ventas
  const generateVentasTableHTML = () => {
    const rows = (Array.isArray(filteredVentas) ? filteredVentas : [])
      .map(
        venta => `
      <tr>
        <td>${venta.cliente_nombre || 'General'}</td>
        <td>${venta.habitacion_nombre || (venta.habitacion_id ? 'Habitación' : 'Barra')}</td>
        <td class="text-center">${venta.item_count || 0} items</td>
        <td class="text-right">${formatCurrencyNoDecimals(venta.sub_total)}</td>
        <td class="text-right">${formatCurrencyNoDecimals(venta.propina)}</td>
        <td class="text-center">${formatSoloHora(venta.fecha_crea)}</td>
        <td class="text-center">${venta.metodo_pago || 'efectivo'}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(venta.total)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Abierta por</div>
          <div class="info-value">${caja.cajero_nombre || 'N/A'}</div>
          <div>${formatFechaLarga(caja.fecha_apertura)} • ${formatSoloHora(caja.fecha_apertura)}</div>
        </div>
        ${
          caja.fecha_cierre
            ? `
        <div class="info-card">
          <div class="info-label">Cerrada por</div>
          <div class="info-value">${caja.cajero_cierre_nombre || 'N/A'}</div>
          <div>${formatFechaLarga(caja.fecha_cierre)} • ${formatSoloHora(caja.fecha_cierre)}</div>
        </div>
        `
            : ''
        }
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Habitación</th>
            <th class="text-center">Cant.</th>
            <th class="text-right">Precio</th>
            <th class="text-right">Propina</th>
            <th class="text-center">Hora</th>
            <th class="text-center">Método</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="summary-row">
            <td colspan="3">Total (${filteredVentas.length} ventas)</td>
            <td class="text-right">${formatCurrencyNoDecimals(filteredVentas.reduce((sum, v) => sum + Number(v.sub_total || 0), 0))}</td>
            <td class="text-right">${formatCurrencyNoDecimals(filteredVentas.reduce((sum, v) => sum + Number(v.propina || 0), 0))}</td>
            <td colspan="2"></td>
            <td class="text-right">${formatCurrencyNoDecimals(filteredVentas.reduce((sum, v) => sum + Number(v.total || 0), 0))}</td>
          </tr>
        </tfoot>
      </table>
    `;
  };

  // Generar HTML para tabla de servicios
  const generateServiciosTableHTML = () => {
    const rows = (Array.isArray(filteredServicios) ? filteredServicios : [])
      .map(
        servicio => `
      <tr>
        <td>${servicio.cliente_nombre || 'N/A'}</td>
        <td>${servicio.anfitrionas_nombres || 'Sin asignar'}</td>
        <td>${servicio.habitacion_nombre || 'N/A'}</td>
        <td class="text-right">${formatCurrencyNoDecimals(servicio.precio_servicio)}</td>
        <td class="text-right">${formatCurrencyNoDecimals(servicio.precio_habitacion)}</td>
        <td class="text-right">${formatCurrencyNoDecimals(servicio.iva)}</td>
        <td class="text-center">${formatFechaLarga(servicio.fecha_crea)}</td>
        <td class="text-center">${servicio.metodo_pago || 'efectivo'}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(servicio.total)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Anfitrionas</th>
            <th>Habitación</th>
            <th class="text-right">Precio Servicio</th>
            <th class="text-right">Precio Habitación</th>
            <th class="text-right">IVA</th>
            <th class="text-center">Fecha</th>
            <th class="text-center">Pago</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="summary-row">
            <td colspan="3">Total (${filteredServicios.length} servicios)</td>
            <td class="text-right">${formatCurrencyNoDecimals(filteredServicios.reduce((sum, s) => sum + Number(s.precio_servicio || 0), 0))}</td>
            <td class="text-right">${formatCurrencyNoDecimals(filteredServicios.reduce((sum, s) => sum + Number(s.precio_habitacion || 0), 0))}</td>
            <td class="text-right">${formatCurrencyNoDecimals(filteredServicios.reduce((sum, s) => sum + Number(s.iva || 0), 0))}</td>
            <td colspan="2"></td>
            <td class="text-right">${formatCurrencyNoDecimals(filteredServicios.reduce((sum, s) => sum + Number(s.total || 0), 0))}</td>
          </tr>
        </tfoot>
      </table>
    `;
  };

  // Generar HTML para tabla de retiros
  const generateRetirosTableHTML = () => {
    const rows = (Array.isArray(retiros) ? retiros : [])
      .map(
        retiro => `
      <tr>
        <td>${formatSoloHora(retiro.fecha_crea)}</td>
        <td>${retiro.motivo}</td>
        <td class="text-right font-bold">${formatCurrencyNoDecimals(retiro.monto)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <table>
        <thead>
          <tr>
            <th class="text-center">Hora</th>
            <th>Motivo</th>
            <th class="text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="summary-row">
            <td colspan="2">Total (${retiros.length} retiros)</td>
            <td class="text-right">${formatCurrencyNoDecimals(retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0))}</td>
          </tr>
        </tfoot>
      </table>
    `;
  };

  // Generar HTML para resumen
  const generateResumenHTML = () => {
    return `
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Abierta por</div>
          <div class="info-value">${caja.cajero_nombre || 'N/A'}</div>
          <div>${formatFechaLarga(caja.fecha_apertura)} • ${formatSoloHora(caja.fecha_apertura)}</div>
        </div>
        ${
          caja.fecha_cierre
            ? `
        <div class="info-card">
          <div class="info-label">Cerrada por</div>
          <div class="info-value">${caja.cajero_cierre_nombre || 'N/A'}</div>
          <div>${formatFechaLarga(caja.fecha_cierre)} • ${formatSoloHora(caja.fecha_cierre)}</div>
        </div>
        `
            : ''
        }
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Monto Apertura</td>
            <td class="text-right">${formatCurrencyNoDecimals(caja.monto_apertura)}</td>
          </tr>
          <tr>
            <td>Ventas Tragos</td>
            <td class="text-right">${formatCurrencyNoDecimals(ventasTragosChicas?.total_venta || 0)}</td>
          </tr>
          <tr>
            <td>Ventas Champaña</td>
            <td class="text-right">${formatCurrencyNoDecimals(ventasChampagne?.total_venta || 0)}</td>
          </tr>
          <tr>
            <td>Ventas Barras</td>
            <td class="text-right">${formatCurrencyNoDecimals(ventasBarras?.total_venta || 0)}</td>
          </tr>
          <tr>
            <td>Servicios</td>
            <td class="text-right">${formatCurrencyNoDecimals(caja.servicios || 0)}</td>
          </tr>
          <tr>
            <td>Prepago Cargado</td>
            <td class="text-right">${formatCurrencyNoDecimals(prepagoCargado)}</td>
          </tr>
          <tr>
            <td>Prepago Consumido</td>
            <td class="text-right">${formatCurrencyNoDecimals(prepagoConsumido)}</td>
          </tr>
          <tr>
            <td>Ingreso Real a Caja</td>
            <td class="text-right">${formatCurrencyNoDecimals(ingresosReales)}</td>
          </tr>
          <tr>
            <td>Devoluciones</td>
            <td class="text-right" style="color: red;">-${formatCurrencyNoDecimals(caja.devoluciones || 0)}</td>
          </tr>
          <tr>
            <td>Anticipos</td>
            <td class="text-right" style="color: red;">-${formatCurrencyNoDecimals(caja.anticipo || 0)}</td>
          </tr>
          <tr>
            <td>Retiros</td>
            <td class="text-right" style="color: red;">-${formatCurrencyNoDecimals(retiros.reduce((sum, r) => sum + r.monto, 0))}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="summary-row" style="background-color: #e8f5e8; font-size: 14px;">
            <td>Balance Final</td>
            <td class="text-right">${formatCurrencyNoDecimals(balanceActual)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  };

  // Función para formatear fecha corta para nombres de archivo
  const formatFechaCorta = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  // Función para exportar a PDF mejorado con logo y gráficos
  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const html2canvas = (await import('html2canvas')).default;

      const doc = new jsPDF();

      // Cargar logo y convertir a base64
      const logoUrl = '/img/system/logo2.png';
      const logoResponse = await fetch(logoUrl);
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });

      // Logo en el header
      doc.addImage(logoBase64, 'PNG', 14, 8, 40, 20);

      // Título "REPORTE DE CAJA" alineado a la derecha del logo
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('REPORTE DE CAJA', 160, 18, { align: 'right' });

      // Línea separadora bajo el logo
      doc.setDrawColor(41, 41, 41);
      doc.setLineWidth(0.5);
      doc.line(14, 32, 196, 32);

      // Info de la caja
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Fecha: ${getDiaSemana(caja.fecha_apertura)}, ${formatFechaLarga(caja.fecha_apertura)}`,
        14,
        40
      );
      doc.text(`Cajero: ${caja.cajero_nombre}`, 14, 46);
      doc.text(`Pestaña: ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`, 120, 40);
      doc.text(`Estado: ${estadoInfo.label}`, 120, 46);

      // Capturar gráficos si estamos en la pestaña resumen
      if (activeTab === 'resumen') {
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

      // Espacio antes de la tabla
      const startY = activeTab === 'resumen' ? 110 : 62;

      const tableData = getPDFData();
      const { headers, body } = tableData;

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: startY,
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

      // Totales si es ventas o servicios
      if (activeTab === 'ventas' && filteredVentas.length > 0) {
        const lastTable = (doc as any).lastAutoTable;
        const finalY = lastTable?.finalY || 100;
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        const totalVentas = filteredVentas.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalPropinas = filteredVentas.reduce((sum, v) => sum + (v.propina || 0), 0);
        doc.text(`Total Ventas: $${totalVentas.toLocaleString('es-CL')}`, 14, finalY + 12);
        doc.text(`Total Propinas: $${totalPropinas.toLocaleString('es-CL')}`, 14, finalY + 19);
      }

      if (activeTab === 'servicios' && filteredServicios.length > 0) {
        const lastTable = (doc as any).lastAutoTable;
        const finalY = lastTable?.finalY || 100;
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        const totalServicios = filteredServicios.reduce((sum, s) => sum + (s.total || 0), 0);
        doc.text(`Total Servicios: $${totalServicios.toLocaleString('es-CL')}`, 14, finalY + 12);
      }

      // Numeración de páginas
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

      doc.save(`caja-${activeTab}-${formatFechaCorta(caja.fecha_apertura)}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const getPDFData = () => {
    switch (activeTab) {
      case 'ventas':
        return {
          headers: [
            '#',
            'Cliente',
            'Habitación',
            'Cantidad',
            'SubTotal',
            'Propina',
            'Hora',
            'Método',
            'Total'
          ],
          body: filteredVentas.map((v, i) => [
            (i + 1).toString(),
            v.cliente_nombre || 'General',
            v.habitacion_nombre || (v.habitacion_id ? 'Habitación' : 'Barra'),
            v.item_count || 0,
            v.sub_total || 0,
            v.propina || 0,
            formatSoloHora(v.fecha_crea),
            v.metodo_pago || 'efectivo',
            v.total || 0
          ])
        };
      case 'servicios':
        return {
          headers: [
            '#',
            'Cliente',
            'Anfitrionas',
            'Habitación',
            'Total Habitación',
            'IVA',
            'Fecha',
            'Pago',
            'Total'
          ],
          body: filteredServicios.map((s, i) => [
            (i + 1).toString(),
            s.cliente_nombre || 'N/A',
            s.anfitrionas_nombres || 'Sin asignar',
            s.habitacion_nombre || 'N/A',
            s.total_habitacion || 0,
            s.iva || 0,
            formatFechaLarga(s.fecha_crea),
            s.metodo_pago || 'efectivo',
            s.total || 0
          ])
        };
      case 'retiros':
        return {
          headers: ['#', 'Hora', 'Motivo', 'Monto'],
          body: retiros.map((r, i) => [
            (i + 1).toString(),
            formatSoloHora(r.fecha_crea),
            r.motivo,
            r.monto
          ])
        };
      default:
        return {
          headers: ['#', 'Concepto', 'Monto'],
          body: [
            ['1', 'Monto Apertura', caja.monto_apertura],
            ['2', 'Ventas Tragos', ventasTragosChicas?.total_venta || 0],
            ['3', 'Ventas Champaña', ventasChampagne?.total_venta || 0],
            ['4', 'Ventas Barras', ventasBarras?.total_venta || 0],
            ['5', 'Servicios', caja.servicios || 0],
            ['6', 'Prepago Cargado', prepagoCargado],
            ['7', 'Prepago Consumido', prepagoConsumido],
            ['8', 'Ingreso Real a Caja', ingresosReales],
            ['9', 'Devoluciones', -(caja.devoluciones || 0)],
            ['10', 'Anticipos', -(caja.anticipo || 0)],
            ['11', 'Retiros', -retiros.reduce((sum, r) => sum + r.monto, 0)],
            ['12', 'Balance Final', balanceActual]
          ]
        };
    }
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

          {/* Quick Stats - Sticky Header */}
          <div className='sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-6 py-4 print:hidden'>
            <div className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
                {isLoadingSummary ? (
                  <>
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                  </>
                ) : (
                  <>
                    <div className='bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center'>
                          <TrendingUp className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase'>
                            Ingresos
                          </p>
                          <p className='text-lg font-black text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(totalIngresos)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center'>
                          <TrendingDown className='w-5 h-5 text-rose-600 dark:text-rose-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-rose-600 dark:text-rose-400 uppercase'>
                            Egresos
                          </p>
                          <p className='text-lg font-black text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(totalEgresos)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center'>
                          <Wallet className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-blue-600 dark:text-blue-400 uppercase'>
                            Balance
                          </p>
                          <p className='text-lg font-black text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(balanceActual)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center'>
                          <CreditCard className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-amber-600 dark:text-amber-400 uppercase'>
                            Propinas
                          </p>
                          <p className='text-lg font-black text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(totalPropinas)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
                {isLoadingSummary ? (
                  <>
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                  </>
                ) : (
                  <>
                    <div className='bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center'>
                          <Wallet className='w-5 h-5 text-green-600 dark:text-green-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-slate-600 dark:text-slate-300 uppercase'>
                            Efectivo
                          </p>
                          <p className='text-lg font-black text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(efectivoCaja)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center'>
                          <CreditCard className='w-5 h-5 text-sky-600 dark:text-sky-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-slate-600 dark:text-slate-300 uppercase'>
                            Tarjeta
                          </p>
                          <p className='text-lg font-black text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(tarjetaCaja)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center'>
                          <ArrowDownCircle className='w-5 h-5 text-violet-600 dark:text-violet-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-slate-600 dark:text-slate-300 uppercase'>
                            Transferencia
                          </p>
                          <p className='text-lg font-black text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(transferenciaCaja)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='bg-violet-50 dark:bg-violet-900/20 p-3 rounded-xl border border-violet-100 dark:border-violet-800'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center'>
                          <Wallet className='w-5 h-5 text-violet-600 dark:text-violet-400' />
                        </div>
                        <div>
                          <p className='text-xs font-bold text-violet-600 dark:text-violet-400 uppercase'>
                            Total medios de pago
                          </p>
                          <p className='text-lg font-black text-violet-700 dark:text-violet-300'>
                            {formatCurrencyNoDecimals(totalMetodosPago)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
              {/* TAB RESUMEN */}
              <TabsContent value='resumen' className='mt-0 space-y-8'>
                {/* Info de Caja */}
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
                      {formatFechaLarga(caja.fecha_apertura)} •{' '}
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
                        {formatFechaLarga(caja.fecha_cierre)} • {formatSoloHora(caja.fecha_cierre)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Gráficos */}
                <div id='charts-container' className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  {/* Gráfico de Barras */}
                  <div
                    id='chart-bars'
                    className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'
                  >
                    <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                      <TrendingUp className='w-4 h-4 text-blue-500' />
                      Ventas por Categoría
                    </h4>
                    {/* Info de ventas */}
                    <div className='grid grid-cols-3 gap-2 mb-3'>
                      <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center'>
                        <p className='text-xs text-blue-600 dark:text-blue-400 font-medium'>
                          Tragos
                        </p>
                        <p className='text-sm font-bold text-blue-700 dark:text-blue-300'>
                          {formatCurrencyNoDecimals(ventasTragosChicas?.total_venta || 0)}
                        </p>
                      </div>
                      <div className='bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center'>
                        <p className='text-xs text-purple-600 dark:text-purple-400 font-medium'>
                          Champaña
                        </p>
                        <p className='text-sm font-bold text-purple-700 dark:text-purple-300'>
                          {formatCurrencyNoDecimals(ventasChampagne?.total_venta || 0)}
                        </p>
                      </div>
                      <div className='bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center'>
                        <p className='text-xs text-emerald-600 dark:text-emerald-400 font-medium'>
                          Barras
                        </p>
                        <p className='text-sm font-bold text-emerald-700 dark:text-emerald-300'>
                          {formatCurrencyNoDecimals(ventasBarras?.total_venta || 0)}
                        </p>
                      </div>
                    </div>
                    <div className='h-48'>
                      {isLoadingSummary ? (
                        <Skeleton className='h-full w-full rounded-xl' />
                      ) : (
                        <ResponsiveContainer width='100%' height='100%'>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                            <XAxis dataKey='name' tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v / 1000}k`} />
                            <Tooltip
                              formatter={(value: number) => formatCurrencyNoDecimals(value)}
                              contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }}
                            />
                            <Bar
                              dataKey='valor'
                              fill='#3b82f6'
                              radius={[8, 8, 0, 0]}
                              name='Ventas'
                            />
                            <Bar
                              dataKey='propinas'
                              fill='#f59e0b'
                              radius={[8, 8, 0, 0]}
                              name='Propinas'
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    {/* Total general */}
                    <div className='mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        Total Ventas:
                      </span>
                      <span className='text-sm font-bold text-gray-900 dark:text-white'>
                        {formatCurrencyNoDecimals(totalIngresos)}
                      </span>
                    </div>
                  </div>

                  {/* Gráfico de Pie */}
                  <div
                    id='chart-pie'
                    className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'
                  >
                    <h4 className='text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                      <Wallet className='w-4 h-4 text-emerald-500' />
                      Distribución de Ingresos
                    </h4>
                    {/* Info de ingresos */}
                    <div className='grid grid-cols-2 gap-2 mb-3'>
                      <div className='bg-slate-50 dark:bg-slate-800 rounded-lg p-2'>
                        <p className='text-xs text-slate-500 dark:text-slate-400'>
                          Ingresos Totales
                        </p>
                        <p className='text-base font-bold text-slate-700 dark:text-slate-300'>
                          {formatCurrencyNoDecimals(totalIngresos)}
                        </p>
                      </div>
                      <div className='bg-slate-50 dark:bg-slate-800 rounded-lg p-2'>
                        <p className='text-xs text-slate-500 dark:text-slate-400'>
                          Egresos Totales
                        </p>
                        <p className='text-base font-bold text-slate-700 dark:text-slate-300'>
                          {formatCurrencyNoDecimals(totalEgresos)}
                        </p>
                      </div>
                    </div>
                    <div className='h-48'>
                      {isLoadingSummary ? (
                        <Skeleton className='h-full w-full rounded-xl' />
                      ) : pieData.length > 0 ? (
                        <ResponsiveContainer width='100%' height='100%'>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx='50%'
                              cy='50%'
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey='value'
                            >
                              {pieData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => formatCurrencyNoDecimals(value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className='h-full flex items-center justify-center text-gray-500'>
                          No hay datos para mostrar
                        </div>
                      )}
                    </div>
                    {/* Leyenda con valores */}
                    <div className='flex flex-wrap justify-center gap-2 mt-2'>
                      {pieData.map((entry, index) => (
                        <div key={entry.name} className='flex items-center gap-1'>
                          <div
                            className='w-3 h-3 rounded-full'
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className='text-xs text-gray-600 dark:text-gray-400'>
                            {entry.name}: {formatCurrencyNoDecimals(entry.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detalle Financiero */}
                <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
                  <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
                    <h4 className='font-bold text-gray-900 dark:text-white'>Detalle Financiero</h4>
                  </div>
                  <div className='p-4 space-y-3'>
                    {isLoadingSummary ? (
                      <>
                        <Skeleton className='h-10 w-full' />
                        <Skeleton className='h-10 w-full' />
                        <Skeleton className='h-10 w-full' />
                        <Skeleton className='h-12 w-full' />
                      </>
                    ) : (
                      <>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Monto Apertura
                          </span>
                          <span className='font-bold text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(caja.monto_apertura)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Ventas Tragos
                          </span>
                          <span className='font-bold text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(ventasTragosChicas?.total_venta || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Ventas Champaña
                          </span>
                          <span className='font-bold text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(ventasChampagne?.total_venta || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Ventas Barras
                          </span>
                          <span className='font-bold text-gray-900 dark:text-white'>
                            {formatCurrencyNoDecimals(ventasBarras?.total_venta || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Servicios
                          </span>
                          <span className='font-bold text-emerald-600'>
                            {formatCurrencyNoDecimals(caja.servicios || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Prepago Cargado
                          </span>
                          <span className='font-bold text-sky-600 dark:text-sky-400'>
                            {formatCurrencyNoDecimals(prepagoCargado)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Prepago Consumido
                          </span>
                          <span className='font-bold text-violet-600 dark:text-violet-400'>
                            {formatCurrencyNoDecimals(prepagoConsumido)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Ingreso Real a Caja
                          </span>
                          <span className='font-bold text-cyan-600 dark:text-cyan-400'>
                            {formatCurrencyNoDecimals(ingresosReales)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Devoluciones
                          </span>
                          <span className='font-bold text-rose-600'>
                            -{formatCurrencyNoDecimals(caja.devoluciones || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            Anticipos
                          </span>
                          <span className='font-bold text-rose-600'>
                            -{formatCurrencyNoDecimals(caja.anticipo || 0)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>Retiros</span>
                          <span className='font-bold text-rose-600'>
                            -
                            {formatCurrencyNoDecimals(retiros.reduce((sum, r) => sum + r.monto, 0))}
                          </span>
                        </div>
                        <div className='flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-900/20 -mx-4 px-4 mt-2'>
                          <span className='font-bold text-emerald-800 dark:text-emerald-200'>
                            Balance Final
                          </span>
                          <span className='text-xl font-black text-emerald-700 dark:text-emerald-300'>
                            {formatCurrencyNoDecimals(balanceActual)}
                          </span>
                        </div>
                        <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300'>
                          <div className='flex justify-between gap-4'>
                            <span>Saldo prepago pendiente clientes</span>
                            <span className='font-bold'>
                              {formatCurrencyNoDecimals(prepagoPendienteClientes)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB VENTAS */}
              <TabsContent value='ventas' className='mt-0 space-y-4'>
                {/* Buscador */}
                <div className='relative print:hidden'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <Input
                    placeholder='Buscar por cliente, habitación o categoría...'
                    value={searchVentas}
                    onChange={e => setSearchVentas(e.target.value)}
                    className='pl-10 rounded-xl'
                  />
                </div>

                {loadingVentas ? (
                  <TableSkeleton rows={5} />
                ) : filteredVentas.length === 0 ? (
                  <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
                    <ShoppingCart className='w-12 h-12 mx-auto mb-3 opacity-30' />
                    <p className='font-medium mb-2'>
                      {ventas.length === 0
                        ? 'No hay ventas registradas en esta caja'
                        : 'No hay ventas que coincidan con la búsqueda'}
                    </p>
                    {ventas.length === 0 && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={fetchVentas}
                        className='rounded-full text-xs'
                      >
                        Reintentar carga
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
                      <div className='overflow-x-auto'>
                        <Table>
                          <TableHeader>
                            <TableRow className='bg-gray-50 dark:bg-gray-800/50'>
                              <TableHead className='font-bold text-xs'>CLIENTE</TableHead>
                              <TableHead className='font-bold text-xs'>HAB.</TableHead>
                              <TableHead className='font-bold text-xs'>CAT.</TableHead>
                              <TableHead className='font-bold text-xs text-right'>CANT.</TableHead>
                              <TableHead className='font-bold text-xs text-right'>PRECIO</TableHead>
                              <TableHead className='font-bold text-xs text-right'>
                                PROPINA
                              </TableHead>
                              <TableHead className='font-bold text-xs'>HORA</TableHead>
                              <TableHead className='font-bold text-xs'>MÉTODO</TableHead>
                              <TableHead className='font-bold text-xs text-right'>TOTAL</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getVentasForDisplay().map((venta: any, idx: number) => (
                              <TableRow
                                key={idx}
                                className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              >
                                <TableCell className='font-medium text-sm'>
                                  {venta.cliente_nombre || 'General'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='outline' className='text-xs'>
                                    {venta.habitacion_nombre ||
                                      (venta.habitacion_id ? 'Habitación' : 'Barra')}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-sm capitalize text-gray-600'>
                                  {venta.item_count || 0} items
                                </TableCell>
                                <TableCell className='text-right font-bold'>
                                  {venta.item_count || 0}
                                </TableCell>
                                <TableCell className='text-right text-sm text-gray-600'>
                                  {formatCurrencyNoDecimals(venta.sub_total)}
                                </TableCell>
                                <TableCell className='text-right text-sm text-amber-600'>
                                  {formatCurrencyNoDecimals(venta.propina)}
                                </TableCell>
                                <TableCell className='text-sm text-gray-500'>
                                  {formatSoloHora(venta.fecha_crea)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='secondary' className='text-xs capitalize'>
                                    {venta.metodo_pago || 'efectivo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-right font-black'>
                                  {formatCurrencyNoDecimals(venta.total)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    {totalPages(filteredVentas) > 1 && (
                      <div className='print:hidden'>
                        <Paginate
                          page={ventasPage}
                          totalPages={totalPages(filteredVentas)}
                          setPage={setVentasPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* TAB SERVICIOS */}
              <TabsContent value='servicios' className='mt-0 space-y-4'>
                {/* Buscador */}
                <div className='relative print:hidden'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <Input
                    placeholder='Buscar por cliente, anfitriona o habitación...'
                    value={searchServicios}
                    onChange={e => setSearchServicios(e.target.value)}
                    className='pl-10 rounded-xl'
                  />
                </div>

                {loadingServicios ? (
                  <TableSkeleton rows={5} />
                ) : filteredServicios.length === 0 ? (
                  <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
                    <Home className='w-12 h-12 mx-auto mb-3 opacity-30' />
                    <p>No hay servicios registrados</p>
                  </div>
                ) : (
                  <>
                    <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
                      <div className='overflow-x-auto'>
                        <Table>
                          <TableHeader>
                            <TableRow className='bg-gray-50 dark:bg-gray-800/50'>
                              <TableHead className='font-bold text-xs'>CLIENTE</TableHead>
                              <TableHead className='font-bold text-xs'>ANFITRIONAS</TableHead>
                              <TableHead className='font-bold text-xs'>HAB.</TableHead>
                              <TableHead className='font-bold text-xs text-right'>
                                SERVICIO
                              </TableHead>
                              <TableHead className='font-bold text-xs text-right'>
                                HABITACIÓN
                              </TableHead>
                              <TableHead className='font-bold text-xs text-right'>IVA</TableHead>
                              <TableHead className='font-bold text-xs'>FECHA</TableHead>
                              <TableHead className='font-bold text-xs'>PAGO</TableHead>
                              <TableHead className='font-bold text-xs text-right'>TOTAL</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getServiciosForDisplay().map((servicio: any, idx: number) => (
                              <TableRow
                                key={idx}
                                className='hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              >
                                <TableCell className='font-medium text-sm'>
                                  {servicio.cliente_nombre || 'N/A'}
                                </TableCell>
                                <TableCell className='text-sm text-gray-600 italic'>
                                  {servicio.anfitrionas_nombres || 'Sin asignar'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='outline' className='text-xs'>
                                    {servicio.habitacion_nombre || 'N/A'}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-right text-sm font-semibold text-emerald-600'>
                                  {formatCurrencyNoDecimals(servicio.precio_servicio || 0)}
                                </TableCell>
                                <TableCell className='text-right text-sm font-semibold text-blue-600'>
                                  {formatCurrencyNoDecimals(servicio.precio_habitacion || 0)}
                                </TableCell>
                                <TableCell className='text-right text-sm font-semibold text-purple-600'>
                                  {formatCurrencyNoDecimals(servicio.iva || 0)}
                                </TableCell>
                                <TableCell className='text-sm text-gray-500'>
                                  {formatFechaLarga(servicio.fecha_crea)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='secondary' className='text-xs capitalize'>
                                    {servicio.metodo_pago || 'efectivo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className='text-right font-black'>
                                  {formatCurrencyNoDecimals(servicio.total || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    {totalPages(filteredServicios) > 1 && (
                      <div className='print:hidden'>
                        <Paginate
                          page={serviciosPage}
                          totalPages={totalPages(filteredServicios)}
                          setPage={setServiciosPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* TAB RETIROS */}
              <TabsContent value='retiros' className='mt-0 space-y-4'>
                {retirosLoading ? (
                  <TableSkeleton rows={5} />
                ) : retiros.length === 0 ? (
                  <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
                    <ArrowDownCircle className='w-12 h-12 mx-auto mb-3 opacity-30' />
                    <p>No hay retiros registrados</p>
                  </div>
                ) : (
                  <>
                    <div className='space-y-3'>
                      {getRetirosForDisplay().map((retiro: any, idx: number) => (
                        <div
                          key={idx}
                          className='bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition-shadow'
                        >
                          <div className='flex items-center gap-4'>
                            <div className='w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center'>
                              <ArrowDownCircle className='w-6 h-6 text-orange-600' />
                            </div>
                            <div>
                              <p className='font-bold text-gray-900 dark:text-white'>
                                {retiro.motivo || 'Sin motivo'}
                              </p>
                              <p className='text-xs text-gray-500'>
                                {formatFechaLarga(retiro.fecha_retiro)} •{' '}
                                {formatSoloHora(retiro.fecha_retiro)}
                              </p>
                              <p className='text-xs text-gray-400'>
                                Por: {retiro.cajero_nombre || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='text-xl font-black text-orange-600'>
                              -{formatCurrencyCLP(retiro.monto)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {retiros.length > 0 && (
                      <div className='bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800'>
                        <div className='flex justify-between items-center'>
                          <span className='font-bold text-orange-800 dark:text-orange-200'>
                            Total Retirado
                          </span>
                          <span className='text-xl font-black text-orange-700 dark:text-orange-300'>
                            {formatCurrencyCLP(retiros.reduce((sum, r) => sum + r.monto, 0))}
                          </span>
                        </div>
                      </div>
                    )}
                    {totalPages(retiros) > 1 && (
                      <div className='print:hidden'>
                        <Paginate
                          page={retirosPage}
                          totalPages={totalPages(retiros)}
                          setPage={setRetirosPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
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
