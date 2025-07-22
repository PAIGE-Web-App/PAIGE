// components/OptimizedImage.tsx
// Optimized Image Component with lazy loading and responsive images

import React from 'react';
import { ImageOptimizer } from '@/utils/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  lazy?: boolean;
  placeholder?: boolean;
  quality?: number;
  format?: 'webp' | 'avif' | 'original';
  sizes?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  responsiveSizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  lazy = !priority,
  placeholder = true,
  quality,
  format,
  sizes,
  responsiveSizes,
  onLoad,
  onError
}: OptimizedImageProps) {
  const imageProps = ImageOptimizer.getOptimizedImageProps(src, alt, {
    width,
    height,
    priority,
    lazy,
    placeholder,
    quality,
    format,
    sizes,
    responsiveSizes
  });

  return (
    <img
      src={imageProps.src}
      alt={imageProps.alt}
      srcSet={imageProps.srcSet}
      sizes={imageProps.sizes}
      loading={imageProps.loading as 'lazy' | 'eager'}
      className={className}
      onLoad={onLoad}
      onError={onError}
      style={{
        transition: 'opacity 0.3s ease-in-out',
        opacity: imageProps.placeholder ? 0 : 1
      }}
    />
  );
} 