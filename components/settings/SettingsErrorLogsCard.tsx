'use client';

import { AlertTriangle } from 'lucide-react';
import Paginate from '@/components/shared/Paginate';
import SelectElements from '@/components/shared/SelectElements';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { cardClass } from '@/components/settings/constants';
import type { ErrorLog } from '@/hooks/settings/useSettingsLogs';

interface SettingsErrorLogsCardProps {
  errorLogs: ErrorLog[];
  paginatedErrorLogs: ErrorLog[];
  errorPage: number;
  setErrorPage: (page: number) => void;
  errorPageSize: number;
  setErrorPageSize: (value: number) => void;
  errorTotalPages: number;
  loading: boolean;
  formatDate: (value?: string) => string;
  parseRequestBody: (value?: string | null) => string;
  getRangeLabel: (page: number, pageSize: number, total: number) => string;
}

export function SettingsErrorLogsCard({
  errorLogs,
  paginatedErrorLogs,
  errorPage,
  setErrorPage,
  errorPageSize,
  setErrorPageSize,
  errorTotalPages,
  loading,
  formatDate,
  parseRequestBody,
  getRangeLabel
}: SettingsErrorLogsCardProps) {
  return (
    <CollapsibleCard
      defaultOpen
      aria-label='Error Logs'
      className={cardClass}
      headerClassName='p-4 sm:px-5 sm:py-4'
      contentClassName='px-4 pb-4 sm:px-5 sm:pb-5'
      title={
        <div className='flex items-center gap-3'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950'>
            <AlertTriangle className='h-4 w-4 text-red-600 dark:text-red-400' />
          </div>
          <span className='text-base font-semibold leading-tight text-neutral-900 sm:text-lg dark:text-white'>
            Error Logs
          </span>
        </div>
      }
    >
        {loading ? (
          <div className='space-y-4'>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className='space-y-2 rounded-2xl border p-4'>
                <Skeleton className='h-4 w-1/3' />
                <Skeleton className='h-4 w-2/3' />
                <Skeleton className='h-20 w-full' />
              </div>
            ))}
          </div>
        ) : errorLogs.length === 0 ? (
          <div className='py-10 text-center text-zinc-500'>No hay error logs registrados.</div>
        ) : (
          <div className='space-y-4'>
            <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
              <p className='text-sm text-zinc-500'>
                {getRangeLabel(errorPage, errorPageSize, errorLogs.length)}
              </p>
              <SelectElements
                value={errorPageSize}
                onChange={value => {
                  setErrorPageSize(value);
                  setErrorPage(1);
                }}
                options={[5, 10, 20, 40]}
                label='Listar'
              />
            </div>

            <Accordion type='multiple' className='space-y-3'>
              {paginatedErrorLogs.map(log => (
                <AccordionItem
                  key={log.id}
                  value={log.id}
                  className='overflow-hidden rounded-2xl border border-red-100 bg-red-50/60 px-0 dark:border-red-950 dark:bg-red-950/20'
                >
                  <AccordionTrigger className='px-4 py-4 text-left hover:no-underline'>
                    <div className='flex w-full flex-col gap-3 pr-3 sm:flex-row sm:items-start sm:justify-between'>
                      <div className='min-w-0 space-y-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge className='w-fit bg-red-100 text-red-700 hover:bg-red-100'>
                            Error
                          </Badge>
                          <span className='text-xs font-medium uppercase tracking-[0.18em] text-red-700/80 dark:text-red-300/80'>
                            Click para expandir
                          </span>
                        </div>

                        <div>
                          <div className='font-semibold text-red-800 dark:text-red-300'>
                            {log.endpoint || 'Endpoint desconocido'}
                          </div>
                          <div className='mt-1 text-xs text-zinc-500'>
                            {formatDate(log.fecha_crea)}
                          </div>
                        </div>

                        <p className='line-clamp-2 text-sm text-zinc-700 dark:text-zinc-200'>
                          {log.error_message}
                        </p>
                      </div>

                      <div className='text-sm font-medium text-zinc-600 dark:text-zinc-300'>
                        Ver detalle completo
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className='px-4 pb-4'>
                    <div className='space-y-3 border-t border-red-100/80 pt-4 dark:border-red-900/60'>
                      <div>
                        <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                          Mensaje
                        </p>
                        <pre className='whitespace-pre-wrap wrap-break-word rounded-xl bg-white/90 p-3 text-sm text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
                          {log.error_message}
                        </pre>
                      </div>

                      {log.request_body && (
                        <div>
                          <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                            Request body
                          </p>
                          <pre className='overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl bg-white/90 p-3 text-xs text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
                            {parseRequestBody(log.request_body)}
                          </pre>
                        </div>
                      )}

                      {log.stack_trace && (
                        <div>
                          <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                            Stack trace
                          </p>
                          <pre className='overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl bg-white/90 p-3 text-xs text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
                            {log.stack_trace}
                          </pre>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {errorTotalPages > 1 && (
              <div className='flex justify-center'>
                <Paginate page={errorPage} totalPages={errorTotalPages} setPage={setErrorPage} />
              </div>
            )}
          </div>
        )}
    </CollapsibleCard>
  );
}
