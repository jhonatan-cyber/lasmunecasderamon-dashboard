import NextImage from 'next/image';
import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Trash2, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { type UserFormValues } from '@/hooks/personal';
import { cn } from '@/lib/utils/utils';

interface ImageUploadFieldProps {
  control: Control<UserFormValues>;
  initialImageUrl?: string;
  onImageChange: (file: File | null) => void;
}

function ImageUploadFieldComponent({
  control,
  initialImageUrl,
  onImageChange
}: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 }); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  
  
  const startDragRef = useRef({ x: 0, y: 0 });
  const startOffsetRef = useRef({ x: 0, y: 0 });

  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    startDragRef.current = { x: e.clientX, y: e.clientY };
    startOffsetRef.current = { ...imageOffset };
    setIsDraggingImage(true);
  };

  const handleImageMouseMoveInternal = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingImage) return;

      
      const deltaX = e.clientX - startDragRef.current.x;
      const deltaY = e.clientY - startDragRef.current.y;

      
      const newX = startOffsetRef.current.x + deltaX;
      const newY = startOffsetRef.current.y + deltaY;

      
      const clampedX = Math.max(-100, Math.min(100, newX));
      const clampedY = Math.max(-100, Math.min(100, newY));

      setImageOffset({ x: clampedX, y: clampedY });
    },
    [isDraggingImage]
  );

  const handleImageMouseUpInternal = useCallback(() => {
    setIsDraggingImage(false);
  }, []);

  
  useEffect(() => {
    if (!isDraggingImage) return;

    window.addEventListener('mousemove', handleImageMouseMoveInternal);
    window.addEventListener('mouseup', handleImageMouseUpInternal);

    return () => {
      window.removeEventListener('mousemove', handleImageMouseMoveInternal);
      window.removeEventListener('mouseup', handleImageMouseUpInternal);
    };
  }, [isDraggingImage, handleImageMouseMoveInternal, handleImageMouseUpInternal]);

  useEffect(() => {
    if (initialImageUrl) {
      const imageUrl = initialImageUrl.startsWith('http')
        ? initialImageUrl
        : `/img/users/${initialImageUrl}`;
      setPreviewUrl(imageUrl);
    }
    setUrlValue('');
  }, [initialImageUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processFile = useCallback(
    (file: File, onChange: (value: string) => void) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no puede superar los 5MB');
        return;
      }

      onImageChange(file);
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(file));
      onChange(file.name);
      setUrlValue('');
    },
    [onImageChange, previewUrl]
  );

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, onChange);
  };

  const handleRemoveImage = (onChange: (value: string) => void) => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageChange(null);
    onChange('');
    setUrlValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlChange = (value: string, onChange: (value: string) => void) => {
    setUrlValue(value);
    onImageChange(null);

    const trimmedValue = value.trim();
    if (trimmedValue) {
      setPreviewUrl(trimmedValue);
      onChange(trimmedValue);
    } else {
      setPreviewUrl(null);
      onChange('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, onChange: (value: string) => void) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, onChange);
  };

  return (
    <FormField
      control={control}
      name='foto'
      render={({ field: { onChange, onBlur, name } }) => (
        <FormItem className='flex flex-col items-center gap-2 w-full'>
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={e => handleImageChange(e, onChange)}
            ref={fileInputRef}
            name={name}
            onBlur={onBlur}
          />

          <div
            ref={containerRef}
            className={cn(
              'relative w-full max-w-[200px] aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer shadow-sm',
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-105'
                : 'border-gray-200 hover:border-gray-400 bg-gray-50/50',
              previewUrl && 'group'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, onChange)}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div
                className='absolute inset-0 bg-cover'
                style={{
                  backgroundImage: `url(${previewUrl})`,
                  backgroundPosition: `calc(50% + ${imageOffset.x}px) calc(50% + ${imageOffset.y}px)`,
                  backgroundRepeat: 'no-repeat'
                }}
                onMouseDown={handleImageMouseDown}
                onMouseMove={e => {
                  if (!isDraggingImage) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - rect.width / 2;
                  const y = e.clientY - rect.top - rect.height / 2;
                  setImageOffset({ x, y });
                }}
                onMouseUp={() => setIsDraggingImage(false)}
                onMouseLeave={() => setIsDraggingImage(false)}
                onClick={e => {
                  if (isDraggingImage) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {}
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    isDraggingImage ? 'bg-black/50' : 'bg-black/0 group-hover:bg-black/40'
                  )}
                >
                  {isDraggingImage ? (
                    <span className='text-xs font-medium bg-black/70 text-white px-3 py-1 rounded-full'>
                      Moviendo...
                    </span>
                  ) : (
                    <span className='opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium flex items-center gap-1'>
                      <UploadCloud size={14} />
                      Cambiar
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center p-4 text-center text-gray-400 gap-2'>
                <div
                  className={cn(
                    'p-3 rounded-full bg-white shadow-sm border transition-colors',
                    isDragging ? 'text-blue-500 border-blue-200' : 'text-gray-400 border-gray-100'
                  )}
                >
                  {isDragging ? <UploadCloud size={32} /> : <ImageIcon size={32} />}
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-700 dark:text-gray-200'>
                    Subir foto
                  </p>
                  <p className='text-xs text-gray-400 mt-1 px-2'>Arrastra una imagen o haz clic</p>
                  <div className='mt-3 flex flex-wrap justify-center gap-1.5 px-4'>
                    {['JPG', 'PNG', 'WEBP', 'GIF'].map(ext => (
                      <span
                        key={ext}
                        className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[9px] font-bold text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-700'
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                  <p className='text-[10px] text-gray-400 dark:text-gray-500 mt-3 font-medium italic italic'>
                    Hasta 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className='flex flex-col w-full items-center gap-2'>
            {previewUrl && (
              <div className='flex gap-2 flex-wrap justify-center'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 dark:border-red-900/40 rounded-full h-8 px-3 transition-colors'
                  onClick={e => {
                    e.stopPropagation();
                    handleRemoveImage(onChange);
                  }}
                >
                  <Trash2 className='w-3 h-3 mr-1' />
                  <span className='text-xs font-medium'>Quitar</span>
                </Button>
              </div>
            )}

            <div className='flex flex-col justify-center w-full'>
              <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 ml-1'>
                URL de imagen
              </label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'>
                  <LinkIcon className='w-4 h-4' />
                </span>
                <Input
                  placeholder='https://ejemplo.com/imagen.jpg'
                  value={urlValue}
                  onChange={e => handleUrlChange(e.target.value, onChange)}
                  className='h-11 pl-10 rounded-xl bg-white dark:bg-slate-800'
                />
              </div>
              <p className='text-[10px] text-gray-400 mt-1.5 ml-1'>
                Pegá el enlace de una imagen externa
              </p>
            </div>
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const ImageUploadField = memo(ImageUploadFieldComponent);

