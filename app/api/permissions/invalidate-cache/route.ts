import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { PermissionsCache } from '@/lib/auth/permissions-cache';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const POST = withRoute({ auth: true, access: 'administrator', audit: true }, async () => {
  PermissionsCache.clear();
  // Sin este evento los clientes seguirían operando con sus permisos viejos hasta
  // recargar la página; el hook los hace refrescar al instante.
  sendNotificationToAll('permissions-updated', { source: 'invalidate-cache' });

  return NextResponse.json({
    success: true,
    message:
      'Caché de permisos invalidado. Los usuarios verán sus nuevos permisos en el próximo request.'
  });
});
