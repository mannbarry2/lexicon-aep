import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  title: string;
}

export function SearchBar({ onSearch, placeholder = "Search terms...", title }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between flex-wrap mb-6">
        {title && <h2 className="text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">{title}</h2>}
        <form onSubmit={handleSearch} className={`relative flex-grow max-w-lg ${!title ? 'w-full' : ''}`}>
          <div className="relative">
            <Input
              type="text"
              className="input-business w-full pl-10 pr-24"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <button 
              type="submit" 
              className="absolute right-1 top-1 bottom-1 btn-business btn-business-primary px-4 text-sm"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
