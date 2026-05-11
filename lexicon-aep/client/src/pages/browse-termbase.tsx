import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SearchBar } from "@/components/search-bar";
import { TermCard } from "@/components/term-card";
import { PaginationCustom } from "@/components/pagination-custom";

import { Category, TermWithMetadata } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export default function BrowseTermbase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const pageSize = 12; // Show more terms per page
  
  // Create state to hold directly fetched terms
  const [directTerms, setDirectTerms] = useState<{
    terms: TermWithMetadata[];
    total: number;
  } | null>(null);
  const [directLoading, setDirectLoading] = useState(true);

  // Fetch all categories directly instead of using React Query
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch categories directly
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        
        const response = await fetch(`/api/categories?t=${Date.now()}`);
        const data = await response.json();
        
        setCategories(data);
        setIsLoadingCategories(false);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setIsLoadingCategories(false);
        setCategories([]);
      }
    };
    
    fetchCategories();
  }, []);

  // Fetch terms directly using fetch API instead of React Query which might be having issues
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setDirectLoading(true);
        
        let url;
        
        // For search without category, use the specialized search endpoint that handles HTML content better
        if (searchQuery && selectedCategory === null) {
          url = new URL('/api/terms/search', window.location.origin);
          url.searchParams.append('search', searchQuery);
          url.searchParams.append('t', Date.now().toString());
          
          const response = await fetch(url.toString());
          const searchResults = await response.json();
          
          // Format the results to match the expected structure
          setDirectTerms({
            terms: searchResults,
            total: searchResults.length
          });
          
          console.log(`Search for "${searchQuery}" found ${searchResults.length} results via /search endpoint`);
        } else {
          // For category filtering or no search, use the regular terms endpoint
          url = new URL('/api/terms', window.location.origin);
          url.searchParams.append('page', currentPage.toString());
          url.searchParams.append('pageSize', pageSize.toString());
          url.searchParams.append('t', Date.now().toString());
          
          if (searchQuery) {
            url.searchParams.append('search', searchQuery);
          }
          
          if (selectedCategory !== null) {
            url.searchParams.append('categoryId', selectedCategory.toString());
          }
          
          const response = await fetch(url.toString());
          const data = await response.json();
          
          setDirectTerms(data);
        }
        
        setDirectLoading(false);
      } catch (err) {
        console.error("Error fetching terms:", err);
        setDirectLoading(false);
      }
    };
    
    fetchTerms();
  }, [currentPage, pageSize, searchQuery, selectedCategory]);

  // For debugging - also try the React Query approach
  const { data, isLoading, refetch, error } = useQuery<{
    terms: TermWithMetadata[];
    total: number;
  }>({
    queryKey: [
      "/api/terms", 
      { 
        search: searchQuery, 
        page: currentPage, 
        pageSize, 
        categoryId: selectedCategory,
        t: Date.now() 
      }
    ],
    staleTime: 0,
    enabled: false, // Disable this query for now
  });
  
  // Remove excessive debugging logs
  // Only log errors if they occur
  if (error) {
    console.error("Error:", error);
  }

  // Use the direct fetch data instead of React Query data
  const terms = directTerms?.terms || [];
  const totalPages = directTerms ? Math.ceil(directTerms.total / pageSize) : 0;

  // Handler for search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handler for category selection
  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to first page on category change
  };

  return (
    <Layout>
      <div className="py-6">
        {/* Page Title */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold">Browse Lexicon</h1>
        </div>

        {/* Category Filter */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
          <div className="p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange(null)}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                  selectedCategory === null
                    ? "bg-black text-white" 
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                )}
              >
                All
              </button>
              
              {isLoadingCategories ? (
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-full" />
                  ))}
                </div>
              ) : (
                categories?.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                      selectedCategory === category.id
                        ? "bg-black text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {category.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {directLoading ? (
            <TermsGridSkeleton />
          ) : terms.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="mt-2 text-xl font-semibold text-gray-900">
                No terms found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? `No terms matching "${searchQuery}"${selectedCategory ? " in the selected category" : ""}`
                  : selectedCategory 
                    ? "No terms in the selected category"
                    : "The lexicon is empty. Start by adding terms."}
              </p>
            </div>
          ) : (
            <>
              {/* Terms Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {terms.map((term) => (
                  <TermCard key={term.id} term={term} />
                ))}
              </div>

              {/* Pagination with Page Info */}
              {totalPages > 0 && (
                <div className="mt-8">
                  <div className="text-center mb-2 text-sm text-gray-500">
                    Page {currentPage} of {totalPages} • Showing {terms.length} of {directTerms?.total || 0} terms
                  </div>
                  <PaginationCustom 
                    pageCount={totalPages}
                    currentPage={currentPage}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function TermsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white shadow rounded-lg overflow-hidden p-5">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-7 w-full mt-3" />
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-3/4 mt-1" />
          <div className="mt-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
