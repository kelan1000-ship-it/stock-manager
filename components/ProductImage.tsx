import React, { useState, useMemo, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface ProductImageProps {
  imageUrl?: string | null;
  alt: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  style?: React.CSSProperties;
}

/**
 * ProductImage
 * Resilient image component that handles both legacy Google Drive images
 * and native Firebase Storage images, with a built-in fallback for failed loads.
 */
export const ProductImage: React.FC<ProductImageProps> = ({ 
  imageUrl, 
  alt, 
  className = '', 
  onClick, 
  style 
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when imageUrl changes
  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  // Derive the final source based on the URL type
  const processedSrc = useMemo(() => {
    if (!imageUrl) return null;

    // Firebase Storage - append timestamp to bypass cache if needed
    if (imageUrl.includes('firebasestorage.app')) {
      return imageUrl.includes('?') ? `${imageUrl}&t=${Date.now()}` : `${imageUrl}?t=${Date.now()}`;
    }

    // Standard HTTP web links (e.g. supplier sites, external images)
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // Data URIs can be used as-is
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Default to treating it as a raw base64 string
    return `data:image/jpeg;base64,${imageUrl}`;
  }, [imageUrl]);

  const handleError = () => {
    setHasError(true);
  };

  // Render fallback if source is missing or loading failed
  if (!processedSrc || hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-800 text-slate-500 overflow-hidden ${className}`}
        style={style}
        title={alt || 'Image failed to load'}
      >
        <ImageOff className="w-1/3 h-1/3 min-w-[16px] min-h-[16px] max-w-[48px] max-h-[48px] opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={handleError}
      style={style}
      // CRITICAL: Required for cross-site image loading from Google Drive and Firebase Storage
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};

export default ProductImage;