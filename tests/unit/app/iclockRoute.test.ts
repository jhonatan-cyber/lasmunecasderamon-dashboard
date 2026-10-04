// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queryMock: vi.fn() }));
const procesar = vi.hoisted(() => ({ fn: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.queryMock,
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/modules/asistencia/biometrico/processBiometricEvent', () => ({
  procesarEventoBiometrico: procesar.fn
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

import { GET, POST } from '@/app/iclock/cdata/route';
import { PUBLIC_PATHS } from '@/lib/constants/route-permissions';

const autorizado = { id: 'dev-1', nombre: 'Puerta', marca: 'zkteco', serial: 'SERIE1' };

function instalarSerial(autorizadoSiempre: boolean) {
  db.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM biometric_devices')) return autorizadoSiempre ? [autorizado] : [];
    return [];
  });
}

const request = (metodo: 'GET' | 'POST', url: string, cuerpo?: string) =>
  new Request(url, {
    method: metodo,
    ...(cuerpo !== undefined ? { body: cuerpo } : {})
  });

beforeEach(() => {
  db.queryMock.mockReset().mockResolvedValue([]);
  procesar.fn.mockReset().mockResolvedValue({ resultado: 'registrado' });
});

describe('handshake ZKTeco', () => {
  it('responde 400 si el equipo no manda serial', async () => {
    const response = await GET(request('GET', 'http://localhost/iclock/cdata'));
    expect(response.status).toBe(400);
    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('rechaza un serial no dado de alta', async () => {
    instalarSerial(false);
    const response = await GET(request('GET', 'http://localhost/iclock/cdata?SN=intruso'));
    expect(response.status).toBe(401);
    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('acepta el handshake del serial autorizado', async () => {
    instalarSerial(true);
    const response = await GET(request('GET', 'http://localhost/iclock/cdata?SN=SERIE1'));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('GET OPTION FROM: SERIE1');
    expect(body).toContain('TransInterval=1');
  });
});

describe('eventos ATTLOG', () => {
  it('rechaza el push de un serial no autorizado', async () => {
    instalarSerial(false);
    const response = await POST(
      request(
        'POST',
        'http://localhost/iclock/cdata?SN=intruso&table=ATTLOG',
        '1\t2026-09-29 21:30:00\t1\t0\t'
      )
    );
    expect(response.status).toBe(401);
    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('procesa cada fila y responde OK para que el equipo de por enviado', async () => {
    instalarSerial(true);
    const cuerpo = ['1001\t2026-09-29 21:30:00\t1\t0\t', '1002\t2026-09-29 21:31:00\t15\t0\t'].join(
      '\n'
    );
    const response = await POST(
      request('POST', 'http://localhost/iclock/cdata?SN=SERIE1&table=ATTLOG', cuerpo)
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');
    expect(procesar.fn).toHaveBeenCalledTimes(2);
    expect(procesar.fn.mock.calls[0][0]).toMatchObject({ codigo: '1001', metodo: 'huella' });
    expect(procesar.fn.mock.calls[1][0]).toMatchObject({ codigo: '1002', metodo: 'cara' });
    expect(procesar.fn.mock.calls[0][1]).toMatchObject({ serial: 'SERIE1' });
  });

  it('acusa las tablas que no son asistencias sin procesarlas', async () => {
    instalarSerial(true);
    const response = await POST(
      request('POST', 'http://localhost/iclock/cdata?SN=SERIE1&table=OPERLOG', '1\talgo')
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');
    expect(procesar.fn).not.toHaveBeenCalled();
  });

  it('un fallo de un evento no detiene a los demas', async () => {
    instalarSerial(true);
    procesar.fn
      .mockRejectedValueOnce(new Error('db caida'))
      .mockResolvedValueOnce({ resultado: 'registrado' });
    const cuerpo = ['1001\t2026-09-29 21:30:00\t1\t0\t', '1002\t2026-09-29 21:31:00\t1\t0\t'].join(
      '\n'
    );
    const response = await POST(
      request('POST', 'http://localhost/iclock/cdata?SN=SERIE1&table=ATTLOG', cuerpo)
    );
    expect(response.status).toBe(200);
    expect(procesar.fn).toHaveBeenCalledTimes(2);
  });
});

describe('politica del middleware', () => {
  it('el camino del lector esta entre las rutas sin sesion', () => {
    expect(PUBLIC_PATHS).toContain('/iclock');
    expect(PUBLIC_PATHS).toContain('/dahua');
  });
});
