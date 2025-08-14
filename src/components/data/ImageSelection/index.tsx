import React, { useState, useRef } from "react";
import styles from "./style.module.sass";

interface ImageDisplayProps {
  imageData: string; // Base64 encoded image data
  number_element_to_select: number; // Number of elements to select
  setCoordinates: (x: number[], y: number[]) => void;
  onClose: () => void;
}

const ImageSelection: React.FC<ImageDisplayProps> = ({ imageData, number_element_to_select, setCoordinates, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);

    const [coordinates, setCoordinatesState] = useState<{ x: number[], y: number[] }>({ x: [], y: [] });

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

      // Add a new clicked coordinate in the state. If we have the right number, we stop and send back the information to HDS
      if (coordinates.x.length < number_element_to_select) {
        setCoordinatesState(prev => ({
          x: [...prev.x, x],
          y: [...prev.y, y]
        }));
      } else {
        setCoordinates(coordinates.x, coordinates.y);
        onClose();
      }
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

export default ImageSelection