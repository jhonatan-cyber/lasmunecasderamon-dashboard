// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

const db = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: any) => r }));

vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockResolvedValue({ id: 'u-1', role: 'administrador', permissions: {} })
}));

vi.mock('@/modules/auditoria/registro/servicio', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/modules/auditoria/errores/servicio', () => ({
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = {
    error: vi.fn(),
    captureException: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };
  return { logger: mocks, default: mocks };
});

vi.mock('@/lib/database/db', () => ({ query: db.query }));

import { GET, PUT } from '@/app/api/configurations/route';

const call = (handler: any, url: string, init?: RequestInit) =>
  handler(new Request(url, init), { params: {} });

const putJson = (body: unknown) =>
  call(PUT, 'http://localhost/api/configurations', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.query.mockResolvedValue([]);
});

describe('PUT /api/configurations · shot_ml', () => {
  it('crea shot_ml en la categoría bar con tipo number cuando no existe', async () => {
    db.query.mockResolvedValueOnce([]); // SELECT id → sin fila previa
    const res = await putJson({ clave: 'shot_ml', valor: '45' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const insertCall = db.query.mock.calls.find(([sql]) => /INSERT INTO configuraciones/.test(sql));
    expect(insertCall).toBeTruthy();
    const params = insertCall![1] as unknown[];
    expect(params.slice(1)).toEqual(['shot_ml', '45', 'bar', 'number']);
  });

  it('actualiza el valor cuando la clave ya existe', async () => {
    db.query.mockResolvedValueOnce([{ id: 7 }]);
    const res = await putJson({ clave: 'shot_ml', valor: '60' });

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE configuraciones SET valor'),
      ['60', 'shot_ml']
    );
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO configuraciones'),
      expect.anything()
    );
  });

  it('rechaza valores fuera de rango o no enteros sin tocar la base', async () => {
    for (const valor of ['0', '1500', '45.5', 'abc', '', '-10']) {
      const res = await putJson({ clave: 'shot_ml', valor });
      const body = await res.json();

      expect(res.status, `valor inválido: "${valor}"`).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('shot_ml');
    }
    expect(db.query).not.toHaveBeenCalled();
  });

  it('acepta el rango completo 1..1000', async () => {
    for (const valor of ['1', '50', '1000']) {
      db.query.mockResolvedValueOnce([]);
      const res = await putJson({ clave: 'shot_ml', valor });
      expect(res.status, `valor válido: "${valor}"`).toBe(200);
    }
  });

  it('modo batch: guarda shot_ml y reporta las claves desconocidas', async () => {
    db.query.mockResolvedValue([]);
    const res = await putJson({
      configs: [
        { clave: 'shot_ml', valor: '55' },
        { clave: 'no_existe', valor: '1' }
      ]
    });
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(body.errors).toEqual(['Clave desconocida: no_existe']);

    const insertCall = db.query.mock.calls.find(([sql]) => /INSERT INTO configuraciones/.test(sql));
    expect((insertCall![1] as unknown[]).slice(1)).toEqual(['shot_ml', '55', 'bar', 'number']);
  });

  it('sigue rechazando claves desconocidas en modo single', async () => {
    const res = await putJson({ clave: 'ml_por_shot', valor: '50' });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Clave desconocida: ml_por_shot');
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('PUT /api/configurations · botella_ml', () => {
  it('crea botella_ml en la categoría bar con tipo number', async () => {
    db.query.mockResolvedValueOnce([]);
    const res = await putJson({ clave: 'botella_ml', valor: '1000' });

    expect(res.status).toBe(200);
    const insertCall = db.query.mock.calls.find(([sql]) => /INSERT INTO configuraciones/.test(sql));
    expect((insertCall![1] as unknown[]).slice(1)).toEqual(['botella_ml', '1000', 'bar', 'number']);
  });

  it('rechaza capacidades fuera de rango (0, 10001, 1.5)', async () => {
    for (const valor of ['0', '10001', '1.5']) {
      const res = await putJson({ clave: 'botella_ml', valor });
      const body = await res.json();

      expect(res.status, `valor inválido: "${valor}"`).toBe(400);
      expect(body.error).toContain('botella_ml');
    }
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('PUT /api/configurations · shots_alerta', () => {
  it('crea shots_alerta en la categoría bar con tipo number', async () => {
    db.query.mockResolvedValueOnce([]);
    const res = await putJson({ clave: 'shots_alerta', valor: '3' });

    expect(res.status).toBe(200);
    const insertCall = db.query.mock.calls.find(([sql]) => /INSERT INTO configuraciones/.test(sql));
    expect((insertCall![1] as unknown[]).slice(1)).toEqual(['shots_alerta', '3', 'bar', 'number']);
  });

  it('rechaza la alerta fuera de rango (0, 51, 2.5)', async () => {
    for (const valor of ['0', '51', '2.5']) {
      const res = await putJson({ clave: 'shots_alerta', valor });
      const body = await res.json();

      expect(res.status, `valor inválido: "${valor}"`).toBe(400);
      expect(body.error).toContain('shots_alerta');
    }
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('GET /api/configurations · shot_ml', () => {
  it('agrupa shot_ml bajo la categoría bar y lo expone como número', async () => {
    db.query.mockResolvedValue([
      {
        id: 1,
        clave: 'shot_ml',
        valor: '45',
        descripcion: null,
        categoria: 'bar',
        tipo: 'number'
      }
    ]);

    const res = await call(GET, 'http://localhost/api/configurations');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.bar.shot_ml).toBe(45);
    expect(typeof body.data.bar.shot_ml).toBe('number');
  });

  it('agrupa botella_ml junto a shot_ml bajo la categoría bar', async () => {
    db.query.mockResolvedValue([
      {
        id: 1,
        clave: 'shot_ml',
        valor: '50',
        descripcion: null,
        categoria: 'bar',
        tipo: 'number'
      },
      {
        id: 2,
        clave: 'botella_ml',
        valor: '750',
        descripcion: null,
        categoria: 'bar',
        tipo: 'number'
      }
    ]);

    const res = await call(GET, 'http://localhost/api/configurations');
    const body = await res.json();

    expect(body.data.bar).toEqual({ shot_ml: 50, botella_ml: 750 });
  });
});

describe('PUT /api/configurations · credenciales de Twilio', () => {
  it('crea twilio_account_sid en la categoría integraciones como texto', async () => {
    db.query.mockResolvedValueOnce([]);
    const res = await putJson({ clave: 'twilio_account_sid', valor: 'AC' + 'a'.repeat(32) });

    expect(res.status).toBe(200);
    const insertCall = db.query.mock.calls.find(([sql]) => /INSERT INTO configuraciones/.test(sql));
    expect((insertCall![1] as unknown[]).slice(1)).toEqual([
      'twilio_account_sid',
      `AC${'a'.repeat(32)}`,
      'integraciones',
      'text'
    ]);
  });

  it('acepta los cuatro campos con valor vacío (= usar el .env)', async () => {
    db.query.mockResolvedValue([]);
    const res = await putJson({
      configs: [
        { clave: 'twilio_account_sid', valor: '' },
        { clave: 'twilio_auth_token', valor: '' },
        { clave: 'twilio_whatsapp_number', valor: '' },
        { clave: 'admin_whatsapp', valor: '' }
      ]
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('rechaza un Account SID que no sea de Twilio', async () => {
    const res = await putJson({ clave: 'twilio_account_sid', valor: 'no-es-un-sid' });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('twilio_account_sid');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rechaza un número de origen inválido', async () => {
    const res = await putJson({ clave: 'twilio_whatsapp_number', valor: 'hola-mundo' });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('twilio_whatsapp_number');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('un Auth Token demasiado corto no se guarda', async () => {
    const res = await putJson({ clave: 'twilio_auth_token', valor: 'corto' });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('twilio_auth_token');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('ignora el Auth Token cuando llega enmascarado o vacío', async () => {
    const enmascarado = await putJson({
      clave: 'twilio_auth_token',
      valor: '••••••••••••'
    });
    expect(enmascarado.status).toBe(200);
    expect((await enmascarado.json()).success).toBe(true);
    expect(db.query).not.toHaveBeenCalled();

    const vacio = await putJson({ clave: 'twilio_auth_token', valor: '' });
    expect(vacio.status).toBe(200);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('en modo batch también ignora el Auth Token enmascarado', async () => {
    db.query.mockResolvedValue([]);
    const res = await putJson({
      configs: [
        { clave: 'twilio_auth_token', valor: '••••••••••••' },
        { clave: 'twilio_account_sid', valor: 'AC' + 'b'.repeat(32) }
      ]
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const escribioToken = db.query.mock.calls.some(
      ([sql, params]) =>
        /INSERT INTO configuraciones|UPDATE configuraciones/.test(sql) &&
        (params as unknown[])?.includes('twilio_auth_token')
    );
    expect(escribioToken).toBe(false);
    const sidCall = db.query.mock.calls.find(([sql]) => /INSERT INTO configuraciones/.test(sql));
    expect((sidCall![1] as unknown[])[1]).toBe('twilio_account_sid');
  });
});

describe('GET /api/configurations · Auth Token', () => {
  it('devuelve el token enmascarado, nunca el valor real', async () => {
    db.query.mockResolvedValue([
      {
        id: 1,
        clave: 'twilio_auth_token',
        valor: 'secreto-real-del-token',
        descripcion: null,
        categoria: 'integraciones',
        tipo: 'text'
      }
    ]);

    const res = await call(GET, 'http://localhost/api/configurations');
    const body = await res.json();

    expect(body.data.integraciones.twilio_auth_token).toBe('••••••••••••');
    expect(JSON.stringify(body)).not.toContain('secreto-real-del-token');
  });
});
