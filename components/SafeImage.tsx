import React from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  // Fix: Added optional style property to support inline styles used for features like zooming
  style?: React.CSSProperties;
}

/**
 * SafeImage - A resilient image component that bypasses common CORS and caching issues
 * by appending a unique timestamp to URLs and setting appropriate referrer policies.
 */
export const SafeImage: React.FC<SafeImageProps> = ({ src, alt, className, onError, onClick, style }) => {
  if (!src) return null;

  // Bypass logic: Add timestamp to force a fresh download if it's a web link
  const finalSrc = src.startsWith('http')
    ? (src.includes('?') ? `${src}&t=${Date.now()}` : `${src}?t=${Date.now()}`)
    : src.startsWith('data:') 
      ? src 
      : `data:image/jpeg;base64,${src}`;

  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={className} 
      onError={onError} 
      onClick={onClick}
      // Fix: Apply the style prop to the underlying img element
      style={style}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};

export default SafeImage;