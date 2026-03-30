import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

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
        className="pl-10 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchInput; 