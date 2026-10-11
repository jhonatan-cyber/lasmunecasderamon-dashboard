import path from 'node:path';
import fs from 'node:fs/promises';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (
    !filename ||
    filename !== path.basename(filename) ||
    filename.includes('\\') ||
    filename.includes('..')
  ) {
    return Response.json(
      { success: false, message: 'Nombre de archivo inválido' },
      { status: 400 }
    );
  }
  const mimeTypes: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
  };
  const contentType = mimeTypes[path.extname(filename).toLowerCase()];
  if (!contentType) return new Response(null, { status: 404 });
  try {
    const image = await fs.readFile(path.join(process.cwd(), 'public', 'img', 'users', filename));
    return new Response(new Uint8Array(image), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return new Response(null, {
      status: code === 'ENOENT' ? 404 : 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
