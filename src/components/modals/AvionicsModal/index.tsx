import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import styles from "./style.module.sass";
import { Topics } from "../../../data/topics.type";

/*
Description: Avionics dock applet. Reads the load cells published on /EL/mass_packet,
tares the selected one over /EL/mass_req, and drives the two servos over /EL/servo_req.
*/

/** MassPacket / MassRequest `id` convention agreed with avionics. */
const LOAD_CELLS = [
	{ id: 0, label: "Sand & Rocks", hint: "Container load cell" },
	{ id: 1, label: "Drill Soil", hint: "Drill load cell" },
] as const;

/**
 * ServoRequest `id` is the physical PWM channel (`Servos_ID` in the firmware's ServoThread.h):
 * 0 = front camera, 1 = drill sand bowl.
 */
const CAMERA_SERVO = {
	id: 0,
	label: "ZED 2i Front Camera",
	defaultAngle: 90,
	minLabel: "35° pitch down",
	midLabel: "90° straight ahead",
	maxLabel: "145° pitch up",
} as const;

const BOWL_SERVO = { id: 1, label: "Drill Sand Bowl" } as const;

/** The bowl is only ever driven to its two end stops, never parked in between. */
const BOWL_POSITIONS = [
	{
		angle: 0,
		goToZero: true,
		label: "Open to drill",
		hint: "Bowl swung to the deep side of the culotte, clear of the drill",
	},
	{
		angle: 180,
		goToZero: false,
		label: "Close to measure",
		hint: "Bowl under the drill to take the sand",
	},
] as const;

const ANGLE_MIN = 35;
const ANGLE_MAX = 145;

/** A load cell whose last packet is older than this is shown as stale. */
const MASS_STALE_MS = 2000;
const PH_STALE_MS = 5000;

type MassReading = { mass: number; receivedAt: number };
type PhReading = { ph: number; receivedAt: number };

