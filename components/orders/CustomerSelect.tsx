/* eslint-disable @typescript-eslint/no-explicit-any */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import React from "react";

interface CustomerSelectProps {
  clientes: any[];
  value: string;
  onChange: (v: string) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({ clientes, value, onChange, searchValue, onSearchChange }) => (
  <div className="flex-1 min-w-[200px]">
    <Label className="block text-xs font-medium text-gray-500 mb-1">Cliente</Label>
    <div className="relative">
      <User className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none h-4 w-4" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full pl-8 border border-gray-300 focus:ring-0 focus:border-black bg-transparent py-1">
          <SelectValue placeholder="Seleccione un cliente" />
        </SelectTrigger>
        <SelectContent style={{ maxHeight: 300, overflowY: "auto" }}>
          <div className="px-2 py-1 sticky top-0 z-10 bg-white">
            <SearchInput value={searchValue} onChange={onSearchChange} placeholder="Buscar cliente..." className="w-full mb-2" />
          </div>
          {clientes.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name || c.nombre} {c.lastName || ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

export default CustomerSelect; 
