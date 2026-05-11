import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// Component to handle image loading fallbacks
export function ImageWithFallback({ 
  src, 
  alt, 
  className,
  ...props 
}: React.ImgHTMLAttributes<HTMLImageElement> & { src: string, alt: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  // Transform image URLs to always use production domain for LinkedIn sharing
  // This helps with images that exist in production but not in the development environment
  const isProduction = window.location.hostname === 'lexiconaep.com';
  const imageUrl = isProduction ? src : src.replace(/^\/uploads/, 'https://lexiconaep.com/uploads');
  
  return (
    <div className="relative">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
          <AlertTriangle className="h-6 w-6 text-orange-500 mb-2" />
          <span className="text-xs text-gray-500">Image unavailable</span>
        </div>
      )}
      <img
        src={error ? '/logo-social.png' : imageUrl}
        alt={alt}
        className={className}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
}