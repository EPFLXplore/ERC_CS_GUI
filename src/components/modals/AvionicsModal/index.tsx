import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertColor } from "@mui/material";
import * as ROSLIB from "roslib";
import styles from "./style.module.sass";
import { Topics } from "../../../data/topics.type";
import {
	ANGLE_MAX,
	ANGLE_MIN,
	CAMERA_SERVO_DEFAULT_ANGLE,
	CAMERA_SERVO_ID,
	useCameraServoContext,
} from "../../../hooks/cameraServoHooks";

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
 *
 * The camera servo's id and angle range live in hooks/cameraServoHooks so this modal and the
 * gamepad's D-pad control cannot drift apart; only the display strings belong here.
 */
const CAMERA_SERVO = {
	id: CAMERA_SERVO_ID,
	label: "ZED 2i Front Camera",
	minLabel: "35° pitch down",
	midLabel: "106° straight ahead",
	maxLabel: "180° pitch up",
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

/**
 * Lamps. Each lamp sits on its own servo that swings it between two end stops (angles agreed with
 * avionics); the servo is never parked in between. `id` is the ServoRequest id / PWM channel.
 */
const LAMP_SERVOS = [
	{ id: 5, label: "Lamp — ID 5 - Right", openAngle: 35, closeAngle: 117 },
	{ id: 4, label: "Lamp — ID 4 - Left", openAngle: 122, closeAngle: 40 },
	{ id: 6, label: "Lamp — ID 6 - Bottom", openAngle: 90, closeAngle: 2 },
] as const;

/**
 * ServoRequest id 7 is the lamps' power line rather than a mechanism: angle 0 = all lamps off,
 * any other angle = on. The exact non-zero value is irrelevant, so we send a fixed one.
 */
const LAMP_POWER_SERVO_ID = 7;
const LAMP_POWER_ON_ANGLE = 90;

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
	// Owned above this modal so the gamepad D-pad can drive the same servo while it is closed, and
	// so the slider reflects that when reopened.
	const {
		angle: cameraAngle,
		setAngle: setCameraAngle,
		sendServo: publishServo,
	} = useCameraServoContext();
	const [masses, setMasses] = useState<Record<number, MassReading>>({});
	const [phReading, setPhReading] = useState<PhReading | null>(null);
	const [selectedCell, setSelectedCell] = useState<number>(LOAD_CELLS[0].id);
	// The bowl has no feedback topic, so this is the last angle *we* commanded — null until then.
	const [bowlAngle, setBowlAngle] = useState<number | null>(null);
	// Lamps have no feedback either: last angle we commanded per servo id, and whether power is on.
	const [lampAngles, setLampAngles] = useState<Record<number, number | null>>({});
	const [lampsOn, setLampsOn] = useState<boolean>(false);
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

	/** Both servos publish through the shared hook's topic; this wrapper only adds the snackbar,
	 *  which suits a deliberate click here but not the gamepad's repeated taps. */
	const sendServo = useCallback(
		(id: number, angle: number, goToZero: boolean) => {
			if (!publishServo(id, angle, goToZero)) {
				snackBar("error", "ROS not connected, servo request not sent.");
			}
		},
		[publishServo, snackBar]
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
										setCameraAngle(CAMERA_SERVO_DEFAULT_ANGLE);
										sendServo(CAMERA_SERVO.id, CAMERA_SERVO_DEFAULT_ANGLE, false);
									}}
								>
									Straight Ahead ({CAMERA_SERVO_DEFAULT_ANGLE}°)
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

					<section className={styles.Section}>
						<div className={styles.SectionHeader}>
							<h2>Lamps</h2>
							<span className={styles.SectionHint}>
								Power on ID {LAMP_POWER_SERVO_ID}, then open each lamp.
							</span>
						</div>

						<div className={styles.ServoActions}>
							<button
								type="button"
								className={styles.ServoButton}
								onClick={() => {
									LAMP_SERVOS.forEach((lamp) => sendServo(lamp.id, lamp.openAngle, false));
									setLampAngles((previous) => ({
										...previous,
										...Object.fromEntries(LAMP_SERVOS.map((lamp) => [lamp.id, lamp.openAngle])),
									}));
									// Let the lamp servos swing clear before powering the lamps on.
									setTimeout(() => {
										sendServo(LAMP_POWER_SERVO_ID, LAMP_POWER_ON_ANGLE, false);
										setLampsOn(true);
									}, 700);
								}}
							>
								Open &amp; Turn On All
							</button>
							<button
								type="button"
								className={styles.ServoButton}
								onClick={() => {
									sendServo(LAMP_POWER_SERVO_ID, 0, false);
									setLampsOn(false);
									// Let the lamps power down before swinging the servos closed.
									setTimeout(() => {
										LAMP_SERVOS.forEach((lamp) => sendServo(lamp.id, lamp.closeAngle, false));
										setLampAngles((previous) => ({
											...previous,
											...Object.fromEntries(LAMP_SERVOS.map((lamp) => [lamp.id, lamp.closeAngle])),
										}));
									}, 700);
								}}
							>
								Close &amp; Turn Off All
							</button>
						</div>

						<div className={styles.ServoRow}>
							<div className={styles.ServoTitleRow}>
								<span className={styles.ServoTitle}>Lamp Power</span>
								<span className={styles.CellId}>ID {LAMP_POWER_SERVO_ID}</span>
								<span className={styles.AngleValue}>{lampsOn ? "ON" : "OFF"}</span>
							</div>

							<div className={styles.ServoActions}>
								<button
									type="button"
									className={styles.ServoButton}
									onClick={() => {
										setLampsOn(true);
										sendServo(LAMP_POWER_SERVO_ID, LAMP_POWER_ON_ANGLE, false);
									}}
								>
									Turn On
								</button>
								<button
									type="button"
									className={styles.ServoButton}
									onClick={() => {
										setLampsOn(false);
										sendServo(LAMP_POWER_SERVO_ID, 0, false);
									}}
								>
									Turn Off
								</button>
							</div>
						</div>

						{LAMP_SERVOS.map((lamp) => {
							const current = lampAngles[lamp.id] ?? null;
							const positions = [
								{ angle: lamp.openAngle, label: "Open" },
								{ angle: lamp.closeAngle, label: "Close" },
							];
							return (
								<div className={styles.ServoRow} key={lamp.id}>
									<div className={styles.ServoTitleRow}>
										<span className={styles.ServoTitle}>{lamp.label}</span>
										<span className={styles.CellId}>ID {lamp.id}</span>
										<span className={styles.AngleValue}>
											{current === null ? "—" : `${current}°`}
										</span>
									</div>

									<div className={styles.BowlActions}>
										{positions.map((position) => (
											<button
												type="button"
												key={position.angle}
												className={`${styles.BowlButton} ${
													current === position.angle ? styles.BowlButtonActive : ""
												}`}
												aria-pressed={current === position.angle}
												onClick={() => {
													setLampAngles((previous) => ({
														...previous,
														[lamp.id]: position.angle,
													}));
													sendServo(lamp.id, position.angle, false);
												}}
											>
												<span className={styles.BowlButtonLabel}>
													{position.label} ({position.angle}°)
												</span>
											</button>
										))}
									</div>
								</div>
							);
						})}
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
