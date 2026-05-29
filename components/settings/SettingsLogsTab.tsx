'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import Paginate from '@/components/shared/Paginate';
import SelectElements from '@/components/shared/SelectElements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logger from '@/lib/utils/logger';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/shared/Skeletons';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';

type AuditLog = {
  id: string;
  user_id?: string | null;
  usuario_nombre?: string;
  usuario_nick?: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: string | null;
  ip_address?: string;
  created_at?: string;
};

type ErrorLog = {
  id: string;
  endpoint: string;
  error_message: string;
  stack_trace?: string | null;
  request_body?: string | null;
  fecha_crea?: string;
};

const cardClass =
  'border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden';

export function SettingsLogsTab() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [errorPage, setErrorPage] = useState(1);
  const [errorPageSize, setErrorPageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const [auditRes, errorRes] = await Promise.all([
        fetch('/api/audit-logs?limit=200'),
        fetch('/api/error-logs')
      ]);

      const [auditJson, errorJson] = await Promise.all([auditRes.json(), errorRes.json()]);

      setAuditLogs(Array.isArray(auditJson?.data) ? auditJson.data : []);
      setErrorLogs(Array.isArray(errorJson?.data) ? errorJson.data : []);
    } catch (error) {
      logger.captureException(error, { context: 'SettingsLogsTab:fetchLogs' });
      setAuditLogs([]);
      setErrorLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, []);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(auditLogs.length / auditPageSize));
    if (auditPage > nextTotalPages) {
      setAuditPage(nextTotalPages);
    }
  }, [auditLogs.length, auditPage, auditPageSize]);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(errorLogs.length / errorPageSize));
    if (errorPage > nextTotalPages) {
      setErrorPage(nextTotalPages);
    }
  }, [errorLogs.length, errorPage, errorPageSize]);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const { date, time } = formatDateTimeDmyLabel(value);
    return `${date} ${time}`;
  };

  const parseRequestBody = (value?: string | null) => {
    if (!value) return '—';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  };

  const parseDetails = (value?: string | null) => {
    if (!value) return '—';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  };

  const auditTotalPages = Math.max(1, Math.ceil(auditLogs.length / auditPageSize));
  const errorTotalPages = Math.max(1, Math.ceil(errorLogs.length / errorPageSize));

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return auditLogs.slice(start, start + auditPageSize);
  }, [auditLogs, auditPage, auditPageSize]);

  const paginatedErrorLogs = useMemo(() => {
    const start = (errorPage - 1) * errorPageSize;
    return errorLogs.slice(start, start + errorPageSize);
  }, [errorLogs, errorPage, errorPageSize]);

  const getRangeLabel = (page: number, pageSize: number, total: number) => {
    if (total === 0) return '0 registros';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `Mostrando ${start}-${end} de ${total} registros`;
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-black dark:text-neutral-100'>
            Logs del Sistema
          </h2>
          <p className='mt-1 text-sm sm:text-base text-zinc-600 dark:text-neutral-300'>
            Revisá auditoría de accesos y errores recientes del sistema.
          </p>
        </div>

        <Button
          onClick={() => fetchLogs(false)}
          disabled={refreshing}
          className='w-full rounded-full sm:w-auto'
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar logs
        </Button>
      </div>

      <Card className={cardClass}>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <ShieldCheck className='h-5 w-5 text-blue-600' />
            Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='space-y-3'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className='grid grid-cols-6 gap-3'>
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-full' />
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className='py-10 text-center text-zinc-500'>No hay audit logs registrados.</div>
          ) : (
            <div className='space-y-4'>
              <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
                <p className='text-sm text-zinc-500'>
                  {getRangeLabel(auditPage, auditPageSize, auditLogs.length)}
                </p>
                <SelectElements
                  value={auditPageSize}
                  onChange={value => {
                    setAuditPageSize(value);
                    setAuditPage(1);
                  }}
                  options={[5, 10, 20, 40]}
                  label='Listar'
                />
              </div>

              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAuditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className='flex flex-col'>
                            <span className='font-medium'>
                              {log.usuario_nombre || log.usuario_nick || log.user_id || 'Sistema'}
                            </span>
                            {log.usuario_nick && (
                              <span className='text-xs text-zinc-500'>@{log.usuario_nick}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='font-medium'>{log.action || '—'}</TableCell>
                        <TableCell>
                          <div className='flex flex-col'>
                            <span>{log.resource_type || '—'}</span>
                            {log.resource_id && (
                              <span className='text-xs text-zinc-500'>{log.resource_id}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{log.ip_address || '—'}</TableCell>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>
                          <details>
                            <summary className='cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-300'>
                              Ver detalle
                            </summary>
                            <pre className='mt-2 max-w-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
                              {parseDetails(log.details)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {auditTotalPages > 1 && (
                <div className='flex justify-center'>
                  <Paginate page={auditPage} totalPages={auditTotalPages} setPage={setAuditPage} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <AlertTriangle className='h-5 w-5 text-red-600' />
            Error Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                          <pre className='whitespace-pre-wrap break-words rounded-xl bg-white/90 p-3 text-sm text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
                            {log.error_message}
                          </pre>
                        </div>

                        {log.request_body && (
                          <div>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                              Request body
                            </p>
                            <pre className='overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/90 p-3 text-xs text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
                              {parseRequestBody(log.request_body)}
                            </pre>
                          </div>
                        )}

                        {log.stack_trace && (
                          <div>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                              Stack trace
                            </p>
                            <pre className='overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/90 p-3 text-xs text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
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
        </CardContent>
      </Card>
    </div>
  );
}