function AvionicsModal({
	onClose,
	ros,
	snackBar,
}: {
	onClose: () => void;
	ros: ROSLIB.Ros | null;
	snackBar: (severity: AlertColor, message: string) => void;
}) {
	const [masses, setMasses] = useState<Record<number, MassReading>>({});
	const [phReading, setPhReading] = useState<PhReading | null>(null);
	const [selectedCell, setSelectedCell] = useState<number>(LOAD_CELLS[0].id);
	const [cameraAngle, setCameraAngle] = useState<number>(CAMERA_SERVO.defaultAngle);
	// The bowl has no feedback topic, so this is the last angle *we* commanded — null until then.
	const [bowlAngle, setBowlAngle] = useState<number | null>(null);
	// Freshness is a function of wall-clock time, so it needs its own tick to re-render.
	const [now, setNow] = useState(() => Date.now());

	const massRequestTopic = useMemo(
		() =>
			ros
				? new ROSLIB.Topic<any>({
						ros,
						name: Topics.EL_MASS_REQ,
						messageType: "custom_msg/MassRequest",
						queue_length: 1,
						queue_size: 1,
					})
				: null,
		[ros]
	);

	const servoRequestTopic = useMemo(
		() =>
			ros
				? new ROSLIB.Topic<any>({
						ros,
						name: Topics.EL_SERVO_REQ,
						messageType: "custom_msg/ServoRequest",
						queue_length: 1,
						queue_size: 1,
					})
				: null,
		[ros]
	);

	useEffect(() => {
		if (!ros) return;

		const massPacketTopic = new ROSLIB.Topic<any>({
			ros,
			name: Topics.EL_MASS_PACKET,
			messageType: "custom_msg/MassPacket",
			queue_length: 1,
			queue_size: 1,
		});

		massPacketTopic.subscribe((message: any) => {
			if (!message || typeof message !== "object") return;
			setMasses((previous) => ({
				...previous,
				[Number(message.id)]: { mass: Number(message.mass), receivedAt: Date.now() },
			}));
		});

		const phPacketTopic = new ROSLIB.Topic<any>({
			ros,
			name: Topics.EL_PH_PACKET,
			messageType: "custom_msg/PhPacket",
			queue_length: 1,
			queue_size: 1,
		});

		phPacketTopic.subscribe((message: any) => {
			if (!message || typeof message.ph !== "number") return;
			setPhReading({ ph: message.ph, receivedAt: Date.now() });
		});

		return () => {
			massPacketTopic.unsubscribe();
			phPacketTopic.unsubscribe();
		};
	}, [ros]);

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(interval);
	}, []);

	const tareSelected = useCallback(() => {
		if (!massRequestTopic) {
			snackBar("error", "ROS not connected, tare not sent.");
			return;
		}
		// change_scale false leaves the calibration slope alone, so scale is ignored.
		massRequestTopic.publish({
			id: selectedCell,
			tare: true,
			change_scale: false,
			scale: 0.0,
		});
		const cell = LOAD_CELLS.find((entry) => entry.id === selectedCell);
		snackBar("success", `Tare sent to ${cell?.label ?? `id ${selectedCell}`}.`);
	}, [massRequestTopic, selectedCell, snackBar]);

	const sendServo = useCallback(
		(id: number, angle: number, goToZero: boolean) => {
			if (!servoRequestTopic) {
				snackBar("error", "ROS not connected, servo request not sent.");
				return;
			}
			servoRequestTopic.publish({
				id,
				angle: Math.round(angle),
				go_to_zero: goToZero,
				change_zero: false,
				zero: 0,
			});
		},
		[servoRequestTopic, snackBar]
	);

	const formatMass = (reading: MassReading | undefined) => {
		if (!reading) return "NO DATA";
		return `${reading.mass.toFixed(1)} g`;
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
					<h1>Avionics</h1>
					<p>
						Topics: <span>{Topics.EL_MASS_PACKET}</span> | <span>{Topics.EL_MASS_REQ}</span> |{" "}
						<span>{Topics.EL_SERVO_REQ}</span>
					</p>
				</div>

				<div className={styles.ModalContent}>
					<section className={styles.Section}>
						<div className={styles.SectionHeader}>
							<h2>Load Cells</h2>
							<span className={styles.SectionHint}>
								Select the cell to focus on, then tare it.
							</span>
						</div>

						<div className={styles.CellGrid}>
							{LOAD_CELLS.map((cell) => {
								const reading = masses[cell.id];
								const fresh = reading != null && now - reading.receivedAt < MASS_STALE_MS;
								return (
									<button
										type="button"
										key={cell.id}
										className={`${styles.CellCard} ${
											selectedCell === cell.id ? styles.CellCardSelected : ""
										}`}
										onClick={() => setSelectedCell(cell.id)}
										aria-pressed={selectedCell === cell.id}
									>
										<div className={styles.CellTitleRow}>
											<span
												className={`${styles.LiveDot} ${fresh ? styles.LiveDotOn : ""}`}
												title={fresh ? "Receiving packets" : "No recent packet"}
											/>
											<span className={styles.CellTitle}>{cell.label}</span>
											<span className={styles.CellId}>ID {cell.id}</span>
										</div>
										<div className={`${styles.CellValue} ${fresh ? "" : styles.CellValueStale}`}>
											{formatMass(reading)}
										</div>
										<div className={styles.CellHint}>{cell.hint}</div>
									</button>
								);
							})}
						</div>

						<button type="button" className={styles.PrimaryColor} onClick={tareSelected}>
							Tare {LOAD_CELLS.find((cell) => cell.id === selectedCell)?.label}
						</button>
					</section>

					<section className={styles.Section}>
						<div className={styles.SectionHeader}>
							<h2>pH</h2>
							<span className={styles.SectionHint}>{Topics.EL_PH_PACKET}</span>
						</div>
						<div className={styles.CellGrid}>
							{(() => {
								const fresh = phReading != null && now - phReading.receivedAt < PH_STALE_MS;
								return (
									<div className={styles.CellCard} style={{ cursor: "default" }}>
										<div className={styles.CellTitleRow}>
											<span
												className={`${styles.LiveDot} ${fresh ? styles.LiveDotOn : ""}`}
												title={fresh ? "Receiving packets" : "No recent packet"}
											/>
											<span className={styles.CellTitle}>pH</span>
										</div>
										<div className={`${styles.CellValue} ${fresh ? "" : styles.CellValueStale}`}>
											{phReading != null ? phReading.ph.toFixed(2) : "NO DATA"}
										</div>
									</div>
								);
							})()}
						</div>
					</section>

					<section className={styles.Section}>
						<div className={styles.SectionHeader}>
							<h2>Servos</h2>
							<span className={styles.SectionHint}>PWM channel = ServoRequest id.</span>
						</div>

						<div className={styles.ServoRow}>
							<div className={styles.ServoTitleRow}>
								<span className={styles.ServoTitle}>{CAMERA_SERVO.label}</span>
								<span className={styles.CellId}>ID {CAMERA_SERVO.id}</span>
								<span className={styles.AngleValue}>{cameraAngle}°</span>
							</div>

							<input
								type="range"
								min={ANGLE_MIN}
								max={ANGLE_MAX}
								step={1}
								value={cameraAngle}
								className={styles.Slider}
								aria-label={`${CAMERA_SERVO.label} angle`}
								onChange={(event) => setCameraAngle(Number(event.target.value))}
								onPointerUp={() => sendServo(CAMERA_SERVO.id, cameraAngle, false)}
								onKeyUp={() => sendServo(CAMERA_SERVO.id, cameraAngle, false)}
							/>

							<div className={styles.ScaleLabels}>
								<span>{CAMERA_SERVO.minLabel}</span>
								<span>{CAMERA_SERVO.midLabel}</span>
								<span>{CAMERA_SERVO.maxLabel}</span>
							</div>

							<div className={styles.ServoActions}>
								<button
									type="button"
									className={styles.ServoButton}
									onClick={() => sendServo(CAMERA_SERVO.id, cameraAngle, false)}
								>
									Send
								</button>
								<button
									type="button"
									className={styles.ServoButton}
									onClick={() => {
										setCameraAngle(CAMERA_SERVO.defaultAngle);
										sendServo(CAMERA_SERVO.id, CAMERA_SERVO.defaultAngle, false);
									}}
								>
									Straight Ahead ({CAMERA_SERVO.defaultAngle}°)
								</button>
							</div>
						</div>

						<div className={styles.ServoRow}>
							<div className={styles.ServoTitleRow}>
								<span className={styles.ServoTitle}>{BOWL_SERVO.label}</span>
								<span className={styles.CellId}>ID {BOWL_SERVO.id}</span>
								<span className={styles.AngleValue}>
									{bowlAngle === null ? "—" : `${bowlAngle}°`}
								</span>
							</div>

							<div className={styles.BowlActions}>
								{BOWL_POSITIONS.map((position) => (
									<button
										type="button"
										key={position.angle}
										className={`${styles.BowlButton} ${
											bowlAngle === position.angle ? styles.BowlButtonActive : ""
										}`}
										aria-pressed={bowlAngle === position.angle}
										onClick={() => {
											setBowlAngle(position.angle);
											sendServo(BOWL_SERVO.id, position.angle, position.goToZero);
										}}
									>
										<span className={styles.BowlButtonLabel}>
											{position.label} ({position.angle}°)
										</span>
										<span className={styles.BowlButtonHint}>{position.hint}</span>
									</button>
								))}
							</div>
						</div>
					</section>
				</div>

				<div className={styles.ModalFooter}>
					<button type="button" className={styles.SecondaryColor} onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export default AvionicsModal;
