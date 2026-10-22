/**
 * URLs retiradas al pasar las rutas de `app/` y de `/api/` a inglés.
 *
 * Una URL no es solo un `href` interno: hay tres clases de enlaces que ya están
 * circulando y no se pueden actualizar desde el código.
 *
 *  - los links con token que se envían por WhatsApp (anticipos, anulaciones,
 *    gratificaciones y la autorización del cierre de caja);
 *  - el QR impreso de asistencia (`/asistencia-qr`), pegado en la puerta;
 *  - los marcadores del personal y la app móvil, que llama a `/api/*`.
 *
 * Por eso el redirect vive acá y no en `next.config.mjs`: `proxy.ts` lo aplica
 * como primera instrucción, antes de mirar sesión o permisos. Si estuviera en la
 * configuración de rutas de Next, un visitante sin sesión que abriera un link
 * viejo de WhatsApp rebotaría a `/login` en vez de llegar al destino.
 *
 * Hay dos clases de retirada y cada una tiene su tabla:
 *
 *  - `LEGACY_ROUTE_REDIRECTS`: grupos completos que cambiaron de nombre
 *    (`/api/cuentas` → `/api/accounts`); se resuelven por prefijo de segmento.
 *  - `LEGACY_API_SEGMENTS`: segmentos internos que cambiaron dentro de su grupo
 *    (`/api/accounts/:id/cobrar` → `…/charge`); se resuelven por coincidencia
 *    exacta de segmento, porque el trozo que cambia va en medio de la ruta.
 */

/** Destino actual de una URL retirada. Las claves más largas ganan. */
export const LEGACY_ROUTE_REDIRECTS: Readonly<Record<string, string>> = {
  // Páginas por rol
  '/anfitriona-anticipos': '/hostess-advances',
  '/anfitriona-asistencias': '/hostess-attendance',
  '/anfitriona-calendar': '/hostess-calendar',
  '/anfitriona-comisiones': '/hostess-commissions',
  '/anfitriona-dashboard': '/hostess-dashboard',
  '/anfitriona-servicios': '/hostess-services',
  '/barman-anticipos': '/bartender-advances',
  '/barman-asistencias': '/bartender-attendance',
  '/barman-calendar': '/bartender-calendar',
  '/barman-horas-extras': '/bartender-overtime',
  '/barman-propinas': '/bartender-tips',
  '/cajero-anticipos': '/cashier-advances',
  '/cajero-asistencias': '/cashier-attendance',
  '/cajero-calendar': '/cashier-calendar',
  '/cajero-horas-extras': '/cashier-overtime',
  '/cajero-propinas': '/cashier-tips',
  '/garzon-anticipos': '/waiter-advances',
  '/garzon-asistencias': '/waiter-attendance',
  '/garzon-calendar': '/waiter-calendar',
  '/garzon-dashboard': '/waiter-dashboard',
  '/garzon-horas-extras': '/waiter-overtime',
  '/garzon-pedidos': '/waiter-orders',
  '/garzon-propinas': '/waiter-tips',

  // Páginas transversales
  '/asistencia-qr': '/attendance-qr',
  '/colaciones': '/meals',
  '/entradas': '/tickets',
  '/gratificaciones': '/gratifications',
  '/solicitudes-servicios': '/service-requests',

  // Confirmaciones por enlace de un solo uso
  '/confirmar-anticipo': '/confirm-advance',
  '/confirmar-anulacion': '/confirm-cancellation',
  '/confirmar-anulacion-cuenta': '/confirm-account-cancellation',
  '/confirmar-anulacion-servicio': '/confirm-service-cancellation',
  '/confirmar-cierre-caja': '/confirm-cash-closing',
  '/confirmar-gratificacion': '/confirm-gratification',

  // APIs: el prefijo arrastra a todas las subrutas
  '/api/anfitrionas': '/api/hostesses',
  '/api/anticipos': '/api/advances',
  '/api/caja': '/api/cash-register',
  '/api/colaciones': '/api/meals',
  '/api/cuentas': '/api/accounts',
  '/api/entradas': '/api/tickets',
  '/api/garzones': '/api/waiters',
  '/api/gratificaciones': '/api/gratifications',
  '/api/servicios': '/api/services',
  '/api/solicitudes-servicios': '/api/service-requests',
  '/api/ventas': '/api/sales'
};

/**
 * Segmentos internos de una API que cambiaron de nombre.
 *
 * `nuevo` es el nombre del grupo hoy; `segmentos` mapea cada segmento viejo que
 * quedaba en español dentro de ese grupo. La tabla usa nombres viejos porque su
 * trabajo es traducir lo que ya está circulando.
 *
 * Un solo segmento por posición se mapea, así que `anulacion`,
 * `procesar-anulacion` y `solicitud-anulacion` conviven sin ambigüedad: la
 * coincidencia es exacta por segmento, no por prefijo de texto.
 */
export interface LegacyApiGroup {
  /** Nombre actual del grupo bajo `/api/`. */
  nuevo: string;
  /** Segmentos internos viejos → actuales. */
  segmentos: Readonly<Record<string, string>>;
}

