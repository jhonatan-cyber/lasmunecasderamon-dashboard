'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logger from '@/lib/utils/logger';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';

export type AuditLog = {
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

export type ErrorLog = {
  id: string;
  endpoint: string;
  error_message: string;
  stack_trace?: string | null;
  request_body?: string | null;
  fecha_crea?: string;
};

export function useSettingsLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [errorPage, setErrorPage] = useState(1);
  const [errorPageSize, setErrorPageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (showLoader = true) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(showLoader);
    setRefreshing(!showLoader);
    setError(null);

    try {
      const read = async (url: string) => {
        const response = await fetch(url, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || payload?.success === false || !Array.isArray(payload?.data))
          throw new Error(payload?.message || `Error al cargar ${url}`);
        return payload.data;
      };
      const results = await Promise.allSettled([
        read('/api/audit-logs?limit=200'),
        read('/api/error-logs')
      ]);
      if (controller.signal.aborted) return;
      if (results[0].status === 'fulfilled') setAuditLogs(results[0].value);
      if (results[1].status === 'fulfilled') setErrorLogs(results[1].value);
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length) {
        setError(
          'No se pudieron actualizar todos los registros. Se conservan los datos disponibles.'
        );
        failures.forEach(result => {
          if (result.status === 'rejected')
            logger.captureException(result.reason, { context: 'SettingsLogsTab:fetchLogs' });
        });
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsLogsTab:fetchLogs' });
      if (!controller.signal.aborted) setError('No se pudieron actualizar los registros');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchLogs(true);
    return () => request.current?.abort();
  }, [fetchLogs]);

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

  const parseDetails = (value?: unknown) => {
    if (!value) return '—';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '—';
      }
    }
    try {
      return JSON.stringify(JSON.parse(value as string), null, 2);
    } catch {
      return String(value);
    }
  };

  const getRangeLabel = (page: number, pageSize: number, total: number) => {
    if (total === 0) return '0 registros';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `Mostrando ${start}-${end} de ${total} registros`;
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

  return {
    auditLogs,
    errorLogs,
    auditPage,
    setAuditPage,
    auditPageSize,
    setAuditPageSize,
    errorPage,
    setErrorPage,
    errorPageSize,
    setErrorPageSize,
    loading,
    error,
    refreshing,
    fetchLogs,
    formatDate,
    parseRequestBody,
    parseDetails,
    getRangeLabel,
    auditTotalPages,
    errorTotalPages,
    paginatedAuditLogs,
    paginatedErrorLogs
  };
}
