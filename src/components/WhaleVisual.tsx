import React from 'react';

interface WhaleVisualProps {
  className?: string;
}

// Single permanent, verified whale direct image URL
const WHALE_IMAGE_URL = 'https://i.ibb.co/GQVgHWd0/Chat-GPT-Image-Sep-11-2026-08-19-56-PM.png';

/**
 * WhaleVisual - Fixed Cinematic Whale Image Component
 * 
 * - Uses the exact specified whale image URL directly
 * - Zero image processing, conversions, or multi-source fallbacks
 * - Preserves the exact majestic 16s swimming undulation and 12s buoyancy animations
 * - Zero upload controls or storage dependencies
 */
export const WhaleVisual: React.FC<WhaleVisualProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center p-1 sm:p-2 select-none ${className}`}
    >
      {/* Main Whale Container with Slow Cinematic Swimming & Floating Animations */}
      <div className="relative w-full h-full max-w-[96%] max-h-[345px] flex items-center justify-center pointer-events-none whale-undulate-wrapper">
        <div className="relative w-full h-full flex items-center justify-center whale-floating-wrapper">
          <img
            src={WHALE_IMAGE_URL}
            alt="Flying Whales Cinematic Whale"
            referrerPolicy="no-referrer"
            className="w-full h-full max-h-[345px] object-contain select-none pointer-events-none drop-shadow-[0_18px_40px_rgba(1,10,25,0.85)]"
          />
        </div>
      </div>

      {/* Swimming & Floating Keyframe Animations */}
      <style>{`
        /* Slow, majestic 16s swimming undulation cycle */
        @keyframes whaleSwimmingUndulation {
          0% {
            transform: translate3d(0px, 0px, 0px) rotate(0deg);
          }
          25% {
            transform: translate3d(6px, -12px, 0px) rotate(1.4deg);
          }
          50% {
            transform: translate3d(-3px, -20px, 0px) rotate(-0.8deg);
          }
          75% {
            transform: translate3d(-8px, -10px, 0px) rotate(-1.6deg);
          }
          100% {
            transform: translate3d(0px, 0px, 0px) rotate(0deg);
          }
        }

        /* Subtle organic breathing buoyancy floating cycle (12s) */
        @keyframes whaleFloatingBuoyancy {
          0%, 100% {
            transform: scale(1) translateY(0px);
          }
          50% {
            transform: scale(1.018) translateY(-8px);
          }
        }

        .whale-undulate-wrapper {
          animation: whaleSwimmingUndulation 16s ease-in-out infinite;
          transform-origin: 50% 60%;
          will-change: transform;
        }

        .whale-floating-wrapper {
          animation: whaleFloatingBuoyancy 12s ease-in-out infinite;
          transform-origin: 50% 50%;
          will-change: transform;
        }
      `}</style>
    </div>
  );
};