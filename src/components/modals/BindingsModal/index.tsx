import React, { useEffect, useMemo, useState } from "react";
import { AlertColor } from "@mui/material";
import styles from "./style.module.sass";
import GamepadController, { GamepadControllerState } from "../../../utils/Gamepad";
import {
	CANONICAL_AXIS_NAMES,
	CANONICAL_BUTTON_NAMES,
	HdBindingsConfig,
	applyHdBindingMap,
	getDefaultHdBindingsConfig,
	loadHdBindingsConfig,
	saveHdBindingsConfig,
} from "../../../utils/hdBindingsConfig";
import {
	ManualSlowFactor,
	ManualSpeed,
	J1_SLOW_SCALE,
	applyManualSlowCurve,
	applyManualSlowCurveToDirectAxes,
	loadManualSlowFactor,
	loadManualSpeed,
} from "../../../utils/hdSpeedConfig";

type ModeKey = "direct" | "inverse";

type AxisTarget = {
	label: string;
	targetIndex: number;
	help?: string;
};

type ButtonTarget = {
	label: string;
	targetIndex: number;
	help?: string;
};

type ControllerSnapshot = {
	connected: boolean;
	buttons: boolean[];
	axes: number[];
};

let liveController: GamepadController | null = null;
let latestControllerState: GamepadControllerState | null = null;

const DIRECT_AXIS_TARGETS: AxisTarget[] = [
	{ label: "J1", targetIndex: 2, help: "Arm base" },
	{ label: "J2", targetIndex: 3, help: "Arm shoulder" },
	{ label: "J3", targetIndex: 5, help: "RT axis (with reverse modifier)" },
	{ label: "J4", targetIndex: 4, help: "LT axis (with reverse modifier)" },
	{ label: "J5", targetIndex: 1, help: "Wrist pitch" },
	{ label: "J6", targetIndex: 0, help: "Wrist yaw" },
];

const INVERSE_AXIS_TARGETS: AxisTarget[] = [
	{ label: "TX", targetIndex: 2, help: "End-effector translation X" },
	{ label: "TZ", targetIndex: 3, help: "End-effector translation Z" },
	{ label: "TY (+)", targetIndex: 5, help: "Positive TY source" },
	{ label: "TY (-)", targetIndex: 4, help: "Negative TY source" },
	{ label: "RY", targetIndex: 0, help: "Mapped then negated in command" },
	{ label: "RX", targetIndex: 1, help: "Mapped then negated in command" },
];

const DIRECT_BUTTON_TARGETS: ButtonTarget[] = [
	{ label: "J3 Reverse Modifier", targetIndex: 5, help: "Default RB" },
	{ label: "J4 Reverse Modifier", targetIndex: 4, help: "Default LB" },
	{ label: "Gripper Open", targetIndex: 1, help: "Default B" },
	{ label: "Gripper Close", targetIndex: 2, help: "Default X" },
	{ label: "Gripper Fine Open", targetIndex: 3, help: "Default Y" },
	{ label: "Gripper Fine Close", targetIndex: 0, help: "Default A" },
];

const INVERSE_BUTTON_TARGETS: ButtonTarget[] = [
	{ label: "RZ Positive", targetIndex: 5, help: "Default RB" },
	{ label: "RZ Negative", targetIndex: 4, help: "Default LB" },
	{ label: "Gripper Open", targetIndex: 1, help: "Default B" },
	{ label: "Gripper Close", targetIndex: 2, help: "Default X" },
	{ label: "Gripper Fine Open", targetIndex: 3, help: "Default Y" },
	{ label: "Gripper Fine Close", targetIndex: 0, help: "Default A" },
];

function cloneConfig(config: HdBindingsConfig): HdBindingsConfig {
	return {
		version: config.version,
		direct: {
			axisMap: [...config.direct.axisMap],
			buttonMap: [...config.direct.buttonMap],
		},
		inverse: {
			axisMap: [...config.inverse.axisMap],
			buttonMap: [...config.inverse.buttonMap],
		},
	};
}

function toFixed2(value: number): string {
	if (!Number.isFinite(value)) {
		return "0.00";
	}
	return value.toFixed(2);
}

