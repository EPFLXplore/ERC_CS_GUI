import React, { useEffect, useRef, useState } from 'react';

interface GifOverlayProps {
  src: string;
  width?: number;
  height?: number;
}

const GifOverlay: React.FC<GifOverlayProps> = ({ src, width = 400, height = 300 }) => {
  const [canDismiss, setCanDismiss] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const gifRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = gifRef.current;
    if (!img) return;

    const onLoad = () => {
      const duration = getGifDuration(img);
      if (duration) {
        setTimeout(() => setCanDismiss(true), duration);
      } else {
        // fallback if duration can't be detected
        setTimeout(() => setCanDismiss(true), 3000);
      }
    };

    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, []);

  const getGifDuration = (img: HTMLImageElement): number | null => {
    // GIF duration detection is not reliable in vanilla JS
    // If you want perfect detection, you need a library like `gifuct-js`
    return null;
  };

  const handleClick = () => {
    if (canDismiss) {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleClick}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <img
        ref={gifRef}
        src={src}
        width={width}
        height={height}
        alt="Loading animation"
        className="rounded shadow-lg"
      />
    </div>
  );
};

export default GifOverlay;