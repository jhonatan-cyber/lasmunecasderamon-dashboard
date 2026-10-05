import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    swagger: '2.0',
    info: { title: 'Las Muñecas de Ramon API', version: '1.0.0' },
    paths: {}
  });
}