function ensureLiveController(): void {
	if (typeof window === "undefined" || liveController) {
		return;
	}

	liveController = new GamepadController((state) => {
		latestControllerState = state;
	});
}

function createSnapshot(): ControllerSnapshot {
	ensureLiveController();

	const controllerState = liveController?.pollState() ?? liveController?.getState() ?? latestControllerState;
	if (!controllerState || !controllerState.isConnected || !controllerState.controller) {
		return {
			connected: false,
			buttons: new Array(CANONICAL_BUTTON_NAMES.length).fill(false),
			axes: new Array(CANONICAL_AXIS_NAMES.length).fill(0),
		};
	}

	const buttons = CANONICAL_BUTTON_NAMES.map((_, index) => Boolean(controllerState.buttons[index]));
	const axes = CANONICAL_AXIS_NAMES.map((_, index) => {
		const value = controllerState.axes[index];
		return typeof value === "number" ? value : 0;
	});

	return {
		connected: true,
		buttons,
		axes,
	};
}

function BindingsModal({
	onClose,
	snackBar,
}: {
	onClose: () => void;
	snackBar: (sev: AlertColor, mes: string) => void;
}) {
	const [configDraft, setConfigDraft] = useState<HdBindingsConfig>(() => cloneConfig(loadHdBindingsConfig()));
	const [activeMode, setActiveMode] = useState<ModeKey>("direct");
	const [snapshot, setSnapshot] = useState<ControllerSnapshot>(() => createSnapshot());
	// Read once: this modal renders above the header, so neither the speed toggle nor the slow
	// factor buttons can be clicked while it is open.
	const [manualSpeed] = useState<ManualSpeed>(() => loadManualSpeed());
	const [manualSlowFactor] = useState<ManualSlowFactor>(() => loadManualSlowFactor());

	const activeBindings = useMemo(() => configDraft[activeMode], [configDraft, activeMode]);
	const axisTargets = activeMode === "direct" ? DIRECT_AXIS_TARGETS : INVERSE_AXIS_TARGETS;
	const buttonTargets = activeMode === "direct" ? DIRECT_BUTTON_TARGETS : INVERSE_BUTTON_TARGETS;

	useEffect(() => {
		let mounted = true;
		const poll = () => {
			if (!mounted) {
				return;
			}
			setSnapshot(createSnapshot());
			window.requestAnimationFrame(poll);
		};

		const frameId = window.requestAnimationFrame(poll);
		return () => {
			mounted = false;
			window.cancelAnimationFrame(frameId);
		};
	}, []);

	const liveDirect = useMemo(() => {
		const mapped = applyHdBindingMap(snapshot.buttons, snapshot.axes, configDraft.direct);
		const j3 = mapped.buttons[5] ? -mapped.axes[5] : mapped.axes[5];
		const j4 = mapped.buttons[4] ? -mapped.axes[4] : mapped.axes[4];
		// The curve applies to the joint values, not to the canonical axis slots they are read
		// from, and never to the gripper.
		return {
			J1: applyManualSlowCurve(mapped.axes[2], manualSpeed, manualSlowFactor, J1_SLOW_SCALE),
			J2: applyManualSlowCurve(mapped.axes[3], manualSpeed, manualSlowFactor),
			J3: applyManualSlowCurve(j3, manualSpeed, manualSlowFactor),
			J4: applyManualSlowCurve(j4, manualSpeed, manualSlowFactor),
			J5: applyManualSlowCurve(mapped.axes[1], manualSpeed, manualSlowFactor),
			J6: applyManualSlowCurve(mapped.axes[0], manualSpeed, manualSlowFactor),
			Grip: (mapped.buttons[1] ? 1 : 0) - (mapped.buttons[2] ? 1 : 0) + (mapped.buttons[3] ? 0.1 : 0) - (mapped.buttons[0] ? 0.1 : 0),
		};
	}, [snapshot, configDraft.direct, manualSpeed, manualSlowFactor]);

	const liveInverse = useMemo(() => {
		const mapped = applyHdBindingMap(snapshot.buttons, snapshot.axes, configDraft.inverse);
		return {
			TX: mapped.axes[2],
			TZ: mapped.axes[3],
			TY: mapped.axes[5] - mapped.axes[4],
			RY: -mapped.axes[0],
			RX: -mapped.axes[1],
			RZ: (mapped.buttons[5] ? 1 : 0) - (mapped.buttons[4] ? 1 : 0),
			Grip: (mapped.buttons[1] ? 1 : 0) - (mapped.buttons[2] ? 1 : 0) + (mapped.buttons[3] ? 0.1 : 0) - (mapped.buttons[0] ? 0.1 : 0),
		};
	}, [snapshot, configDraft.inverse]);

	const activeInputPreview = activeMode === "direct" ? liveDirect : liveInverse;

	const activeRosMessage = useMemo(() => {
		if (activeMode === "direct") {
			const mapped = applyHdBindingMap(snapshot.buttons, snapshot.axes, configDraft.direct);
			return {
				mode: "direct",
				axes: applyManualSlowCurveToDirectAxes(
					[
						mapped.axes[2],
						mapped.axes[3],
						mapped.buttons[5] ? -mapped.axes[5] : mapped.axes[5],
						mapped.buttons[4] ? -mapped.axes[4] : mapped.axes[4],
						mapped.axes[1],
						mapped.axes[0],
						(mapped.buttons[1] ? 1 : 0) -
							(mapped.buttons[2] ? 1 : 0) +
							(mapped.buttons[3] ? 0.1 : 0) -
							(mapped.buttons[0] ? 0.1 : 0),
					],
					manualSpeed,
					manualSlowFactor
				),
				buttons: [
					2,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
				],
			};
		}

		const mapped = applyHdBindingMap(snapshot.buttons, snapshot.axes, configDraft.inverse);
		return {
			mode: "inverse",
			axes: [
				mapped.axes[2],
				mapped.axes[3],
				mapped.axes[5] - mapped.axes[4],
				-mapped.axes[0],
				-mapped.axes[1],
				mapped.buttons[5] ? 1 : 0,
				mapped.buttons[4] ? 1 : 0,
				(mapped.buttons[1] ? 1 : 0) -
					(mapped.buttons[2] ? 1 : 0) +
					(mapped.buttons[3] ? 0.1 : 0) -
					(mapped.buttons[0] ? 0.1 : 0),
			],
			buttons: [
				2,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
			],
		};
	}, [activeMode, snapshot, configDraft.direct, configDraft.inverse, manualSpeed, manualSlowFactor]);

	const updateAxisBinding = (targetIndex: number, sourceIndex: number) => {
		setConfigDraft((current) => ({
			...current,
			[activeMode]: {
				...current[activeMode],
				axisMap: current[activeMode].axisMap.map((value, index) => (index === targetIndex ? sourceIndex : value)),
			},
		}));
	};

	const updateButtonBinding = (targetIndex: number, sourceIndex: number) => {
		setConfigDraft((current) => ({
			...current,
			[activeMode]: {
				...current[activeMode],
				buttonMap: current[activeMode].buttonMap.map((value, index) => (index === targetIndex ? sourceIndex : value)),
			},
		}));
	};

	const resetCurrentMode = () => {
		const defaults = getDefaultHdBindingsConfig();
		setConfigDraft((current) => ({
			...current,
			[activeMode]: cloneConfig(defaults)[activeMode],
		}));
		snackBar("info", `Reset ${activeMode} bindings to default.`);
	};

	const resetAll = () => {
		setConfigDraft(getDefaultHdBindingsConfig());
		snackBar("info", "Reset all HD bindings to default.");
	};

	const saveChanges = () => {
		saveHdBindingsConfig(configDraft);
		snackBar("success", "HD bindings updated.");
	};

	return (
		<div className={styles.Background} onClick={onClose}>
			<div className={styles.Modal} onClick={(event) => event.stopPropagation()}>
				<div className={styles.ModalHeader}>
					<h1>Gamepad Bindings</h1>
					<p>Customize HD controls per mode. Example: set J1 to LEFT_STICK_X from the dropdown.</p>
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.LivePanel}>
						<div className={styles.LiveHeader}>
							<h2>Live Mental Confirmation</h2>
							<span>{snapshot.connected ? "Controller connected" : "No controller detected"}</span>
						</div>
						<div className={styles.LiveSplit}>
							<div className={styles.LiveCard}>
								<h3>Active Input Preview ({activeMode.toUpperCase()})</h3>
								<div className={styles.LiveValues}>
									{Object.entries(activeInputPreview).map(([key, value]) => (
										<p key={key}>
											<strong>{key}:</strong> {toFixed2(Number(value))}
										</p>
									))}
								</div>
							</div>
							<div className={styles.RosPreview}>
								<h3>Active ROS Message Preview ({activeMode.toUpperCase()})</h3>
								{activeMode === "direct" && (
									<p>
										Joint curve:{" "}
										{manualSpeed === "slow"
											? `slow (${manualSlowFactor}·x⁴ expo on J1–J6, gripper unaffected)`
											: "fast (linear)"}{" "}
										— set with the speed toggle under the HD dropdown, factor with the SLOW ×
										buttons next to DRL.
									</p>
								)}
								<pre>{JSON.stringify(activeRosMessage, null, 2)}</pre>
							</div>
						</div>
					</div>

					<div className={styles.Toolbar}>
						<select
							className={styles.FilterSelect}
							value={activeMode}
							onChange={(event) => setActiveMode(event.target.value as ModeKey)}
						>
							<option value="direct">Direct Mode</option>
							<option value="inverse">Inverse Mode</option>
						</select>
						<button type="button" className={styles.SecondaryColor} onClick={resetCurrentMode}>
							Reset Current Mode
						</button>
						<button type="button" className={styles.SecondaryColor} onClick={resetAll}>
							Reset All
						</button>
						<button type="button" className={styles.PrimaryColor} onClick={saveChanges}>
							Save Bindings
						</button>
					</div>

					<div className={styles.NodeSection}>
						<div className={styles.NodeHeader}>
							<h2>{activeMode === "direct" ? "Direct Mode Mapping" : "Inverse Mode Mapping"}</h2>
							<span>{axisTargets.length} axis slots</span>
						</div>
						<div className={styles.MappingGrid}>
							{axisTargets.map((target) => (
								<label className={styles.MappingRow} key={`axis-target-${target.label}`}>
									<div className={styles.MappingMeta}>
										<strong>{target.label}</strong>
										{target.help ? <small>{target.help}</small> : null}
									</div>
								<select
									className={styles.Input}
									value={activeBindings.axisMap[target.targetIndex]}
									onChange={(event) => updateAxisBinding(target.targetIndex, Number(event.target.value))}
								>
									{CANONICAL_AXIS_NAMES.map((sourceName, sourceIndex) => (
										<option key={`axis-source-${sourceName}`} value={sourceIndex}>
											{sourceName}
										</option>
									))}
								</select>
								</label>
							))}
						</div>

						<div className={styles.NodeHeader}>
							<h2>Buttons / Modifiers</h2>
							<span>{buttonTargets.length} button slots</span>
						</div>
						<div className={styles.MappingGrid}>
							{buttonTargets.map((target) => (
								<label className={styles.MappingRow} key={`button-target-${target.label}`}>
									<div className={styles.MappingMeta}>
										<strong>{target.label}</strong>
										{target.help ? <small>{target.help}</small> : null}
									</div>
								<select
									className={styles.Input}
									value={activeBindings.buttonMap[target.targetIndex]}
									onChange={(event) => updateButtonBinding(target.targetIndex, Number(event.target.value))}
								>
									{CANONICAL_BUTTON_NAMES.map((sourceName, sourceIndex) => (
										<option key={`button-source-${sourceName}`} value={sourceIndex}>
											{sourceName}
										</option>
									))}
								</select>
								</label>
							))}
						</div>
					</div>

					<div className={styles.EmptyState}>
						<p>Tip: set J1 to LEFT_STICK_X to move the first direct joint with the left stick.</p>
						<p>Save applies the binding profile immediately for HD controls.</p>
					</div>
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

export default BindingsModal;
