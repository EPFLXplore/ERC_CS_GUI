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
  const [displayCoordinates, setDisplayCoordinates] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

  const handleClick = (event: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
    if (!imgRef.current) return;

    if (coordinates.x.length >= number_element_to_select) {
      return;
    }

    const rect = imgRef.current.getBoundingClientRect();
    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;

    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;

    setCoordinatesState((prev) => {
      const newX = [...prev.x, x];
      const newY = [...prev.y, y];
      return { x: newX, y: newY };
    });

    setDisplayCoordinates((prev) => ({
      x: [...prev.x, displayX],
      y: [...prev.y, displayY],
    }));
  };

  const canSubmit = coordinates.x.length === number_element_to_select;

  const undoLast = () => {
    setCoordinatesState((prev) => ({
      x: prev.x.slice(0, -1),
      y: prev.y.slice(0, -1),
    }));
    setDisplayCoordinates((prev) => ({
      x: prev.x.slice(0, -1),
      y: prev.y.slice(0, -1),
    }));
  };

  const submitSelection = () => {
    if (!canSubmit) {
      return;
    }
    setCoordinates(coordinates.x, coordinates.y);
    onClose();
  };

  return (
    <div className={styles.Container}>
      <div className={styles.ImageArea}>
        <img
          ref={imgRef}
          src={imageData}
          alt="ROS feed"
          onClick={handleClick}
          className={styles.Image}
        />
        <div className={styles.MarkerLayer}>
          {displayCoordinates.x.map((x, index) => (
            <div
              key={`marker-${index}`}
              className={styles.ClickMarker}
              style={{ left: `${x}px`, top: `${displayCoordinates.y[index]}px` }}
            >
              <span className={styles.ClickMarkerDot} />
              <span className={styles.ClickMarkerPulse} />
              <span className={styles.ClickMarkerIndex}>{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.Footer}>
        <div className={styles.Counter}>
          {coordinates.x.length}/{number_element_to_select} points selected
        </div>
        <div className={styles.Actions}>
          <button
            type="button"
            className={styles.SecondaryButton}
            onClick={undoLast}
            disabled={coordinates.x.length === 0}
          >
            Undo
          </button>
          <button
            type="button"
            className={styles.PrimaryButton}
            onClick={submitSelection}
            disabled={!canSubmit}
          >
            Validate and Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageSelection;
