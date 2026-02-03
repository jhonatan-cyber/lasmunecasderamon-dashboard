import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import React, { useRef, useState, useMemo } from "react";

interface Hostess {
  id_usuario?: number;
  id?: number;
  nombre?: string;
  name?: string;
  apellido?: string;
  lastName?: string;
  nick?: string;
}

interface HostessSelectProps {
  anfitrionas: Hostess[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  maxSelection?: number;
  disabled?: boolean;
}

const HostessSelect: React.FC<HostessSelectProps> = ({
  anfitrionas,
  value,
  onChange,
  label = "Anfitriona(s)",
  placeholder = "Seleccione anfitriona(s)",
  searchPlaceholder = "Buscar anfitriona...",
  className = "",
  required = false,
  maxSelection = 5,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Filtrar anfitrionas basado en el término de búsqueda
  const filteredAnfitrionas = useMemo(() => {
    if (!searchTerm) return anfitrionas;
    
    return anfitrionas.filter((anfitriona) => {
      const nombre = anfitriona?.nombre || anfitriona?.name || "";
      const apellido = anfitriona?.apellido || anfitriona?.lastName || "";
      const nick = anfitriona?.nick || "";
      const searchLower = searchTerm.toLowerCase();
      
      return (
        nombre.toLowerCase().includes(searchLower) ||
        apellido.toLowerCase().includes(searchLower) ||
        nick.toLowerCase().includes(searchLower)
      );
    });
  }, [anfitrionas, searchTerm]);

  const getHostessId = (anfitriona: Hostess) => {
    return anfitriona?.id_usuario || anfitriona?.id;
  };

  const getHostessName = (anfitriona: Hostess) => {
    const nombre = anfitriona?.nombre || anfitriona?.name || "";
    const apellido = anfitriona?.apellido || anfitriona?.lastName || "";
    const nick = anfitriona?.nick || "";
    
    if (nick) return nick;
    return `${nombre} ${apellido}`.trim();
  };

  const handleToggleHostess = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      if (value.length < maxSelection) {
        onChange([...value, id]);
      }
    }
  };

  const selectedHostesses = anfitrionas.filter((a) => 
    value.includes(String(getHostessId(a)))
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <Label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className="w-full pl-4 pr-8 border border-gray-300 focus:ring-0 focus:border-black bg-transparent py-2 rounded-full flex items-center min-h-[40px] text-left hover:border-gray-400 transition-colors"
              onClick={() => !disabled && setOpen((v) => !v)}
              disabled={disabled}
            >
              {value.length === 0 ? (
                <span className="text-gray-400">{placeholder}</span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {selectedHostesses.map((a, index) => (
                    <span 
                      key={`${getHostessId(a)}-${index}`} 
                      className="bg-pink-100 text-pink-700 rounded px-2 py-0.5 text-xs font-medium"
                    >
                      {getHostessName(a)}
                    </span>
                  ))}
                </span>
              )}
              <span className="ml-auto pl-2 text-gray-400">▼</span>
            </button>
          </PopoverTrigger>
          {!disabled && (
            <PopoverContent align="start" className="w-[280px] p-0">
              {/* Barra de búsqueda */}
              <div className="p-2 border-b">
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              {/* Lista de anfitrionas */}
              <div className="max-h-60 overflow-y-auto">
                {filteredAnfitrionas.length === 0 ? (
                  <div className="p-2 text-center text-gray-500 text-sm">
                    {searchTerm ? "No se encontraron anfitrionas" : "No hay anfitrionas disponibles"}
                  </div>
                ) : (
                  filteredAnfitrionas.map((anfitriona, index) => {
                    const id = String(getHostessId(anfitriona));
                    const name = getHostessName(anfitriona);
                    const isSelected = value.includes(id);
                    const isDisabled = !isSelected && value.length >= maxSelection;
                    return (
                      <label 
                        key={`${id}-${index}`} 
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded transition-colors ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleHostess(id)}
                          disabled={isDisabled}
                        />
                        <span className="text-sm">{name || "Sin nombre"}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {/* Contador de selección */}
              {maxSelection > 1 && (
                <div className="p-2 border-t bg-gray-50 text-xs text-gray-500">
                  Seleccionadas: {value.length} / Máximo: {maxSelection}
                </div>
              )}
            </PopoverContent>
          )}
        </Popover>
      </div>
    </div>
  );
};

export default HostessSelect; 