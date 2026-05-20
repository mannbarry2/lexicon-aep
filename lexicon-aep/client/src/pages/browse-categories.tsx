import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Category, TermWithMetadata } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TermCard } from "@/components/term-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearch } from "@/hooks/use-search";
import { cn } from "@/lib/utils";
import { BookText, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function BrowseCategories() {
  const { searchQuery } = useSearch();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Featured term IDs for Words of the Week section
  const featuredTermIds = [83, 81]; // Merchandising eVars and ACS Data Collection
  
  // State for vote animations and loading states
  const [votingTermId, setVotingTermId] = useState<number | null>(null);
  const [upvoteAnimation, setUpvoteAnimation] = useState<number | null>(null);
  const [downvoteAnimation, setDownvoteAnimation] = useState<number | null>(null);

  // Fetch all categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch featured terms for Words of the Week
  const { data: featuredTerms, isLoading: isLoadingFeatured } = useQuery<TermWithMetadata[]>({
    queryKey: ["/api/terms/by-ids", { ids: featuredTermIds }],
    queryFn: async () => {
      // Fetch each term individually since we don't have a bulk fetch endpoint
      const terms = await Promise.all(
        featuredTermIds.map(async (id) => {
          const response = await fetch(`/api/terms/${id}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch term ${id}`);
          }
          return response.json();
        })
      );
      return terms;
    }
  });

  // Handle voting on terms in the Words of the Week section
  const handleVote = async (termId: number, isUpvote: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from navigating
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to vote on terms",
        variant: "destructive",
      });
      return;
    }

    setVotingTermId(termId);
    
    try {
      if (isUpvote) {
        setUpvoteAnimation(termId);
        setTimeout(() => setUpvoteAnimation(null), 500);
      } else {
        setDownvoteAnimation(termId);
        setTimeout(() => setDownvoteAnimation(null), 500);
      }

      await apiRequest("POST", "/api/votes", {
        termId: termId,
        isUpvote,
      });

      // Invalidate queries to refresh the vote count
      queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
      queryClient.invalidateQueries({ queryKey: [`/api/terms/${termId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms/by-ids"] });
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVotingTermId(null);
    }
  };

  // Fetch terms by category
  const { data: terms, isLoading: isLoadingTerms } = useQuery<TermWithMetadata[]>({
    queryKey: [
      "/api/terms/by-category", 
      { 
        categoryId: selectedCategory ? parseInt(selectedCategory) : undefined,
        search: searchQuery 
      }
    ],
    // Ensure query runs on initial load with all categories
    enabled: true
  });

  return (
    <Layout>
      <div className="py-6">
        {/* Word of the Week Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-8">
          <div className="flex items-center mb-4">
            <BookText className="text-primary mr-2" size={24} />
            <h1 className="text-2xl font-bold">Words of the Week</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoadingFeatured ? (
              // Loading skeletons
              <>
                <div className="bg-white shadow rounded-lg overflow-hidden p-5">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-7 w-full mt-3" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-3/4 mt-1" />
                </div>
                <div className="bg-white shadow rounded-lg overflow-hidden p-5">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-7 w-full mt-3" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-3/4 mt-1" />
                </div>
              </>
            ) : featuredTerms && featuredTerms.length > 0 ? (
              // Render the featured terms
              featuredTerms.map((term) => (
                <div 
                  key={term.id}
                  className={`card-business p-0 cursor-pointer hover:translate-y-[-2px] border-l-4 ${term.isLegacy ? 'border-orange-500' : 'border-primary'}`}
                  onClick={() => setLocation(`/term/${term.slug}`)}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <div></div>
                      <div></div>
                    </div>
                    
                    <h3 className="mt-3 text-lg font-medium text-gray-900">{term.name}</h3>
                    <p className="mt-2 text-sm text-gray-600 truncate-3-lines">
                      {term.definition
                        .replace(/<[^>]+>/g, " ")
                        .replace(/&nbsp;/g, " ")
                        .replace(/&amp;/g, "&")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/\s+/g, " ")
                        .trim()}
                    </p>
                    
                    {/* Voting buttons */}
                    <div className="mt-4 flex items-center">
                      <button
                        className={cn(
                          "btn-business btn-business-secondary text-gray-700 mr-2 !px-2 !py-1",
                          votingTermId === term.id && "opacity-50 pointer-events-none"
                        )}
                        onClick={(e) => handleVote(term.id, true, e)}
                        disabled={votingTermId === term.id}
                      >
                        <ThumbsUp 
                          className={cn(
                            "h-4 w-4 inline mr-1 text-primary",
                            upvoteAnimation === term.id && "animate-[clap_0.5s_ease-in-out]"
                          )} 
                        />
                        <span className="text-xs font-medium">{term.upvotes}</span>
                      </button>
                      <button
                        className={cn(
                          "btn-business btn-business-secondary text-gray-700 !px-2 !py-1",
                          votingTermId === term.id && "opacity-50 pointer-events-none"
                        )}
                        onClick={(e) => handleVote(term.id, false, e)}
                        disabled={votingTermId === term.id}
                      >
                        <ThumbsDown 
                          className={cn(
                            "h-4 w-4 inline mr-1 text-gray-500",
                            downvoteAnimation === term.id && "animate-[clap_0.5s_ease-in-out]"
                          )} 
                        />
                        <span className="text-xs font-medium">{term.downvotes}</span>
                      </button>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Categories
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {term.categories.map((category) => (
                          <Badge 
                            key={category.id} 
                            className="bg-blue-100 text-blue-800 border-blue-200"
                          >
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback when no featured terms are available
              <div className="col-span-2 text-center py-6">
                <p className="text-gray-500">Featured terms will appear here.</p>
              </div>
            )}
          </div>
        </div>
      
        {/* Category header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold">Browse Categories</h1>
            
            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <div className="flex items-center">
                <div className="w-3 h-6 bg-primary mr-2"></div>
                <span className="text-sm">Current AdobeSpeak</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-6 bg-orange-500 mr-2"></div>
                <span className="text-sm">Legacy AdobeSpeak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {isLoadingCategories ? (
            <div className="flex items-center space-x-2 overflow-x-auto py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-full" />
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <Tabs 
              defaultValue="all" 
              className="w-full"
              onValueChange={(value) => {
                console.log("Tab changed:", value);
                setSelectedCategory(value === "all" ? null : value);
              }}
            >
              <div className="overflow-x-auto pb-2">
                <TabsList className="h-auto p-1">
                  <TabsTrigger
                    value="all"
                    className={cn(
                      "rounded-full px-4 py-2 bg-gray-100 hover:bg-gray-200 data-[state=active]:text-white data-[state=active]:bg-[#2563eb]"
                    )}
                  >
                    All Categories
                  </TabsTrigger>
                  {categories.map((category) => (
                    <TabsTrigger
                      key={category.id}
                      value={String(category.id)}
                      className={cn(
                        "rounded-full px-4 py-2 bg-gray-100 hover:bg-gray-200 data-[state=active]:text-white data-[state=active]:bg-[#2563eb]"
                      )}
                    >
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-6">
                <CategoryContent 
                  terms={terms} 
                  isLoading={isLoadingTerms} 
                  categoryName="All Categories"
                  categoryId={undefined}
                />
              </TabsContent>

              {categories.map((category) => (
                <TabsContent key={category.id} value={String(category.id)} className="mt-6">
                  <CategoryContent 
                    terms={terms} 
                    isLoading={isLoadingTerms}
                    categoryName={category.name}
                    categoryId={category.id}
                  />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-12">
              <h3 className="mt-2 text-xl font-semibold text-gray-900">
                No categories found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Categories will appear as terms are added with new categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

interface CategoryContentProps {
  terms: TermWithMetadata[] | undefined;
  isLoading: boolean;
  categoryName: string;
  categoryId?: number;
}

function CategoryContent({ terms, isLoading, categoryName, categoryId }: CategoryContentProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white shadow rounded-lg overflow-hidden p-5">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-7 w-full mt-3" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!terms || terms.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-xl font-semibold text-gray-900">
          No terms found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No terms in {categoryName}
        </p>
      </div>
    );
  }
  
  // Client-side filtering using category ID as the primary method
  // and falling back to name matching only if needed
  let filteredTerms = terms;
  
  if (categoryId) {
    // Primary filtering method: Use category ID (most reliable, handles renamed categories)
    filteredTerms = terms.filter(term => 
      term.categories.some(cat => cat.id === categoryId)
    );
    
    console.log(`Client-side filtering by ID: ${categoryId} (${categoryName}) - found ${filteredTerms.length} terms`);
  } 
  else if (categoryName !== "All Categories") {
    // Fallback method: Use category name matching (less reliable but handles older data)
    filteredTerms = terms.filter(term => {
      return term.categories.some(cat => 
        cat.name.toLowerCase() === categoryName.toLowerCase() ||
        // Handle renamed categories (e.g., "food" vs "old food")
        cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(cat.name.toLowerCase())
      );
    });
    
    console.log(`Client-side filtering by name: ${categoryName} - found ${filteredTerms.length} terms`);
  }

  return (
    <div>
      {/* Category header */}
      {categoryId && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{categoryName}</h2>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTerms.map((term) => (
          <TermCard key={term.id} term={term} />
        ))}
      </div>
      
      {/* Count indicator */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Displaying {filteredTerms.length} {filteredTerms.length === 1 ? 'term' : 'terms'}
      </div>
    </div>
  );
}