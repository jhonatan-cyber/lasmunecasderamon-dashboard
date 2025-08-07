import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallbackSrc?: string;
  onError?: () => void;
  onLoad?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width = 300,
  height = 300,
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  fallbackSrc = '/img/products/default.png',
  onError,
  onLoad,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
      onError?.();
    }
  };

  const handleLoad = () => {
    setHasError(false);
    onLoad?.();
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'object-cover transition-opacity duration-300',
          hasError && 'opacity-50'
        )}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onError={handleError}
        onLoad={handleLoad}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          Imagen no disponible
        </div>
      )}
    </div>
  );
}

// Componente específico para avatares de usuario
export function UserAvatar({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      fallbackSrc="/img/users/default-avatar.png"
    />
  );
}

// Componente específico para productos
export function ProductImage({
  src,
  alt,
  width = 200,
  height = 200,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('rounded-lg shadow-sm', className)}
      fallbackSrc="/img/products/default.png"
    />
  );
}

// Componente para imágenes de categorías
export function CategoryImage({
  src,
  alt,
  width = 150,
  height = 150,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('rounded-md', className)}
      fallbackSrc="/img/categories/default.png"
    />
  );
}

export default OptimizedImage; 