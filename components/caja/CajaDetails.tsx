"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Función para obtener el día de la semana en español
const getDiaSemana = (fecha: string | Date): string => {
  const date = new Date(fecha);
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return dias[date.getDay()];
};

// Importación de sub-componentes refactorizados
import { CajaInfoCards } from "./details/CajaInfoCards";
import { CajaFinanceSummary } from "./details/CajaFinanceSummary";
import { CajaOperationsTables } from "./details/CajaOperationsTables";

interface CajaDetailsProps {
  caja: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CajaDetails({ caja, open, onOpenChange }: CajaDetailsProps) {
  // 🛡️ GUARDIA DE SEGURIDAD - Evita que el componente intente calcular nada si la caja no existe
  if (!caja) return null;

  // Estados para ventas, retiros y servicios
  const [ventas, setVentas] = useState<any[]>([]);
  const [retiros, setRetiros] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  
  // Estados de carga
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [retirosLoading, setRetirosLoading] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // Estados para ventas por categoría (Tragos, Champagne, Barras)
  const [ventasTragosChicas, setVentasTragosChicas] = useState<any>({ total_venta: 0, propinas: 0 });
  const [ventasChampagne, setVentasChampagne] = useState<any>({ total_venta: 0, propinas: 0 });
  const [ventasBarras, setVentasBarras] = useState<any>({ total_venta: 0, propinas: 0 });
  const [loadingTragosChicas, setLoadingTragosChicas] = useState(false);
  const [loadingChampagne, setLoadingChampagne] = useState(false);
  const [loadingBarras, setLoadingBarras] = useState(false);

  // Paginación
  const [ventasPage, setVentasPage] = useState(1);
  const [serviciosPage, setServiciosPage] = useState(1);
  const ventasLimit = 5;
  const serviciosLimit = 5;

  // Efecto para cargar datos cuando el modal abre o cambia la caja
  useEffect(() => {
    if (open && caja?.id_caja) {
      fechRetiros();
      fetchVentas();
      fetchServicios();
      fetchResumenFinanciero();
    }
  }, [open, caja?.id_caja]);

  const fechRetiros = async () => {
    setRetirosLoading(true);
    try {
      // ✅ Ruta confirmada bajo cashregister
      const resp = await fetch(`/api/cashregister/retiros?id_caja=${caja.id_caja}`);
      const data = await resp.json();
      if (data.success) setRetiros(data.data || []);
    } catch (error) {
      console.error("Error cargando retiros:", error);
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
      console.error("Error fetching financial summary:", error);
    } finally {
      setLoadingTragosChicas(false);
      setLoadingChampagne(false);
      setLoadingBarras(false);
    }
  };

  const fetchVentas = async () => {
    setLoadingVentas(true);
    try {
      // 🎯 Ajustada a la ruta raíz que vimos en el escaneo
      const resp = await fetch(`/api/ventas?id_caja=${caja.id_caja}`);
      const data = await resp.json().catch(() => ({ success: false }));
      if (data.success) setVentas(data.data || []);
    } catch (error) {
      console.error("Error cargando ventas:", error);
    } finally {
      setLoadingVentas(false);
    }
  };

  const fetchServicios = async () => {
    setLoadingServicios(true);
    try {
      // 🎯 Ajustada a la ruta raíz que vimos en el escaneo
      const resp = await fetch(`/api/servicios?id_caja=${caja.id_caja}`);
      const data = await resp.json().catch(() => ({ success: false }));
      if (data.success) setServicios(data.data || []);
    } catch (error) {
      console.error("Error cargando servicios:", error);
    } finally {
      setLoadingServicios(false);
    }
  };

  // Cálculos financieros globales con chequeo de seguridad
  const totalPropinas = Number(ventasTragosChicas?.propinas || 0) + Number(ventasChampagne?.propinas || 0) + Number(ventasBarras?.propinas || 0);
  const totalIngresos = Number(ventasTragosChicas?.total_venta || 0) + Number(caja?.servicios || 0) + Number(ventasChampagne?.total_venta || 0) + Number(ventasBarras?.total_venta || 0);
  const totalEgresos = Number(caja?.devoluciones || 0) + Number(caja?.anticipo || 0) + retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0);
  const balanceActual = Number(caja?.monto_apertura || 0) + totalIngresos - totalEgresos;

