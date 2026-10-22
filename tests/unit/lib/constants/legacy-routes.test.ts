// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGACY_ROUTE_REDIRECTS, legacyRedirectTarget } from '@/lib/constants/legacy-routes';
import { ROUTE_PERMISSIONS } from '@/lib/constants/route-permissions';
import { PROJECT_ROOT } from '../api/_walk-helpers';

/**
 * Guardián de la migración de rutas a inglés.
 *
 * Una URL no vive solo en el código: viaja en los links con token que ya se
 * enviaron por WhatsApp y en el QR de asistencia pegado en la puerta. El mapa de
 * `legacy-routes` es lo que mantiene esos enlaces vivos, y este test fija las dos
 * mitades del acuerdo:
 *
 *   - cada URL retirada apunta a una ruta que de verdad existe hoy (si no, el
 *     redirect lleva a un 404 y el link viejo sigue roto);
 *   - ninguna URL retirada volvió a ser una ruta viva (sería un redirect
 *     circular: la ruta existiría y el proxy la mandaría a otro lado).
 */

const existePagina = (ruta: string) =>
  fs.existsSync(path.join(PROJECT_ROOT, 'app', ruta.replace(/^\//, ''), 'page.tsx'));

const esApi = (ruta: string) => ruta.startsWith('/api/');

/** Rutas con permiso declarado que no tienen página propia (deuda anterior a esta migración). */
const RUTAS_SIN_PAGINA_CONOCIDAS = ['/inventory'];

describe('redirects de las URLs retiradas', () => {
  it('cada página retirada apunta a una página que existe', () => {
    const rotas: string[] = [];

    for (const [origen, destino] of Object.entries(LEGACY_ROUTE_REDIRECTS)) {
      if (esApi(origen)) continue;
      if (!existePagina(destino)) rotas.push(`${origen} → ${destino}`);
    }

    expect(
      rotas,
      `\nDestinos inexistentes (el link viejo terminaría en 404):\n${rotas.join('\n')}\n`
    ).toEqual([]);
  });

  it('cada API retirada apunta a un grupo de rutas que existe', () => {
    const rotas: string[] = [];

    for (const [origen, destino] of Object.entries(LEGACY_ROUTE_REDIRECTS)) {
      if (!esApi(origen)) continue;
      const carpeta = path.join(PROJECT_ROOT, 'app', destino.replace(/^\//, ''));
      if (!fs.existsSync(carpeta)) rotas.push(`${origen} → ${destino}`);
    }

    expect(rotas, `\nDestinos de API inexistentes:\n${rotas.join('\n')}\n`).toEqual([]);
  });

  it('ninguna URL retirada sigue siendo una ruta viva', () => {
    // Si la ruta vieja volviera a existir, el proxy la redirigiría igual y la página
    // nueva quedaría inalcanzable por esa URL: dos verdades para el mismo destino.
    const vivas = Object.keys(LEGACY_ROUTE_REDIRECTS).filter(origen =>
      esApi(origen)
        ? fs.existsSync(path.join(PROJECT_ROOT, 'app', origen.replace(/^\//, '')))
        : existePagina(origen)
    );

    expect(vivas, `\nEstas rutas se retiraron pero siguen en app/:\n${vivas.join('\n')}\n`).toEqual(
      []
    );
  });

  it('la URL retirada no se redirige a sí misma', () => {
    for (const [origen, destino] of Object.entries(LEGACY_ROUTE_REDIRECTS)) {
      expect(destino, `${origen} se apunta a sí misma`).not.toBe(origen);
      expect(destino.startsWith('/'), `${origen}: el destino debe ser una ruta absoluta`).toBe(
        true
      );
    }
  });
});

describe('legacyRedirectTarget', () => {
  it('resuelve la ruta exacta', () => {
    expect(legacyRedirectTarget('/colaciones')).toBe('/meals');
    expect(legacyRedirectTarget('/asistencia-qr')).toBe('/attendance-qr');
    expect(legacyRedirectTarget('/confirmar-anulacion')).toBe('/confirm-cancellation');
    expect(legacyRedirectTarget('/api/cuentas')).toBe('/api/accounts');
  });

  it('arrastra las subrutas, que es lo que salva a la app móvil y al MCP', () => {
    expect(legacyRedirectTarget('/colaciones/12')).toBe('/meals/12');
    expect(legacyRedirectTarget('/api/cuentas/7/cobrar')).toBe('/api/accounts/7/charge');
    expect(legacyRedirectTarget('/api/ventas/solicitud-anulacion')).toBe(
      '/api/sales/cancellation-request'
    );
    expect(legacyRedirectTarget('/api/anfitrionas/disponibles')).toBe('/api/hostesses/available');
    expect(legacyRedirectTarget('/api/attendance/hoy')).toBe('/api/attendance/today');
    expect(legacyRedirectTarget('/api/biometric/records/42/foto')).toBe(
      '/api/biometric/records/42/photo'
    );
  });

  it('gana la ruta más específica cuando una es prefijo de otra', () => {
    // `/confirmar-anulacion` es prefijo de sus dos hermanas: si ganara la corta,
    // el link de anulación de cuenta abriría la página genérica.
    expect(legacyRedirectTarget('/confirmar-anulacion-cuenta')).toBe(
      '/confirm-account-cancellation'
    );
    expect(legacyRedirectTarget('/confirmar-anulacion-servicio')).toBe(
      '/confirm-service-cancellation'
    );
  });

  it('no toca las rutas actuales ni las que solo comparten prefijo de texto', () => {
    for (const actual of [
      '/meals',
      '/tickets',
      '/gratifications',
      '/service-requests',
      '/api/accounts'
    ]) {
      expect(legacyRedirectTarget(actual), `${actual} se está redirigiendo`).toBeNull();
    }
    // Frontera de segmento: `/colacionesX` no es una subruta de `/colaciones`.
    expect(legacyRedirectTarget('/colacionesx')).toBeNull();
    expect(legacyRedirectTarget('/')).toBeNull();
  });

  it('cubre los enlaces externos que ya no se pueden reescribir', () => {
    // El QR impreso de la puerta y los seis links con token enviados por WhatsApp.
    const externos = [
      '/asistencia-qr',
      '/confirmar-anticipo',
      '/confirmar-anulacion',
      '/confirmar-anulacion-cuenta',
      '/confirmar-anulacion-servicio',
      '/confirmar-cierre-caja',
      '/confirmar-gratificacion'
    ];

    for (const ruta of externos) {
      expect(LEGACY_ROUTE_REDIRECTS[ruta], `${ruta} viaja en un QR o en un WhatsApp`).toBeDefined();
    }
  });
});

describe('las rutas declaradas existen en app/', () => {
  it('cada permiso de página tiene su page.tsx', () => {
    const huerfanas = Object.keys(ROUTE_PERMISSIONS).filter(
      ruta => !RUTAS_SIN_PAGINA_CONOCIDAS.includes(ruta) && !existePagina(ruta)
    );

    expect(
      huerfanas,
      `\nRutas con permiso declarado que no existen como página:\n${huerfanas.join('\n')}\n`
    ).toEqual([]);
  });

  it('cada destino del menú tiene su page.tsx', () => {
    // El sidebar y el mapa de permisos viven en archivos distintos; si este test
    // falla, un ítem del menú lleva a una ruta que ya no existe.
    const fuente = fs.readFileSync(
      path.join(PROJECT_ROOT, 'hooks/shell/useSidebarNavigation.ts'),
      'utf8'
    );
    const hrefs = [...fuente.matchAll(/href:\s*'([^']+)'/g)].map(match => match[1]);

    expect(hrefs.length).toBeGreaterThan(20);
    const rotas = hrefs.filter(href => !existePagina(href));
    expect(rotas, `\nDestinos del menú sin página:\n${rotas.join('\n')}\n`).toEqual([]);
  });
});
