import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CajaWithUser } from '@/types/caja';
import {
  Eye,
  Lock,
  Wallet,
  ArrowDownCircle,
  User,
  Calendar,
  Clock,
  Send,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatDateTimeLabel, formatLongDateEs } from '@/lib/utils/calendarUtils';
import { totalCaja } from '@/lib/business/cajaEfectivo';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface CajaCardProps {
  caja: CajaWithUser;
  onViewDetails: (caja: CajaWithUser) => void;
  onCloseCaja: (caja: CajaWithUser) => void;
  onRetirar?: (caja: CajaWithUser) => void;
  /** Vuelve a mandar al administrador el aviso del cierre pendiente. */
  onResendAviso?: (caja: CajaWithUser) => void;
  /** El reenvío de **esta** caja está en vuelo. */
  reenviandoAviso?: boolean;
  /** Pide el cierre de nuevo: el administrador no respondió al pedido anterior. */
  onReabrirCierre?: (caja: CajaWithUser) => void;
  /** El segundo pedido de **esta** caja está en vuelo. */
  reabriendoCierre?: boolean;
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
  onResendAviso,
  reenviandoAviso = false,
  onReabrirCierre,
  reabriendoCierre = false,
  canCloseCaja = true,
  canRetirar = true,
  canViewDetails = true
}: CajaCardProps) => {
  const estadoInfo = getEstadoInfo(caja.estado);
  const Icon = estadoInfo.icon;

  // Cierre pedido y esperando al administrador: la caja sigue abierta, así que sin
  // este aviso la tarjeta se ve igual que un turno que nadie pidió cerrar.
  const cierrePendiente = caja.cierre_pendiente === true;
  const { time: horaSolicitud, date: fechaSolicitud } = caja.cierre_solicitado_en
    ? formatDateTimeLabel(caja.cierre_solicitado_en)
    : { time: '', date: '' };

  // El último aviso se sella al pedir el cierre y en cada reenvío. Si es distinto del
  // momento en que se pidió, hubo reenvíos: decirlo evita que el cajero insista a ciegas.
  const huboReenvio =
    !!caja.cierre_ultimo_aviso_en &&
    !!caja.cierre_solicitado_en &&
    caja.cierre_ultimo_aviso_en !== caja.cierre_solicitado_en;
  const horaUltimoAviso = huboReenvio
    ? formatDateTimeLabel(caja.cierre_ultimo_aviso_en as string).time
    : '';

  // Un solo cálculo del cajón, compartido con el detalle y con el diálogo de retiro.
  const balanceActual = totalCaja(caja);

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

        {cierrePendiente && (
          <div className='mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10'>
            <Clock className='w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400' />
            <div className='space-y-0.5'>
              <p className='text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400'>
                Cierre pendiente
              </p>
              <p className='text-[11px] font-medium leading-tight text-amber-800 dark:text-amber-300'>
                Pedido por {caja.cierre_solicitado_por || 'el cajero'}
                {horaSolicitud ? ` a las ${horaSolicitud} (${fechaSolicitud})` : ''}. La caja sigue
                abierta hasta que el administrador autorice.
              </p>
              {huboReenvio && (
                <p className='text-[10px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80'>
                  Último aviso reenviado: {horaUltimoAviso}
                </p>
              )}
              {onResendAviso && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => onResendAviso(caja)}
                  disabled={reenviandoAviso}
                  className='mt-1 h-7 rounded-full border-amber-300 bg-white/70 px-3 text-[11px] font-bold text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/20'
                >
                  {reenviandoAviso ? (
                    <Loader2 className='w-3 h-3 mr-1.5 animate-spin' />
                  ) : (
                    <Send className='w-3 h-3 mr-1.5' />
                  )}
                  {reenviandoAviso ? 'Reenviando…' : 'Reenviar aviso'}
                </Button>
              )}
              {caja.cierre_estancado && onReabrirCierre && (
                <div className='mt-2 space-y-1 border-t border-amber-200/70 pt-2 dark:border-amber-500/20'>
                  <p className='text-[11px] font-medium leading-tight text-amber-800 dark:text-amber-300'>
                    Nadie contestó el cierre: puedes pedirlo de nuevo y el aviso al administrador
                    vuelve a salir.
                  </p>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => onReabrirCierre(caja)}
                    disabled={reabriendoCierre}
                    className='mt-1 h-7 rounded-full border-amber-300 bg-white/70 px-3 text-[11px] font-bold text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/20'
                  >
                    {reabriendoCierre ? (
                      <Loader2 className='w-3 h-3 mr-1.5 animate-spin' />
                    ) : (
                      <RotateCcw className='w-3 h-3 mr-1.5' />
                    )}
                    {reabriendoCierre ? 'Pidiendo…' : 'Pedir cierre de nuevo'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
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
                  {cierrePendiente ? 'Cierre pedido' : 'Cerrar'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