  // Lógica de Paginación para Ventas
  const getPaginatedVentas = () => {
    const startIndex = (ventasPage - 1) * ventasLimit;
    return Array.isArray(ventas) ? ventas.slice(startIndex, startIndex + ventasLimit) : [];
  };
  const totalVentasPagesCount = Math.ceil((Array.isArray(ventas) ? ventas.length : 0) / ventasLimit);

  // Lógica de Paginación para Servicios
  const getPaginatedServicios = () => {
    const startIndex = (serviciosPage - 1) * serviciosLimit;
    return Array.isArray(servicios) ? servicios.slice(startIndex, startIndex + serviciosLimit) : [];
  };
  const totalServiciosPagesCount = Math.ceil((Array.isArray(servicios) ? servicios.length : 0) / serviciosLimit);

  const handleVentasPageChange = (page: number) => setVentasPage(page);
  const handleServiciosPageChange = (page: number) => setServiciosPage(page);

  const estadoInfo = caja.estado === "abierta" 
    ? { label: "En curso", color: "bg-emerald-500/10 text-emerald-600" }
    : { label: "Cerrada", color: "bg-slate-500/10 text-slate-600" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 w-[95vw] overflow-hidden rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900">
        <DialogHeader className="p-6 pb-2 border-b flex-shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-4">
              Detalles de Caja {getDiaSemana(caja.fecha_apertura)}{" "}
              <Badge variant="secondary" className={`${estadoInfo.color} rounded-xl px-4 py-1 text-xs font-black uppercase tracking-widest border-none shadow-sm`}>
                {estadoInfo.label}
              </Badge>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-8 custom-scrollbar bg-white dark:bg-slate-900">
          <div className="space-y-12">
            {/* 1. Información General */}
            <CajaInfoCards 
              cajeroNombre={caja.cajero_nombre}
              fechaApertura={caja.fecha_apertura}
              cajeroCierreNombre={caja.cajero_cierre_nombre}
              fechaCierre={caja.fecha_cierre}
            />

            {/* 2. Resumen Financiero Consolidado */}
            <CajaFinanceSummary 
              caja={caja}
              ventasTragosChicas={ventasTragosChicas}
              ventasChampagne={ventasChampagne}
              ventasBarras={ventasBarras}
              loadingTragosChicas={loadingTragosChicas}
              loadingChampagne={loadingChampagne}
              loadingBarras={loadingBarras}
              totalPropinas={totalPropinas}
              totalIngresos={totalIngresos}
              totalEgresos={totalEgresos}
              balanceActual={balanceActual}
              retirosMonto={retiros.reduce((sum, r) => sum + r.monto, 0)}
            />

            {/* 3. Listas y Tablas de Operación */}
            <CajaOperationsTables 
              retirosLoading={retirosLoading}
              retiros={retiros}
              loadingVentas={loadingVentas}
              ventas={getPaginatedVentas()}
              ventasPage={ventasPage}
              totalVentasPages={totalVentasPagesCount}
              onVentasPageChange={handleVentasPageChange}
              loadingServicios={loadingServicios}
              servicios={getPaginatedServicios()}
              serviciosPage={serviciosPage}
              totalServiciosPages={totalServiciosPagesCount}
              onServiciosPageChange={handleServiciosPageChange}
            />
          </div>
        </div>

        {/* Footer Estándar */}
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center px-6 rounded-b-2xl">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-8 bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200 font-bold"
            onClick={() => onOpenChange(false)}
          >
            Cerrar Detalles
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
