'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import type { Client } from '@/types/client';

interface PrepaidBalancesFilters {
  search: string;
  page: number;
  pageSize: number;
}

interface PrepaidBalancesPage {
  clients: Client[];
  total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseClient(value: unknown): Client {
  if (!isRecord(value) || (typeof value.id !== 'string' && typeof value.id !== 'number')) {
    throw new Error('La respuesta contiene un cliente inválido');
  }

  const saldo = Number(value.saldo ?? 0);
  if (!Number.isFinite(saldo)) throw new Error('La respuesta contiene un saldo inválido');

  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    lastName: typeof value.lastName === 'string' ? value.lastName : '',
    run: typeof value.run === 'string' ? value.run : '',
    phone: typeof value.phone === 'string' ? value.phone : '',
    saldo,
    status: typeof value.status === 'number' ? value.status : undefined
  };
}

function parsePage(value: unknown): PrepaidBalancesPage {
  if (!isRecord(value) || value.success !== true || !Array.isArray(value.data)) {
    throw new Error('No se pudo interpretar la respuesta de saldos');
  }

  const total = Number(value.total);
  if (!Number.isInteger(total) || total < 0) {
    throw new Error('La respuesta contiene un total inválido');
  }

  return { clients: value.data.map(parseClient), total };
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === 'string') return body.message;
  } catch {
    // Usa el estado HTTP cuando la respuesta de error no contiene JSON.
  }

  return response.statusText || 'No se pudieron cargar los saldos prepago';
}

async function fetchPrepaidBalances(
  { search, page, pageSize }: PrepaidBalancesFilters,
  signal: AbortSignal
): Promise<PrepaidBalancesPage> {
  const params = new URLSearchParams({
    search,
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
    con_saldo: '1'
  });
  const response = await fetch(`/api/clients?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    signal
  });

  if (!response.ok) throw new Error(await getErrorMessage(response));

  const body: unknown = await response.json();
  return parsePage(body);
}

export function usePrepaidBalances(filters: PrepaidBalancesFilters) {
  const query = useQuery({
    queryKey: queryKeys.clients.list({
      view: 'prepaid-balances',
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize
    }),
    queryFn: ({ signal }) => fetchPrepaidBalances(filters, signal)
  });

  return {
    clients: query.data?.clients ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch
  };
}
