import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Sanitize: prevent path traversal by resolving and verifying the path
    // stays within the intended products images directory
    const safeFilename = path.basename(filename);
    const productsDir = path.join(process.cwd(), 'public', 'img', 'products');
    const filePath = path.join(productsDir, safeFilename);

    // Double-check: resolved path must be inside productsDir
    if (!filePath.startsWith(productsDir + path.sep)) {
      return NextResponse.json(
        { success: false, message: 'Invalid filename' },
        { status: 400 }
      );
    }

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
      const defaultPath = path.join(process.cwd(), 'public', 'img', 'products', 'default.png');
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
