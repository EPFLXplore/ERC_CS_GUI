import React from "react";
import { AlertColor } from "@mui/material";
import styles from "./style.module.sass";

const PRESETS = [
	{ label: "High", value: 100 },
	{ label: "Mid", value: 50 },
	{ label: "Low", value: 0 },
] as const;

function SuspensionModal({
	onClose,
	onSetHeight,
	snackBar,
}: {
	onClose: () => void;
	onSetHeight: (value: number) => void;
	snackBar: (sev: AlertColor, mes: string) => void;
}) {
	const [height, setHeight] = React.useState<number>(50);

	const sendHeight = (value: number) => {
		const clamped = Math.max(0, Math.min(100, value));
		onSetHeight(clamped);
	};

	return (
		<div className={styles.Background} onClick={onClose}>
			<div
				className={styles.Modal}
				onClick={(event) => {
					event.stopPropagation();
				}}
			>
				<div className={styles.ModalHeader}>
					<h1>Active Suspension</h1>
					<p>Set rover suspension height</p>
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.SliderPanel}>
						<span className={styles.ValueLabel}>{Math.round(height)}%</span>
						<input
							type="range"
							min={0}
							max={100}
							step={1}
							value={height}
							className={styles.VerticalSlider}
							onChange={(event) => setHeight(Number(event.target.value))}
						/>
						<div className={styles.ScaleLabels}>
							<span>High</span>
							<span>Mid</span>
							<span>Low</span>
						</div>
					</div>

					<div className={styles.PresetGroup}>
						{PRESETS.map((preset) => (
							<button
								type="button"
								key={preset.label}
								className={`${styles.PresetButton} ${height === preset.value ? styles.Selected : ""}`}
								onClick={() => {
									setHeight(preset.value);
									sendHeight(preset.value);
									snackBar("success", `${preset.label} preset applied`);
								}}
							>
								{preset.label}
							</button>
						))}
					</div>
				</div>

				<div className={styles.ModalFooter}>
					<button
						type="button"
						className={styles.PrimaryColor}
						onClick={() => sendHeight(height)}
					>
						Apply Height
					</button>
					<button type="button" className={styles.SecondaryColor} onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export default SuspensionModal;
