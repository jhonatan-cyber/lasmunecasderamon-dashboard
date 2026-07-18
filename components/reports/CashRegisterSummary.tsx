'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Clock, Wallet, TrendingUp, TrendingDown, ArrowDownCircle, DollarSign } from 'lucide-react';

interface SummaryData {
  cajas: number;
  apertura_total: number;
  cierre_total: number;
  diferencia_total: number;
  devoluciones: number;
  iva: number;
}

interface CashRegisterSummaryProps {
  summary: SummaryData;
}

export function CashRegisterSummary({ summary }: CashRegisterSummaryProps) {
  const isDiferenciaNegative = summary.diferencia_total < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Apertura */}
      <StatCard
        title="Apertura"
        label="Caja Inicial"
        value={formatCurrencyNoDecimals(summary.apertura_total)}
        sub={`${summary.cajas} cajas operativas`}
        Icon={Clock}
        bgColor="bg-blue-500/10 dark:bg-blue-500/20"
        borderColor="border-blue-500/20"
        iconBg="bg-blue-500/20"
        textColor="text-blue-700 dark:text-blue-400"
        textMuted="text-blue-700/60 dark:text-blue-400/60"
      />

      {/* Cierre */}
      <StatCard
        title="Cierre"
        label="Total Reportado"
        value={formatCurrencyNoDecimals(summary.cierre_total)}
        sub="Suma de cierres"
        Icon={Wallet}
        bgColor="bg-emerald-500/10 dark:bg-emerald-500/20"
        borderColor="border-emerald-500/20"
        iconBg="bg-emerald-500/20"
        textColor="text-emerald-700 dark:text-emerald-400"
        textMuted="text-emerald-700/60 dark:text-emerald-400/60"
      />

      {/* Diferencia */}
      <StatCard
        title="Diferencia"
        label="Descuadre"
        value={formatCurrencyNoDecimals(summary.diferencia_total)}
        sub="Cierre - Total"
        Icon={isDiferenciaNegative ? TrendingDown : TrendingUp}
        bgColor={isDiferenciaNegative ? 'bg-red-500/10 dark:bg-red-500/20' : 'bg-amber-500/10 dark:bg-amber-500/20'}
        borderColor={isDiferenciaNegative ? 'border-red-500/20' : 'border-amber-500/20'}
        iconBg={isDiferenciaNegative ? 'bg-red-500/20' : 'bg-amber-500/20'}
        textColor={isDiferenciaNegative ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}
        textMuted={isDiferenciaNegative ? 'text-red-700/60 dark:text-red-400/60' : 'text-amber-700/60 dark:text-amber-400/60'}
      />

      {/* Devoluciones */}
      <StatCard
        title="Devoluciones"
        label="Reintegros"
        value={formatCurrencyNoDecimals(summary.devoluciones)}
        sub="Total reintegrado"
        Icon={ArrowDownCircle}
        bgColor="bg-rose-500/10 dark:bg-rose-500/20"
        borderColor="border-rose-500/20"
        iconBg="bg-rose-500/20"
        textColor="text-rose-700 dark:text-rose-400"
        textMuted="text-rose-700/60 dark:text-rose-400/60"
      />

      {/* Impuestos */}
      <StatCard
        title="Impuestos"
        label="IVA Retenido"
        value={formatCurrencyNoDecimals(summary.iva)}
        sub="Transacciones"
        Icon={DollarSign}
        bgColor="bg-purple-500/10 dark:bg-purple-500/20"
        borderColor="border-purple-500/20"
        iconBg="bg-purple-500/20"
        textColor="text-purple-700 dark:text-purple-400"
        textMuted="text-purple-700/60 dark:text-purple-400/60"
      />
    </div>
  );
}

function StatCard({
  title,
  label,
  value,
  sub,
  Icon,
  bgColor,
  borderColor,
  iconBg,
  textColor,
  textMuted,
}: {
  title: string;
  label: string;
  value: string;
  sub: string;
  Icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  textColor: string;
  textMuted: string;
}) {
  return (
    <Card
      className={`shadow-xs backdrop-blur-xs rounded-4xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 border ${bgColor} ${borderColor}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-2xl ${iconBg}`}>
            <Icon className={`h-4 w-4 ${textColor}`} />
          </div>
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full text-center ${textColor} ${iconBg}`}>
            {title}
          </span>
        </div>
        <div className="space-y-0.5 text-center sm:text-left">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>
            {label}
          </p>
          <h3 className={`text-xl sm:text-2xl font-black ${textColor} truncate`}>
            {value}
          </h3>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 pt-1">
            <span className={`text-[10px] font-medium uppercase tracking-tighter italic ${textMuted} truncate`}>
              {sub}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
