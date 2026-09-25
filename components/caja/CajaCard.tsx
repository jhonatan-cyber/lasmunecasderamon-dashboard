import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CajaWithUser } from '@/types/caja';
import { Eye, Lock, Wallet, ArrowDownCircle, User, Calendar, Hash } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface CajaCardProps {
  caja: CajaWithUser;
  onViewDetails: (caja: CajaWithUser) => void;
  onCloseCaja: (caja: CajaWithUser) => void;
  onRetirar?: (caja: CajaWithUser) => void;
  canCloseCaja?: boolean;
  canRetirar?: boolean;
  canViewDetails?: boolean;
}

const getEstadoInfo = (estado: number) => {
  switch (estado) {
    case 1:
      return {
        label: 'Abierta',
        color:
          'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
        icon: Wallet
      };
    case 0:
      return {
        label: 'Cerrada',
        color:
          'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-100 dark:border-slate-500/20',
        icon: Lock
      };
    default:
      return {
        label: 'Eliminada',
        color:
          'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20',
        icon: Lock
      };
  }
};

export const CajaCard = ({
  caja,
  onViewDetails,
  onCloseCaja,
  onRetirar,
  canCloseCaja = true,
  canRetirar = true,
  canViewDetails = true
}: CajaCardProps) => {
  const estadoInfo = getEstadoInfo(caja.estado);
  const Icon = estadoInfo.icon;

  const efectivoBase = Number(caja.monto_apertura || 0) + Number(caja.efectivo || 0);
  const totalEgresos =
    Number(caja.devoluciones || 0) + Number(caja.anticipo || 0) + Number(caja.retiro_total || 0);
  const efectivoNeto = efectivoBase - totalEgresos;
  const balanceActual = efectivoNeto + Number(caja.tarjeta || 0) + Number(caja.transferencia || 0);

  return (
    <Card className='group border border-slate-100 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-4xl overflow-hidden'>
      <CardHeader className='pb-4 pt-6 px-6'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <div className='p-2 bg-slate-50 dark:bg-white/5 rounded-xl'>
                <Calendar className='w-4 h-4 text-slate-400' />
              </div>
              <CardTitle className='text-lg font-bold tracking-tight'>
                {capitalize(formatLongDateEs(caja.fecha_apertura))}
              </CardTitle>
            </div>
          </div>
          <Badge
            variant='outline'
            className={`${estadoInfo.color} rounded-full px-4 py-1.5 border font-semibold text-[10px] uppercase tracking-wider shadow-xs`}
          >
            <Icon className='w-3 h-3 mr-1.5' />
            {estadoInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-6 px-6 pb-8'>
        <div className='grid grid-cols-1 gap-3 p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <User className='w-3.5 h-3.5 text-slate-400' />
              <span className='text-[11px] font-bold text-slate-500 uppercase tracking-wider'>
                Apertura
              </span>
            </div>
            <span className='text-sm font-semibold'>{caja.cajero_nombre || 'N/A'}</span>
          </div>
          {caja.cajero_cierre_nombre && (
            <div className='flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2'>
              <div className='flex items-center gap-2'>
                <Lock className='w-3.5 h-3.5 text-slate-400' />
                <span className='text-[11px] font-bold text-slate-500 uppercase tracking-wider'>
                  Cierre
                </span>
              </div>
              <span className='text-sm font-semibold'>{caja.cajero_cierre_nombre}</span>
            </div>
          )}
        </div>

        <div className='space-y-3 px-2'>
          <div className='flex justify-between items-center text-sm'>
            <span className='text-slate-500 font-medium'>Monto inicial</span>
            <span className='font-bold tabular-nums'>{formatCurrencyCLP(caja.monto_apertura)}</span>
          </div>

          <div className='space-y-2 pb-4 border-b border-dashed border-slate-200 dark:border-white/10'>
            <div className='flex justify-between items-center text-xs'>
              <span className='text-slate-400 font-medium italic'>Efectivo</span>
              <span className='font-semibold tabular-nums text-slate-600 dark:text-slate-300'>
                +{formatCurrencyCLP(caja.efectivo)}
              </span>
            </div>
            <div className='flex justify-between items-center text-xs'>
              <span className='text-slate-400 font-medium italic'>Tarjeta</span>
              <span className='font-semibold tabular-nums text-slate-600 dark:text-slate-300'>
                +{formatCurrencyCLP(caja.tarjeta)}
              </span>
            </div>
            <div className='flex justify-between items-center text-xs'>
              <span className='text-slate-400 font-medium italic'>Transferencia</span>
              <span className='font-semibold tabular-nums text-slate-600 dark:text-slate-300'>
                +{formatCurrencyCLP(caja.transferencia)}
              </span>
            </div>
          </div>

          <div className='pt-2'>
            <div className='flex flex-col items-center justify-center p-4 bg-black/2 dark:bg-white/2 rounded-2xl border border-black/5 dark:border-white/5'>
              <span className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1'>
                Balance Actual
              </span>
              <span
                className={`text-2xl font-black tabular-nums tracking-tight ${balanceActual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
              >
                {formatCurrencyCLP(balanceActual)}
              </span>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-2.5 pt-2'>
          {canViewDetails && (
            <Button
              variant='default'
              onClick={() => onViewDetails(caja)}
              className='w-full rounded-2xl h-11 bg-black text-white hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95 font-bold shadow-lg shadow-black/10'
            >
              <Eye className='w-4 h-4 mr-2' />
              Detalle de Caja
            </Button>
          )}

          {caja.estado === 1 && (
            <div className='grid grid-cols-2 gap-2'>
              {canRetirar && onRetirar && (
                <Button
                  variant='outline'
                  onClick={() => onRetirar(caja)}
                  className='rounded-2xl h-11 border-slate-200 dark:border-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all hover:scale-[1.02] active:scale-95 font-bold'
                >
                  <ArrowDownCircle className='w-4 h-4 mr-2' />
                  Retirar
                </Button>
              )}
              {canCloseCaja && (
                <Button
                  variant='outline'
                  onClick={() => onCloseCaja(caja)}
                  className='rounded-2xl h-11 border-slate-200 dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400 transition-all hover:scale-[1.02] active:scale-95 font-bold'
                >
                  <Lock className='w-4 h-4 mr-2' />
                  Cerrar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
