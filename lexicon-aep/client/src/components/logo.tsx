import React from 'react';
import { Link } from 'wouter';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

// Brand constants — see brand-colors.md
const BRAND_BLUE = '#2563eb';
const BRAND_TEAL = '#14b8a6';

/**
 * The AEP Lexicon mark: a square bracket pair enclosing an "A".
 * Reads as both a dictionary-entry marker and as code — fitting the
 * martech/technical audience. The "A" crossbar is the teal accent.
 * Drawn on a 48×48 grid so it stays crisp at any size and as a favicon.
 */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AEP Lexicon"
      className={className}
    >
      {/* Left bracket */}
      <path
        d="M14 9 L9 9 L9 39 L14 39"
        stroke={BRAND_BLUE}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right bracket */}
      <path
        d="M34 9 L39 9 L39 39 L34 39"
        stroke={BRAND_BLUE}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* "A" legs */}
      <path
        d="M24 15 L18 34 M24 15 L30 34"
        stroke={BRAND_BLUE}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* "A" crossbar — teal accent */}
      <path
        d="M20 27 L28 27"
        stroke={BRAND_TEAL}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = 'md', className = '', onClick }: LogoProps) {
  const markSizes = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const textSizes = {
    sm: { aep: 'text-xl', lexicon: 'text-sm' },
    md: { aep: 'text-2xl', lexicon: 'text-base' },
    lg: { aep: 'text-3xl', lexicon: 'text-lg' },
  };

  return (
    <Link
      href="/"
      className={`flex items-center gap-2.5 ${className}`}
      onClick={onClick}
    >
      <LogoMark size={markSizes[size]} />
      <div className="flex flex-col leading-tight">
        <span
          className={`font-display font-bold tracking-tight text-primary ${textSizes[size].aep}`}
        >
          AEP
        </span>
        <span
          className={`font-display font-medium tracking-wide text-slate-500 ${textSizes[size].lexicon}`}
        >
          Lexicon
        </span>
      </div>
    </Link>
  );
}
