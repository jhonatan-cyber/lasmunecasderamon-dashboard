import React from "react";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4 fontawesome-icon"
        />
      </span>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        className="pl-10"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchInput; 