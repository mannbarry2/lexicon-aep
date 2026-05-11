import React from 'react';
import { Link } from 'wouter';
import { BookText } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function Logo({ size = 'md', className = '', onClick }: LogoProps) {
  // Size mapping for the book icon
  const iconSizes = {
    sm: 22,
    md: 26,
    lg: 30
  };

  // Font sizes for the logo text
  const textSizes = {
    sm: {
      aep: 'text-3xl',
      lexicon: 'text-xl'
    },
    md: {
      aep: 'text-3xl',
      lexicon: 'text-2xl'
    },
    lg: {
      aep: 'text-4xl',
      lexicon: 'text-2xl'
    }
  };

  return (
    <Link href="/" className={`flex items-center ${className}`} onClick={onClick}>
      <div className="flex items-center">
        <div className="text-primary mr-1">
          <BookText size={iconSizes[size]} strokeWidth={2} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className={`font-display text-primary ${textSizes[size].aep} font-bold tracking-tight`}>AEP</span>
          <span className={`font-display text-primary ${textSizes[size].lexicon} font-medium tracking-wide`}>Lexicon</span>
        </div>
      </div>
    </Link>
  );
}