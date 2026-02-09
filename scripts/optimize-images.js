const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Imágenes a optimizar
const images = [
  'placeholder-logo.png',
  'placeholder-user.jpg',
  'placeholder.jpg'
];

async function optimizeImages() {
  console.log('🖼️  Optimizando imágenes...\n');

  for (const img of images) {
    const input = path.join(publicDir, img);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(input)) {
      console.log(`⚠️  ${img} no encontrado, saltando...`);
      continue;
    }

    const ext = path.extname(img);
    const name = path.basename(img, ext);
    const outputWebP = path.join(publicDir, `${name}.webp`);
    const outputAvif = path.join(publicDir, `${name}.avif`);

    try {
      // Obtener info de la imagen original
      const metadata = await sharp(input).metadata();
      const originalSize = fs.statSync(input).size;

      // Convertir a WebP
      await sharp(input)
        .webp({ quality: 80 })
        .toFile(outputWebP);
      
      const webpSize = fs.statSync(outputWebP).size;
      const webpSavings = ((1 - webpSize / originalSize) * 100).toFixed(1);

      // Convertir a AVIF (mejor compresión)
      await sharp(input)
        .avif({ quality: 70 })
        .toFile(outputAvif);
      
      const avifSize = fs.statSync(outputAvif).size;
      const avifSavings = ((1 - avifSize / originalSize) * 100).toFixed(1);

      console.log(`✅ ${img}`);
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB (${metadata.width}x${metadata.height})`);
      console.log(`   WebP: ${(webpSize / 1024).toFixed(1)}KB (-${webpSavings}%)`);
      console.log(`   AVIF: ${(avifSize / 1024).toFixed(1)}KB (-${avifSavings}%)\n`);
    } catch (error) {
      console.error(`❌ Error optimizando ${img}:`, error.message);
    }
  }

  console.log('✨ Optimización completada!');
}

optimizeImages().catch(console.error);
