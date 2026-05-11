import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThumbsUp, ThumbsDown, ArrowRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TermWithMetadata } from "@shared/schema";

interface TermCardProps {
  term: TermWithMetadata;
}

export function TermCard({ term }: TermCardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);
  const [upvoteAnimation, setUpvoteAnimation] = useState(false);
  const [downvoteAnimation, setDownvoteAnimation] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(term.upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(term.downvotes);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setLocation(`/term/${term.slug}`);
  };

  const handleVote = async (isUpvote: boolean) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to vote on terms",
        variant: "destructive",
      });
      return;
    }

    setIsVoting(true);
    
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
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div 
      className={cn(
        "card-business p-0 cursor-pointer hover:translate-y-[-2px]",
        term.isLegacy 
          ? "border-l-4 border-orange-500" 
          : "border-l-4 border-primary"
      )}
      onClick={handleCardClick}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            {/* No badges at the top of the card */}
          </div>
          <div>
            {/* Top right area kept for symmetry but now empty */}
          </div>
        </div>
        
        <h3 className="mt-3 text-lg font-medium text-gray-900">{term.name}</h3>
        <div 
          className="mt-2 text-sm text-gray-600 truncate-3-lines"
          dangerouslySetInnerHTML={{ __html: term.definition }}
        />
        
        {/* Voting buttons moved down here */}
        <div className="mt-4 flex items-center">
          <button
            className={cn(
              "btn-business btn-business-secondary text-gray-700 mr-2 !px-2 !py-1",
              isVoting && "opacity-50 pointer-events-none"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleVote(true);
            }}
            disabled={isVoting}
          >
            <ThumbsUp 
              className={cn(
                "h-4 w-4 inline mr-1 text-primary",
                upvoteAnimation && "animate-[clap_0.5s_ease-in-out]"
              )} 
            />
            <span className="text-xs font-medium">{localUpvotes}</span>
          </button>
          <button
            className={cn(
              "btn-business btn-business-secondary text-gray-700 !px-2 !py-1",
              isVoting && "opacity-50 pointer-events-none"
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleVote(false);
            }}
            disabled={isVoting}
          >
            <ThumbsDown 
              className={cn(
                "h-4 w-4 inline mr-1 text-gray-500",
                downvoteAnimation && "animate-[clap_0.5s_ease-in-out]"
              )} 
            />
            <span className="text-xs font-medium">{localDownvotes}</span>
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
        
        {/* Show current term for legacy terms */}
        {term.isLegacy && term.currentTerm && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Current AdobeSpeak Term
            </h4>
            <a 
              href={`/term/${term.currentTerm.slug}`}
              className="mt-2 inline-flex items-center btn-business btn-business-primary text-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLocation(`/term/${term.currentTerm!.slug}`);
              }}
            >
              {term.currentTerm.name}
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </div>
        )}
        
        {/* Show legacy names for current terms */}
        {!term.isLegacy && term.legacyNames && term.legacyNames.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Legacy AdobeSpeak Names
            </h4>
            <div className="mt-2 space-y-2">
              {term.legacyNames.map((legacy) => (
                <a 
                  key={legacy.id}
                  href={`/term/${legacy.slug}`}
                  className="inline-flex items-center btn-business btn-business-secondary text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLocation(`/term/${legacy.slug}`);
                  }}
                >
                  {legacy.name}
                  <History className="ml-1 h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
