import React, { useMemo } from 'react';

interface ProductDisplayImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * ProductDisplayImage - A resilient image component for pharmacy products.
 * Handles external URLs, data URIs, and raw base64 strings while ensuring
 * cross-origin compatibility for Google Drive hosted assets.
 */
export const ProductDisplayImage: React.FC<ProductDisplayImageProps> = ({ 
  src, 
  alt, 
  className, 
  onClick 
}) => {
  const processedSrc = useMemo(() => {
    if (!src) return '';
    
    // 1. If it's a direct web link, use as is
    if (src.startsWith('http')) {
      return src;
    }
    
    // 2. If it's already a formatted data URI, use as is
    if (src.startsWith('data:')) {
      return src;
    }
    
    // 3. If it's a raw string (typical from DB), assume it's base64 JPEG
    return `data:image/jpeg;base64,${src}`;
  }, [src]);

  if (!src) return null;

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      // CRITICAL: Required for cross-site image loading from secure bridges
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};

export default ProductDisplayImage;