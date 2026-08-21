import {
	DEFAULT_MANUAL_SLOW_FACTOR,
	J1_SLOW_SCALE,
	MANUAL_SLOW_FACTORS,
	ManualSlowFactor,
	applyManualSlowCurve,
	applyManualSlowCurveToDirectAxes,
	sanitizeManualSlowFactor,
	stepManualSlowFactor,
} from "./hdSpeedConfig";

describe.each(MANUAL_SLOW_FACTORS)("applyManualSlowCurve at factor %p", (factor) => {
	it("is the identity in fast mode", () => {
		[1, 0.5, 0.05, 0, -0.5, -1].forEach((x) => {
			expect(applyManualSlowCurve(x, "fast", factor)).toBe(x);
		});
	});

	it("caps slow mode at the factor on full deflection", () => {
		expect(applyManualSlowCurve(1, "slow", factor)).toBeCloseTo(factor, 10);
		expect(applyManualSlowCurve(-1, "slow", factor)).toBeCloseTo(-factor, 10);
	});

	// x⁴ is even, so this is the regression the quartic is most likely to introduce: without
	// Math.sign a negative deflection would command a positive joint velocity.
	it("preserves the sign of the input", () => {
		expect(applyManualSlowCurve(-0.5, "slow", factor)).toBeCloseTo(-factor * 0.0625, 10);
		expect(applyManualSlowCurve(0.5, "slow", factor)).toBeCloseTo(factor * 0.0625, 10);
		expect(applyManualSlowCurve(-0.75, "slow", factor)).toBeLessThan(0);
		expect(applyManualSlowCurve(-1.05, "slow", factor)).toBeLessThan(0);
	});

	it("gives finer resolution near centre", () => {
		expect(applyManualSlowCurve(0.5, "slow", factor)).toBeCloseTo(factor * 0.0625, 10);
		expect(applyManualSlowCurve(0.25, "slow", factor)).toBeCloseTo(factor * 0.00390625, 10);
		expect(applyManualSlowCurve(0.05, "slow", factor)).toBeCloseTo(factor * 0.00000625, 10);
	});

	it("is monotonic, so more stick is always more speed", () => {
		const xs = [-1, -0.75, -0.5, -0.25, 0, 0.1, 0.25, 0.5, 0.75, 1];
		const ys = xs.map((x) => applyManualSlowCurve(x, "slow", factor));
		ys.forEach((y, i) => {
			if (i > 0) expect(y).toBeGreaterThan(ys[i - 1]);
		});
	});

	it("never exceeds the cap, even on out-of-range input", () => {
		expect(applyManualSlowCurve(1.05, "slow", factor)).toBeCloseTo(factor, 10);
		expect(applyManualSlowCurve(-1.05, "slow", factor)).toBeCloseTo(-factor, 10);
	});

	it("treats non-finite input as zero", () => {
		expect(applyManualSlowCurve(NaN, "slow", factor)).toBe(0);
		expect(applyManualSlowCurve(Infinity, "fast", factor)).toBe(0);
	});
});

describe("applyManualSlowCurveToDirectAxes", () => {
	/** MANUAL_DIRECT layout: [J1…J6, gripper]. */
	const axes = () => [1, -1, 0.5, -0.5, 0.25, 0.75, 1];

	it.each(MANUAL_SLOW_FACTORS)(
		"slows every joint by factor %p but leaves the gripper at full speed",
		(factor) => {
			const out = applyManualSlowCurveToDirectAxes(axes(), "slow", factor);

			expect(out[0]).toBeCloseTo(factor * J1_SLOW_SCALE, 10);
			expect(out[1]).toBeCloseTo(-factor, 10);
			expect(out[2]).toBeCloseTo(factor * 0.0625, 10);
			expect(out[3]).toBeCloseTo(-factor * 0.0625, 10);
			expect(out[4]).toBeCloseTo(factor * 0.00390625, 10);
			expect(out[5]).toBeCloseTo(factor * 0.31640625, 10);
			expect(out[6]).toBe(1);
		}
	);

	it("leaves every axis untouched in fast mode", () => {
		expect(applyManualSlowCurveToDirectAxes(axes(), "fast", 0.3)).toEqual(axes());
	});

	it("slows J1 to exactly half of J2 for the same input in slow mode", () => {
		const out = applyManualSlowCurveToDirectAxes([1, 1], "slow", 0.4);

		expect(out[0]).toBeCloseTo(out[1] * J1_SLOW_SCALE, 10);
	});

	it("does not apply the J1 scale in fast mode", () => {
		expect(applyManualSlowCurveToDirectAxes([1, 1], "fast", 0.4)).toEqual([1, 1]);
	});

	it("does not read past the end of a short array", () => {
		expect(applyManualSlowCurveToDirectAxes([1, -1], "slow", 0.4)).toEqual([0.2, -0.4]);
	});
});

describe("stepManualSlowFactor", () => {
	it("steps by one slot", () => {
		expect(stepManualSlowFactor(0.4, 1)).toBe(0.5);
		expect(stepManualSlowFactor(0.4, -1)).toBe(0.3);
	});

	it("clamps at the offered extremes", () => {
		expect(stepManualSlowFactor(0.1, -1)).toBe(0.1);
		expect(stepManualSlowFactor(1.0, 1)).toBe(1.0);
	});

	it("recovers from an off-list current value via the default index", () => {
		expect(stepManualSlowFactor(0.35 as ManualSlowFactor, 1)).toBe(0.5);
		expect(stepManualSlowFactor(0.35 as ManualSlowFactor, -1)).toBe(0.3);
	});
});

describe("sanitizeManualSlowFactor", () => {
	it("accepts every offered factor, as a number or as its stored string", () => {
		MANUAL_SLOW_FACTORS.forEach((factor) => {
			expect(sanitizeManualSlowFactor(factor)).toBe(factor);
			expect(sanitizeManualSlowFactor(String(factor))).toBe(factor);
		});
	});

	// This multiplies commands sent to a live arm, so anything off the whitelist must fall back
	// rather than pass through.
	it("falls back to the default for anything off the whitelist", () => {
		[5, "5", 0.35, 0, -0.5, null, undefined, "", "fast", NaN, {}].forEach((raw) => {
			expect(sanitizeManualSlowFactor(raw)).toBe(DEFAULT_MANUAL_SLOW_FACTOR);
		});
	});

	it("keeps the default inside the offered set", () => {
		expect(MANUAL_SLOW_FACTORS).toContain(DEFAULT_MANUAL_SLOW_FACTOR as ManualSlowFactor);
	});
});
