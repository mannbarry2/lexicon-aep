import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => void;
  searchResults: any[];
  isSearching: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, navigate] = useLocation();
  
  // Initialize by checking for search parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchQuery(urlSearch);
      doSearch(urlSearch); // Execute search if coming from URL
    }
  }, []);

  // Actual search function that calls the API
  const doSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      // Use the direct search endpoint that handles HTML content properly
      const response = await fetch(`/api/terms/search?search=${encodeURIComponent(query)}&t=${Date.now()}`);
      const data = await response.json();
      
      console.log(`Search for "${query}" found ${data.length} results`);
      setSearchResults(data);
      setIsSearching(false);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const performSearch = (query: string) => {
    setSearchQuery(query);
    doSearch(query);
    
    // Navigate to browse page with the search query
    if (query.trim().length > 0) {
      navigate(`/?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/');
    }
  };

  return (
    <SearchContext.Provider value={{ 
      searchQuery, 
      setSearchQuery, 
      performSearch,
      searchResults,
      isSearching
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}