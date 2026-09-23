import React, { useState, useRef, useMemo } from 'react';
import { WhaleVisual } from './WhaleVisual';

interface WhaleAnimationProps {
  dark?: boolean;
}

/**
 * Cinematic Deep-Ocean Underwater Stage
 * Fulfills all user requirements:
 * - Pure, clean, dark navy/blue oceanic environment
 * - ZERO decorative wave lines, ZERO squiggly caustics, ZERO graphic patterns
 * - Soft diffuse volumetric light rays (photographic god rays with soft blur)
 * - Subtle floating marine snow particles with slow organic drift
 * - Deep underwater haze and realistic depth
 * - Focus is 100% on the realistic swimming blue whale
 * - Ultra-smooth, majestic, slow animation loop
 */
export const WhaleAnimation: React.FC<WhaleAnimationProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Very subtle floating marine particles (marine snow) - minimal and organic
  const particles = useMemo(() => {
    return [
      { id: 1, left: '18%', top: '22%', size: 1.5, opacity: 0.25, duration: 18, delay: 0 },
      { id: 2, left: '72%', top: '15%', size: 1.2, opacity: 0.2, duration: 22, delay: 4 },
      { id: 3, left: '35%', top: '48%', size: 2.0, opacity: 0.3, duration: 16, delay: 2 },
      { id: 4, left: '84%', top: '65%', size: 1.2, opacity: 0.18, duration: 24, delay: 7 },
      { id: 5, left: '26%', top: '78%', size: 1.8, opacity: 0.22, duration: 20, delay: 5 },
      { id: 6, left: '60%', top: '82%', size: 1.4, opacity: 0.2, duration: 25, delay: 9 },
      { id: 7, left: '45%', top: '30%', size: 1.0, opacity: 0.28, duration: 17, delay: 3 },
      { id: 8, left: '12%', top: '55%', size: 1.6, opacity: 0.15, duration: 23, delay: 8 },
    ];
  }, []);

  // Subtle interactive parallax (very gentle, not jarring)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: px, y: py });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full flex flex-col justify-between p-6 sm:p-7 lg:p-7 overflow-hidden select-none bg-[#020914]"
    >
      {/* ============================================================
          1. CLEAN DEEP OCEAN WATER COLUMN (Subtle Gradient)
          No lines, no squiggles, pure cinematic water gradient
      ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, 
            #081e36 0%, 
            #051528 30%, 
            #030e1d 65%, 
            #01060e 100%)`,
        }}
      />

      {/* Surface Sunlight Diffusion: Soft, deep ocean glow penetrating from above */}
      <div
        className="absolute -top-24 inset-x-0 h-80 pointer-events-none opacity-50"
        style={{
          background: 'radial-gradient(ellipse at 55% 0%, rgba(56, 189, 248, 0.22) 0%, rgba(14, 116, 144, 0.08) 50%, transparent 80%)',
        }}
      />

      {/* Volumetric Mid-water Ambient Oceanic Glow behind whale */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[100%] pointer-events-none blur-3xl opacity-30"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(3, 105, 161, 0.25) 0%, rgba(2, 44, 80, 0.1) 55%, transparent 75%)',
        }}
      />

      {/* ============================================================
          2. SOFT VOLUMETRIC LIGHT RAYS (Diffuse, Photographic)
          No sharp lines or graphic shapes — purely soft blurred sunbeams
      ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          transform: `translate3d(${mousePos.x * -8}px, ${mousePos.y * -6}px, 0)`,
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="absolute -top-16 -right-12 w-[130%] h-[130%] pointer-events-none opacity-25 filter blur-2xl volumetric-light-sway">
          <div
            className="w-full h-full"
            style={{
              background: `
                radial-gradient(ellipse 45% 95% at 75% 0%, rgba(125, 211, 252, 0.35) 0%, transparent 75%),
                radial-gradient(ellipse 35% 85% at 50% 0%, rgba(56, 189, 248, 0.25) 0%, transparent 70%),
                radial-gradient(ellipse 40% 90% at 85% 0%, rgba(14, 165, 233, 0.2) 0%, transparent 80%)
              `,
            }}
          />
        </div>
      </div>

      {/* ============================================================
          3. SUBTLE MARINE SNOW PARTICLES (Minimal & Organic)
      ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <span
            key={`p-${p.id}`}
            className="absolute rounded-full bg-sky-200/60 pointer-events-none"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              boxShadow: '0 0 4px rgba(125, 211, 252, 0.6)',
              animation: `particleDrift ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ============================================================
          4. TOP MINIMAL BADGE
      ============================================================ */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] tracking-wider uppercase font-semibold bg-slate-900/60 border border-sky-500/20 text-sky-200/90 backdrop-blur-md shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
          Flying Whales Ad Films
        </div>
      </div>

      {/* ============================================================
          5. CENTERPIECE: REALISTIC CINEMATIC BLUE WHALE
          Naturally swimming in deep water with gentle motion & parallax
      ============================================================ */}
      <div className="relative z-10 my-auto w-full flex-1 flex items-center justify-center py-1 min-h-0">
        <div
          className="relative w-full h-full max-h-[350px] flex items-center justify-center transition-transform duration-700 ease-out will-change-transform"
          style={{
            transform: `perspective(1000px) rotateX(${mousePos.y * -4}deg) rotateY(${mousePos.x * 5}deg) translate3d(${mousePos.x * 8}px, ${mousePos.y * 6}px, 0)`,
          }}
        >
          {/* Ambient Subsurface Oceanic Glow around whale */}
          <div
            className="absolute inset-4 rounded-full pointer-events-none blur-3xl opacity-35"
            style={{
              background: 'radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.2) 0%, rgba(14, 116, 144, 0.1) 50%, transparent 75%)',
            }}
          />

          {/* Photorealistic Cinematic Whale Visual */}
          <WhaleVisual className="w-full h-full" />

          {/* Soft Oceanic Water Haze Overlay (seating whale inside the water column) */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-20"
            style={{
              background: 'radial-gradient(ellipse at 40% 60%, rgba(14, 116, 144, 0.4) 0%, transparent 70%)',
            }}
          />
        </div>
      </div>

      {/* ============================================================
          6. BOTTOM CINEMATIC BRANDING
      ============================================================ */}
      <div className="relative z-20">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white/95 drop-shadow-sm">
            FLYING WHALES
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider font-mono bg-sky-500/15 text-sky-300 border border-sky-400/25 backdrop-blur-sm">
            AD FILMS
          </span>
        </div>
        <p className="text-[11px] sm:text-xs max-w-xs font-normal leading-relaxed text-slate-300/75 drop-shadow-sm">
          Commercial advertising and cinematic film production.
        </p>
      </div>

      {/* ============================================================
          7. UNDERWATER DEPTH VIGNETTE & SEAMLESS EDGE SHADOW
      ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(1, 5, 14, 0.55) 100%)',
        }}
      />

      {/* Right-side depth gradient to frame the white login card seamlessly */}
      <div className="absolute right-0 inset-y-0 w-8 pointer-events-none bg-gradient-to-l from-black/35 to-transparent hidden lg:block" />

      {/* ============================================================
          8. CINEMATIC SLOW ANIMATIONS (CSS)
      ============================================================ */}
      <style>{`
        /* Slow, smooth volumetric light ray movement */
        @keyframes volumetricSway {
          0%, 100% {
            opacity: 0.2;
            transform: rotate(0deg) scale(1);
          }
          50% {
            opacity: 0.32;
            transform: rotate(1.2deg) scale(1.02);
          }
        }

        /* Subtle marine snow drift */
        @keyframes particleDrift {
          0% {
            transform: translate3d(0px, 0px, 0px);
            opacity: 0.15;
          }
          50% {
            transform: translate3d(8px, -14px, 0px);
            opacity: 0.35;
          }
          100% {
            transform: translate3d(-5px, -28px, 0px);
            opacity: 0.12;
          }
        }

        .volumetric-light-sway {
          animation: volumetricSway 14s ease-in-out infinite alternate;
          transform-origin: 75% 0%;
        }
      `}</style>
    </div>
  );
};
