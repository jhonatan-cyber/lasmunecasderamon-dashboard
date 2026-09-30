'use client';

import { memo } from 'react';
import { Calendar, Clock, Printer, Download, Send, Loader2, RotateCcw } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTimeLabel } from '@/lib/utils/calendarUtils';
import { getDiaSemana } from '@/components/caja/details/cajaDetailsModel';

/** Cierre pedido y todavía sin autorizar: quién lo pidió y desde cuándo. */
export interface CierrePendienteInfo {
  solicitadoPor: string | null;
  solicitadoEn: string | null;
  /** Nadie contestó dentro de la ventana de recordatorios: ya se puede pedir de nuevo. */
  estancado?: boolean;
}

/** Cabecera del modal: día, chip de estado y acciones Imprimir / Exportar PDF. */
export const CajaDetailsHeader = memo(function CajaDetailsHeader({
  fechaApertura,
  estadoInfo,
  cierrePendiente,
  onReenviarAviso,
  reenviandoAviso = false,
  onReabrirCierre,
  reabriendoCierre = false,
  onPrint,
  onExportPdf
}: {
  fechaApertura: string | Date;
  estadoInfo: { label: string; color: string };
  cierrePendiente?: CierrePendienteInfo | null;
  /** Vuelve a mandar al administrador el aviso del cierre pendiente. */
  onReenviarAviso?: () => void;
  reenviandoAviso?: boolean;
  /** Pide el cierre de nuevo (el administrador no respondió). */
  onReabrirCierre?: () => void;
  reabriendoCierre?: boolean;
  onPrint: () => void;
  onExportPdf: () => void;
}) {
  const solicitud = cierrePendiente?.solicitadoEn
    ? formatDateTimeLabel(cierrePendiente.solicitadoEn)
    : null;
  return (
    <DialogHeader className='p-6 pb-2 border-b shrink-0 bg-white dark:bg-slate-900 print:hidden'>
      <div className='flex items-center justify-between'>
        <DialogTitle className='text-xl font-bold text-slate-900 dark:text-white flex items-center gap-4'>
          <Calendar className='w-5 h-5 text-gray-500' />
          Detalles de Caja - {getDiaSemana(fechaApertura)}{' '}
          <Badge
            variant='secondary'
            className={`${estadoInfo.color} rounded-xl px-4 py-1 text-xs font-black uppercase tracking-widest border shadow-xs`}
          >
            {estadoInfo.label}
          </Badge>
        </DialogTitle>
        <div className='flex items-center gap-3 ml-auto'>
          <Button variant='outline' size='sm' className='rounded-full gap-2' onClick={onPrint}>
            <Printer className='w-4 h-4' />
            <span className='hidden sm:inline'>Imprimir</span>
          </Button>
          <Button variant='outline' size='sm' className='rounded-full gap-2' onClick={onExportPdf}>
            <Download className='w-4 h-4' />
            <span className='hidden sm:inline'>Exportar PDF</span>
          </Button>
        </div>
      </div>

      {cierrePendiente && (
        <div className='mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10'>
          <Clock className='w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400' />
          <div className='space-y-0.5'>
            <p className='text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400'>
              Cierre pendiente de autorización
            </p>
            <p className='text-[11px] font-medium leading-tight text-amber-800 dark:text-amber-300'>
              Pedido por {cierrePendiente.solicitadoPor || 'el cajero'}
              {solicitud ? ` a las ${solicitud.time} del ${solicitud.date}` : ''}. La caja sigue
              abierta: al autorizar, su monto de cierre descontará los saldos prepago que los
              clientes tengan cargados en ese momento.
            </p>
          </div>
          <div className='ml-auto flex shrink-0 flex-col items-end gap-1.5'>
            {onReenviarAviso && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={onReenviarAviso}
                disabled={reenviandoAviso}
                className='h-8 shrink-0 gap-2 rounded-full border-amber-300 bg-white/70 text-[11px] font-bold text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/20'
              >
                {reenviandoAviso ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Send className='w-3.5 h-3.5' />
                )}
                {reenviandoAviso ? 'Reenviando…' : 'Reenviar aviso'}
              </Button>
            )}
            {cierrePendiente.estancado && onReabrirCierre && (
              <>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={onReabrirCierre}
                  disabled={reabriendoCierre}
                  className='h-8 shrink-0 gap-2 rounded-full border-amber-300 bg-white/70 text-[11px] font-bold text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/20'
                >
                  {reabriendoCierre ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <RotateCcw className='w-3.5 h-3.5' />
                  )}
                  {reabriendoCierre ? 'Pidiendo…' : 'Pedir cierre de nuevo'}
                </Button>
                <p className='max-w-[190px] text-right text-[10px] font-medium leading-tight text-amber-700 dark:text-amber-400'>
                  Nadie contestó el cierre: pídelo de nuevo y el aviso vuelve a salir.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </DialogHeader>
  );
});
