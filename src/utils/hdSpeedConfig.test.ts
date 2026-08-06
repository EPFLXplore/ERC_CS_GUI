import { applyJ1Curve } from "./hdSpeedConfig";

describe("applyJ1Curve", () => {
	it("is the identity in fast mode", () => {
		[1, 0.5, 0.05, 0, -0.5, -1].forEach((x) => {
			expect(applyJ1Curve(x, "fast")).toBe(x);
		});
	});

	it("still reaches full speed at full deflection in slow mode", () => {
		// The whole point of an expo curve over a linear multiplier: no loss of top end.
		expect(applyJ1Curve(1, "slow")).toBe(1);
		expect(applyJ1Curve(-1, "slow")).toBe(-1);
	});

	it("preserves sign without Math.sign juggling", () => {
		expect(applyJ1Curve(-0.5, "slow")).toBeCloseTo(-0.125, 10);
		expect(applyJ1Curve(0.5, "slow")).toBeCloseTo(0.125, 10);
	});

	it("gives finer resolution near centre", () => {
		expect(applyJ1Curve(0.5, "slow")).toBeCloseTo(0.125, 10);
		expect(applyJ1Curve(0.25, "slow")).toBeCloseTo(0.015625, 10);
		expect(applyJ1Curve(0.05, "slow")).toBeCloseTo(0.000125, 10);
	});

	it("clamps out-of-range input so cubing cannot amplify overshoot", () => {
		expect(applyJ1Curve(1.05, "slow")).toBe(1);
		expect(applyJ1Curve(-1.05, "slow")).toBe(-1);
	});

	it("treats non-finite input as zero", () => {
		expect(applyJ1Curve(NaN, "slow")).toBe(0);
		expect(applyJ1Curve(Infinity, "fast")).toBe(0);
	});
});
