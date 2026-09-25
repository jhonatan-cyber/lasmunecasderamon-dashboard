import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { BusinessError } from '@/lib/errors/errors';
import logger from '@/lib/utils/logger';

const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');
const USER_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'users');

type ImageProcessingOptions = {
  width?: number;
  height?: number;
  fit?: 'cover' | 'inside' | 'outside' | 'fill' | 'contain';
  position?: string;
  quality?: number;
  /** Override upload directory. Default depends on baseName prefix: 'user_' → users dir, else products dir. */
  uploadDir?: string;
};

function resolveUploadDir(baseName: string, options?: ImageProcessingOptions): string {
  if (options?.uploadDir) return options.uploadDir;
  return baseName.startsWith('user_') ? USER_UPLOAD_DIR : PRODUCT_UPLOAD_DIR;
}

// Exportadas para que los tests puedan calcular los límites sin duplicarlos.
export const IMAGE_FETCH_TIMEOUT_MS = 10_000;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** URL sin query ni fragmento: es lo que se registra al fallar (evita filtrar tokens por query). */
function loggableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'URL inválida';
  }
}

/**
 * Descarga una imagen remota referenciada por URL.
 *
 * El fallo se devuelve como `BusinessError`, y su mensaje llega tal cual al toast del
 * formulario, así que tiene que explicar qué salió mal: estado HTTP, content-type o
 * tiempo de espera agotado. También impone tiempo límite y tamaño máximo porque el
 * origen lo pone un usuario en un campo de texto.
 */
async function fetchImageFromUrl(url: string): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      headers: { accept: 'image/*' }
    });
  } catch (error) {
    // Se compara por `name` y no por `instanceof Error`: DOMException cruza realms y en
    // algunos entornos no es instanceof Error, con lo que un timeout real acabaría
    // clasificado como fallo de conexión.
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

  // Se lee en streaming: sin esto un origen sin Content-Length agotaría la memoria
  // antes de poder aplicar el límite.
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

// ponytail: convenience for product images (keeps existing defaults)
export async function processAndSaveProductImage(
  imageSource: Buffer | string,
  baseName: string = 'product'
): Promise<string> {
  return processAndSaveImage(imageSource, baseName);
}
