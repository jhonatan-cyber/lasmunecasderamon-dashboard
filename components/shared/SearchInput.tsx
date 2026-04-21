import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { ORDER_FIELD_INPUT_CLASS } from '@/components/orders/orderFieldStyles';

interface SearchInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  id="search",
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      <Search 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none w-4 h-4"
      />
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        className={`${ORDER_FIELD_INPUT_CLASS} pl-10`}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchInput; 