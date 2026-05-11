import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Check if user has already made a cookie choice
    const hasAccepted = localStorage.getItem("cookiesAccepted");
    const hasDeclined = localStorage.getItem("cookiesDeclined");
    // Only show banner if the user hasn't made any choice yet
    if (!hasAccepted && !hasDeclined) {
      setShowBanner(true);
    }
  }, []);
  
  const acceptCookies = () => {
    localStorage.setItem("cookiesAccepted", "true");
    setShowBanner(false);
  };
  
  const declineCookies = () => {
    localStorage.setItem("cookiesDeclined", "true");
    setShowBanner(false);
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="fixed bottom-2 right-2 max-w-xs bg-white p-2 rounded-lg shadow-lg border border-gray-200 text-xs z-50 flex items-center space-x-2">
      <p className="text-gray-700 whitespace-nowrap">
        We use cookies
      </p>
      <div className="flex items-center space-x-1">
        <Button 
          size="sm" 
          className="h-5 text-xs bg-[#0E76A8] hover:bg-[#0E76A8]/90 px-2 py-0"
          onClick={acceptCookies}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-5 text-xs px-2 py-0"
          onClick={declineCookies}
        >
          Don't accept
        </Button>
      </div>
    </div>
  );
}