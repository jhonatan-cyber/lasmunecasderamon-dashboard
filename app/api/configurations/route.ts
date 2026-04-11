import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

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
  const { clave, valor } = body;

  if (!clave) {
    return NextResponse.json({ success: false, error: 'Clave es requerida' }, { status: 400 });
  }

  await query('UPDATE configuraciones SET valor = ?, fecha_mod = NOW() WHERE clave = ?', [
    String(valor),
    clave
  ]);

  return NextResponse.json({ success: true, message: 'Configuración actualizada' });
});
