import React from 'react';

/**
 * Reusable Branded Watermark Component
 * Renders the approved "FLYING WHALES" faded display typography
 * using Clash Display / Syne, #1a66c2 brand color, subtle vertical fade,
 * and soft depth blur across all main app views.
 */
interface BrandedWatermarkProps {
  className?: string;
}

export const BrandedWatermark: React.FC<BrandedWatermarkProps> = ({ className = '' }) => {
  return (
    <div
      id="brand-footer-watermark"
      aria-hidden="true"
      className={`relative z-0 mt-16 sm:mt-24 pt-8 pb-10 w-full flex flex-col items-center justify-center select-none pointer-events-none ${className}`}
    >
      <div className="w-full flex justify-center items-center px-4 overflow-hidden">
        <div className="relative flex items-center justify-center max-w-full">
          {/* Subtle atmospheric ambient depth */}
          <span
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap uppercase text-[clamp(1.4rem,5.8vw,4.5rem)] leading-none select-none text-[#1a66c2] dark:text-[#38bdf8] opacity-[0.05] tracking-[0.08em] sm:tracking-[0.12em] md:tracking-[0.15em]"
            style={{
              fontFamily: "'Clash Display', 'Syne', sans-serif",
              fontWeight: 700,
              filter: 'blur(8px)',
            }}
          >
            FLYING WHALES
          </span>

          {/* Main Typographic Watermark: creative editorial display font, distinctive character shapes, vertical fade */}
          <span
            className="relative whitespace-nowrap uppercase text-[clamp(1.4rem,5.8vw,4.5rem)] leading-none select-none text-transparent bg-clip-text bg-gradient-to-b from-[#1a66c2] via-[#1a66c2]/80 to-[#1a66c2]/10 dark:from-[#38bdf8] dark:via-[#0ea5e9]/80 dark:to-[#0284c7]/10 tracking-[0.08em] sm:tracking-[0.12em] md:tracking-[0.15em]"
            style={{
              fontFamily: "'Clash Display', 'Syne', sans-serif",
              fontWeight: 700,
              opacity: 0.23,
              filter: 'blur(0.35px)',
              WebkitMaskImage:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.95) 15%, rgba(0, 0, 0, 0.6) 65%, transparent 100%)',
              maskImage:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.95) 15%, rgba(0, 0, 0, 0.6) 65%, transparent 100%)',
            }}
          >
            FLYING WHALES
          </span>
        </div>
      </div>
    </div>
  );
};
