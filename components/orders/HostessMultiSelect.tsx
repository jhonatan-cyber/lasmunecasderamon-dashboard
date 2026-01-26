import { Users } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import SearchInput from "@/components/ui/SearchInput";
import React, { useRef, useState } from "react";

interface HostessMultiSelectProps {
  anfitrionas: any[];
  value: string[];
  onChange: (v: string[]) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  maxSelection?: number; // NUEVO: Límite máximo de selecciones
}

const HostessMultiSelect: React.FC<HostessMultiSelectProps> = ({ 
  anfitrionas, 
  value, 
  onChange, 
  searchValue, 
  onSearchChange, 
  maxSelection 
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Verificar si se ha alcanzado el límite máximo
  const hasReachedLimit = maxSelection ? value.length >= maxSelection : false;
  return (
    <div className="flex-1 min-w-[200px]">
   
      <div className="relative">
        <Users className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10 h-4 w-4" />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className="w-full pl-8 pr-2 border border-gray-300 focus:ring-0 focus:border-black bg-transparent py-1 rounded-full flex items-center min-h-[35px] text-center"
              onClick={() => setOpen((v) => !v)}
            >
              {value.length === 0 ? (
                <span className="text-gray-400">
                  {maxSelection ? `Seleccione anfitriona(s) (máx. ${maxSelection})` : 'Seleccione anfitriona(s)'}
                </span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {anfitrionas
                    .filter((a) => value.includes(String(a.id_usuario || a.id)))
                    .map((a) => (
                      <span key={a.id_usuario || a.id} className="bg-pink-100 text-pink-700 rounded px-2 py-0.5 text-xs">{a.nick || a.nombre}</span>
                    ))}
                  {maxSelection && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({value.length}/{maxSelection})
                    </span>
                  )}
                </span>
              )}
              <span className="ml-auto pl-2 text-gray-400">▼</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px] p-0">
            <div className="px-2 py-1 sticky top-0 z-10 bg-white">
              <SearchInput value={searchValue} onChange={onSearchChange} placeholder="Buscar anfitriona..." className="w-full mb-2" />
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {anfitrionas.length === 0 && (
                <div className="text-xs text-gray-400 px-2 py-2">No hay anfitrionas</div>
              )}
              {hasReachedLimit && (
                <div className="text-xs text-orange-600 px-2 py-2 bg-orange-50 border-b">
                  Límite alcanzado: {value.length} de {maxSelection} seleccionadas
                </div>
              )}
              {anfitrionas.map((a) => {
                const id = String(a.id_usuario || a.id);
                const isSelected = value.includes(id);
                const canSelect = isSelected || !hasReachedLimit;
                
                return (
                  <label key={id} className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Checkbox
                      checked={isSelected}
                      disabled={!canSelect}
                      onCheckedChange={() => {
                        if (isSelected) {
                          // Siempre permitir deseleccionar
                          onChange(value.filter((x) => x !== id));
                        } else if (!hasReachedLimit) {
                          // Solo permitir seleccionar si no se ha alcanzado el límite
                          onChange([...value, id]);
                        }
                      }}
                    />
                    <span className="text-sm">{a.nick || a.nombre}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default HostessMultiSelect; 