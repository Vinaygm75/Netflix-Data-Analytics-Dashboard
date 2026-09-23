import React from 'react';

interface FlyingWhalesLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  subtitle?: string;
  dark?: boolean;
  variant?: 'mark' | 'icon' | 'full';
}

/**
 * Official FLYING WHALES Company Logo Component
 * Faithfully matches Reference Image 2 (Company Logo):
 * - Rounded squircle royal blue background (#0066FF)
 * - White line-art whale mark
 * - Twin curved water spout sprays at top
 * - Distinctive tail fluke on the left with leaf-shaped negative cutout
 * - Solid round eye
 */
export const FlyingWhalesLogo: React.FC<FlyingWhalesLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  subtitle = 'Video Production Management',
  dark = false,
  variant = 'icon',
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 40;

  const WhaleMark = ({ strokeColor = '#ffffff' }: { strokeColor?: string }) => (
    <svg
      viewBox="0 0 500 500"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke={strokeColor} strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        {/* Top Water Spout: Twin curved fountain sprays */}
        {/* Left spout spray curving up and to the left */}
        <path d="M 292 188 C 292 142 260 114 216 112" />
        {/* Right spout spray curving up and to the right */}
        <path d="M 292 188 C 295 142 328 114 372 118" />

        {/* Whale Upper Body Arc & Snout */}
        {/* Inner vertical flank with gap at bottom, curving over dome head and front face down to flat belly */}
        <path d="M 206 324 L 206 260 C 206 208 244 188 292 188 C 354 188 392 228 392 284 C 392 344 354 388 288 388 L 194 388 C 158 388 138 366 138 322 L 138 274" />

        {/* Tail Fluke loop on the left */}
        <path d="M 138 274 C 138 246 106 246 94 268 C 82 288 84 310 102 324 C 120 334 138 322 138 322" />

        {/* Inner Leaf / Waterdrop cutout on tail */}
        <path d="M 124 282 C 124 294 115 302 108 296 C 104 290 108 278 120 276" strokeWidth="20" />
      </g>

      {/* Solid Circular Eye */}
      <circle cx="334" cy="286" r="14" fill={strokeColor} />
    </svg>
  );

  if (variant === 'mark') {
    return (
      <div style={{ width: numericSize, height: numericSize }} className={`relative shrink-0 ${className}`}>
        <WhaleMark strokeColor={dark ? '#38bdf8' : '#0066FF'} />
      </div>
    );
  }

  const badgeContent = (
    <div
      style={{ width: numericSize, height: numericSize }}
      className={`rounded-2xl bg-[#0066FF] flex items-center justify-center p-2 shadow-md shadow-blue-500/25 shrink-0 ${className}`}
    >
      <WhaleMark strokeColor="#ffffff" />
    </div>
  );

  if (!showText) {
    return badgeContent;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {badgeContent}
      <div>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight uppercase ${
              dark ? 'text-white' : 'text-slate-900'
            }`}
            style={{ fontSize: Math.max(14, numericSize * 0.42) }}
          >
            FLYING WHALES
          </span>
        </div>
        {subtitle && (
          <p
            className={`font-medium tracking-wide text-xs ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}
            style={{ fontSize: Math.max(10, numericSize * 0.25) }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
