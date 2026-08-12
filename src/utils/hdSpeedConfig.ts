/*
Manual-mode joint sensitivity curve for the Handling Device in MANUAL_DIRECT.

Decoupled from the gamepad hook the same way hdBindingsConfig is: localStorage is the source of
truth, a CustomEvent notifies live consumers in this tab, and the native "storage" event covers
other tabs. The toggle lives in the control page header while the consumer lives inside
<Gamepad>, so there is no useful component boundary to pass this through.
*/

export type ManualSpeed = "fast" | "slow";

/* New key, deliberately not the old erc-cs-hd-j1-speed-v1: that setting slowed J1 alone with a
   gentler curve, so reusing it would silently promote an operator's stored "slow" into a much
   stronger, arm-wide slowdown on first load. */
export const MANUAL_SPEED_STORAGE_KEY = "erc-cs-hd-manual-speed-v1";
export const MANUAL_SPEED_EVENT = "erc-cs-hd-manual-speed-updated";

/** Linear, i.e. the behaviour before this setting existed. */
export const DEFAULT_MANUAL_SPEED: ManualSpeed = "fast";

function sanitizeManualSpeed(raw: unknown): ManualSpeed {
	return raw === "slow" ? "slow" : DEFAULT_MANUAL_SPEED;
}

export function loadManualSpeed(): ManualSpeed {
	if (typeof window === "undefined") {
		return DEFAULT_MANUAL_SPEED;
	}

	try {
		return sanitizeManualSpeed(window.localStorage.getItem(MANUAL_SPEED_STORAGE_KEY));
	} catch {
		return DEFAULT_MANUAL_SPEED;
	}
}

export function saveManualSpeed(speed: ManualSpeed): void {
	if (typeof window === "undefined") {
		return;
	}

	const sanitized = sanitizeManualSpeed(speed);
	try {
		window.localStorage.setItem(MANUAL_SPEED_STORAGE_KEY, sanitized);
	} catch {
		// Quota / private mode: the in-memory toggle still applies for this session.
	}
	window.dispatchEvent(new CustomEvent(MANUAL_SPEED_EVENT, { detail: sanitized }));
}

/**
 * Ceiling in slow mode: full stick deflection commands this fraction of full speed. Operator
 * selectable, because how slow "slow" needs to be depends on the task.
 */
export const MANUAL_SLOW_FACTORS = [0.3, 0.4, 0.5, 0.6] as const;

export type ManualSlowFactor = (typeof MANUAL_SLOW_FACTORS)[number];

export const DEFAULT_MANUAL_SLOW_FACTOR: ManualSlowFactor = 0.5;

export const MANUAL_SLOW_FACTOR_STORAGE_KEY = "erc-cs-hd-manual-slow-factor-v1";
export const MANUAL_SLOW_FACTOR_EVENT = "erc-cs-hd-manual-slow-factor-updated";

/** Whitelist rather than a range check: this multiplies commands sent to a live arm, so a hand
 *  edited localStorage entry of "5" must not become a 5× multiplier. */
export function sanitizeManualSlowFactor(raw: unknown): ManualSlowFactor {
	const value = typeof raw === "string" ? Number(raw) : raw;
	return MANUAL_SLOW_FACTORS.includes(value as ManualSlowFactor)
		? (value as ManualSlowFactor)
		: DEFAULT_MANUAL_SLOW_FACTOR;
}

export function loadManualSlowFactor(): ManualSlowFactor {
	if (typeof window === "undefined") {
		return DEFAULT_MANUAL_SLOW_FACTOR;
	}

	try {
		return sanitizeManualSlowFactor(window.localStorage.getItem(MANUAL_SLOW_FACTOR_STORAGE_KEY));
	} catch {
		return DEFAULT_MANUAL_SLOW_FACTOR;
	}
}

export function saveManualSlowFactor(factor: ManualSlowFactor): void {
	if (typeof window === "undefined") {
		return;
	}

	const sanitized = sanitizeManualSlowFactor(factor);
	try {
		window.localStorage.setItem(MANUAL_SLOW_FACTOR_STORAGE_KEY, String(sanitized));
	} catch {
		// Quota / private mode: the in-memory selection still applies for this session.
	}
	window.dispatchEvent(new CustomEvent(MANUAL_SLOW_FACTOR_EVENT, { detail: sanitized }));
}

/**
 * Quartic expo, scaled to the selected factor — the "maintenance" curve.
 *
 * Two separate effects combine here:
 *   - the fourth power gives very fine resolution near centre (factor/16 of full speed at half
 *     deflection, against 0.5 for the linear curve);
 *   - the factor caps the top end, so full deflection gives `factor` rather than 1.0.
 *
 * Math.sign is load-bearing: x⁴ is an *even* function, unlike the x³ this replaces, so without it
 * a negative stick deflection would command a positive joint velocity.
 *
 * The 0.05 deadzone in remapAxes is applied upstream, so this never sees input inside the
 * deadband; it makes the deadzone edge smoother rather than introducing a new discontinuity.
 *
 * "fast" is the identity so call sites can stay unconditional.
 */
export function applyManualSlowCurve(
	value: number,
	speed: ManualSpeed,
	factor: ManualSlowFactor
): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	if (speed !== "slow") {
		return value;
	}

	// Clamp defensively: a mis-profiled pad can emit slightly out-of-range values and the fourth
	// power amplifies overshoot (1.05⁴ = 1.22).
	const clamped = Math.max(-1, Math.min(1, value));
	return factor * Math.sign(clamped) * clamped * clamped * clamped * clamped;
}

/** MANUAL_DIRECT `msg.axes` is [J1…J6, gripper]; the gripper is deliberately left at full speed. */
export const DIRECT_ARM_JOINT_AXIS_COUNT = 6;

/**
 * Slows every joint of a MANUAL_DIRECT command in place, leaving the gripper alone. Lives here
 * rather than at the call site so the live command path and the bindings preview cannot disagree
 * about which axes are joints.
 */
export function applyManualSlowCurveToDirectAxes(
	axes: number[],
	speed: ManualSpeed,
	factor: ManualSlowFactor
): number[] {
	if (speed !== "slow") {
		return axes;
	}

	const end = Math.min(DIRECT_ARM_JOINT_AXIS_COUNT, axes.length);
	for (let i = 0; i < end; i++) {
		axes[i] = applyManualSlowCurve(axes[i], speed, factor);
	}
	return axes;
}
