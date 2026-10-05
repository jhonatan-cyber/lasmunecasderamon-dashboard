import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { clearAdminWhatsAppCache } from '@/lib/business/whatsappConfig';
import { clearTwilioConfigCache, TWILIO_CLAVES } from '@/lib/business/twilioConfig';
import { guardarClave, listarConfiguracionesAgrupadas } from '@/modules/configuracion';
import { CLAVES_CON_CACHE, aliasDeClave } from '@/modules/configuracion/contracts';

/** Lo que el GET devuelve en vez del Auth Token real: es un secreto. */
const AUTH_TOKEN_MASK = '••••••••••••';

const esClaveTwilio = (clave: string) => (TWILIO_CLAVES as readonly string[]).includes(clave);

export const GET = withRoute({ auth: true, access: 'authenticated', audit: true }, async () => {
  return NextResponse.json({ success: true, data: await listarConfiguracionesAgrupadas() });
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
        const error = await guardarClave(clave, String(valor));
        if (error) {
          errors.push(error);
          continue;
        }
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

    const error = await guardarClave(clave, String(valor));
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Mantener el alias deprecado sincronizado también en modo single.
    const alias = aliasDeClave(clave);
    if (alias) await guardarClave(alias, String(valor));

    if (CLAVES_CON_CACHE.has(clave)) clearAdminWhatsAppCache();
    if (esClaveTwilio(clave)) clearTwilioConfigCache();

    return NextResponse.json({ success: true, message: 'Configuración actualizada' });
  }
);
