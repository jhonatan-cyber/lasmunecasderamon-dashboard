import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { clearAdminWhatsAppCache } from '@/lib/business/whatsappConfig';
import { clearTwilioConfigCache, TWILIO_CLAVES } from '@/lib/business/twilioConfig';

/** Lo que el GET devuelve en vez del Auth Token real: es un secreto. */
const AUTH_TOKEN_MASK = '••••••••••••';

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
  'propina_venta',
  'moneda',
  'facturacion_activada',
  'resolucion_sii',
  'ambiente',
  'timezone',
  'asistencia_hora_inicio',
  'asistencia_hora_fin',
  'threshold_producto_caro',
  'umbral_simple_hasta',
  'umbral_anfitriona_desde',
  'umbral_habitacion_desde',
  'split_tarjeta_venta',
  'split_tarjeta_propina',
  'shot_ml',
  'botella_ml',
  'shots_alerta',
  'admin_whatsapp',
  ...TWILIO_CLAVES
]);

const esClaveTwilio = (clave: string) => (TWILIO_CLAVES as readonly string[]).includes(clave);

function validateConfig(clave: string, valor: string): string | null {
  if (!VALID_CLAVES.has(clave)) {
    return `Clave desconocida: ${clave}`;
  }
  if (clave === 'impuesto_iva' || clave === 'propina_venta') {
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
  if (
    clave === 'threshold_producto_caro' ||
    clave === 'umbral_simple_hasta' ||
    clave === 'umbral_anfitriona_desde' ||
    clave === 'umbral_habitacion_desde' ||
    clave === 'split_tarjeta_venta' ||
    clave === 'split_tarjeta_propina'
  ) {
    const num = Number(valor);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      return `${clave} debe ser un número entero positivo`;
    }
  }
  if (clave === 'shot_ml') {
    const num = Number(valor);
    if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 1000) {
      return 'shot_ml debe ser un número entero entre 1 y 1000 (ml por shot)';
    }
  }
  if (clave === 'botella_ml') {
    const num = Number(valor);
    if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 10000) {
      return 'botella_ml debe ser un número entero entre 1 y 10000 (ml por botella)';
    }
  }
  if (clave === 'shots_alerta') {
    const num = Number(valor);
    if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 50) {
      return 'shots_alerta debe ser un número entero entre 1 y 50 (shots restantes)';
    }
  }
  if (clave === 'admin_whatsapp') {
    if (valor && !/^\+?\d{7,15}$/.test(valor.replace('whatsapp:', ''))) {
      return 'admin_whatsapp debe ser un número válido (ej: 59172419112)';
    }
  }
  // Credenciales de Twilio: vacío = seguir usando la variable de entorno.
  if (clave === 'twilio_account_sid' && valor) {
    if (!/^AC[0-9a-f]{32}$/i.test(valor.trim())) {
      return 'twilio_account_sid debe ser un Account SID de Twilio (empieza con AC y tiene 32 caracteres)';
    }
  }
  if (clave === 'twilio_auth_token' && valor) {
    if (!/^[A-Za-z0-9_\-]{16,128}$/.test(valor.trim())) {
      return 'twilio_auth_token debe ser un Auth Token válido de Twilio (mínimo 16 caracteres)';
    }
  }
  if (clave === 'twilio_whatsapp_number' && valor) {
    if (!/^\+?\d{7,15}$/.test(valor.replace('whatsapp:', '').trim())) {
      return 'twilio_whatsapp_number debe ser un número válido (ej: whatsapp:+14155238886)';
    }
  }
  return null;
}

