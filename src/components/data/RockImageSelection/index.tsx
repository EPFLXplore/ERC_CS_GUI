import React, { useState, useRef } from "react";
import styles from "./style.module.sass";

interface ImageDisplayProps {
  imageData: string; // Base64 encoded image data
  setCoordinates: (x: number, y: number) => void;
  onClose: () => void;
}

const ImageRockDisplay: React.FC<ImageDisplayProps> = ({ imageData, setCoordinates, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
      if (!imgRef.current) return;
    
      const rect = imgRef.current.getBoundingClientRect();
      const naturalWidth = imgRef.current.naturalWidth;
      const naturalHeight = imgRef.current.naturalHeight;
      const displayWidth = rect.width;
      const displayHeight = rect.height;
    
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
    
      const x = Math.round((event.clientX - rect.left) * scaleX);
      const y = Math.round((event.clientY - rect.top) * scaleY);
    
      setCoordinates(x, y);
      onClose();
    };
  
    return (
      <div
      className={styles.Container}
      >
        <img
          ref={imgRef}
          src={imageData}
          alt="ROS Image"
          onClick={handleClick}
          className={styles.Image}
        />
      </div>
    );
  };

export default ImageRockDisplay