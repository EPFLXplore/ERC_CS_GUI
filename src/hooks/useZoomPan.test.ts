import { clampPan, zoomAt } from "./useZoomPan";

describe("zoomAt", () => {
	// The whole point of zoom-to-cursor: whatever pixel of the feed sits under the pointer must
	// still sit under it after the scale changes.
	it("keeps the content point under the cursor fixed", () => {
		const contentPoint = (p: number, offset: number, scale: number) => (p - offset) / scale;
		[-180, -40, 0, 25, 200].forEach((p) => {
			[-30, 0, 55].forEach((offset) => {
				[1, 2.5, 6].forEach((from) => {
					[1.4, 3, 8].forEach((to) => {
						const before = contentPoint(p, offset, from);
						const after = contentPoint(p, zoomAt(p, offset, from, to), to);
						expect(after).toBeCloseTo(before, 10);
					});
				});
			});
		});
	});

	it("is its own inverse over a zoom in/out round trip", () => {
		const zoomedIn = zoomAt(120, 0, 1, 4);
		expect(zoomAt(120, zoomedIn, 4, 1)).toBeCloseTo(0, 10);
	});

	it("leaves the centre alone when the pan is already centred", () => {
		expect(zoomAt(0, 0, 1, 5)).toBe(0);
	});
});

describe("clampPan", () => {
	// This is what makes zooming back out re-centre by itself — nothing else resets the pan.
	it("collapses to 0 at scale 1", () => {
		// Math.abs because clamping a negative offset to a zero-width bound yields -0.
		[-500, -1, 0, 1, 500].forEach((v) => {
			expect(Math.abs(clampPan(v, 1, 640))).toBe(0);
		});
	});

	it("never lets the content edge come inside the cell", () => {
		[1.2, 2, 8].forEach((scale) => {
			const max = ((scale - 1) * 640) / 2;
			[-10000, -max - 1, 0, max + 1, 10000].forEach((v) => {
				expect(Math.abs(clampPan(v, scale, 640))).toBeLessThanOrEqual(max + 1e-9);
			});
		});
	});

	it("passes offsets inside the bound through untouched", () => {
		expect(clampPan(100, 2, 640)).toBe(100);
		expect(clampPan(-100, 2, 640)).toBe(-100);
	});
});
