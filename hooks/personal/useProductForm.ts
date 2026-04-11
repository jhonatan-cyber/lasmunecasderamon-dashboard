import { useState, useEffect } from 'react';
import { Product } from '@/types/product';

import { generateRandomCode } from '@/lib/utils/codeUtils';

export interface ProductFormValues {
  code: string;
  name: string;
  price: string;
  commission: string;
  description: string;
  foto: File | null;
  fotoUrl: string;
}

const formatNumber = (value: string) => value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const getNumericValue = (v: string) => v.replace(/\./g, '');

const initialFormState: ProductFormValues = { code: '', name: '', price: '', commission: '', description: '', foto: null, fotoUrl: '' };

interface UseProductFormProps {
  open: boolean;
  initialValues?: Product | null;
  categoryId: string | number;
  onSubmit: (form: FormData) => void;
}

export function useProductForm({ open, initialValues, categoryId, onSubmit }: UseProductFormProps) {
  const [form, setForm] = useState<ProductFormValues>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (open && initialValues) {
      setForm({
        code: initialValues.code || '',
        name: initialValues.name || '',
        price: initialValues.price !== undefined && initialValues.price !== null ? formatNumber(String(initialValues.price)) : '',
        commission: initialValues.commission !== undefined && initialValues.commission !== null ? formatNumber(String(initialValues.commission)) : '',
        description: initialValues.description || '',
        foto: null,
        fotoUrl: '',
      });
      if (initialValues.foto && initialValues.foto !== 'default.png') {
        const url = initialValues.foto.startsWith('http') 
          ? initialValues.foto 
          : `/img/products/${initialValues.foto}`;
        setImagePreview(url);
      } else {
        setImagePreview('');
      }
    } else if (open) {
      setForm({ ...initialFormState, code: generateRandomCode() });
      setImagePreview('');
    }
    setErrors({});
  }, [open, initialValues]);

  useEffect(() => {
    return () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const validate = () => {
    const newErrors: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!form.code.trim()) newErrors.code = 'El cÃ³digo es requerido';
    if (!form.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!getNumericValue(form.price) || isNaN(Number(getNumericValue(form.price)))) newErrors.price = 'Precio vÃ¡lido requerido';
    if (form.commission.trim() && isNaN(Number(getNumericValue(form.commission)))) newErrors.commission = 'ComisiÃ³n debe ser un nÃºmero vÃ¡lido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const processFile = (file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setErrors(prev => ({ ...prev, foto: 'Solo se permiten archivos JPG, PNG, GIF o WEBP' })); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, foto: 'La imagen no puede superar los 5MB' })); return;
    }
    setForm(prev => ({ ...prev, foto: file, fotoUrl: '' }));
    setImagePreview(URL.createObjectURL(file));
    setErrors(prev => { const { foto: _, ...rest } = prev; return rest; });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const target = e.target;
    const name = target?.name;
    const value = target?.value;
    
    // Handle file input (either from native event or custom event)
    if (target?.type === 'file' || (target?.files && target?.files?.length > 0)) {
      const file = target.files?.[0];
      if (file) processFile(file);
      return;
    }

    if (name === 'name') {
      setForm(prev => ({ ...prev, name: value.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') }));
    } else if (name === 'description') {
      setForm(prev => ({ ...prev, description: value ? value.charAt(0).toUpperCase() + value.slice(1) : value }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePriceChange = (value: string) => setForm(prev => ({ ...prev, price: formatNumber(value) }));
  const handleCommissionChange = (value: string) => setForm(prev => ({ ...prev, commission: formatNumber(value) }));

  const handleUrlChange = (url: string) => {
    setForm(prev => ({ ...prev, fotoUrl: url, foto: null }));
    if (url) setImagePreview(url);
    else setImagePreview('');
  };

  const handleFileDrop = (file: File) => processFile(file);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    const data = new FormData();
    data.append('code', form.code);
    data.append('name', form.name);
    
    const finalCategoryId = initialValues?.category_id ?? categoryId;
    
    if (finalCategoryId !== undefined && finalCategoryId !== null && String(finalCategoryId) !== 'NaN') {
      data.append('category_id', String(finalCategoryId));
    } else {
      console.warn('[useProductForm] Intento de submit sin category_id vÃ¡lido:', { 
        initialCategoryId: initialValues?.category_id, 
        propCategoryId: categoryId 
      });
    }
    
    data.append('price', getNumericValue(form.price));
    data.append('commission', getNumericValue(form.commission) || '0');
    data.append('description', form.description);
    data.append('status', '1');
    if (form.foto) {
      data.append('foto', form.foto);
    }
    if (form.fotoUrl) {
      data.append('fotoUrl', form.fotoUrl);
    }
    if (initialValues?.id) data.append('id', String(initialValues.id));
    onSubmit(data);
  };

  return { form, errors, imagePreview, handleChange, handlePriceChange, handleCommissionChange, handleUrlChange, handleFileDrop, handleSubmit };
}
