import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

export const GET = withAppApiWrapper(async () => {
  const data = await query('SELECT * FROM ventas ORDER BY fecha_crea DESC LIMIT 5');
  return NextResponse.json({ success: true, data });
});
