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
    console.log('[image-utils] Upload directory ready:', UPLOAD_DIR);

    const fileName = `${baseName}_${Date.now()}.webp`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    console.log('[image-utils] Will save to:', filePath);

    let input: Buffer;

    if (typeof imageSource === 'string') {
      // Check if it's a data URL (base64)
      if (imageSource.startsWith('data:')) {
        console.log('[image-utils] Processing base64 data URL');
        // Extract the base64 data (remove the prefix like "data:image/jpeg;base64,")
        const base64Data = imageSource.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid base64 data URL');
        }
        input = Buffer.from(base64Data, 'base64');
        console.log('[image-utils] Base64 decoded, buffer size:', input.length);
      } else if (imageSource.startsWith('http')) {
        // It's a URL
        console.log('[image-utils] Processing HTTP URL:', imageSource);
        const response = await fetch(imageSource);
        if (!response.ok) throw new Error('Failed to fetch image from URL');
        const arrayBuffer = await response.arrayBuffer();
        input = Buffer.from(arrayBuffer);
        console.log('[image-utils] URL fetched, buffer size:', input.length);
      } else {
        // Assume it's a file path or other string, return as is
        console.log('[image-utils] Unknown string format, returning as filename:', imageSource);
        return imageSource;
      }
    } else {
      input = imageSource;
      console.log('[image-utils] Processing Buffer, size:', input.length);
    }

    await sharp(input)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(filePath);

    console.log('[image-utils] Image saved successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('[image-utils] Error processing image:', error);
    throw error;
  }
}