async function updateConfig(clave: string, valor: string) {
  const [existing] = (await query('SELECT id FROM configuraciones WHERE clave = ? LIMIT 1', [
    clave
  ])) as any[];
  if (!existing) {
    const categoria = esClaveTwilio(clave)
      ? 'integraciones'
      : clave.startsWith('asistencia_')
        ? 'asistencia'
        : clave === 'threshold_producto_caro' ||
            clave === 'umbral_simple_hasta' ||
            clave === 'umbral_anfitriona_desde' ||
            clave === 'umbral_habitacion_desde'
          ? 'comisiones'
          : clave.startsWith('split_tarjeta_')
            ? 'comisiones'
            : clave === 'shot_ml' || clave === 'botella_ml' || clave === 'shots_alerta'
              ? 'bar'
              : clave === 'admin_whatsapp'
                ? 'sistema'
                : 'empresa';
    const tipo =
      clave.startsWith('asistencia_') ||
      clave === 'threshold_producto_caro' ||
      clave === 'umbral_simple_hasta' ||
      clave === 'umbral_anfitriona_desde' ||
      clave === 'umbral_habitacion_desde' ||
      clave.startsWith('split_tarjeta_') ||
      clave === 'shot_ml' ||
      clave === 'botella_ml' ||
      clave === 'shots_alerta'
        ? 'number'
        : 'text';
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

export const GET = withRoute({ auth: true, access: 'authenticated', audit: true }, async () => {
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

    // El Auth Token nunca sale en claro: se devuelve enmascarado y el PUT
    // lo ignora si llega igual (o vacío), así guardar no lo pisa.
    if (config.clave === 'twilio_auth_token' && typeof value === 'string' && value) {
      value = AUTH_TOKEN_MASK;
    }

    grouped[config.categoria][config.clave] = value;
  }

  return NextResponse.json({ success: true, data: grouped });
});

export const PUT = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (req: Request) => {
    const body = await req.json();
    const errors: string[] = [];

    // Batch mode: { configs: [{ clave, valor }] }
    if (body.configs && Array.isArray(body.configs)) {
      // `threshold_producto_caro` deprecado: alias de `umbral_habitacion_desde`.
      // Se sincronizan para no bifurcar el comportamiento.
      const expanded = [...body.configs];
      for (const { clave, valor } of body.configs) {
        if (clave === 'umbral_habitacion_desde') {
          expanded.push({ clave: 'threshold_producto_caro', valor: String(valor) });
        } else if (clave === 'threshold_producto_caro') {
          expanded.push({ clave: 'umbral_habitacion_desde', valor: String(valor) });
        }
      }
      for (const { clave, valor } of expanded) {
        if (!clave) continue;
        // El Auth Token llega enmascarado (o vacío) cuando no se tocó: no pisar el guardado.
        if (
          clave === 'twilio_auth_token' &&
          (!String(valor).trim() || String(valor) === AUTH_TOKEN_MASK)
        ) {
          continue;
        }
        const error = validateConfig(clave, String(valor));
        if (error) {
          errors.push(error);
          continue;
        }
        await updateConfig(clave, String(valor));
      }
      if (body.configs.some((c: any) => c.clave === 'admin_whatsapp')) clearAdminWhatsAppCache();
      if (body.configs.some((c: any) => esClaveTwilio(c.clave))) clearTwilioConfigCache();
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

    // Auth Token sin cambios (enmascarado o vacío): no hay nada que guardar.
    if (
      clave === 'twilio_auth_token' &&
      (!String(valor ?? '').trim() || String(valor) === AUTH_TOKEN_MASK)
    ) {
      return NextResponse.json({ success: true, message: 'Configuración sin cambios' });
    }

    const error = validateConfig(clave, String(valor));
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    await updateConfig(clave, String(valor));
    // Mantener alias deprecado sincronizado también en modo single.
    if (clave === 'umbral_habitacion_desde') {
      await updateConfig('threshold_producto_caro', String(valor));
    } else if (clave === 'threshold_producto_caro') {
      await updateConfig('umbral_habitacion_desde', String(valor));
    }

    if (clave === 'admin_whatsapp') clearAdminWhatsAppCache();
    if (esClaveTwilio(clave)) clearTwilioConfigCache();

    return NextResponse.json({ success: true, message: 'Configuración actualizada' });
  }
);
