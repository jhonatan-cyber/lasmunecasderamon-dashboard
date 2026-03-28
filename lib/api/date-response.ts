import { NextResponse } from 'next/server';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

const RAW_SQL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RAW_SQL_DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i;

export const normalizeDateValueForResponse = (value: unknown): unknown => {
  if (value == null) return value;

  if (value instanceof Date) {
    return getNowInBusinessTimezone(value);
  }

  if (typeof value === 'string') {
    if (RAW_SQL_DATE_RE.test(value) || RAW_SQL_DATETIME_RE.test(value)) {
      return value;
    }

    if (ISO_DATETIME_RE.test(value)) {
      return getNowInBusinessTimezone(value);
    }
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeDateValueForResponse(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        normalizeDateValueForResponse(entryValue)
      ])
    );
  }

  return value;
};

export const jsonWithNormalizedDates = (payload: unknown, init?: ResponseInit) =>
  NextResponse.json(normalizeDateValueForResponse(payload), init);

export const normalizeJsonResponseDates = async (response: Response): Promise<Response> => {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return response;
  }

  try {
    const cloned = response.clone();
    const payload = await cloned.json();
    const normalizedPayload = normalizeDateValueForResponse(payload);
    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(JSON.stringify(normalizedPayload), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    return response;
  }
};
