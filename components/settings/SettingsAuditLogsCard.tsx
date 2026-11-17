'use client';

import { ShieldCheck } from 'lucide-react';
import Paginate from '@/components/shared/Paginate';
import SelectElements from '@/components/shared/SelectElements';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cardClass } from '@/components/settings/constants';
import type { AuditLog } from '@/hooks/settings/useSettingsLogs';

interface SettingsAuditLogsCardProps {
  auditLogs: AuditLog[];
  paginatedAuditLogs: AuditLog[];
  auditPage: number;
  setAuditPage: (page: number) => void;
  auditPageSize: number;
  setAuditPageSize: (value: number) => void;
  auditTotalPages: number;
  loading: boolean;
  formatDate: (value?: string) => string;
  parseDetails: (value?: unknown) => string;
  getRangeLabel: (page: number, pageSize: number, total: number) => string;
}

export function SettingsAuditLogsCard({
  auditLogs,
  paginatedAuditLogs,
  auditPage,
  setAuditPage,
  auditPageSize,
  setAuditPageSize,
  auditTotalPages,
  loading,
  formatDate,
  parseDetails,
  getRangeLabel
}: SettingsAuditLogsCardProps) {
  return (
    <CollapsibleCard
      defaultOpen
      aria-label='Audit Logs'
      className={cardClass}
      headerClassName='p-4 sm:px-5 sm:py-4'
      contentClassName='px-4 pb-4 sm:px-5 sm:pb-5'
      title={
        <div className='flex items-center gap-3'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950'>
            <ShieldCheck className='h-4 w-4 text-blue-600 dark:text-blue-400' />
          </div>
          <span className='text-base font-semibold leading-tight text-neutral-900 sm:text-lg dark:text-white'>
            Audit Logs
          </span>
        </div>
      }
    >
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

          {/* Vista en cards para móvil */}
          <div className='space-y-3 md:hidden'>
            {paginatedAuditLogs.map(log => (
              <div
                key={log.id}
                className='rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900'
              >
                <div className='mb-3 flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='flex flex-col'>
                      <span className='font-medium text-neutral-900 dark:text-white'>
                        {log.usuario_nombre || log.usuario_nick || log.user_id || 'Sistema'}
                      </span>
                      {log.usuario_nick && (
                        <span className='text-xs text-zinc-500'>@{log.usuario_nick}</span>
                      )}
                    </div>
                  </div>
                  <span className='ml-2 shrink-0 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300'>
                    {log.action || '—'}
                  </span>
                </div>

                <div className='space-y-2 text-sm text-zinc-600 dark:text-zinc-300'>
                  <div className='flex items-center gap-2'>
                    <span className='w-16 shrink-0 text-xs font-medium text-zinc-500'>Recurso</span>
                    <span>
                      {log.resource_type || '—'}
                      {log.resource_id && (
                        <span className='ml-1 text-xs text-zinc-500'>{log.resource_id}</span>
                      )}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='w-16 shrink-0 text-xs font-medium text-zinc-500'>IP</span>
                    <span>{log.ip_address || '—'}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='w-16 shrink-0 text-xs font-medium text-zinc-500'>Fecha</span>
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                </div>

                {log.details && (
                  <details className='mt-3'>
                    <summary className='cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-300'>
                      Ver detalle
                    </summary>
                    <pre className='mt-2 max-w-[360px] overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
                      {parseDetails(log.details)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Vista en tabla para desktop */}
          <div className='hidden overflow-x-auto md:block'>
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
                        <pre className='mt-2 max-w-[360px] overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-slate-950 dark:text-zinc-200'>
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
    </CollapsibleCard>
  );
}
