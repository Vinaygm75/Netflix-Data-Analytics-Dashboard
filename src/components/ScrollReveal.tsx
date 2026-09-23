import React, { useEffect, useRef, useState } from 'react';

export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Delay in milliseconds (e.g. 50-70ms for stagger)
  duration?: number; // Transition duration in milliseconds (default 600ms)
  distance?: number; // Vertical translateY distance in px (default 30px)
  threshold?: number; // Viewport intersection threshold (default 0.15)
  rootMargin?: string;
  onVisible?: () => void;
  id?: string;
  style?: React.CSSProperties;
}

/**
 * High-performance IntersectionObserver hook.
 * Elements remain hidden (opacity: 0, translateY: 30px) until ~15% of the element enters the viewport.
 * Automatically disconnects once revealed so the animation triggers only once.
 */
export function useInViewObserver<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
  rootMargin = '0px'
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    // If reduced motion is requested, show immediately
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsInView(true);
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    // Use IntersectionObserver to accurately detect entry into the viewport as user scrolls
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Triggers when ~15% of the section enters the viewport
          const targetHeight = entry.boundingClientRect.height || 200;
          const pxInViewport = window.innerHeight - entry.boundingClientRect.top;
          const hasFifteenPercentEntered =
            entry.intersectionRatio >= threshold ||
            (pxInViewport >= Math.min(60, targetHeight * threshold) && entry.boundingClientRect.bottom > 0);

          if (entry.isIntersecting && hasFifteenPercentEntered) {
            setIsInView(true);
            observer.unobserve(entry.target);
            observer.disconnect();
          }
        });
      },
      {
        threshold: [0, threshold],
        rootMargin,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return [ref, isInView];
}

/**
 * Premium iOS-style ScrollReveal component.
 * - Below viewport: translateY(30px), opacity: 0
 * - Enters viewport (~15% visible): translateY(0), opacity: 1
 * - Duration: 600ms with ease-out cubic-bezier(0.16, 1, 0.3, 1)
 * - Triggers once via IntersectionObserver as user scrolls
 * - Zero heavy scroll listeners, zero bouncing, zero jitter
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 600,
  distance = 30,
  threshold = 0.15,
  rootMargin = '0px',
  onVisible,
  id,
  style = {},
}) => {
  const [ref, isInView] = useInViewObserver<HTMLDivElement>(threshold, rootMargin);
  const hasFiredCallback = useRef(false);

  useEffect(() => {
    if (isInView && onVisible && !hasFiredCallback.current) {
      hasFiredCallback.current = true;
      onVisible();
    }
  }, [isInView, onVisible]);

  // Check reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animationStyle: React.CSSProperties = prefersReducedMotion
    ? {
        opacity: 1,
        transform: 'none',
        ...style,
      }
    : {
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0px)' : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: isInView ? 'auto' : 'opacity, transform',
        ...style,
      };

  return (
    <div ref={ref} id={id} className={`w-full min-w-0 ${className}`} style={animationStyle}>
      {children}
    </div>
  );
};

/**
 * ScrollRevealStagger
 * Wraps a list of items and applies a subtle 50-70ms sequential stagger delay
 */
export interface ScrollRevealStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerMs?: number; // default 60ms (50-70ms)
  baseDelay?: number; // default 0ms
  threshold?: number;
  id?: string;
}

export const ScrollRevealStagger: React.FC<ScrollRevealStaggerProps> = ({
  children,
  className = '',
  staggerMs = 60,
  baseDelay = 0,
  threshold = 0.15,
  id,
}) => {
  const childArray = React.Children.toArray(children);

  return (
    <div id={id} className={className}>
      {childArray.map((child, index) => (
        <ScrollReveal
          key={index}
          delay={baseDelay + index * staggerMs}
          threshold={threshold}
          duration={600}
          distance={30}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
};
