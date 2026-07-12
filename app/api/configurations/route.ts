import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

const VALID_CLAVES = new Set([
  'empresa_nombre',
  'empresa_rut',
  'empresa_direccion',
  'empresa_telefono',
  'empresa_email',
  'empresa_facebook',
  'empresa_instagram',
  'empresa_whatsapp',
  'empresa_tiktok',
  'impuesto_iva',
  'impuesto_propina',
  'moneda',
  'facturacion_activada',
  'resolucion_sii',
  'ambiente',
  'timezone',
  'asistencia_hora_inicio',
  'asistencia_hora_fin'
]);

function validateConfig(clave: string, valor: string): string | null {
  if (!VALID_CLAVES.has(clave)) {
    return `Clave desconocida: ${clave}`;
  }
  if (clave === 'impuesto_iva' || clave === 'impuesto_propina') {
    const num = Number(valor);
    if (isNaN(num) || num < 0 || num > 100) {
      return `${clave} debe estar entre 0 y 100`;
    }
  }
  if (clave === 'asistencia_hora_inicio' || clave === 'asistencia_hora_fin') {
    const num = Number(valor);
    if (isNaN(num) || num < 0 || num > 23 || !Number.isInteger(num)) {
      return `${clave} debe ser una hora válida entre 0 y 23`;
    }
  }
  return null;
}

async function updateConfig(clave: string, valor: string) {
  const [existing] = (await query('SELECT id FROM configuraciones WHERE clave = ? LIMIT 1', [
    clave
  ])) as any[];
  if (!existing) {
    const categoria = clave.startsWith('asistencia_') ? 'asistencia' : 'empresa';
    const tipo = clave.startsWith('asistencia_') ? 'number' : 'text';
    await query(
      'INSERT INTO configuraciones (id, clave, valor, categoria, tipo, fecha_crea, fecha_mod) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [crypto.randomUUID(), clave, String(valor), categoria, tipo]
    );
  } else {
    await query('UPDATE configuraciones SET valor = ?, fecha_mod = NOW() WHERE clave = ?', [
      String(valor),
      clave
    ]);
  }
}

export const GET = withAppAuth(async () => {
  const configs = (await query(`
    SELECT id, clave, valor, descripcion, categoria, tipo
    FROM configuraciones
    ORDER BY categoria, clave
  `)) as Array<{
    id: number;
    clave: string;
    valor: string;
    descripcion: string;
    categoria: string;
    tipo: string;
  }>;

  const grouped: Record<string, Record<string, string | number | boolean>> = {};

  for (const config of configs) {
    if (!grouped[config.categoria]) {
      grouped[config.categoria] = {};
    }

    let value: string | number | boolean = config.valor;
    if (config.tipo === 'number') {
      value = parseInt(config.valor) || 0;
    } else if (config.tipo === 'boolean') {
      value = config.valor === 'true' || config.valor === '1' || config.valor === 'yes';
    }

    grouped[config.categoria][config.clave] = value;
  }

  return NextResponse.json({ success: true, data: grouped });
});

export const PUT = withAppAuth(async (req: Request) => {
  const body = await req.json();
  const errors: string[] = [];

  // Batch mode: { configs: [{ clave, valor }] }
  if (body.configs && Array.isArray(body.configs)) {
    for (const { clave, valor } of body.configs) {
      if (!clave) continue;
      const error = validateConfig(clave, String(valor));
      if (error) {
        errors.push(error);
        continue;
      }
      await updateConfig(clave, String(valor));
    }
    return NextResponse.json({
      success: errors.length === 0,
      message:
        errors.length > 0
          ? `${errors.length} configuraciones ignoradas: ${errors.join(', ')}`
          : `${body.configs.length} configuraciones actualizadas`,
      errors: errors.length > 0 ? errors : undefined
    });
  }

  // Single mode (backwards compatible)
  const { clave, valor } = body;
  if (!clave) {
    return NextResponse.json({ success: false, error: 'Clave es requerida' }, { status: 400 });
  }

  const error = validateConfig(clave, String(valor));
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  await updateConfig(clave, String(valor));

  return NextResponse.json({ success: true, message: 'Configuración actualizada' });
});
