
import React, { useEffect, useState, useMemo } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Home } from "lucide-react";
import { formatCurrencyCLP } from "@/lib/utils/formatters";

interface Habitacion {
  id_habitacion?: string | number;
  id?: string | number;
  nombre?: string;
  name?: string;
  numero?: string;
  precio?: number;
  price?: number;
  tiempo?: number;
  time?: number;
  estado?: number;
  status?: number;
}

interface RoomSelectProps {
  habitaciones?: Habitacion[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showPrice?: boolean;
  showTime?: boolean;
  filterByStatus?: number;
  includeRoomIds?: Array<string>;
}

const RoomSelect: React.FC<RoomSelectProps> = ({
  habitaciones,
  value,
  onChange,
  label = "Habitación",
  placeholder = "Seleccione una habitación",
  searchPlaceholder = "Buscar habitación...",
  className = "",
  required = false,
  disabled = false,
  showPrice = false,
  showTime = false,
  filterByStatus,
  includeRoomIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHabitaciones = useMemo(() => {
    if (!Array.isArray(habitaciones)) {
      return [];
    }

    let filtered = habitaciones;

    if (filterByStatus !== undefined) {
      filtered = filtered.filter((habitacion) => {
        const id = habitacion.id_habitacion || habitacion.id;
        const estado = habitacion.estado || habitacion.status;

        return (
          estado === filterByStatus ||
          (id !== undefined && includeRoomIds.some(roomId => String(roomId) === String(id)))
        );
      });
    }

    if (!searchTerm) return filtered;

    return filtered.filter((habitacion) => {
      const nombre = habitacion.nombre || habitacion.name || "";
      const numero = habitacion.numero || "";
      const searchLower = searchTerm.toLowerCase();

      return (
        nombre.toLowerCase().includes(searchLower) ||
        numero.toLowerCase().includes(searchLower)
      );
    });
  }, [habitaciones, searchTerm, filterByStatus, includeRoomIds]);

  // Formatear tiempo (ej: 2 horas)
  const formatTime = (min: number) => {
    if (!min || isNaN(min)) return "";
    if (min % 60 === 0) return `${min / 60} horas`;
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  // Formatear precio CLP
  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return "";
    return formatCurrencyCLP(price);
  };

  const getHabitacionId = (habitacion: Habitacion) => {
    return habitacion?.id_habitacion || habitacion?.id;
  };

  const getHabitacionDisplayName = (habitacion: Habitacion) => {
    const nombre = habitacion?.nombre || habitacion?.name || "";
    const numero = habitacion?.numero || "";
    const displayName = nombre || numero;

    let result = displayName;

    if (showTime && (habitacion.tiempo || habitacion.time)) {
      const tiempo = habitacion.tiempo || habitacion.time || 0;
      result += ` (${formatTime(tiempo)})`;
    }

    if (showPrice && (habitacion.precio || habitacion.price)) {
      const precio = habitacion.precio || habitacion.price || 0;
      result += ` - ${formatPrice(precio)}`;
    }

    return result;
  };

  const handleValueChange = (newValue: string) => {
    // Convertir el valor especial "__none__" a string vacío
    onChange(newValue === "__none__" ? "" : newValue);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className='block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide'>
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="relative">

        <Select value={value || ""} onValueChange={handleValueChange || (() => { })} disabled={disabled}>
          <SelectTrigger
            className="w-full pl-10 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 h-11"
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-80" onClick={(e) => e.stopPropagation()}>
            {/* Barra de búsqueda */}
            <div className="p-2 border-b">
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full"
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Lista de habitaciones */}
            <div className="max-h-60 overflow-y-auto">
              {/* Opción para limpiar selección */}
              {value && (
                <SelectItem
                  value="__none__"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-gray-500 italic">Sin habitación</span>
                </SelectItem>
              )}

              {filteredHabitaciones.length === 0 ? (
                <div className="p-2 text-center text-gray-500 text-sm">
                  {searchTerm ? "No se encontraron habitaciones" : "No hay habitaciones disponibles"}
                </div>
              ) : (
                filteredHabitaciones.map((habitacion) => {
                  const id = getHabitacionId(habitacion);
                  const displayName = getHabitacionDisplayName(habitacion);

                  return (
                    <SelectItem
                      key={id}
                      value={id ? id.toString() : ""}
                      disabled={disabled}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {displayName || "Sin nombre"}
                    </SelectItem>
                  );
                })
              )}
            </div>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default RoomSelect;
