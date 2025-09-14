/**
 * Progressive Image Loading Component
 * Uses intersection observer to load images only when they're about to be visible
 * Provides smooth loading transitions and placeholder states
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // Load immediately if true
  threshold?: number; // Intersection observer threshold (0-1)
  rootMargin?: string; // Intersection observer root margin
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  placeholder = '/Venue.png',
  className = '',
  onLoad,
  onError,
  priority = false,
  threshold = 0.1,
  rootMargin = '50px'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true);
    setCurrentSrc(placeholder);
    onError?.();
  }, [placeholder, onError]);

  // Set up intersection observer
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority, threshold, rootMargin]);

  // Load image when in view
  useEffect(() => {
    if (isInView && src && !hasError) {
      setCurrentSrc(src);
    }
  }, [isInView, src, hasError]);

  // Reset state when src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setIsLoaded(false);
      setHasError(false);
      setCurrentSrc(placeholder);
    }
  }, [src, placeholder, currentSrc]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder/loading state */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Failed to load</div>
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
};

export default ProgressiveImage;
