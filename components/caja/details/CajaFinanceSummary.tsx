import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Home, Loader2, Calendar } from 'lucide-react';
import { FinancialCard } from './FinancialCard';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CajaFinanceSummaryProps {
  caja: any;
  ventasTragosChicas: any;
  ventasChampagne: any;
  ventasBarras: any;
  loadingTragosChicas: boolean;
  loadingChampagne: boolean;
  loadingBarras: boolean;
  totalPropinas: number;
  totalIngresos: number;
  totalEgresos: number;
  balanceActual: number;
  retirosMonto: number;
}

export function CajaFinanceSummary({
  caja,
  ventasTragosChicas,
  ventasChampagne,
  ventasBarras,
  loadingTragosChicas,
  loadingChampagne,
  loadingBarras,
  totalPropinas,
  totalIngresos,
  totalEgresos,
  balanceActual,
  retirosMonto
}: CajaFinanceSummaryProps) {
  return (
    <div className="py-6 px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        <h5 className="font-black text-xs uppercase tracking-[0.3em] text-center text-gray-400 dark:text-gray-500 mb-10">
          Resumen Financiero Consolidado
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {}
          <div className="md:col-span-4 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between group overflow-hidden relative mb-4">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Calendar className="w-32 h-32 -mr-8 -mt-8" />
            </div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center shadow-inner">
                <Calendar className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <div className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Monto de Apertura</div>
                <div className="text-4xl font-black text-gray-900 dark:text-white leading-none">
                  {formatCurrencyNoDecimals(caja.monto_apertura)}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto">
                <DollarSign className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Tragos Chicas</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {loadingTragosChicas ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : formatCurrencyNoDecimals(ventasTragosChicas.total_venta)}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto">
                <ShoppingCart className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Champañas</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {loadingChampagne ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : formatCurrencyNoDecimals(ventasChampagne.total_venta)}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Barras</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {loadingBarras ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : formatCurrencyNoDecimals(ventasBarras.total_venta)}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto">
                <Home className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Servicios</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {formatCurrencyNoDecimals(caja.servicios)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 pt-12 border-t border-gray-100 dark:border-gray-800">
          <FinancialCard 
            title="Total Propinas"
            mainValue={formatCurrencyNoDecimals(totalPropinas)}
            isLoading={loadingTragosChicas || loadingChampagne || loadingBarras}
            gradientFrom="from-emerald-500/20"
            gradientTo="to-teal-500/20"
            textColor="text-emerald-600 dark:text-emerald-400"
            mainColor="text-emerald-700 dark:text-emerald-300"
            breakdown={[
              { label: "Tragos Chicas", value: loadingTragosChicas ? '...' : formatCurrencyNoDecimals(ventasTragosChicas.propinas || 0) },
              { label: "Champañas", value: loadingChampagne ? '...' : formatCurrencyNoDecimals(ventasChampagne.propinas || 0) },
              { label: "Barras", value: loadingBarras ? '...' : formatCurrencyNoDecimals(ventasBarras.propinas || 0) }
            ]}
          />

          <FinancialCard 
            title="Total Ingresos"
            mainValue={formatCurrencyNoDecimals(totalIngresos)}
            gradientFrom="from-blue-500/20"
            gradientTo="to-indigo-500/20"
            textColor="text-blue-600 dark:text-blue-400"
            mainColor="text-blue-700 dark:text-blue-300"
            breakdown={[
              { label: "Ventas Totales", value: formatCurrencyNoDecimals(ventasTragosChicas.total_venta + ventasChampagne.total_venta + ventasBarras.total_venta) },
              { label: "Servicios", value: formatCurrencyNoDecimals(caja.servicios), isSpecial: true }
            ]}
          />

          <FinancialCard 
            title="Total Egresos"
            mainValue={formatCurrencyNoDecimals(totalEgresos)}
            gradientFrom="from-rose-500/20"
            gradientTo="to-red-500/20"
            textColor="text-rose-600 dark:text-rose-400"
            mainColor="text-rose-700 dark:text-rose-300"
            breakdown={[
              { label: "Devoluciones", value: formatCurrencyNoDecimals(caja.devoluciones) },
              { label: "Anticipos", value: formatCurrencyNoDecimals(caja.anticipo || 0) },
              { label: "Retiros", value: formatCurrencyNoDecimals(retirosMonto), isSpecial: true }
            ]}
          />
        </div>

        {}
        <div className="px-6 max-w-5xl mx-auto space-y-10 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <div className="bg-gray-50/50 dark:bg-gray-800/20 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 flex flex-col justify-center">
              <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-sm font-bold text-gray-500">Total Ingresos</span>
                <span className="text-lg font-bold text-blue-600">+{formatCurrencyNoDecimals(totalIngresos)}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-sm font-bold text-gray-500">Total Egresos</span>
                <span className="text-lg font-bold text-rose-600">-{formatCurrencyNoDecimals(totalEgresos)}</span>
              </div>
              <div className="flex justify-between items-center py-4 text-gray-900 dark:text-white">
                <span className="text-lg font-black uppercase tracking-widest">Resultado Caja</span>
                <span className="text-2xl font-black">{formatCurrencyNoDecimals(totalIngresos - totalEgresos)}</span>
              </div>
            </div>

            <div className="bg-gray-900 dark:bg-black p-8 rounded-[2.5rem] shadow-2xl shadow-gray-900/20 border border-gray-800 flex flex-col justify-center">
              <div className="text-center space-y-4">
                <div className="text-xs font-black text-gray-500 uppercase tracking-[0.4em]">Balance Final Proyectado</div>
                <div className="text-5xl font-black text-white tracking-tight">
                  {formatCurrencyNoDecimals(balanceActual)}
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 py-2 px-6 rounded-full inline-block">
                  Incluye Monto de Apertura
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
