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
      const x = event.clientX - rect.left; // X-coordinate relative to image
      const y = event.clientY - rect.top; // Y-coordinate relative to image
  
      console.log("Clicked coordinates:", { x, y });
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