import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');

export async function processAndSaveImage(
  imageSource: Buffer | string,
  baseName: string = 'product'
): Promise<string> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const fileName = `${baseName}_${Date.now()}.webp`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    let input: Buffer;

    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:')) {
        const base64Data = imageSource.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid base64 data URL');
        }
        input = Buffer.from(base64Data, 'base64');
      } else if (imageSource.startsWith('http')) {
        const response = await fetch(imageSource);
        if (!response.ok) throw new Error('Failed to fetch image from URL');
        const arrayBuffer = await response.arrayBuffer();
        input = Buffer.from(arrayBuffer);
      } else {
        return imageSource;
      }
    } else {
      input = imageSource;
    }

    await sharp(input)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(filePath);

    return fileName;
  } catch (error) {
    throw error;
  }
}
