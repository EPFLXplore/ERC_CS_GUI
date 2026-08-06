import { J1_SLOW_MAX, applyJ1Curve } from "./hdSpeedConfig";

describe("applyJ1Curve", () => {
	it("is the identity in fast mode", () => {
		[1, 0.5, 0.05, 0, -0.5, -1].forEach((x) => {
			expect(applyJ1Curve(x, "fast")).toBe(x);
		});
	});

	it("caps slow mode at J1_SLOW_MAX on full deflection", () => {
		expect(applyJ1Curve(1, "slow")).toBeCloseTo(J1_SLOW_MAX, 10);
		expect(applyJ1Curve(-1, "slow")).toBeCloseTo(-J1_SLOW_MAX, 10);
	});

	it("preserves sign without Math.sign juggling", () => {
		expect(applyJ1Curve(-0.5, "slow")).toBeCloseTo(-J1_SLOW_MAX * 0.125, 10);
		expect(applyJ1Curve(0.5, "slow")).toBeCloseTo(J1_SLOW_MAX * 0.125, 10);
	});

	it("gives finer resolution near centre", () => {
		expect(applyJ1Curve(0.5, "slow")).toBeCloseTo(0.0875, 10);
		expect(applyJ1Curve(0.25, "slow")).toBeCloseTo(0.0109375, 10);
		expect(applyJ1Curve(0.05, "slow")).toBeCloseTo(0.0000875, 10);
	});

	it("is monotonic, so more stick is always more speed", () => {
		const xs = [0, 0.1, 0.25, 0.5, 0.75, 1];
		const ys = xs.map((x) => applyJ1Curve(x, "slow"));
		ys.forEach((y, i) => {
			if (i > 0) expect(y).toBeGreaterThan(ys[i - 1]);
		});
	});

	it("never exceeds the cap, even on out-of-range input", () => {
		expect(applyJ1Curve(1.05, "slow")).toBeCloseTo(J1_SLOW_MAX, 10);
		expect(applyJ1Curve(-1.05, "slow")).toBeCloseTo(-J1_SLOW_MAX, 10);
	});

	it("treats non-finite input as zero", () => {
		expect(applyJ1Curve(NaN, "slow")).toBe(0);
		expect(applyJ1Curve(Infinity, "fast")).toBe(0);
	});
});