export const LEGACY_API_SEGMENTS: Readonly<Record<string, LegacyApiGroup>> = {
  accounts: {
    nuevo: 'accounts',
    segmentos: {
      anulacion: 'cancellation',
      'procesar-anulacion': 'process-cancellation',
      'solicitud-anulacion': 'cancellation-request',
      cobrar: 'charge',
      'cobrar-con-venta': 'charge-with-sale'
    }
  },
  advances: {
    nuevo: 'advances',
    segmentos: {
      aprobar: 'approve',
      maximo: 'max',
      'solicitud-detalles': 'request-details',
      solicitudes: 'requests'
    }
  },
  attendance: {
    nuevo: 'attendance',
    segmentos: {
      detalle: 'detail',
      hoy: 'today',
      masivo: 'bulk'
    }
  },
  biometric: {
    nuevo: 'biometric',
    segmentos: {
      foto: 'photo'
    }
  },
  'cash-register': {
    nuevo: 'cash-register',
    segmentos: {
      'ventas-barras': 'bar-sales',
      'ventas-champagne': 'champagne-sales',
      'ventas-por-producto': 'sales-by-product',
      'ventas-tragos-chicas': 'hostess-drinks'
    }
  },
  cashregister: {
    nuevo: 'cashregister',
    segmentos: {
      cierre: 'closing',
      'cierre-pdf': 'closing-pdf',
      reenviar: 'resend',
      'procesar-cierre': 'process-closing',
      'reporte-pdf': 'pdf-report',
      retiros: 'withdrawals',
      'solicitud-cierre': 'closing-request'
    }
  },
  clients: {
    nuevo: 'clients',
    segmentos: {
      devolucion: 'return',
      aprobar: 'approve',
      recordatorio: 'reminder',
      solicitudes: 'requests',
      prepago: 'prepaid'
    }
  },
  /** El grupo entero cambió: `/api/codigo/actual` → `/api/code/current`. */
  codigo: {
    nuevo: 'code',
    segmentos: {
      actual: 'current'
    }
  },
  /** El segmento `actual` sigue retirado aunque la llamada ya use el grupo nuevo. */
  code: {
    nuevo: 'code',
    segmentos: {
      actual: 'current'
    }
  },
  gratifications: {
    nuevo: 'gratifications',
    segmentos: {
      aprobar: 'approve',
      'solicitud-detalles': 'request-details'
    }
  },
  hostesses: {
    nuevo: 'hostesses',
    segmentos: {
      disponibles: 'available'
    }
  },
  meals: {
    nuevo: 'meals',
    segmentos: {
      regla: 'rule'
    }
  },
  mcp: {
    nuevo: 'mcp',
    segmentos: {
      solicitudes: 'requests'
    }
  },
  permissions: {
    nuevo: 'permissions',
    segmentos: {
      'setup-cajero': 'setup-cashier'
    }
  },
  sales: {
    nuevo: 'sales',
    segmentos: {
      anulacion: 'cancellation',
      'procesar-anulacion': 'process-cancellation',
      'solicitud-anulacion': 'cancellation-request'
    }
  },
  'service-requests': {
    nuevo: 'service-requests',
    segmentos: {
      aprobar: 'approve',
      rechazar: 'reject'
    }
  },
  services: {
    nuevo: 'services',
    segmentos: {
      anfitrionas: 'hostesses',
      anulacion: 'cancellation',
      'procesar-anulacion': 'process-cancellation',
      'solicitud-anulacion': 'cancellation-request',
      temporal: 'temporary'
    }
  },
  users: {
    nuevo: 'users',
    segmentos: {
      captura: 'capture',
      verificar: 'verify'
    }
  }
};

/** Claves ordenadas de más específica a más general, para resolver prefijos. */
const RUTAS_POR_ESPECIFICIDAD = Object.keys(LEGACY_ROUTE_REDIRECTS).sort(
  (a, b) => b.length - a.length
);

/**
 * Destino de una URL retirada, o `null` si la ruta ya es la actual.
 *
 * Coincide por ruta exacta o por prefijo de segmento (`/colaciones/123` →
 * `/meals/123`), con el mismo criterio que `matchesRoutePath`: `/colacionesx` no
 * es una subruta de `/colaciones`.
 */
export function legacyRouteTarget(pathname: string): string | null {
  for (const origen of RUTAS_POR_ESPECIFICIDAD) {
    const destino = LEGACY_ROUTE_REDIRECTS[origen];
    if (pathname === origen) return destino;
    if (pathname.startsWith(origen + '/')) return destino + pathname.slice(origen.length);
  }
  return null;
}

/**
 * Destino de una API con un segmento interno retirado, o `null`.
 *
 * La coincidencia es por segmento exacto, no por texto: un segmento que solo
 * empieza igual no se traduce, y `/api/reports/cash-register` no toca al grupo
 * `cash-register` porque va después de otro grupo.
 */
export function legacyApiTarget(pathname: string): string | null {
  if (!pathname.startsWith('/api/')) return null;

  const segmentos = pathname.slice('/api/'.length).split('/');
  const grupo = LEGACY_API_SEGMENTS[segmentos[0]];
  if (!grupo) return null;

  let cambió = false;
  if (grupo.nuevo !== segmentos[0]) {
    segmentos[0] = grupo.nuevo;
    cambió = true;
  }

  for (let i = 1; i < segmentos.length; i++) {
    const nuevo = grupo.segmentos[segmentos[i]];
    if (nuevo && nuevo !== segmentos[i]) {
      segmentos[i] = nuevo;
      cambió = true;
    }
  }

  return cambió ? '/api/' + segmentos.join('/') : null;
}

/**
 * Unificación para el proxy: agrupa completos y segmentos internos.
 *
 * Se encadena hasta el punto fijo porque una llamada vieja puede arrastrar las
 * dos capas de renombrado (`/api/cuentas/7/cobrar` cambió de grupo y de
 * segmento). Encadenar en memoria deja un solo 308 en vez de dos saltos.
 */
export function legacyRedirectTarget(pathname: string): string | null {
  let actual = pathname;
  let pasos = 0;

  for (; pasos < 4; pasos++) {
    const siguiente = legacyRouteTarget(actual) ?? legacyApiTarget(actual);
    if (!siguiente || siguiente === actual) break;
    actual = siguiente;
  }

  return pasos === 0 ? null : actual;
}
