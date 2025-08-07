import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faTimes,
  faBarcode,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { Product } from "@/types/product";

interface ProductForm {
  code: string;
  name: string;
  price: string;
  commission: string;
  description: string;
  foto: File | null;
}

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
  initialValues?: Product | null;
  categoryId: number;
  isLoading: boolean;
}

function generateProductCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const initialFormState: ProductForm = {
  code: "",
  name: "",
  price: "",
  commission: "",
  description: "",
  foto: null,
};

const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  categoryId,
  isLoading,
}) => {
  const [form, setForm] = useState<ProductForm>(initialFormState);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductForm, string>>
  >({});
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (open && initialValues) {
      setForm({
        code: initialValues.code || "",
        name: initialValues.name || "",
        price: initialValues.price ? String(initialValues.price) : "",
        commission: initialValues.commission
          ? String(initialValues.commission)
          : "",
        description: initialValues.description || "",
        foto: null,
      });
      // Mostrar imagen existente para edición
      if (initialValues.foto && initialValues.foto !== "default.png") {
        setImagePreview(`/img/products/${initialValues.foto}`);
      } else {
        setImagePreview("");
      }
    } else if (open) {
      setForm({ ...initialFormState, code: generateProductCode() });
      setImagePreview("");
    }
    setErrors({});
  }, [open, initialValues]);

  const validate = () => {
    const newErrors: Partial<Record<keyof ProductForm, string>> = {};
    if (!form.code.trim()) newErrors.code = "El código es requerido";
    if (!form.name.trim()) newErrors.name = "El nombre es requerido";
    if (!form.price.trim() || isNaN(Number(form.price)))
      newErrors.price = "Precio válido requerido";
    if (!form.commission.trim() || isNaN(Number(form.commission)))
      newErrors.commission = "Comisión válida requerida";
    if (!form.description.trim())
      newErrors.description = "La descripción es requerida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === "foto" && files && files[0]) {
      const file = files[0];

      // Validar tipo de archivo
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors({
          ...errors,
          foto: "Solo se permiten archivos JPG, PNG o GIF",
        });
        return;
      }

      // Validar tamaño (5MB máximo)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setErrors({ ...errors, foto: "La imagen no puede superar los 5MB" });
        return;
      }

      // Si pasa las validaciones, actualizar el estado
      setForm({ ...form, foto: file });
      setImagePreview(URL.createObjectURL(file));

      // Limpiar error si existía
      if (errors.foto) {
        const newErrors = { ...errors };
        delete newErrors.foto;
        setErrors(newErrors);
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    console.log("Preparando FormData...");
    const data = new FormData();

    // Agregar campos de texto
    data.append("code", form.code);
    data.append("name", form.name);
    data.append("category_id", String(categoryId));
    data.append("price", form.price);
    data.append("commission", form.commission);
    data.append("description", form.description);
    data.append("status", "1"); // Estado activo por defecto

    // ✅ CORRECTO - Enviar el archivo completo, no solo el nombre
    if (form.foto) {
      console.log(
        "Agregando archivo:",
        form.foto.name,
        "Tamaño:",
        form.foto.size
      );
      data.append("foto", form.foto); // Envía el archivo completo
    } else {
      console.log("No hay archivo seleccionado, usando default.png");
      // Para edición sin cambio de imagen, no enviar el campo foto
      // El backend mantendrá la imagen existente
      if (!initialValues) {
        data.append("foto", "default.png");
      }
    }

    // Para edición, agregar el ID
    if (initialValues && initialValues.id) {
      data.append("id", String(initialValues.id));
      console.log("Modo edición, ID:", initialValues.id);
    } else {
      console.log("Modo creación");
    }

    // Debug: mostrar contenido del FormData
    console.log("Contenido del FormData:");
    for (let [key, value] of data.entries()) {
      if (value instanceof File) {
        console.log(
          key,
          ":",
          `File(${value.name}, ${value.size} bytes, ${value.type})`
        );
      } else {
        console.log(key, ":", value);
      }
    }

    onSubmit(data);
  };

  // Limpiar URL del objeto cuando el componente se desmonta o cambia la imagen
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-bold">
              {initialValues ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-2 pt-2">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faBarcode} /> Código
              </label>
              <Input
                name="code"
                value={form.code}
                readOnly
                className="bg-gray-100 cursor-not-allowed"
              />
              {errors["code"] && (
                <span className="text-red-500 text-xs mt-1 block">
                  {errors["code"]}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej: Producto X"
                disabled={isLoading}
                autoFocus
              />
              {errors["name"] && (
                <span className="text-red-500 text-xs mt-1 block">
                  {errors["name"]}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Precio</label>
                <Input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Ej: 12000"
                  disabled={isLoading}
                  inputMode="numeric"
                />
                {errors["price"] && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {errors["price"]}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Comisión
                </label>
                <Input
                  name="commission"
                  value={form.commission}
                  onChange={handleChange}
                  placeholder="Ej: 2000"
                  disabled={isLoading}
                  inputMode="numeric"
                />
                {errors["commission"] && (
                  <span className="text-red-500 text-xs mt-1 block">
                    {errors["commission"]}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Descripción
              </label>
              <Input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Descripción del producto"
                disabled={isLoading}
              />
              {errors["description"] && (
                <span className="text-red-500 text-xs mt-1 block">
                  {errors["description"]}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faImage} /> Imagen
              </label>
              <Input
                name="foto"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors["foto"] && (
                <span className="text-red-500 text-xs mt-1 block">
                  {errors["foto"]}
                </span>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 5MB
              </div>
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="max-h-32 max-w-32 rounded border object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-2 w-full gap-4">
            <div className="flex flex-row justify-center gap-2 w-full">
              <Button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                size="sm"
                className="flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white"
                variant="outline"
              >
                <FontAwesomeIcon icon={faTimes} />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="flex items-center bg-black text-white gap-2 rounded-full hover:scale-105 transition-all duration-200"
              >
                <FontAwesomeIcon icon={faCheck} />
                {initialValues ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
