import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { clearAdminWhatsAppCache } from '@/lib/business/whatsappConfig';
import { clearTwilioConfigCache, TWILIO_CLAVES } from '@/lib/business/twilioConfig';
import {
  CLAVES_CON_CACHE,
  aliasDeClave,
  categoriaDeClave,
  definicionDe,
  validarConfig as validarClaveDeRegistro
} from '@/lib/configuraciones/registroClaves';

/** Lo que el GET devuelve en vez del Auth Token real: es un secreto. */
const AUTH_TOKEN_MASK = '••••••••••••';

const esClaveTwilio = (clave: string) => (TWILIO_CLAVES as readonly string[]).includes(clave);

/**
 * La regla de cada clave vive en `lib/configuraciones/registroClaves.ts`; acá sólo se
 * traduce al mensaje que devolvía el endpoint (los mensajes son parte del contrato con los
 * formularios, que los muestran tal cual).
 */
function validateConfig(clave: string, valor: string): string | null {
  return validarClaveDeRegistro(clave, valor);
}

async function updateConfig(clave: string, valor: string) {
  const [existing] = (await query('SELECT id FROM configuraciones WHERE clave = ? LIMIT 1', [
    clave
  ])) as any[];
  if (!existing) {
    // Categoría y tipo salen del registro: la categoría es una propiedad de la clave, no
    // de la fila que la creó. Antes salían de ternarios anidados y `impuesto_iva`,
    // `moneda`, `ambiente` y `timezone` se guardaban bajo `empresa` aunque el volcado base
    // las deja en `facturacion` y `sistema`: el GET las devolvía donde nadie las leía.
    const definicion = definicionDe(clave);
    await query(
      'INSERT INTO configuraciones (id, clave, valor, categoria, tipo, fecha_crea, fecha_mod) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [
        crypto.randomUUID(),
        clave,
        String(valor),
        definicion?.categoria ?? 'sistema',
        definicion?.tipo ?? 'text'
      ]
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
    // La categoría es de la clave (registro), no de la fila: una fila guardada antes de
    // que existiera el registro bajo otra categoría aparece igual donde la buscan las
    // pantallas. Las claves que no están en el registro (p. ej. el `impuesto_propina`
    // histórico del volcado) conservan la que tengan guardada.
    const categoria = categoriaDeClave(config.clave) ?? config.categoria;
    if (!grouped[categoria]) {
      grouped[categoria] = {};
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

    grouped[categoria][config.clave] = value;
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
      // Alias deprecados (`threshold_producto_caro` ⇄ `umbral_habitacion_desde`): según
      // el registro, guardar una escribe la otra con el mismo valor.
      const expanded = [...body.configs];
      for (const { clave, valor } of body.configs) {
        const alias = aliasDeClave(clave);
        if (alias) expanded.push({ clave: alias, valor: String(valor) });
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
      if (body.configs.some((c: any) => CLAVES_CON_CACHE.has(c.clave))) clearAdminWhatsAppCache();
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
    // Mantener el alias deprecado sincronizado también en modo single.
    const alias = aliasDeClave(clave);
    if (alias) await updateConfig(alias, String(valor));

    if (CLAVES_CON_CACHE.has(clave)) clearAdminWhatsAppCache();
    if (esClaveTwilio(clave)) clearTwilioConfigCache();

    return NextResponse.json({ success: true, message: 'Configuración actualizada' });
  }
);
