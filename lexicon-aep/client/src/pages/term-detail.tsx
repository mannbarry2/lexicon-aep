import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { TermWithMetadata } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ThumbsUp, ThumbsDown, Edit, ArrowLeft, ArrowRight, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { TermImages } from "@/components/term-images";
import { MetaTags } from "@/components/meta-tags";
import { ShareButtons } from "@/components/share-buttons";
import { Helmet } from 'react-helmet';

// Utility function to strip HTML tags for meta descriptions
const stripHtml = (html: string): string => {
  // First replace common entity codes
  const withoutEntities = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
    
  // Then strip all HTML tags
  return withoutEntities.replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Helper to detect LinkedIn's in-app browser and iOS devices
function detectLinkedInBrowser(): boolean {
  if (typeof window !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // iOS specific detection
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isIOSWebView = isIOS && !userAgent.includes('safari') && !userAgent.includes('crios');
    
    // LinkedIn app webviews often have these patterns
    const linkedInPatterns = [
      'linkedin',
      'professional-services',
      'lispeak',
      'liapp',
      'liwebview'
    ];
    
    // Check if any LinkedIn patterns are in the user agent
    const hasLinkedInPattern = linkedInPatterns.some(pattern => 
      userAgent.includes(pattern)
    );
    
    return (
      // Explicit LinkedIn indicators
      hasLinkedInPattern || 
      
      // iOS in-app browsers (including LinkedIn on iOS)
      (isIOS && isIOSWebView) ||
      
      // Common in-app browser indicators for Android
      (userAgent.includes('mozilla') && 
       userAgent.includes('mobile') && 
       !userAgent.includes('chrome') &&
       !userAgent.includes('safari'))
    );
  }
  return false;
}

export default function TermDetail() {
  const [slugMatch, slugParams] = useRoute("/term/:slug");
  const [idMatch, idParams] = useRoute("/term/id/:id");
  const [, setLocation] = useLocation();
  const { user, isAdmin, isLoggedIn, signIn } = useAuth();
  const { toast } = useToast();
  const [upvoteAnimation, setUpvoteAnimation] = useState(false);
  const [downvoteAnimation, setDownvoteAnimation] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState<number | null>(null);
  const [localDownvotes, setLocalDownvotes] = useState<number | null>(null);
  const [isLinkedInBrowser, setIsLinkedInBrowser] = useState(false);
  
  // Detect LinkedIn browser once component mounts
  useEffect(() => {
    setIsLinkedInBrowser(detectLinkedInBrowser());
  }, []);

  // Determine if we're using a slug or ID
  const isSlugRoute = slugMatch && !idMatch;
  const isIdRoute = !slugMatch && idMatch;

  // Use the appropriate API endpoint
  const apiEndpoint = isSlugRoute 
    ? `/api/terms/slug/${slugParams?.slug}`
    : isIdRoute
      ? `/api/terms/${idParams?.id}`
      : null;

  // Fetch term details
  const { data: term, isLoading, isError } = useQuery<TermWithMetadata>({
    queryKey: [apiEndpoint],
    enabled: !!apiEndpoint,
  });

  // Initialize local vote counts from term data when it loads
  useEffect(() => {
    if (term) {
      setLocalUpvotes(term.upvotes);
      setLocalDownvotes(term.downvotes);
    }
  }, [term]);

  // Handle voting
  const handleVote = async (isUpvote: boolean) => {
    if (!term) return;
    
    try {
      if (isUpvote) {
        setUpvoteAnimation(true);
        setTimeout(() => setUpvoteAnimation(false), 500);
      } else {
        setDownvoteAnimation(true);
        setTimeout(() => setDownvoteAnimation(false), 500);
      }
      
      const responseData = await apiRequest("POST", "/api/votes", {
        termId: term.id,
        isUpvote,
      });
      
      // Update local vote counts from the server response
      if (responseData && typeof responseData === 'object') {
        const { termUpvotes, termDownvotes } = responseData as any;
        if (typeof termUpvotes === 'number' && typeof termDownvotes === 'number') {
          setLocalUpvotes(termUpvotes);
          setLocalDownvotes(termDownvotes);
        }
      }

      // Invalidate all relevant queries to refresh vote counts everywhere
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
      queryClient.invalidateQueries({ queryKey: [`/api/terms/${term.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/terms/slug/${term.slug}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms/by-category"] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms/by-ids"] });
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle edit button
  const handleEdit = () => {
    if (!term) return;
    setLocation(`/edit-meaning?term=${term.id}`);
  };

  if (isError) {
    return (
      <Layout>
        <div className="py-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Term not found</h2>
            <p className="mt-2 text-gray-500">The term you're looking for doesn't exist or has been removed.</p>
            <Button
              onClick={() => setLocation("/")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Termbase
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading || !term) {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-6 w-full mt-4" />
                <Skeleton className="h-24 w-full mt-4" />
                <div className="mt-6">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Create canonical and image URLs for metadata
  // Always use production URL for LinkedIn sharing
  const productionBaseUrl = "https://lexiconaep.barrymann.com";
  const canonicalUrl = `${productionBaseUrl}/term/${term.slug}`;
  
  // Prepare image URL - LinkedIn requires absolute URLs
  let termImageUrl;
  if (term.images && term.images.length > 0) {
    // First check if we have a Firebase URL
    if (term.images[0] && term.images[0].firebaseUrl) {
      termImageUrl = term.images[0].firebaseUrl;
      console.log("Using Firebase image URL for metadata:", termImageUrl);
    }
    // Fall back to local storage if no Firebase URL
    else if (term.images[0] && term.images[0].filename) {
      termImageUrl = `${productionBaseUrl}/uploads/${term.images[0].filename}`;
      console.log("Using local term image for metadata:", termImageUrl);
    } else {
      termImageUrl = `${productionBaseUrl}/logo-social.png`;
      console.log("Using default logo (no valid term image found)");
    }
  } else {
    termImageUrl = `${productionBaseUrl}/logo-social.png`;
    console.log("Using default logo (no images array)");
  }
  
  // Log image URL for debugging
  console.log("Term image URL for metadata:", termImageUrl);
  
  // LinkedIn share URL
  const linkedInShareUrl = `${productionBaseUrl}/term/${term.slug}`;
  console.log("LinkedIn share URL:", linkedInShareUrl);

  return (
    <Layout>
      <Helmet>
        {/* Basic tags */}
        <title>{term.name} | Adobe AEP Lexicon</title>
        <meta name="description" content={stripHtml(term.definition).slice(0, 160)} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* LinkedIn specific OpenGraph tags - enhanced for better sharing */}
        <meta property="og:title" content={`${term.name} | Adobe AEP Lexicon`} />
        <meta property="og:description" content={stripHtml(term.definition).slice(0, 160)} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Adobe AEP Lexicon" />
        <meta property="og:image" content={termImageUrl} />
        <meta property="og:image:secure_url" content={termImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`Image for ${term.name}`} />
        <meta property="og:image:type" content="image/png" />
        
        {/* Additional LinkedIn-specific tags */}
        <meta name="author" content="Adobe AEP Lexicon" />
        <meta property="article:published_time" content={new Date(term.updatedAt).toISOString()} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="skype_toolbar" content="skype_toolbar_parser_compatible" />
        <meta name="linkedin:optimizebrowser" content="true" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content={termImageUrl ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={term.name} />
        <meta name="twitter:description" content={stripHtml(term.definition).slice(0, 160)} />
        <meta name="twitter:image" content={termImageUrl} />
      </Helmet>
      
      {/* Keep MetaTags for other pages */}
      <MetaTags
        title={term.name}
        description={stripHtml(term.definition).slice(0, 160)}
        canonical={canonicalUrl}
        image={termImageUrl}
        type="article"
        twitterCard={termImageUrl ? "summary_large_image" : "summary"}
      />
      <div className="py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button
              className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          
          <div 
            className={cn(
              "card-business overflow-hidden",
              term.isLegacy 
                ? "border-l-4 border-orange-500" 
                : "border-l-4 border-primary"
            )}
          >
            <div className="p-6 bg-white">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{term.name}</h1>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {/* AdobeSpeak badge removed as requested */}
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
                {isLoggedIn ? (
                  <Button
                    className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0"
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Term
                  </Button>
                ) : (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => signIn()}
                          className="opacity-60 hover:opacity-100 border-dashed"
                          aria-label="Sign in to edit this term"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Term
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sign in to edit this term</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <div className="mt-6">
                <div className={cn(
                  "prose max-w-none p-6 bg-gray-50 rounded-md border border-gray-200",
                  isLinkedInBrowser && "p-4 text-base"
                )}>
                  {isLinkedInBrowser && (
                    <div className="mb-4 px-2 py-1 text-xs text-gray-500 bg-blue-50 rounded-md border border-blue-100">
                      {/iphone|ipad|ipod/i.test(navigator.userAgent) 
                        ? "You're viewing on iOS. For best experience, tap the '...' and select 'Open in Safari'."
                        : "You're viewing in LinkedIn browser. For best experience, open in your device's browser."}
                    </div>
                  )}
                  <div 
                    className={cn(
                      "text-gray-800 term-definition",
                      isLinkedInBrowser && "leading-relaxed space-y-4"
                    )}
                    dangerouslySetInnerHTML={{ 
                      __html: isLinkedInBrowser 
                        ? term.definition
                            // Replace emoji images with text alternatives
                            .replace(/<img[^>]*class="emoji"[^>]*alt="([^"]*)"[^>]*>/g, "$1")
                            // Add extra spacing to list items
                            .replace(/<li>/g, '<li style="margin-bottom: 8px;">')
                            // Improve sandwich term highlighting
                            .replace(/<span[^>]*class="sandwich"[^>]*>([^<]*)<\/span>/g, 
                              '<span style="background-color: #FFEB3B; padding: 2px 4px; border-radius: 3px; font-weight: 500;">$1</span>')
                            // Specifically handle "Rule Sandwich" highlighting
                            .replace(/([Tt]he\s+[Rr]ule\s+[Ss]andwich)/g, 
                              '<span style="background-color: #FFEB3B; padding: 2px 4px; border-radius: 3px; font-weight: 500; display: inline-block; margin: 0 1px;">$1</span>')
                            // Improve iOS formatting for paragraphs
                            .replace(/<p>/g, '<p style="margin-bottom: 1em; line-height: 1.6;">')
                            // Force proper newlines for iOS
                            .replace(/<br>/g, '<br style="display: block; content: \'\'; margin-top: 0.5em;">')
                        : term.definition 
                    }}
                  />
                </div>
              </div>
              
              {/* Current/Legacy references */}
              {term.isLegacy && term.currentTerm && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Current AdobeSpeak Term
                  </h3>
                  <a 
                    href={`/term/${term.currentTerm.slug}`}
                    className="mt-2 inline-flex items-center bg-[#2563eb] text-white hover:bg-[#2563eb]/90 rounded-md px-3 py-1.5 text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation(`/term/${term.currentTerm!.slug}`);
                    }}
                  >
                    <span className="font-medium">{term.currentTerm.name}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </div>
              )}
              
              {!term.isLegacy && term.legacyNames && term.legacyNames.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Legacy AdobeSpeak Names
                  </h3>
                  <div className="mt-2 space-y-2">
                    {term.legacyNames.map((legacy) => (
                      <a 
                        key={legacy.id}
                        href={`/term/${legacy.slug}`}
                        className="inline-flex items-center bg-[#2563eb] text-white hover:bg-[#2563eb]/90 rounded-md px-3 py-1.5 text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setLocation(`/term/${legacy.slug}`);
                        }}
                      >
                        <span className="font-medium">{legacy.name}</span>
                        <History className="ml-2 h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Images section */}
              {term.images && (
                <TermImages
                  termId={term.id}
                  images={term.images || []}
                  isAdmin={isAdmin}
                  isLoggedIn={isLoggedIn}
                />
              )}
              
              {/* Social Share Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <ShareButtons 
                  title={`${term.name} | AEP Lexicon`}
                  url={canonicalUrl}
                  description={stripHtml(term.definition)}
                />
              </div>
              
              {/* Voting and metadata */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center space-x-3">
                  <button
                    className="btn-business btn-business-secondary flex items-center"
                    onClick={() => handleVote(true)}
                  >
                    <ThumbsUp 
                      className={cn(
                        "h-5 w-5 mr-2 text-primary",
                        upvoteAnimation && "animate-[clap_0.5s_ease-in-out]"
                      )} 
                    />
                    <span className="font-medium">{localUpvotes !== null ? localUpvotes : term.upvotes}</span>
                  </button>
                  <button
                    className="btn-business btn-business-secondary flex items-center"
                    onClick={() => handleVote(false)}
                  >
                    <ThumbsDown 
                      className={cn(
                        "h-5 w-5 mr-2 text-gray-500",
                        downvoteAnimation && "animate-[clap_0.5s_ease-in-out]"
                      )} 
                    />
                    <span className="font-medium">{localDownvotes !== null ? localDownvotes : term.downvotes}</span>
                  </button>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-200">
                  Last updated: {format(new Date(term.updatedAt), "MMMM d, yyyy")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}