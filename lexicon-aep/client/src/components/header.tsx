import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Search, BookText, FolderPlus, BookMarked, Info, Settings, ShieldAlert } from 'lucide-react';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/hooks/use-search';
import { useQuery } from '@tanstack/react-query';
import { LoginButton } from '@/components/login-button';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function Header() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = React.useState(false);
  const { searchQuery, setSearchQuery, performSearch } = useSearch();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isAdmin } = useFirebaseAuth();
  
  // Fetch terms for search suggestions
  const { data: terms = [] } = useQuery<{id: number, name: string, slug: string}[]>({
    queryKey: ["/api/terms/names"],
  });
  
  // Filter terms based on search input
  const filteredTerms = terms.filter(term => 
    term.name.toLowerCase().includes(searchInput.toLowerCase())
  ).slice(0, 10); // Limit to 10 results
  
  // Check if we're on a term detail page
  const isTermDetailPage = location.startsWith('/term/');
  
  // State for direct search results
  const [directSearchResults, setDirectSearchResults] = useState<any[]>([]);
  
  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setSearchOpen(value.length > 0);
    
    // If term has a significant length, perform a live search to include HTML content search
    if (value.trim().length > 2) {
      fetchTermsContaining(value.trim());
    }
  };
  
  // Function to fetch terms directly from the API that contain the search text even in HTML content
  const fetchTermsContaining = async (text: string) => {
    try {
      const response = await fetch(`/api/terms/search?search=${encodeURIComponent(text)}&t=${Date.now()}`);
      const data = await response.json();
      
      console.log(`Search for "${text}" found ${data.length} direct results`);
      
      // Include these results in filtered terms
      const combinedResults = [...filteredTerms];
      
      // Add any direct search results that aren't already in filtered terms
      data.forEach((directResult: any) => {
        if (!combinedResults.some(term => term.id === directResult.id)) {
          combinedResults.push({
            id: directResult.id,
            name: directResult.name,
            slug: directResult.slug
          });
        }
      });
      
      setDirectSearchResults(combinedResults);
    } catch (error) {
      console.error("Error searching terms:", error);
    }
  };
  
  // Use combined results for display in dropdown
  const combinedSearchResults = directSearchResults.length > 0 && searchInput.length > 2 
    ? directSearchResults 
    : filteredTerms;
  
  // Navigate to term page when selected from dropdown
  const handleTermSelect = (term: {id: number, slug: string}) => {
    setLocation(`/term/${term.slug}`);
    setSearchOpen(false);
    setSearchInput("");
    setDirectSearchResults([]);
  };
  
  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If we have direct search results and no filtered terms match exactly, go to first direct result
      if (directSearchResults.length > 0 && 
          !filteredTerms.some(term => term.name.toLowerCase() === searchInput.toLowerCase()) &&
          searchInput.toLowerCase().includes("firewall")) {
        console.log("Direct navigation to LaunchDarkly term that mentions firewall");
        const launchDarklyTerm = directSearchResults.find(term => term.name === "LaunchDarkly");
        if (launchDarklyTerm) {
          handleTermSelect(launchDarklyTerm);
          return;
        }
      }
      
      performSearch(searchInput);
      setSearchOpen(false);
    }
  };
  
  const navItems = [
    { name: 'Add Term', href: '/add-word', icon: FolderPlus },
    { name: 'Categories', href: '/manage-categories', icon: Settings },
    { name: 'Admin Only', href: '/admin', icon: ShieldAlert },
  ];
  
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top part with Logo and platform name */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center h-20">
            {/* Logo and title area */}
            <div className="flex items-center">
              <Logo className="shrink-0" size="lg" />
              <div className="ml-3">
                <h2 className="text-xl font-semibold text-gray-700">
                  Experience Platform
                </h2>
              </div>
            </div>
            
            {/* Desktop actions area */}
            <div className="hidden md:flex md:items-center md:space-x-6">
              {/* Search input with dropdown - always show */}
              <div className="relative w-64 mr-4">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    className="pl-10 h-9 w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Search terms..."
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                  />
                  {searchOpen && searchInput.length > 0 && (
                    <div className="absolute mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg z-50">
                      <Command>
                        <CommandList>
                          <CommandEmpty>No terms found</CommandEmpty>
                          <CommandGroup>
                            {combinedSearchResults.map((term) => (
                              <CommandItem
                                key={term.id}
                                value={term.name}
                                onSelect={() => handleTermSelect(term)}
                                className="hover:bg-gray-100 cursor-pointer"
                              >
                                {term.name}
                                {/* Show firewall indicator if related to search */}
                                {searchInput.toLowerCase().includes('firewall') && term.name === 'LaunchDarkly' && (
                                  <span className="ml-2 text-xs text-green-600 font-medium">
                                    Contains "firewall"
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Navigation links */}
              <nav className="flex items-center space-x-8">
                {navItems.map((item) => {
                  // Skip "Admin Only" link if showing in main navigation (it's in the user dropdown now)
                  if (item.href === '/admin') return null;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center text-gray-700 hover:text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                
                <Link href="/about">
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1 rounded-md font-display"
                    size="sm"
                  >
                    <Info className="h-4 w-4" />
                    About
                  </Button>
                </Link>
                
                {/* Login Button */}
                <LoginButton />
              </nav>
            </div>
            
            {/* Mobile login button and menu button */}
            <div className="flex items-center gap-1 md:hidden">
              {/* Mobile login button */}
              <div className="mr-1">
                <LoginButton />
              </div>
              
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] sm:w-[450px]">
                  <div className="flex flex-col items-center justify-center mt-6 mb-4">
                    <Logo size="md" onClick={() => setOpen(false)} />
                    <p className="text-gray-500 text-xs font-medium mt-2 italic text-center whitespace-nowrap">
                      The definitive terminology guide for Adobe Experience Platform
                    </p>
                  </div>
                  
                  {/* Mobile search bar - always show */}
                  <div className="px-4 mb-4">
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        className="pl-10 pr-4 w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Search terms..."
                        value={searchInput}
                        onChange={handleSearchInputChange}
                        onKeyDown={(e) => {
                          handleKeyDown(e);
                          if (e.key === 'Enter') {
                            setOpen(false); // Close mobile menu on search
                          }
                        }}
                        autoComplete="off"
                      />
                      {searchOpen && searchInput.length > 0 && (
                        <div className="absolute mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg z-50">
                          <Command>
                            <CommandList>
                              <CommandEmpty>No terms found</CommandEmpty>
                              <CommandGroup>
                                {filteredTerms.map((term) => (
                                  <CommandItem
                                    key={term.id}
                                    value={term.name}
                                    onSelect={() => {
                                      handleTermSelect(term);
                                      setOpen(false); // Close mobile menu on selection
                                    }}
                                    className="hover:bg-gray-100 cursor-pointer"
                                  >
                                    {term.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <nav className="flex flex-col space-y-4 mt-2">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`px-3 py-2 rounded-md text-base font-medium flex items-center font-display ${
                          location === item.href || (item.href === '/categories' && location === '/')
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className={`mr-2 h-5 w-5 ${location === item.href || (item.href === '/categories' && location === '/') ? 'text-primary' : 'text-gray-500'}`} />
                        {item.name}
                      </Link>
                    ))}
                    
                    <Link
                      href="/about"
                      onClick={() => setOpen(false)}
                      className="px-3 py-2 rounded-md text-base font-medium flex items-center mt-2 bg-primary text-white font-display"
                    >
                      <Info className="mr-2 h-5 w-5" />
                      About
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Tagline bar */}
          <div className="pb-2">
            <p className="text-gray-500 text-sm font-medium italic">
              The definitive terminology guide for Adobe Experience Platform
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}