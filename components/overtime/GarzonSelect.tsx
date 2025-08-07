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

interface GarzonSelectProps {
  users: User[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GarzonSelect({ users, value, onChange, placeholder }: GarzonSelectProps) {
  const [search, setSearch] = useState("");
  
  // Filtrar por búsqueda (los usuarios ya vienen filtrados como garzones activos)
  const filteredGarzones = users.filter((u) =>
    (`${u.name} ${u.lastName} ${u.nick}`.toLowerCase().includes(search.toLowerCase()))
  );

  console.log("=== GARZON SELECT DEBUG ===");
  console.log("Garzones recibidos:", users.length);
  console.log("Garzones filtrados:", filteredGarzones.length);
  console.log("===========================");

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder || "Selecciona un garzón"} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2 pb-0">
          <Input
            autoFocus
            placeholder="Buscar garzón..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
          />
        </div>
        {filteredGarzones.length === 0 && (
          <div className="px-4 py-2 text-gray-400 text-sm">
            {users.length === 0 ? "No hay garzones disponibles" : "Sin resultados"}
          </div>
        )}
        {filteredGarzones.map((u) => (
          <SelectItem key={u.id} value={String(u.id)}>
            {u.name} {u.lastName} ({u.nick})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 