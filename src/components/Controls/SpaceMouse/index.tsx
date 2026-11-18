import { useCallback, useRef, useState } from "react";
import * as ROSLIB from "roslib";
import useSpaceMouse from "../../../hooks/spaceMouseHooks";
import useSpaceMouseArm from "../../../hooks/spaceMouseArmHooks";
import States from "../../../data/states.type";
import SpaceMouseDisplay from "./SpaceMouseDisplay";
import styles from "./style.module.sass";

/*
Description: Draggable SpaceMouse widget, the 6DOF counterpart of the Gamepad widget.
Click ARM (HD must be in Manual Inverse) to drive the arm with it; see utils/SpaceMouse/inverseArm.ts
for the axis mapping. Buttons: right = gripper open, left = gripper close.

Linux setup (once per machine): /dev/hidraw* is root-only by default, so Chrome cannot open the
device. Install a udev rule and replug. The file must sort before 73-seat-late.rules, or the
uaccess tag lands too late and no ACL is granted:
  echo 'KERNEL=="hidraw*", ATTRS{idVendor}=="256f", TAG+="uaccess"' | \
    sudo tee /etc/udev/rules.d/70-spacemouse-hidraw.rules
  sudo udevadm control --reload && sudo udevadm trigger
Then click "Pair SpaceMouse" once; Chrome remembers the grant afterwards.
*/

const PAIR_HINT_DISMISSED_KEY = "spacemouse.pairHintDismissed";

const readDismissed = () => {
	try {
		return localStorage.getItem(PAIR_HINT_DISMISSED_KEY) === "1";
	} catch {
		return false;
	}
};

const SpaceMouse = ({
	visible = true,
	ros,
	hdState,
}: {
	visible?: boolean;
	ros: ROSLIB.Ros | null;
	/** HD subsystem state; the SpaceMouse can only be armed in Manual Inverse. */
	hdState?: string;
}) => {
	const [state, requestDevice] = useSpaceMouse();
	const [armed, toggleArmed, canArm] = useSpaceMouseArm(ros, hdState, state);
	const [hintDismissed, setHintDismissed] = useState(readDismissed);

	const wrapRef = useRef<HTMLDivElement>(null);
	const drag = useRef<{ id: number; sx: number; sy: number; ol: number; ot: number } | null>(null);
	const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		const r = e.currentTarget.getBoundingClientRect();
		drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ol: r.left, ot: r.top };
		e.currentTarget.setPointerCapture(e.pointerId);
		setIsDragging(true);
	}, []);

	const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		const s = drag.current;
		if (!s || e.pointerId !== s.id) return;
		const w = wrapRef.current?.offsetWidth ?? 0;
		const h = wrapRef.current?.offsetHeight ?? 0;
		setPos({
			left: Math.max(0, Math.min(s.ol + e.clientX - s.sx, window.innerWidth - w)),
			top: Math.max(0, Math.min(s.ot + e.clientY - s.sy, window.innerHeight - h)),
		});
	}, []);

	const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!drag.current || e.pointerId !== drag.current.id) return;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}
		drag.current = null;
		setIsDragging(false);
	}, []);

	if (!visible || !state?.supported) return null;

	if (!state.connected) {
		if (hintDismissed) return null;
		return (
			<div className={styles.PairHint}>
				<button className={styles.PairButton} onClick={() => requestDevice()}>
					Pair SpaceMouse
				</button>
				<button
					className={styles.DismissButton}
					title="Hide (re-show by clearing site data)"
					onClick={() => {
						try {
							localStorage.setItem(PAIR_HINT_DISMISSED_KEY, "1");
						} catch {
							/* storage unavailable */
						}
						setHintDismissed(true);
					}}
				>
					×
				</button>
			</div>
		);
	}

	return (
		<div
			ref={wrapRef}
			className={`${styles.DraggableWrap} ${isDragging ? styles.DraggableWrapDragging : ""}`}
			style={pos ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" } : undefined}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
		>
			<div className={`${styles.Container} ${armed ? styles.Armed : styles.Outline}`}>
				<SpaceMouseDisplay axes={state.axes} buttons={state.buttons} />
				<div className={styles.Mode}>
					<p>{armed ? "HD INV" : "3D"}</p>
				</div>
				<div className={styles.ArmRow}>
					<button
						className={`${styles.ArmButton} ${armed ? styles.ArmButtonActive : ""}`}
						disabled={!armed && !canArm}
						// Keep the click from starting a widget drag.
						onPointerDown={(e) => e.stopPropagation()}
						onClick={toggleArmed}
						title={
							armed
								? "Stop driving the arm"
								: canArm
									? "Drive the HD arm (Manual Inverse) with the SpaceMouse"
									: "HD must be in Manual Inverse and ROS connected"
						}
					>
						{armed ? "DISARM" : "ARM"}
					</button>
					{!armed && !canArm && (
						<span className={styles.ArmHint}>
							{hdState === States.MANUAL_INVERSE ? "ROS not connected" : "HD not in Manual Inverse"}
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default SpaceMouse;
