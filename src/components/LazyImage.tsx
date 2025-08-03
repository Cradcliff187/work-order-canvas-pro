import React, { useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  loading?: 'lazy' | 'eager';
  webpSrc?: string;
  sizes?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNkM5Ljk1IDI2IDIgMjAuMDUgMiAyM0MyIDI1Ljk1IDkuOTUgMzIgMjAgMzJDMzAuMDUgMzIgMzggMjUuOTUgMzggMjNDMzggMjAuMDUgMzAuMDUgMTQgMjAgMTRWMjZaIiBmaWxsPSIjOTQ5OEE1Ii8+Cjwvc3ZnPgo=',
  fallback = '/placeholder.svg',
  loading = 'lazy',
  webpSrc,
  sizes = '100vw',
}: LazyImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  const shouldLoad = loading === 'eager' || isIntersecting;
  const imageSrc = imageError ? fallback : src;

  // WebP support detection and source selection
  const supportsWebP = typeof window !== 'undefined' && 
    window.CSS && window.CSS.supports && window.CSS.supports('(background-image: url("data:image/webp;base64,"))');

  return (
    <div ref={targetRef as React.RefObject<HTMLDivElement>} className={cn('overflow-hidden', className)}>
      {shouldLoad ? (
        webpSrc && supportsWebP ? (
          <picture>
            <source srcSet={webpSrc} type="image/webp" sizes={sizes} />
            <img
              src={imageSrc}
              alt={alt}
              className={cn(
                'transition-opacity duration-300 fade-in',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                className
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading={loading}
              sizes={sizes}
            />
          </picture>
        ) : (
          <img
            src={imageSrc}
            alt={alt}
            className={cn(
              'transition-opacity duration-300 fade-in',
              imageLoaded ? 'opacity-100' : 'opacity-0',
              className
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading={loading}
            sizes={sizes}
          />
        )
      ) : (
        <div
          className={cn(
            'bg-muted animate-pulse flex items-center justify-center',
            className
          )}
        >
          <img
            src={placeholder}
            alt="Loading..."
            className="opacity-50"
          />
        </div>
      )}
    </div>
  );
}