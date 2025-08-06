import React, { useEffect, useState } from 'react';

interface GifOverlayProps {
  src: string;
  durationMs?: number; // default to 5 seconds
  onClose?: () => void;
}

const GifOverlay: React.FC<GifOverlayProps> = ({ src, durationMs = 5000, onClose }) => {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanDismiss(true);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs]);

  const handleClick = () => {
    if (canDismiss && onClose) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999, // always above everything
        cursor: canDismiss ? 'pointer' : 'default',
      }}
    >
      <img
        src={src}
        alt="GIF Animation"
        style={{
          width: '600px',
          height: 'auto',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
};

export default GifOverlay;
