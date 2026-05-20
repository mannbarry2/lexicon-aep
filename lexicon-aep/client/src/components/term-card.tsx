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
        "card-business p-0 cursor-pointer transition-all duration-200 hover:-translate-y-0.5",
        term.isLegacy
          ? "border-l-4 border-accent"
          : "border-l-4 border-primary"
      )}
      onClick={handleCardClick}
    >
      <div className="p-5">
        <h3 className="font-display text-xl text-foreground" style={{ fontWeight: 500, letterSpacing: "-0.015em" }}>
          {term.name}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground truncate-3-lines leading-relaxed">
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
              "btn-business btn-business-secondary mr-2 !px-2 !py-1",
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
              "btn-business btn-business-secondary !px-2 !py-1",
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
                "h-4 w-4 inline mr-1 text-muted-foreground",
                downvoteAnimation && "animate-[clap_0.5s_ease-in-out]"
              )}
            />
            <span className="text-xs font-medium">{localDownvotes}</span>
          </button>
        </div>

        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
            Categories
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {term.categories.map((category) => (
              <Badge
                key={category.id}
                className="badge-business-primary border-0"
              >
                {category.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Show current term for legacy terms */}
        {term.isLegacy && term.currentTerm && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
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
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
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
