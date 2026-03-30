"use client";

import React, { useState, useMemo } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { User as UserIcon, Search } from "lucide-react";
import { User } from "@/types/user";

interface UserSelectProps {
  users: User[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Roles a filtrar (opcional) */
  roles?: string[];
  /** Solo usuarios activos (por defecto true) */
  onlyActive?: boolean;
  /** Clase personalizada para el trigger */
  className?: boolean;
  /** Si debe mostrar el nickname */
  showNick?: boolean;
  disabled?: boolean;
}

/**
 * Componente genérico para selección de usuarios con búsqueda integrada.
 * Reemplaza implementaciones específicas como GarzonSelect.
 */
export default function UserSelect({
  users = [],
  value,
  onChange,
  placeholder = "Selecciona un usuario",
  searchPlaceholder = "Buscar usuario...",
  roles,
  onlyActive = true,
  showNick = true,
  disabled = false,
}: UserSelectProps) {
  const [search, setSearch] = useState("");

  // 1. Filtrado por lógica de negocio (Roles y Estado)
  const eligibleUsers = useMemo(() => {
    return (users || []).filter((u) => {
      // Filtrar por estado activo si corresponde
      const isActive = u.status === 1 || u.status === undefined || u.status === null;
      if (onlyActive && !isActive) return false;

      // Filtrar por roles si se especifican
      if (roles && roles.length > 0) {
        const userRole = (u.role || "").toLowerCase();
        return roles.some(r => r.toLowerCase() === userRole);
      }

      return true;
    });
  }, [users, roles, onlyActive]);

  // 2. Filtrado por búsqueda de texto
  const filteredUsers = useMemo(() => {
    if (!search) return eligibleUsers;
    const s = search.toLowerCase();
    return eligibleUsers.filter((u) => {
      const fullName = `${u.name} ${u.lastName}`.toLowerCase();
      const nick = (u.nick || "").toLowerCase();
      return fullName.includes(s) || nick.includes(s);
    });
  }, [eligibleUsers, search]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 h-10 sm:h-11 focus:ring-1 focus:ring-purple-500 focus:ring-offset-0 transition-all">
        <div className="flex items-center gap-2 overflow-hidden">
          <UserIcon className="h-4 w-4 text-gray-400 shrink-0" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      
      <SelectContent className="rounded-2xl border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
        <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 border-none bg-white dark:bg-slate-950 focus-visible:ring-1 focus-visible:ring-purple-500 rounded-lg text-sm"
              onKeyDown={(e) => e.stopPropagation()} // Evitar que el select se cierre al borrar con backspace
            />
          </div>
        </div>
        
        <div className="max-h-[280px] overflow-y-auto p-1">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400 font-medium">
                {eligibleUsers.length === 0 
                  ? "No hay usuarios disponibles" 
                  : "No se encontraron resultados"}
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <SelectItem 
                key={u.id} 
                value={String(u.id)}
                className="rounded-lg focus:bg-purple-50 dark:focus:bg-purple-900/20 focus:text-purple-700 dark:focus:text-purple-300 cursor-pointer py-2.5"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">
                    {u.name} {u.lastName}
                  </span>
                  {showNick && u.nick && (
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      {u.nick}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
