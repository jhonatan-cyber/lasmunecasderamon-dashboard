// @ts-ignore - sharp 0.35 exports types via lib/index.d.ts, not dist/index.mjs
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { BusinessError } from '@/lib/errors/errors';

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
      const response = await fetch(imageSource);
      if (!response.ok)
        throw new BusinessError('Failed to fetch image from URL', 'IMAGE_FETCH_FAILED');
      const arrayBuffer = await response.arrayBuffer();
      input = Buffer.from(arrayBuffer);
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
