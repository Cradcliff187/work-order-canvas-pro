import React, { useEffect, useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';

interface EntranceAnimationWrapperProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-in' | 'fade-in-up' | 'scale-in';
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function EntranceAnimationWrapper({
  children,
  className,
  animation = 'fade-in-up',
  delay = 0,
  threshold = 0.1,
  rootMargin = '50px',
  once = true,
}: EntranceAnimationWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin,
  });

  useEffect(() => {
    if (isIntersecting && (!once || !hasAnimated)) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setHasAnimated(true);
      }, delay);
      
      return () => clearTimeout(timer);
    } else if (!isIntersecting && !once) {
      setIsVisible(false);
    }
  }, [isIntersecting, delay, once, hasAnimated]);

  return (
    <div
      ref={targetRef as React.RefObject<HTMLDivElement>}
      className={cn(
        'transition-all duration-300',
        isVisible ? animation : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}