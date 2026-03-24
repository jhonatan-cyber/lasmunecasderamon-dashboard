/* eslint-disable */
import { memo, useRef, useEffect, useState } from 'react';
import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Image, Trash2 } from 'lucide-react';
import { UserFormValues } from './UserForm';

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
      if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos de imagen (JPG, PNG, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB');
      return;
    }

    onImageChange(file);
    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    onChange(file.name);
  };

  const handleRemoveImage = (onChange: (value: string) => void) => {
    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageChange(null);
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <FormField
      control={control}
      name='foto'
      render={({ field: { onChange, onBlur, name } }) => (
        <FormItem className='flex items-center gap-4 justify-center'>
          <input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={(e) => handleImageChange(e, onChange)}
            ref={fileInputRef}
            name={name}
            onBlur={onBlur}
          />

          <div className='flex flex-col items-center'>
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              className='w-40 h-36 rounded-md border border-gray-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors'
              title='Seleccionar imagen'
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt='Vista previa'
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='w-full h-full flex flex-col items-center justify-center text-gray-400'>
                  <Image size={32} />
                  <span className='text-sm mt-1'>Seleccionar imagen</span>
                </div>
              )}
            </button>

            {previewUrl && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='mt-2 text-red-500 hover:text-red-700'
                onClick={() => handleRemoveImage(onChange)}
              >
                <Trash2 className='mr-1' />
                Eliminar
              </Button>
            )}
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const ImageUploadField = memo(ImageUploadFieldComponent);

