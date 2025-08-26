import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { User } from "@/types/user";
import { User as UserIcon } from "lucide-react";

interface GarzonSelectProps {
  users?: User[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GarzonSelect({ users = [], value, onChange, placeholder }: GarzonSelectProps) {
  const [search, setSearch] = useState("");
  
  // Filtrar por roles válidos (garzon y cajero) y activos
  const eligible = (users || []).filter((u) => {
    const role = (u.role || "").toLowerCase();
    const isActive = u.status === 1 || u.status === undefined || u.status === null;
    return isActive && (role === "garzon" || role === "cajero");
  });

  // Filtrar por búsqueda
  const filtered = eligible.filter((u) =>
    (`${u.name} ${u.lastName} ${u.nick}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full rounded-full">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-gray-500" />
          <SelectValue placeholder={placeholder || "Selecciona un empleado (garzón/cajero)"} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <div className="p-2 pb-0">
          <Input
            autoFocus
            placeholder="Buscar empleado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
          />
        </div>
        {filtered.length === 0 && (
          <div className="px-4 py-2 text-gray-400 text-sm">
            {eligible.length === 0 ? "No hay garzones o cajeros disponibles" : "Sin resultados"}
          </div>
        )}
        {filtered.map((u) => (
          <SelectItem key={u.id} value={String(u.id)}>
            {u.name} {u.lastName} ({u.nick})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 