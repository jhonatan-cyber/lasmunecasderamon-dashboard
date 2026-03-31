import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

export async function GET() {
  try {
    const configs = await query(`
      SELECT id, clave, valor, descripcion, categoria, tipo
      FROM configuraciones
      ORDER BY categoria, clave
    `) as Array<{ id: number; clave: string; valor: string; descripcion: string; categoria: string; tipo: string }>;

    // Agrupar por categoría
    const grouped: Record<string, Record<string, string | number | boolean>> = {};
    
    for (const config of configs) {
      if (!grouped[config.categoria]) {
        grouped[config.categoria] = {};
      }
      
      // Convertir tipos apropiadamente
      let value: string | number | boolean = config.valor;
      if (config.tipo === 'number') {
        value = parseInt(config.valor) || 0;
      } else if (config.tipo === 'boolean') {
        value = config.valor === 'true' || config.valor === '1' || config.valor === 'yes';
      }
      
      grouped[config.categoria][config.clave] = value;
    }

    return NextResponse.json({
      success: true,
      data: grouped
    });

  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuraciones' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { clave, valor } = body;

    if (!clave) {
      return NextResponse.json({ error: 'Clave es requerida' }, { status: 400 });
    }

    await query(
      'UPDATE configuraciones SET valor = ?, fecha_mod = NOW() WHERE clave = ?',
      [String(valor), clave]
    );

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada'
    });

  } catch (error) {
    console.error('Error updating configuration:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}