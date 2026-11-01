'use client';

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  Link as LinkIcon,
  Crop,
  RotateCcw
} from 'lucide-react';
import { type UserFormValues } from '@/hooks/staff';
import { cn } from '@/lib/utils/utils';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// El servidor guarda la foto de usuario en 500×500 (processAndSaveImage),
// así que el recorte se exporta a ese tamaño y el resize final es identidad.
const OUTPUT_SIZE = 500;
const MIN_ZOOM = 1; // contain: la imagen entra completa, centrada
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.05;
const COMMIT_DEBOUNCE_MS = 350;
const CLICK_TOLERANCE_PX = 4;
// Fondo de las bandas: mismo color en la vista previa y en el recorte
// exportado, para que lo que se ve es exactamente lo que se guarda.
const FRAME_BG = '#0f172a';

interface ImageUploadFieldProps {
  control: Control<UserFormValues>;
  initialImageUrl?: string;
  onImageChange: (file: File | null) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// El encuadre manual exige poder dibujar la fuente en <canvas>: blob de un
// archivo recién elegido o imagen del propio servidor. Con un URL externo el
// canvas queda manchado (canvas taint) y toBlob lanza SecurityError; además
// ese URL se guarda tal cual en la base, así que pan/zoom no tienen efecto.
const isFrameEditable = (url: string | null) =>
  !!url && (url.startsWith('blob:') || url.startsWith('/img/users/'));

function ImageUploadFieldComponent({
  control,
  initialImageUrl,
  onImageChange
}: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Los refs espejo evitan re-binding de handlers nativos y re-closures.
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const previewUrlRef = useRef<string | null>(null);
  const sourceNameRef = useRef('foto.jpg');
  const imgSizeRef = useRef<{ w: number; h: number } | null>(null);
  const wasCroppedRef = useRef(false);
  const panStartRef = useRef({ px: 0, py: 0, ox: 0, oy: 0, moved: 0 });
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEncodingRef = useRef(false);

  const applyPan = useCallback((next: { x: number; y: number }) => {
    panRef.current = next;
    setPan(next);
  }, []);

  const clampedPanFor = useCallback((offset: { x: number; y: number }) => {
    const size = imgSizeRef.current;
    const viewport = viewportRef.current;
    if (!size || !viewport) return offset;
    const displaySize = viewport.getBoundingClientRect().width;
    // contain: a zoom 1 la imagen entra completa (una lateral pertenece a las
    // bandas del fondo), así que sin zoom no hay margen para mover.
    const fitScale = Math.min(displaySize / size.w, displaySize / size.h);
    const scale = fitScale * zoomRef.current;
    return {
      x: clamp(
        offset.x,
        -Math.max(0, (size.w * scale - displaySize) / 2),
        Math.max(0, (size.w * scale - displaySize) / 2)
      ),
      y: clamp(
        offset.y,
        -Math.max(0, (size.h * scale - displaySize) / 2),
        Math.max(0, (size.h * scale - displaySize) / 2)
      )
    };
  }, []);

  const applyZoom = useCallback(
    (next: number) => {
      const scaled = clamp(next, MIN_ZOOM, MAX_ZOOM);
      zoomRef.current = scaled;
      setZoom(scaled);
      // Al cambiar el zoom cambia el rango de pan: re-acoplar el offset,
      // para que la foto siempre cubra el cuadro.
      applyPan(clampedPanFor(panRef.current));
    },
    [applyPan, clampedPanFor]
  );

  const loadImage = useCallback(
    (src: string) =>
      new Promise<HTMLImageElement | null>(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    []
  );

  // Recorta en canvas la vista que el usuario armó (pan + zoom) y entrega el
  // resultado como File. Arranca en contain (imagen completa con bandas);
  // el usuario acerca y arma su encuadre: lo que se ve es lo que se guarda.
  const encodeCrop = useCallback(async (): Promise<File | null> => {
    const url = previewUrlRef.current;
    const viewport = viewportRef.current;
    if (!url || !viewport) return null;

    const img = await loadImage(url);
    if (!img) return null;

    const displaySize = viewport.getBoundingClientRect().width;
    const fitScale = Math.min(displaySize / img.naturalWidth, displaySize / img.naturalHeight);
    const scale = fitScale * zoomRef.current;
    const outFactor = OUTPUT_SIZE / displaySize;
    const w = img.naturalWidth * scale * outFactor;
    const h = img.naturalHeight * scale * outFactor;
    const dx = (OUTPUT_SIZE - w) / 2 + panRef.current.x * outFactor;
    const dy = (OUTPUT_SIZE - h) / 2 + panRef.current.y * outFactor;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = FRAME_BG;
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, dx, dy, w, h);

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    if (!blob) return null;
    return new File([blob], sourceNameRef.current, { type: 'image/jpeg' });
  }, [loadImage]);

  const commitCropNow = useCallback(async () => {
    if (!previewUrlRef.current || isEncodingRef.current) return;
    isEncodingRef.current = true;
    try {
      const file = await encodeCrop();
      if (file) {
        wasCroppedRef.current = true;
        onImageChange(file);
      }
    } finally {
      isEncodingRef.current = false;
    }
  }, [encodeCrop, onImageChange]);

  const scheduleCommit = useCallback(() => {
    if (!previewUrlRef.current) return;
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      void commitCropNow();
    }, COMMIT_DEBOUNCE_MS);
  }, [commitCropNow]);

  // Medir la imagen una vez cargada para poder clavar el pan al área visible.
  useEffect(() => {
    previewUrlRef.current = previewUrl;
    wasCroppedRef.current = false;
    applyPan({ x: 0, y: 0 });
    zoomRef.current = 1;
    setZoom(1);
    imgSizeRef.current = null;
    if (!previewUrl || !isFrameEditable(previewUrl)) return;

    let cancelled = false;
    void loadImage(previewUrl).then(img => {
      if (!cancelled && img) {
        imgSizeRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      }
    });
    return () => {
      cancelled = true;
    };
  }, [previewUrl, applyPan, loadImage]);

  useEffect(() => {
    if (initialImageUrl) {
      const imageUrl = initialImageUrl.startsWith('http')
        ? initialImageUrl
        : `/img/users/${initialImageUrl}`;
      setPreviewUrl(imageUrl);
      sourceNameRef.current = `${initialImageUrl.replace(/\.[^.]+$/, '')}_encuadre.jpg`;
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

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  // Zoom con rueda: listener nativo no-passivo (React registra wheel pasivo)
  // con commit postergado para no re-encodear a mitad del gesto.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !isFrameEditable(previewUrl)) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoomRef.current - e.deltaY * 0.0015);
      scheduleCommit();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [previewUrl, applyZoom, scheduleCommit]);

  const processFile = useCallback(
    (file: File, onChange: (value: string) => void) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede superar los 5MB');
        return;
      }

      onImageChange(file);
      const previous = previewUrlRef.current;
      if (previous && previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous);
      }
      previewUrlRef.current = URL.createObjectURL(file);
      sourceNameRef.current = `${file.name.replace(/\.[^.]+$/, '')}.jpg`;
      setPreviewUrl(previewUrlRef.current);
      onChange(file.name);
      setUrlValue('');
    },
    [onImageChange]
  );

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, onChange);
      // Permite re-elegir la misma imagen después: sin esto, el input retiene
      // el path y el evento change no vuelve a dispararse.
      e.target.value = '';
    }
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

  const handleResetFrame = () => {
    applyPan({ x: 0, y: 0 });
    applyZoom(MIN_ZOOM);
    // Sólo re-compromete si ya había un encuadre enviado: evita duplicar la
    // foto existente en el server con el mismo recorte central.
    if (wasCroppedRef.current) scheduleCommit();
  };

  const panHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isFrameEditable(previewUrl)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      panStartRef.current = {
        px: e.clientX,
        py: e.clientY,
        ox: panRef.current.x,
        oy: panRef.current.y,
        moved: 0
      };
      setIsPanning(true);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanning) return;
      const start = panStartRef.current;
      const dx = e.clientX - start.px;
      const dy = e.clientY - start.py;
      start.moved = Math.abs(dx) + Math.abs(dy);
      applyPan(clampedPanFor({ x: start.ox + dx, y: start.oy + dy }));
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanning) return;
      setIsPanning(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // el pointer ya no está capturado: nada que deshacer
      }
      if (panStartRef.current.moved < CLICK_TOLERANCE_PX) {
        // tap sin arrastre: elegir otra imagen (equivale a "Cambiar")
        fileInputRef.current?.click();
        return;
      }
      void commitCropNow();
    },
    onPointerCancel: () => setIsPanning(false)
  };

  return (
    <FormField
      control={control}
      name='foto'
      render={({ field: { onChange, onBlur, name } }) => (
        <FormItem className='flex flex-col items-center gap-2 w-full'>
          <Input
            type='file'
            accept='image/*'
            className='hidden'
            onChange={e => handleImageChange(e, onChange)}
            ref={fileInputRef}
            name={name}
            onBlur={onBlur}
          />

          <div
            className={cn(
              'relative w-full max-w-[200px] aspect-square rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden shadow-xs',
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-105'
                : previewUrl
                  ? 'border-gray-200'
                  : 'border-dashed border-gray-200 hover:border-gray-400 bg-gray-50/50',
              previewUrl && 'group',
              previewUrl &&
                isFrameEditable(previewUrl) &&
                (isPanning ? 'cursor-grabbing' : 'cursor-grab')
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, onChange)}
          >
            {previewUrl ? (
              <div
                data-themed-photo
                ref={viewportRef}
                className={cn(
                  'absolute inset-0 overflow-hidden select-none bg-[#0f172a]',
                  isFrameEditable(previewUrl) && 'touch-none'
                )}
                {...(isFrameEditable(previewUrl) ? panHandlers : {})}
              >
                {/* Transform dinámico de pan+zoom: Tailwind no ofrece clase
                    para valores calculados en runtime; es el mismo recorte que
                    luego se exporta en canvas (encodeCrop). */}
                <img
                  src={previewUrl}
                  alt=''
                  draggable={false}
                  className='absolute inset-0 h-full w-full object-contain max-w-none'
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
                  }}
                />
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center pointer-events-none',
                    isPanning ? 'bg-black/50' : 'bg-black/0 group-hover:bg-black/40'
                  )}
                >
                  {isPanning ? (
                    <span className='text-xs font-medium bg-black/70 text-white px-3 py-1 rounded-full pointer-events-none'>
                      Moviendo...
                    </span>
                  ) : (
                    isFrameEditable(previewUrl) && (
                      <span className='opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium flex items-center gap-1 pointer-events-none'>
                        <Crop size={14} />
                        Encuadrar
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : (
              <Button
                type='button'
                variant='ghost'
                onClick={() => fileInputRef.current?.click()}
                className='flex flex-col items-center justify-center p-4 text-center text-gray-400 gap-2 cursor-pointer w-full h-full rounded-2xl'
              >
                <div
                  className={cn(
                    'p-3 rounded-full bg-white shadow-xs border transition-colors',
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
                  <p className='text-[10px] text-gray-400 dark:text-gray-500 mt-3 font-medium italic'>
                    Hasta 5MB
                  </p>
                </div>
              </Button>
            )}
          </div>

          {previewUrl && isFrameEditable(previewUrl) && (
            <div className='w-full max-w-[220px] flex items-center gap-1.5'>
              <Crop className='w-3.5 h-3.5 text-gray-400 shrink-0' />
              <Input
                type='range'
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={zoom}
                onChange={e => {
                  applyZoom(Number(e.target.value));
                  scheduleCommit();
                }}
                aria-label='Zoom de la foto'
                className='h-1.5 p-0 cursor-pointer accent-blue-600 bg-gray-200 rounded-full appearance-none'
              />
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleResetFrame}
                title='Centrar la imagen de nuevo'
                className='h-7 w-7 p-0 shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full'
              >
                <RotateCcw className='w-3.5 h-3.5' />
              </Button>
            </div>
          )}

          {previewUrl && isFrameEditable(previewUrl) && (
            <p className='text-[10px] text-gray-400 -mt-1 text-center'>
              Se muestra la imagen completa: acercá con la rueda o el deslizador y arrastrala para
              encuadrar
            </p>
          )}

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
              <Label
                htmlFor='image-url-input'
                className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 ml-1'
              >
                URL de imagen
              </Label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'>
                  <LinkIcon className='w-4 h-4' />
                </span>
                <Input
                  id='image-url-input'
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
