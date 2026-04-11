import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    const filePath = path.join(process.cwd(), 'public', 'img', 'users', filename);

    let imageBuffer: Buffer;
    let contentType = 'image/jpeg';

    try {
      await fs.access(filePath);
      imageBuffer = await fs.readFile(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      contentType = mimeTypes[ext] || 'image/jpeg';
    } catch {
      const defaultPath = path.join(process.cwd(), 'public', 'img', 'users', 'default.png');
      try {
        imageBuffer = await fs.readFile(defaultPath);
        contentType = 'image/png';
      } catch {
        return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
      }
    }

    return new Response(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
