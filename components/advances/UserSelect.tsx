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

interface UserSelectProps {
  users: User[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function UserSelect({ users, value, onChange, placeholder }: UserSelectProps) {
  const [search, setSearch] = useState("");
  // Excluir administradores (rol_id = 1, o por nombre de rol) ANTES de filtrar por búsqueda
  const onlyActiveNonAdmins = users.filter((u) => u.rol_id !== 1 && u.status === 1);
  const filteredUsers = onlyActiveNonAdmins.filter((u) =>
    (`${u.name} ${u.lastName} ${u.nick}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full text-sm sm:text-base">
        <SelectValue placeholder={placeholder || "Selecciona un usuario"} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2 pb-0">
          <Input
            autoFocus
            placeholder="Buscar usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2 text-sm sm:text-base"
          />
        </div>
        {filteredUsers.length === 0 && (
          <div className="px-4 py-2 text-gray-400 text-xs sm:text-sm">Sin resultados</div>
        )}
        {filteredUsers.map((u) => (
          <SelectItem key={u.id} value={String(u.id)} className="text-sm sm:text-base">
            {u.name} {u.lastName} ({u.nick})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}