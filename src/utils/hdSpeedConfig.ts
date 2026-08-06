/*
J1 sensitivity curve for the Handling Device in MANUAL_DIRECT.

Decoupled from the gamepad hook the same way hdBindingsConfig is: localStorage is the source of
truth, a CustomEvent notifies live consumers in this tab, and the native "storage" event covers
other tabs. The toggle lives in the control page header while the consumer lives inside
<Gamepad>, so there is no useful component boundary to pass this through.
*/

export type J1Speed = "fast" | "slow";

export const J1_SPEED_STORAGE_KEY = "erc-cs-hd-j1-speed-v1";
export const J1_SPEED_EVENT = "erc-cs-hd-j1-speed-updated";

/** Linear, i.e. the behaviour before this setting existed. */
export const DEFAULT_J1_SPEED: J1Speed = "fast";

function sanitizeJ1Speed(raw: unknown): J1Speed {
	return raw === "slow" ? "slow" : DEFAULT_J1_SPEED;
}

export function loadJ1Speed(): J1Speed {
	if (typeof window === "undefined") {
		return DEFAULT_J1_SPEED;
	}

	try {
		return sanitizeJ1Speed(window.localStorage.getItem(J1_SPEED_STORAGE_KEY));
	} catch {
		return DEFAULT_J1_SPEED;
	}
}

export function saveJ1Speed(speed: J1Speed): void {
	if (typeof window === "undefined") {
		return;
	}

	const sanitized = sanitizeJ1Speed(speed);
	try {
		window.localStorage.setItem(J1_SPEED_STORAGE_KEY, sanitized);
	} catch {
		// Quota / private mode: the in-memory toggle still applies for this session.
	}
	window.dispatchEvent(new CustomEvent(J1_SPEED_EVENT, { detail: sanitized }));
}

/**
 * Ceiling on J1 in slow mode: full stick deflection commands this fraction of full speed.
 * Tune here — it is the one number an operator is likely to want changed.
 */
export const J1_SLOW_MAX = 0.7;

/**
 * Cubic expo curve for J1, scaled to J1_SLOW_MAX.
 *
 * x³ is an odd function, so (-a)³ === -(a³) carries the sign through with no Math.sign juggling.
 * Two separate effects combine here:
 *   - the cube gives much finer resolution near centre (dy/dx = 3x², so 0.03 at x = 0.1 against
 *     1.0 for the linear curve);
 *   - the J1_SLOW_MAX factor caps the top end, so full deflection gives 0.7 rather than 1.0.
 *
 * The 0.05 deadzone in remapAxes is applied upstream, so this never sees input inside the
 * deadband; it makes the deadzone edge smoother rather than introducing a new discontinuity.
 *
 * If the curve ever proves too aggressive against a joint-level minimum-velocity deadband, the
 * escape hatch with the same signature is a blend that keeps the same ceiling:
 *     const k = 0.85; return J1_SLOW_MAX * (k * c * c * c + (1 - k) * c);
 *
 * "fast" is the identity so call sites can stay unconditional.
 */
export function applyJ1Curve(value: number, speed: J1Speed): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	if (speed !== "slow") {
		return value;
	}

	// Clamp defensively: a mis-profiled pad can emit slightly out-of-range values and cubing
	// amplifies overshoot (1.05³ = 1.16).
	const clamped = Math.max(-1, Math.min(1, value));
	return J1_SLOW_MAX * clamped * clamped * clamped;
}
