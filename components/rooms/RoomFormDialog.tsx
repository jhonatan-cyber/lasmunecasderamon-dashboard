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
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { Room } from "@/types/room";

export interface RoomForm {
  name: string;
  price: string;
  time: string;
}

interface RoomFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: RoomForm) => void;
  initialValues?: Room | null;
  isLoading: boolean;
}

const initialFormState: RoomForm = {
  name: "",
  price: "",
  time: "",
};

const RoomFormDialog: React.FC<RoomFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isLoading,
}) => {
  const [form, setForm] = useState<RoomForm>(initialFormState);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open && initialValues) {
      setForm({
        name: initialValues.name || "",
        price: initialValues.price ? String(initialValues.price) : "",
        time: initialValues.time ? String(initialValues.time) : "",
      });
    } else if (open) {
      setForm(initialFormState);
    }
    setErrors({});
  }, [open, initialValues]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = "El nombre es requerido";
    if (!form.price.trim() || isNaN(Number(form.price)))
      newErrors.price = "Precio válido requerido";
    if (!form.time.trim() || isNaN(Number(form.time)))
      newErrors.time = "Tiempo válido requerido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.name === "price" || e.target.name === "time") {
      setForm({ ...form, [e.target.name]: "" });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (
      (e.target.name === "price" || e.target.name === "time") &&
      !form[e.target.name]
    ) {
      setForm({
        ...form,
        [e.target.name]: initialValues
          ? String((initialValues as any)[e.target.name])
          : "",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('submit ejecutado', form);
    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="p-0 w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold">
              {initialValues ? "Editar habitación" : "Nueva habitación"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-4 sm:px-6 pb-2 pt-2">
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">Nombre</label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej: Suite Presidencial"
                disabled={isLoading}
                autoFocus
                className="text-sm sm:text-base"
              />
              {errors.name && (
                <span className="text-red-500 text-xs sm:text-sm mt-1 block">
                  {errors.name}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">Precio</label>
              <Input
                name="price"
                value={form.price}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Ej: 12000"
                disabled={isLoading}
                inputMode="numeric"
                className="text-sm sm:text-base"
              />
              {errors.price && (
                <span className="text-red-500 text-xs sm:text-sm mt-1 block">
                  {errors.price}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">
                Tiempo (minutos)
              </label>
              <Input
                name="time"
                value={form.time}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Ej: 60"
                disabled={isLoading}
                inputMode="numeric"
                className="text-sm sm:text-base"
              />
              {errors.time && (
                <span className="text-red-500 text-xs sm:text-sm mt-1 block">
                  {errors.time}
                </span>
              )}
            </div>
          </div>
          <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 w-full gap-4">
            <div className="flex flex-col sm:flex-row justify-center gap-2 w-full">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                disabled={isLoading}
                className="flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto"
              >
                <FontAwesomeIcon icon={faTimes} className="w-3 h-3 sm:w-4 sm:h-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto"
              >
                <FontAwesomeIcon icon={faCheck} className="w-3 h-3 sm:w-4 sm:h-4" />
                {initialValues ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoomFormDialog;
