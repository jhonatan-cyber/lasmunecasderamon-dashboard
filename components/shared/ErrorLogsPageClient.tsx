'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import logger from '@/lib/utils/logger';

export function ErrorLogsPageClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/error-logs');
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } catch (error) {
      logger.captureException(error, { context: 'ErrorLogsPageClient:fetchLogs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <BoneyardSkeleton name="error-logs-main" loading={loading}>
    <div className='p-8'>
      <div className='flex justify-between items-center mb-4'>
        <h1 className='text-2xl font-bold'>Error Logs (ultimos 50)</h1>
        <Button onClick={fetchLogs}>Refrescar</Button>
      </div>

      {logs.length === 0 ? (
        <p className='text-gray-500'>No hay errores registrados</p>
      ) : (
        <div className='space-y-4'>
          {logs.map(log => (
            <div key={log.id} className='border rounded-lg p-4 bg-red-50'>
              <div className='flex justify-between items-start mb-2'>
                <h3 className='font-semibold text-red-800'>{log.endpoint}</h3>
                <span className='text-sm text-gray-600'>{formatLongDateEs(log.fecha_crea)}</span>
              </div>

              <div className='mb-2'>
                <strong>Error:</strong>
                <pre className='bg-white p-2 rounded mt-1 text-sm overflow-auto'>
                  {log.error_message}
                </pre>
              </div>

              {log.request_body && (
                <div className='mb-2'>
                  <strong>Request Body:</strong>
                  <pre className='bg-white p-2 rounded mt-1 text-sm overflow-auto max-h-40'>
                    {JSON.stringify(JSON.parse(log.request_body), null, 2)}
                  </pre>
                </div>
              )}

              {log.stack_trace && log.stack_trace !== 'No stack trace' && (
                <details className='mt-2'>
                  <summary className='cursor-pointer font-semibold text-sm'>
                    Ver Stack Trace
                  </summary>
                  <pre className='bg-white p-2 rounded mt-1 text-xs overflow-auto max-h-60'>
                    {log.stack_trace}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </BoneyardSkeleton>
  );
}
