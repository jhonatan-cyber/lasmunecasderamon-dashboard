 
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
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/personal/useUsers";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { User, DollarSign } from "lucide-react";

interface AdvanceFormDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreated?: () => void;
  children: React.ReactNode;
}

export default function AdvanceFormDialog({ open, setOpen, onCreated, children }: AdvanceFormDialogProps) {
  const { users, isLoading: loadingUsers, fetchUsers } = useUsers();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [monto, setMonto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchUsers();
    if (!open) {
      setSelectedUser("");
      setMonto("");
      setError(null);
    }
  }, [open, fetchUsers]);

  const handleSubmit = async () => {
    setError(null);
    if (!selectedUser) {
      setError("Selecciona un usuario");
      return;
    }
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/anticipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: selectedUser, monto }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Anticipo otorgado correctamente");
        setOpen(false);
        if (onCreated) onCreated();
      } else {
        setError(data.message || "No se pudo otorgar el anticipo");
      }
    } catch (e) {
      setError("Error de red o del servidor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Nuevo Anticipo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <Label className="text-sm sm:text-base">Usuario</Label>
            <div className="relative">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                                 <SelectTrigger className="w-full text-sm sm:text-base pl-10 rounded-full">
                  <User className="absolute left-3 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => String(u.roleId ?? '') !== '1' && u.status === 1)
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)} className="text-sm sm:text-base">
                        {u.name} {u.lastName} ({u.nick})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm sm:text-base">Monto</Label>
            <div className="relative">
              <Input
                type="number"
                min={1}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Monto de anticipo"
                className="pl-10 text-sm sm:text-base"
              />
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm sm:text-base">{error}</div>}
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base"
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !selectedUser || !monto}
              size="sm"
              variant="outline"
              className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
