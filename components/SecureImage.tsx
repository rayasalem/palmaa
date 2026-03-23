import React from 'react';
import { secureImageSrc, setImageToPlaceholder, IMAGE_PLACEHOLDER } from '../utils/secureUrl';

export interface SecureImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Raw URL from API or state; normalized to HTTPS before render */
  src: string | null | undefined;
  /** Used when src is missing or invalid (default: placehold.co via secureImageSrc) */
  fallbackSrc?: string;
}

/**
 * Image wrapper: applies {@link secureImageSrc}, broken-image fallback to {@link IMAGE_PLACEHOLDER}.
 * Prefer this for any remote/user-controlled image src to avoid mixed content.
 */
export const SecureImage = React.forwardRef<HTMLImageElement, SecureImageProps>(
  ({ src, fallbackSrc, onError, alt, ...rest }, ref) => {
    const resolved = secureImageSrc(src, fallbackSrc);
    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageToPlaceholder(e);
      onError?.(e);
    };
    return <img ref={ref} {...rest} src={resolved} alt={alt ?? ''} onError={handleError} />;
  }
);

SecureImage.displayName = 'SecureImage';

export { IMAGE_PLACEHOLDER };
