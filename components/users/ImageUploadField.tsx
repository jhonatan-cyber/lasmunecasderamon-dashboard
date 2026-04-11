import NextImage from 'next/image';
import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Trash2, UploadCloud, Link as LinkIcon, X } from 'lucide-react';
import { type UserFormValues } from '@/hooks/personal/useUserForm';
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImageUrl) {
      const imageUrl = initialImageUrl.startsWith('http')
        ? initialImageUrl
        : `/img/users/${initialImageUrl}`;
      setPreviewUrl(imageUrl);
    }
  }, [initialImageUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processFile = useCallback((file: File, onChange: (value: string) => void) => {
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
  }, [onImageChange, previewUrl]);

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

  const handleUrlSubmit = (onChange: (value: string) => void) => {
    if (urlValue.trim() && urlValue.startsWith('http')) {
      setPreviewUrl(urlValue.trim());
      onImageChange(null);
      onChange(urlValue.trim());
      setShowUrlInput(false);
    } else {
      alert('Por favor, ingresa una URL válida (ej. https://...)');
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
            onChange={(e) => handleImageChange(e, onChange)}
            ref={fileInputRef}
            name={name}
            onBlur={onBlur}
          />

          <div 
            className={cn(
              "relative w-full max-w-[200px] aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group overflow-hidden shadow-sm",
              isDragging 
                ? "border-blue-500 bg-blue-50 scale-105" 
                : "border-gray-200 hover:border-gray-400 bg-gray-50/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, onChange)}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <>
                <NextImage
                  src={previewUrl}
                  alt='Vista previa'
                  fill
                  sizes='200px'
                  className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                  <UploadCloud size={24} className="animate-bounce" />
                  <span className="text-xs font-medium">Cambiar imagen</span>
                </div>
              </>
            ) : (
              <div className='flex flex-col items-center justify-center p-4 text-center text-gray-400 gap-2'>
                <div className={cn(
                  "p-3 rounded-full bg-white shadow-sm border transition-colors",
                  isDragging ? "text-blue-500 border-blue-200" : "text-gray-400 border-gray-100"
                )}>
                  {isDragging ? <UploadCloud size={32} /> : <ImageIcon size={32} />}
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-700 dark:text-gray-200'>Subir foto</p>
                  <p className='text-xs text-gray-400 mt-1 px-2'>Arrastra una imagen o haz clic</p>
                  <div className='mt-3 flex flex-wrap justify-center gap-1.5 px-4'>
                    {['JPG', 'PNG', 'WEBP', 'GIF'].map((ext) => (
                      <span key={ext} className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[9px] font-bold text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-700'>
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

          <div className="flex flex-col w-full max-w-[240px] items-center gap-2">
            {!showUrlInput ? (
              <div className="flex gap-2">
                {previewUrl && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 dark:border-red-900/40 rounded-full h-8 px-3 transition-colors'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(onChange);
                    }}
                  >
                    <Trash2 className='w-3 h-3 mr-1' />
                    <span className="text-xs font-medium">Quitar</span>
                  </Button>
                )}
                {!previewUrl && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 dark:border-blue-900/40 rounded-full h-8 px-3 transition-colors'
                    onClick={() => setShowUrlInput(true)}
                  >
                    <LinkIcon className='w-3 h-3 mr-1.5' />
                    <span className="text-xs font-medium">Usar URL</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input
                      placeholder="https://ejemplo.com/foto.jpg"
                      className="h-8 pl-8 text-xs rounded-lg"
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleUrlSubmit(onChange);
                        }
                      }}
                    />
                  </div>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setShowUrlInput(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  type="button" 
                  size="sm" 
                  className="w-full h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                  onClick={() => handleUrlSubmit(onChange)}
                >
                  Confirmar URL
                </Button>
              </div>
            )}
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const ImageUploadField = memo(ImageUploadFieldComponent);
