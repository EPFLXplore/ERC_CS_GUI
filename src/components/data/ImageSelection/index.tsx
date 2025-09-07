import React, { useState, useRef } from "react";
import styles from "./style.module.sass";

interface ImageDisplayProps {
  imageData: string; // Base64 encoded image data
  number_element_to_select: number; // Number of elements to select
  setCoordinates: (x: number[], y: number[]) => void;
  onClose: () => void;
}

const ImageSelection: React.FC<ImageDisplayProps> = ({
  imageData,
  number_element_to_select,
  setCoordinates,
  onClose,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [coordinates, setCoordinatesState] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

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

    setCoordinatesState((prev) => {
      const newX = [...prev.x, x];
      const newY = [...prev.y, y];

      // When we reach the required number of clicks, send result back
      if (newX.length === number_element_to_select) {
        setCoordinates(newX, newY);
        onClose();
      }

      return { x: newX, y: newY };
    });
  };

  return (
    <div className={styles.Container}>
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

export default ImageSelection;