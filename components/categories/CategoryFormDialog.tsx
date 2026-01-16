import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tag, FileText } from "lucide-react";

export interface CategoryForm {
  name: string;
  description: string;
}

interface CategoryFormDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreate: (form: CategoryForm) => Promise<void>;
  initialValues?: CategoryForm;
  children: React.ReactNode;
}

export default function CategoryFormDialog({
  open,
  setOpen,
  onCreate,
  initialValues,
  children,
}: CategoryFormDialogProps) {
  const [form, setForm] = useState<CategoryForm>(
    initialValues || { name: "", description: "" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialValues) {
      setForm(initialValues);
    } else if (open && !initialValues) {
      setForm({ name: "", description: "" });
    }
  }, [open, initialValues]);

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    await onCreate(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {initialValues ? "Editar Categoría" : "Nueva Categoría"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="categoryName" className="text-sm sm:text-base">Nombre</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">
                  <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                </span>
                <Input
                  id="categoryName"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="text-sm sm:text-base pl-10 sm:pl-12"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="categoryDescription" className="text-sm sm:text-base">Descripción</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-600">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                </span>
                <Textarea
                  id="categoryDescription"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Ingresa una descripción para la categoría..."
                  rows={3}
                  className="text-sm sm:text-base pl-10 sm:pl-12"
                />
              </div>
            </div>
            {error && <div className="text-red-500 text-xs sm:text-sm">{error}</div>}
          </div>
        </div>
        <div className="flex-shrink-0 border-t px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base w-full sm:w-auto"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
              size="sm"
              variant="outline"
              className="rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
            >
              {saving
                ? "Guardando..."
                : initialValues
                ? "Actualizar"
                : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
