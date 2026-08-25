import { useCallback, useEffect, useRef, useState } from "react";
import useGamepad, { GamepadCommandState, isDrillOn } from "../../../hooks/gamepadHooks";
import GamepadDisplay from "./GamepadDisplay";
import styles from "./style.module.sass";
import { PublishTo, PublishToType } from "../../../data/publishTo.type";
import * as ROSLIB from "roslib";
import { ClassicalGamepad } from "../../../utils/Gamepad/bindings";
import States from "../../../data/states.type";

/*
Author: Ugo Balducci
Year: 2023
Description: React Component for the Gamepad. Its displays the gamepad on the screen and map the 
correct bindings. 
*/

const Gamepad = ({
	selectorCallback,
	mode,
	submode,
	visible = true,
	ros,
	drillState = States.OFF,
}: {
	selectorCallback?: () => void;
	mode: PublishToType;
	submode: string[];
	visible?: boolean;
	ros: ROSLIB.Ros | null;
	/** Drill subsystem mode. While it is on, NAV commands are published with zeroed axes. */
	drillState?: string;
}) => {
	const [gamepad, gamepadState, gamepadCommandState, togglePublishing] = useGamepad(
		ros,
		mode,
		submode,
		selectorCallback,
		drillState
	);

	const navHeldByDrill = mode === PublishTo.NAVIGATION && isDrillOn(drillState);

	const wrapRef = useRef<HTMLDivElement>(null);
	const dragSession = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		originLeft: number;
		originTop: number;
	} | null>(null);
	const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const showGamepad = Boolean(gamepad?.getGamepad() && gamepadState && visible);

	useEffect(() => {
		if (!showGamepad) {
			return;
		}
		const el = wrapRef.current;
		return () => {
			const sid = dragSession.current?.pointerId;
			if (el != null && sid != null) {
				try {
					el.releasePointerCapture(sid);
				} catch {
					/* not captured */
				}
			}
		};
	}, [showGamepad]);

	const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		const el = e.currentTarget;
		const r = el.getBoundingClientRect();
		dragSession.current = {
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			originLeft: r.left,
			originTop: r.top,
		};
		el.setPointerCapture(e.pointerId);
		setIsDragging(true);
	}, []);

	const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		const s = dragSession.current;
		if (!s || e.pointerId !== s.pointerId) return;

		const el = wrapRef.current;
		const w = el?.offsetWidth ?? 0;
		const h = el?.offsetHeight ?? 0;
		let left = s.originLeft + (e.clientX - s.startX);
		let top = s.originTop + (e.clientY - s.startY);
		left = Math.max(0, Math.min(left, window.innerWidth - w));
		top = Math.max(0, Math.min(top, window.innerHeight - h));
		setDragPos({ left, top });
	}, []);

	const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		const s = dragSession.current;
		if (!s || e.pointerId !== s.pointerId) return;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}
		dragSession.current = null;
		setIsDragging(false);
	}, []);

	const calcDirectionVertical = (axe: number) => {
		// Up
		if (axe < -0.2) {
			return "down";
		}
		// Down
		if (axe > 0.2) {
			return "up";
		}

		return "";
	};

	const calcDirectionHorizontal = (axe: number) => {
		// Left
		if (axe < -0.2) {
			return "left";
		}
		// Right
		if (axe > 0.2) {
			return "right";
		}

		return "";
	};

	if (gamepad?.getGamepad() && gamepadState && visible) {
		return (
			<div
				ref={wrapRef}
				className={`${styles.DraggableWrap} ${isDragging ? styles.DraggableWrapDragging : ""}`}
				style={
					dragPos
						? {
								left: dragPos.left,
								top: dragPos.top,
								right: "auto",
								bottom: "auto",
							}
						: undefined
				}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
			>
				<div
					className={`${styles.Container} ${
						//@ts-ignore
						gamepadCommandState === GamepadCommandState.UI ? styles.Outline : ""
					}`}
				>
				<GamepadDisplay
					onPublishToggle={togglePublishing}
					buttonDown={gamepadState.buttons[ClassicalGamepad.Button.A]}
					buttonRight={gamepadState.buttons[ClassicalGamepad.Button.B]}
					buttonLeft={gamepadState.buttons[ClassicalGamepad.Button.X]}
					buttonUp={gamepadState.buttons[ClassicalGamepad.Button.Y]}
					directionUp={gamepadState.buttons[ClassicalGamepad.Button.UP]}
					directionDown={gamepadState.buttons[ClassicalGamepad.Button.DOWN]}
					directionLeft={gamepadState.buttons[ClassicalGamepad.Button.LEFT]}
					directionRight={gamepadState.buttons[ClassicalGamepad.Button.RIGHT]}
					analogLeft={
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_X] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_X] < -0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_Y] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_Y] < -0.3
					}
					analogRight={
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_X] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_X] < -0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_Y] > 0.3 ||
						gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_Y] < -0.3
					}
					analogLeftDirection={[
						calcDirectionHorizontal(
							gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_X]
						),
						calcDirectionVertical(
							gamepadState.axes[ClassicalGamepad.Axis.LEFT_STICK_Y]
						),
					]}
					analogRightDirection={[
						calcDirectionHorizontal(
							gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_X]
						),
						calcDirectionVertical(
							gamepadState.axes[ClassicalGamepad.Axis.RIGHT_STICK_Y]
						),
					]}
					select={gamepadState.buttons[ClassicalGamepad.Button.BACK]}
					start={gamepadState.buttons[ClassicalGamepad.Button.START]}
					home={gamepadState.buttons[ClassicalGamepad.Button.HOME]}
					rearLeft={gamepadState.buttons[ClassicalGamepad.Button.LB]}
					rearRight={gamepadState.buttons[ClassicalGamepad.Button.RB]}
					triggerLeft={gamepadState.axes[ClassicalGamepad.Axis.LT]}
					triggerRight={gamepadState.axes[ClassicalGamepad.Axis.RT]}
					activeColor="#FF4345"
					isControlling={gamepadCommandState === GamepadCommandState.CONTROL}
				/>
				<div className={styles.GamepadMode}>
					<p>
						{mode === PublishTo.NAVIGATION
							? "NAV"
							: mode === PublishTo.DRILL
								? "DRILL"
								: "HD"}
					</p>
				</div>
				{navHeldByDrill && (
					<div className={styles.GamepadWarning}>Drill ON, cannot move NAV.</div>
				)}
				</div>
			</div>
		);
	} else {
		return null;
	}
};

export default Gamepad;
