import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/utils/logger';

/**
 * POST /api/csp-violation
 *
 * Endpoint que recibe reportes de violaciones CSP del navegador.
 * Los reportes se registran en el logger para monitoreo y depuración
 * de políticas de seguridad de contenido.
 *
 * Referencia CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json().catch(() => ({}));

    const cspReport = report['csp-report'] || report;

    logger.warn('[CSP Violation]', {
      'blocked-uri': cspReport['blocked-uri'] || 'unknown',
      'document-uri': cspReport['document-uri'] || 'unknown',
      'violated-directive': cspReport['violated-directive'] || 'unknown',
      'effective-directive': cspReport['effective-directive'] || 'unknown',
      'original-policy': cspReport['original-policy']?.substring(0, 200) || 'unknown',
      'source-file': cspReport['source-file'] || 'unknown',
      'line-number': cspReport['line-number'] || 'unknown',
      'column-number': cspReport['column-number'] || 'unknown',
      'disposition': cspReport['disposition'] || 'unknown',
      'user-agent': request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.captureException(error, { context: 'CSP Violation Report' });
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
