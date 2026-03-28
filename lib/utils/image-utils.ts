import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');

export async function processAndSaveImage(
  imageSource: Buffer | string,
  baseName: string = 'product'
): Promise<string> {
  try {
    // Ensure directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const fileName = `${baseName}_${Date.now()}.webp`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    let input: Buffer;

    if (typeof imageSource === 'string') {
      // It's a URL
      const response = await fetch(imageSource);
      if (!response.ok) throw new Error('Failed to fetch image from URL');
      const arrayBuffer = await response.arrayBuffer();
      input = Buffer.from(arrayBuffer);
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
    console.error('Error processing image:', error);
    throw error;
  }
}
