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

/** ServoRequest `id` convention agreed with avionics. */
const SERVOS = [
	{
		id: 0,
		label: "ZED 2i Front Camera",
		defaultAngle: 90,
		minLabel: "0° pitch up",
		midLabel: "90° straight ahead",
		maxLabel: "180° pitch down",
	},
	{
		id: 1,
		label: "Drill Rail",
		defaultAngle: 90,
		minLabel: "0°",
		midLabel: "90°",
		maxLabel: "180°",
	},
] as const;

const ANGLE_MIN = 0;
const ANGLE_MAX = 180;

/** A load cell whose last packet is older than this is shown as stale. */
const MASS_STALE_MS = 2000;

type MassReading = { mass: number; receivedAt: number };

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
	const [selectedCell, setSelectedCell] = useState<number>(LOAD_CELLS[0].id);
	const [angles, setAngles] = useState<Record<number, number>>(() =>
		SERVOS.reduce((acc, servo) => {
			acc[servo.id] = servo.defaultAngle;
			return acc;
		}, {} as Record<number, number>)
	);
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

		return () => massPacketTopic.unsubscribe();
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
							<h2>Servos</h2>
							<span className={styles.SectionHint}>
								The angle is published when the slider is released, or with Send.
							</span>
						</div>

						{SERVOS.map((servo) => (
							<div className={styles.ServoRow} key={servo.id}>
								<div className={styles.ServoTitleRow}>
									<span className={styles.ServoTitle}>{servo.label}</span>
									<span className={styles.CellId}>ID {servo.id}</span>
									<span className={styles.AngleValue}>{angles[servo.id]}°</span>
								</div>

								<input
									type="range"
									min={ANGLE_MIN}
									max={ANGLE_MAX}
									step={1}
									value={angles[servo.id]}
									className={styles.Slider}
									aria-label={`${servo.label} angle`}
									onChange={(event) =>
										setAngles((previous) => ({
											...previous,
											[servo.id]: Number(event.target.value),
										}))
									}
									onPointerUp={() => sendServo(servo.id, angles[servo.id], false)}
									onKeyUp={() => sendServo(servo.id, angles[servo.id], false)}
								/>

								<div className={styles.ScaleLabels}>
									<span>{servo.minLabel}</span>
									<span>{servo.midLabel}</span>
									<span>{servo.maxLabel}</span>
								</div>

								<div className={styles.ServoActions}>
									<button
										type="button"
										className={styles.ServoButton}
										onClick={() => sendServo(servo.id, angles[servo.id], false)}
									>
										Send
									</button>
									<button
										type="button"
										className={styles.ServoButton}
										onClick={() => {
											setAngles((previous) => ({
												...previous,
												[servo.id]: servo.defaultAngle,
											}));
											sendServo(servo.id, servo.defaultAngle, false);
										}}
									>
										Default ({servo.defaultAngle}°)
									</button>
									<button
										type="button"
										className={styles.ServoButton}
										onClick={() => {
											setAngles((previous) => ({ ...previous, [servo.id]: ANGLE_MIN }));
											sendServo(servo.id, ANGLE_MIN, true);
										}}
										title="Sends go_to_zero"
									>
										Go To Zero
									</button>
								</div>
							</div>
						))}
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
