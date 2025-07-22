// utils/imageOptimizer.ts
// Comprehensive image optimization utilities

import { useState, useRef, useEffect } from 'react';

interface ImageOptimizationOptions {
  quality?: number; // 0-100
  format?: 'webp' | 'avif' | 'original';
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: boolean;
  blur?: number;
}

interface ResponsiveImageSizes {
  sm: number; // 640px
  md: number; // 768px
  lg: number; // 1024px
  xl: number; // 1280px
  '2xl': number; // 1536px
}

// Default responsive breakpoints
const DEFAULT_SIZES: ResponsiveImageSizes = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Image optimization class
export class ImageOptimizer {
  private static readonly CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || '';
  private static readonly DEFAULT_QUALITY = 85;
  private static readonly SUPPORTED_FORMATS = ['webp', 'avif', 'png', 'jpg', 'jpeg'];

  /**
   * Generate optimized image URL with CDN support
   */
  static getOptimizedImageUrl(
    src: string,
    options: ImageOptimizationOptions = {}
  ): string {
    const {
      quality = this.DEFAULT_QUALITY,
      format = 'webp',
      width,
      height,
      blur = 0
    } = options;

    // If it's already a CDN URL, return as is
    if (src.startsWith('http') && src.includes('cdn')) {
      return src;
    }

    // If CDN is configured, use it
    if (this.CDN_BASE_URL) {
      const params = new URLSearchParams();
      
      if (quality !== this.DEFAULT_QUALITY) {
        params.append('q', quality.toString());
      }
      
      if (format !== 'original') {
        params.append('f', format);
      }
      
      if (width) {
        params.append('w', width.toString());
      }
      
      if (height) {
        params.append('h', height.toString());
      }
      
      if (blur > 0) {
        params.append('blur', blur.toString());
      }

      const queryString = params.toString();
      const optimizedUrl = `${this.CDN_BASE_URL}${src}${queryString ? `?${queryString}` : ''}`;
      
      return optimizedUrl;
    }

    // Use our optimization API
    const params = new URLSearchParams();
    params.append('src', src);
    
    if (quality !== this.DEFAULT_QUALITY) {
      params.append('q', quality.toString());
    }
    
    if (format !== 'original') {
      params.append('f', format);
    }
    
    if (width) {
      params.append('w', width.toString());
    }
    
    if (height) {
      params.append('h', height.toString());
    }
    
    if (blur > 0) {
      params.append('blur', blur.toString());
    }

    return `/api/optimize-image?${params.toString()}`;
  }

  /**
   * Generate responsive image srcset
   */
  static getResponsiveSrcSet(
    src: string,
    sizes: Partial<ResponsiveImageSizes> = {},
    options: ImageOptimizationOptions = {}
  ): string {
    const finalSizes = { ...DEFAULT_SIZES, ...sizes };
    const srcsetParts: string[] = [];

    Object.entries(finalSizes).forEach(([breakpoint, width]) => {
      const optimizedUrl = this.getOptimizedImageUrl(src, {
        ...options,
        width
      });
      srcsetParts.push(`${optimizedUrl} ${width}w`);
    });

    return srcsetParts.join(', ');
  }

  /**
   * Generate responsive sizes attribute
   */
  static getResponsiveSizes(
    defaultSize: string = '100vw',
    customSizes?: string
  ): string {
    if (customSizes) {
      return customSizes;
    }

    return `(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, ${defaultSize}`;
  }

  /**
   * Generate low-quality image placeholder (LQIP)
   */
  static getPlaceholderUrl(
    src: string,
    options: ImageOptimizationOptions = {}
  ): string {
    return this.getOptimizedImageUrl(src, {
      ...options,
      quality: 10,
      blur: 10,
      width: 20
    });
  }

  /**
   * Check if WebP is supported
   */
  static isWebPSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Check if AVIF is supported
   */
  static isAVIFSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  /**
   * Get best format based on browser support
   */
  static getBestFormat(): 'webp' | 'avif' | 'original' {
    if (this.isAVIFSupported()) {
      return 'avif';
    }
    if (this.isWebPSupported()) {
      return 'webp';
    }
    return 'original';
  }

  /**
   * Generate optimized image props for Next.js Image component
   */
  static getOptimizedImageProps(
    src: string,
    alt: string,
    options: ImageOptimizationOptions & {
      sizes?: Partial<ResponsiveImageSizes>;
      responsiveSizes?: string;
      priority?: boolean;
    } = {}
  ) {
    const {
      sizes: customSizes,
      responsiveSizes,
      priority = false,
      lazy = !priority,
      placeholder = true,
      ...optimizationOptions
    } = options;

    const bestFormat = this.getBestFormat();
    const finalOptions = {
      ...optimizationOptions,
      format: optimizationOptions.format || bestFormat
    };

    const optimizedSrc = this.getOptimizedImageUrl(src, finalOptions);
    const srcset = this.getResponsiveSrcSet(src, customSizes, finalOptions);
    const sizes = this.getResponsiveSizes('100vw', responsiveSizes);
    const placeholderSrc = placeholder ? this.getPlaceholderUrl(src, finalOptions) : undefined;

    return {
      src: optimizedSrc,
      alt,
      srcSet: srcset,
      sizes,
      placeholder: placeholderSrc ? 'blur' : undefined,
      blurDataURL: placeholderSrc,
      loading: lazy ? 'lazy' : 'eager',
      priority
    };
  }
}

// Lazy loading hook
export function useLazyImage(
  src: string,
  options: ImageOptimizationOptions = {}
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return {
    imgRef,
    isLoaded,
    isInView,
    handleLoad,
    optimizedSrc: isInView ? ImageOptimizer.getOptimizedImageUrl(src, options) : undefined
  };
}

// Optimized Image Component (moved to separate component file)
// See components/OptimizedImage.tsx for the React component implementation

// Background image optimization
export function getOptimizedBackgroundImage(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const optimizedUrl = ImageOptimizer.getOptimizedImageUrl(src, options);
  return `url(${optimizedUrl})`;
}

// Preload critical images
export function preloadImage(src: string, options: ImageOptimizationOptions = {}): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = ImageOptimizer.getOptimizedImageUrl(src, options);
  document.head.appendChild(link);
}

// Batch preload images
export function preloadImages(
  images: Array<{ src: string; options?: ImageOptimizationOptions }>
): void {
  images.forEach(({ src, options }) => {
    preloadImage(src, options);
  });
} 