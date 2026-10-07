'use client';

import { useEffect, useState } from 'react';

const MAX_SIDE = 720;
const MIN_WHITE = 225;
const MAX_SAT = 30;
const MAX_CACHE = 150;

const processedCache = new Map<string, string>();

function productImageSource(src: string): string {
  if (!/^\/(?:api\/images|img)\/products\//.test(src)) return src;
  const url = new URL(src, 'http://product-photo.local');
  if (url.pathname.endsWith('/default.png')) return src;
  url.pathname = url.pathname.replace(/^\/img\/products\//, '/api/images/products/');
  url.searchParams.set('sin_fondo', '1');
  url.searchParams.set('recorte', '2');
  return `${url.pathname}${url.search}`;
}

function remember(src: string, dataUrl: string) {
  if (processedCache.size >= MAX_CACHE) {
    const oldest = processedCache.keys().next().value;
    if (oldest !== undefined) processedCache.delete(oldest);
  }
  processedCache.set(src, dataUrl);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image-load-failed'));
    image.src = src;
  });
}

async function stripWhiteBackground(src: string): Promise<string | null> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  let image: HTMLImageElement;
  try {
    image = await loadImage(src);
  } catch {
    return null;
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return null;

  const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  let pixels: ImageData;
  try {
    pixels = context.getImageData(0, 0, width, height);
  } catch {
    return null;
  }

  const data = pixels.data;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  const tryVisit = (index: number) => {
    if (visited[index]) return;
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const alpha = data[offset + 3];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (alpha < 12) {
      visited[index] = 1;
      stack.push(index);
      return;
    }
    if (min < MIN_WHITE || max - min > MAX_SAT) return;

    visited[index] = 1;
    stack.push(index);
    data[offset + 3] = Math.max(0, Math.round((255 * (255 - min)) / (255 - MIN_WHITE)));
  };

  for (let x = 0; x < width; x += 1) {
    tryVisit(x);
    tryVisit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    tryVisit(y * width);
    tryVisit(y * width + width - 1);
  }

  while (stack.length > 0) {
    const index = stack.pop() as number;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) tryVisit(index - 1);
    if (x < width - 1) tryVisit(index + 1);
    if (y > 0) tryVisit(index - width);
    if (y < height - 1) tryVisit(index + width);
  }

  context.putImageData(pixels, 0, 0);

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

interface ProductPhotoProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  onError?: () => void;
}

export function ProductPhoto({
  src,
  alt,
  className,
  fill,
  width,
  height,
  onError
}: ProductPhotoProps) {
  const [visibleSrc, setVisibleSrc] = useState<string>(
    () => processedCache.get(src) ?? productImageSource(src)
  );

  useEffect(() => {
    if (src.endsWith('/default.png')) {
      setVisibleSrc(src);
      return;
    }
    const serverSource = productImageSource(src);
    if (serverSource !== src) {
      setVisibleSrc(serverSource);
      return;
    }
    const cached = processedCache.get(src);
    if (cached) {
      setVisibleSrc(cached);
      return;
    }

    let cancelled = false;
    setVisibleSrc(src);
    stripWhiteBackground(src)
      .then(result => {
        if (!result || cancelled) return;
        remember(src, result);
        setVisibleSrc(result);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- salida del canvas (data URL), next/image no la optimiza
    <img
      src={visibleSrc}
      alt={alt}
      width={width}
      height={height}
      loading='lazy'
      onError={onError}
      className={`${fill ? 'absolute inset-0 h-full w-full ' : ''}${className ?? ''}`}
    />
  );
}
