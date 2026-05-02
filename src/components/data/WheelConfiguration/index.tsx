import React from "react";
import styles from "./style.module.sass";

/*
Author: Arno Laurie
Year: 2025
Description: Top-down view visualization of rover wheel configuration showing wheel orientations
*/

interface WheelConfigurationProps {
    steeringAngles: number[]; // [FL, FR, BR, BL] in degrees
    wheelSpeeds?: number[]; // Optional: for visual feedback
}

const WheelConfiguration: React.FC<WheelConfigurationProps> = ({ 
    steeringAngles,
    wheelSpeeds = [0, 0, 0, 0]
}) => {
    // Helper to determine if wheel is moving significantly
    const isMoving = (speed: number) => Math.abs(speed) > 0.1;

    const safeSteeringAngles = Array.from({ length: 4 }, (_, index) => {
        const value = steeringAngles?.[index];
        return Number.isFinite(value) ? Number(value) : 0;
    });

    /** Telemetry sign vs top-down SVG: negate so drawn heading matches rover. */
    const wheelRotateDeg = (telemetryDeg: number) => -telemetryDeg - 90;

    const safeWheelSpeeds = Array.from({ length: 4 }, (_, index) => {
        const value = wheelSpeeds?.[index];
        return Number.isFinite(value) ? Number(value) : 0;
    });

    return (
        <div className={styles.Container}>
            <svg viewBox="0 0 150 300" className={styles.Svg}>
                {/* Rover Body */}
                <rect
                    x="50"
                    y="75"
                    width="60"
                    height="150"
                    className={styles.RoverBody}
                    rx="10"
                />
                
                {/* Front Label */}
                <text x="80" y="65" className={styles.Label} textAnchor="middle">
                    FRONT
                </text>

                {/* Front Left Wheel */}
                <g transform={`translate(40, 100) rotate(${wheelRotateDeg(safeSteeringAngles[0])}, 0, 0)`}>
                    <rect
                        x="-15"
                        y="-6"
                        width="40"
                        height="12"
                        className={`${styles.Wheel} ${isMoving(safeWheelSpeeds[0]) ? styles.WheelActive : ''}`}
                        rx="2"
                    />
                    {/* Direction indicator */}
                    <line
                        x1="0"
                        y1="0"
                        x2="15"
                        y2="0"
                        className={styles.Direction}
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                    />
                </g>

                {/* Front Right Wheel */}
                <g transform={`translate(120, 100) rotate(${wheelRotateDeg(safeSteeringAngles[1])}, 0, 0)`}>
                    <rect
                        x="-15"
                        y="-6"
                        width="40"
                        height="12"
                        className={`${styles.Wheel} ${isMoving(safeWheelSpeeds[1]) ? styles.WheelActive : ''}`}
                        rx="2"
                    />
                    <line
                        x1="0"
                        y1="0"
                        x2="15"
                        y2="0"
                        className={styles.Direction}
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                    />
                </g>

                {/* Rear Right Wheel */}
                <g transform={`translate(120, 200) rotate(${wheelRotateDeg(safeSteeringAngles[2])}, 0, 0)`}>
                    <rect
                        x="-15"
                        y="-6"
                        width="40"
                        height="12"
                        className={`${styles.Wheel} ${isMoving(safeWheelSpeeds[2]) ? styles.WheelActive : ''}`}
                        rx="2"
                    />
                    <line
                        x1="0"
                        y1="0"
                        x2="15"
                        y2="0"
                        className={styles.Direction}
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                    />
                </g>

                {/* Rear Left Wheel */}
                <g transform={`translate(40, 200) rotate(${wheelRotateDeg(safeSteeringAngles[3])}, 0, 0)`}>
                    <rect
                        x="-15"
                        y="-6"
                        width="40"
                        height="12"
                        className={`${styles.Wheel} ${isMoving(safeWheelSpeeds[3]) ? styles.WheelActive : ''}`}
                        rx="2"
                    />
                    <line
                        x1="0"
                        y1="0"
                        x2="15"
                        y2="0"
                        className={styles.Direction}
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                    />
                </g>

                {/* Arrow marker definition */}
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="8"
                        refY="3"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3, 0 6"
                            fill="#4CAF50"
                        />
                    </marker>
                </defs>
            </svg>
        </div>
    );
};

export default WheelConfiguration;
