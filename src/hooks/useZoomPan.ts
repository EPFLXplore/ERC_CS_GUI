import { useCallback, useEffect, useRef, useState } from "react";

/*
Description: Digital zoom/pan on a fixed-size element (a camera cell). Everything here is a CSS
transform on what is already on screen — no request reaches the rover, and the stream itself is
untouched.
*/

export type ZoomPanTransform = { scale: number; x: number; y: number };

export const IDENTITY_TRANSFORM: ZoomPanTransform = { scale: 1, x: 0, y: 0 };

const MIN_SCALE = 1;
const MAX_SCALE = 8;
/** Exponential so a wheel tick zooms by the same *ratio* at every level; ~1.16x per 100px notch. */
const WHEEL_SENSITIVITY = 0.0015;
/** Firefox reports wheel deltas in lines (deltaMode 1), Chrome in pixels. Without converting, the
 *  same physical scroll would zoom ~100x less on Firefox. */
const LINE_HEIGHT_PX = 16;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * New pan offset that keeps the content point under `p` (cursor position relative to the
 * container's untransformed centre) fixed while the scale goes from `from` to `to`.
 *
 * Independent of any rotation on the media itself: the zoom transform lives on a parent layer, so
 * it composes *outside* the rotate and the two never interact.
 */
export const zoomAt = (p: number, offset: number, from: number, to: number) =>
	p - (to / from) * (p - offset);

/**
 * Bounds the pan so the content edge can never be dragged inside the cell. The bound collapses to 0
 * at scale 1, which is what makes zooming back out re-centre on its own — there is no separate
 * reset path for that.
 */
export const clampPan = (v: number, scale: number, size: number) => {
	const max = ((scale - 1) * size) / 2;
	return clamp(v, -max, max);
};

const normalizeWheelDelta = (event: WheelEvent, height: number) => {
	if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT_PX;
	if (event.deltaMode === 2) return event.deltaY * height;
	return event.deltaY;
};

/**
 * @param resetKey identity of whatever is being displayed. When it changes the zoom is dropped:
 *        cells are keyed by slot, so a removed camera reshuffles the feeds and the next one must
 *        not inherit the previous one's zoom.
 */
const useZoomPan = (resetKey?: string) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [transform, setTransform] = useState<ZoomPanTransform>(IDENTITY_TRANSFORM);
	const [isPanning, setIsPanning] = useState(false);
	// The pointer handlers need the live transform without re-subscribing on every zoom step.
	const transformRef = useRef(transform);
	transformRef.current = transform;

	const reset = useCallback(() => {
		setTransform((previous) => (previous.scale === 1 && previous.x === 0 && previous.y === 0 ? previous : IDENTITY_TRANSFORM));
	}, []);

	useEffect(() => {
		reset();
	}, [resetKey, reset]);

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		// React registers `wheel` at the root as a *passive* listener, so preventDefault() from an
		// onWheel prop is ignored and the page scrolls (or browser-zooms) under the feed. The only
		// way to swallow it is a non-passive native listener.
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			const rect = element.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;
			// Measured from the container's centre, matching transform-origin: 50% 50%. The
			// transformed layer's own rect moves as it zooms and must not be used here.
			const px = event.clientX - rect.left - rect.width / 2;
			const py = event.clientY - rect.top - rect.height / 2;

			setTransform((previous) => {
				const delta = normalizeWheelDelta(event, rect.height);
				const scale = clamp(previous.scale * Math.exp(-delta * WHEEL_SENSITIVITY), MIN_SCALE, MAX_SCALE);
				if (scale === previous.scale) return previous;
				return {
					scale,
					x: clampPan(zoomAt(px, previous.x, previous.scale, scale), scale, rect.width),
					y: clampPan(zoomAt(py, previous.y, previous.scale, scale), scale, rect.height),
				};
			});
		};

		element.addEventListener("wheel", onWheel, { passive: false });
		return () => element.removeEventListener("wheel", onWheel);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") reset();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [reset]);

	const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0 || transformRef.current.scale <= 1) return;
		const element = containerRef.current;
		if (!element) return;
		// Deliberately no preventDefault(): on pointerdown it also suppresses the compatibility
		// mouse events, which would cost the double-click-to-rotate action while zoomed. The
		// browser's native image drag is held off by draggable={false} and user-select instead.
		element.setPointerCapture(event.pointerId);
		const rect = element.getBoundingClientRect();
		const startX = event.clientX;
		const startY = event.clientY;
		const origin = transformRef.current;

		const onPointerMove = (move: PointerEvent) => {
			const { scale } = transformRef.current;
			setTransform({
				scale,
				x: clampPan(origin.x + (move.clientX - startX), scale, rect.width),
				y: clampPan(origin.y + (move.clientY - startY), scale, rect.height),
			});
		};

		const stop = () => {
			element.removeEventListener("pointermove", onPointerMove);
			element.removeEventListener("pointerup", stop);
			element.removeEventListener("pointercancel", stop);
			try {
				element.releasePointerCapture(event.pointerId);
			} catch {
				/* the capture was already lost */
			}
			setIsPanning(false);
		};

		element.addEventListener("pointermove", onPointerMove);
		element.addEventListener("pointerup", stop);
		element.addEventListener("pointercancel", stop);
		setIsPanning(true);
	}, []);

	return {
		containerRef,
		transform,
		isPanning,
		isZoomed: transform.scale > 1,
		reset,
		onPointerDown,
	};
};

export default useZoomPan;
