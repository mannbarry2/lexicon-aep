import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Linkedin, Twitter, Facebook, Link2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareButtonsProps {
  title: string;
  url: string;
  description: string;
  className?: string;
}

export function ShareButtons({ title, url, description, className = '' }: ShareButtonsProps) {
  const { toast } = useToast();
  
  // Transform the URL to use the proper production domain
  const urlParts = url.split('/');
  const slug = urlParts[urlParts.length - 1];
  
  // Always use production domain (lexiconaep.barrymann.com) for social media sharing
  // For LinkedIn, NEVER use the social-preview URLs - they must point to the actual term page
  const productionUrl = `https://lexiconaep.barrymann.com/term/${slug}`;
  
  // LinkedIn needs to directly scrape the actual page, not any preview or redirect
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(productionUrl);
  const encodedDescription = encodeURIComponent(description.slice(0, 250) + '...');
  
  console.log("LinkedIn share URL:", productionUrl);
  
  // Generate sharing URLs
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const emailUrl = `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`;
  
  const copyToClipboard = async () => {
    try {
      // Copy the production URL to clipboard
      await navigator.clipboard.writeText(productionUrl);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="text-sm text-gray-500 mr-2 font-medium">Share:</div>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white border-0"
            onClick={() => window.open(linkedinUrl, '_blank')}
          >
            <Linkedin className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share on LinkedIn</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full bg-[#1D9BF0] hover:bg-[#1D9BF0]/90 text-white border-0"
            onClick={() => window.open(twitterUrl, '_blank')}
          >
            <Twitter className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share on Twitter</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white border-0"
            onClick={() => window.open(facebookUrl, '_blank')}
          >
            <Facebook className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share on Facebook</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full bg-[#0E76A8] hover:bg-[#0E76A8]/90 text-white border-0"
            onClick={() => window.open(emailUrl, '_blank')}
          >
            <Mail className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share via Email</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full bg-gray-700 hover:bg-gray-800 text-white border-0"
            onClick={copyToClipboard}
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy Link</TooltipContent>
      </Tooltip>
    </div>
  );
}