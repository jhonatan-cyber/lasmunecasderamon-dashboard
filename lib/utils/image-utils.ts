import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { BusinessError } from '@/lib/errors/errors';
import logger from '@/lib/utils/logger';

const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');
const USER_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'users');
const ORDER_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'orders');
const TICKET_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'tickets');
const SALE_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'sales');

type ImageProcessingOptions = {
  width?: number;
  height?: number;
  fit?: 'cover' | 'inside' | 'outside' | 'fill' | 'contain';
  position?: string;
  quality?: number;
  uploadDir?: string;
};

function resolveUploadDir(baseName: string, options?: ImageProcessingOptions): string {
  if (options?.uploadDir) return options.uploadDir;
  if (baseName.startsWith('order')) return ORDER_UPLOAD_DIR;
  if (baseName.startsWith('ticket')) return TICKET_UPLOAD_DIR;
  if (baseName.startsWith('sale')) return SALE_UPLOAD_DIR;
  return baseName.startsWith('user') ? USER_UPLOAD_DIR : PRODUCT_UPLOAD_DIR;
}

export const IMAGE_FETCH_TIMEOUT_MS = 10_000;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
function loggableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'URL inválida';
  }
}

async function fetchImageFromUrl(url: string): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      headers: { accept: 'image/*' }
    });
  } catch (error) {
    const name =
      typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    logger.warn('[ImageUtils] No se pudo descargar la imagen', {
      url: loggableUrl(url),
      motivo: timedOut ? `sin respuesta en ${IMAGE_FETCH_TIMEOUT_MS}ms` : 'error de conexión'
    });
    throw new BusinessError(
      timedOut
        ? `La URL de la imagen no respondió en ${IMAGE_FETCH_TIMEOUT_MS / 1000}s`
        : 'No se pudo conectar con la URL de la imagen',
      timedOut ? 'IMAGE_FETCH_TIMEOUT' : 'IMAGE_FETCH_FAILED'
    );
  }

  if (!response.ok) {
    logger.warn('[ImageUtils] La URL de la imagen respondió con error', {
      url: loggableUrl(url),
      status: response.status
    });
    throw new BusinessError(
      `La URL de la imagen respondió con estado ${response.status}`,
      'IMAGE_FETCH_FAILED'
    );
  }

  const contentType = (response.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (
    contentType &&
    !contentType.startsWith('image/') &&
    contentType !== 'application/octet-stream'
  ) {
    throw new BusinessError(
      `La URL no apunta a una imagen (devuelve ${contentType})`,
      'IMAGE_NOT_AN_IMAGE'
    );
  }

  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_IMAGE_BYTES) {
    throw new BusinessError(
      `La imagen supera los ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB`,
      'IMAGE_TOO_LARGE'
    );
  }

  const chunks: Buffer[] = [];
  let total = 0;
  const reader = response.body?.getReader();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel().catch(() => {});
        throw new BusinessError(
          `La imagen supera los ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB`,
          'IMAGE_TOO_LARGE'
        );
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new BusinessError(
      `La imagen supera los ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB`,
      'IMAGE_TOO_LARGE'
    );
  }
  return Buffer.from(arrayBuffer);
}

export async function imagenGuardadaABase64Jpeg(
  filename: string,
  dir: string = USER_UPLOAD_DIR
): Promise<string | null> {
  if (!filename || filename === 'default.png') return null;
  try {
    const buffer = filename.startsWith('http')
      ? await fetchImageFromUrl(filename)
      : await fs.readFile(path.join(dir, filename));
    const jpeg = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
    return jpeg.toString('base64');
  } catch (error) {
    logger.warn('[ImageUtils] No se pudo convertir la imagen guardada a JPEG', {
      filename: filename.startsWith('http') ? loggableUrl(filename) : filename,
      error
    });
    return null;
  }
}

export async function processAndSaveImage(
  imageSource: Buffer | string,
  baseName: string = 'product',
  options?: ImageProcessingOptions
): Promise<string> {
  const uploadDir = resolveUploadDir(baseName, options);

  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${baseName}_${Date.now()}.webp`;
  const filePath = path.join(uploadDir, fileName);

  let input: Buffer;

  if (typeof imageSource === 'string') {
    if (imageSource.startsWith('data:')) {
      const base64Data = imageSource.split(',')[1];
      if (!base64Data) {
        throw new BusinessError('Invalid base64 data URL', 'INVALID_IMAGE_DATA');
      }
      input = Buffer.from(base64Data, 'base64');
    } else if (imageSource.startsWith('http')) {
      input = await fetchImageFromUrl(imageSource);
    } else {
      return imageSource;
    }
  } else {
    input = imageSource;
  }

  await sharp(input)
    .resize(options?.width ?? 800, options?.height ?? 800, {
      fit: options?.fit ?? 'inside',
      position: options?.position as any,
      withoutEnlargement: true
    })
    .webp({ quality: options?.quality ?? 80 })
    .toFile(filePath);

  return fileName;
}

export type TipoBaucher = 'order' | 'ticket' | 'sale';
export async function guardarFotoBaucher(
  dataUrl: string,
  tipo: TipoBaucher,
  contexto: Record<string, unknown> = {}
): Promise<string> {
  try {
    return await processAndSaveImage(dataUrl, tipo, {
      width: 1600,
      height: 1600,
      fit: 'inside',
      quality: 85
    });
  } catch (error) {
    logger.error(`[ImageUtils] No se pudo guardar el baucher (${tipo}):`, { ...contexto, error });
    throw new BusinessError('No se pudo guardar la foto del baucher', 'BAUCHER_SAVE_FAILED');
  }
}
export async function eliminarFotoBaucher(
  filename: string,
  tipo: TipoBaucher,
  contexto: Record<string, unknown> = {}
): Promise<void> {
  if (!filename || path.basename(filename) !== filename) return;
  try {
    await fs.rm(path.join(resolveUploadDir(tipo), filename), { force: true });
  } catch (error) {
    logger.warn(`[ImageUtils] No se pudo borrar el baucher (${tipo}):`, { ...contexto, error });
  }
}

export async function processAndSaveProductImage(
  imageSource: Buffer | string,
  baseName: string = 'product'
): Promise<string> {
  return processAndSaveImage(imageSource, baseName);
}
