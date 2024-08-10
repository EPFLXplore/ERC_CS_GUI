import { Point2D, Point3D } from "../data/point.type";

/**
 * Creates a mapping function to convert a 2D point to a 3D point
 * where the y coordinate in 3D is always set to 0.
 *
 * @param {Point2D} p2d1 The first 2D point.
 * @param {Point2D} p2d2 The second 2D point.
 * @param {Point2D} p2d3 The third 2D point.
 * @param {Point3D} p3d1 The first 3D point.
 * @param {Point3D} p3d2 The second 3D point.
 * @param {Point3D} p3d3 The third 3D point.
 * @returns {Function} A function that maps a 2D point (x, z) to its corresponding 3D point (x, 0, z).
 */
const createMappingFunction = (
	p2d1: Point2D,
	p2d2: Point2D,
	p2d3: Point2D,
	p3d1: Point3D,
	p3d2: Point3D,
	p3d3: Point3D
): ((point2D: Point2D) => Point3D) => {
	const A = [
		[p2d1.x, p2d1.y, 1],
		[p2d2.x, p2d2.y, 1],
		[p2d3.x, p2d3.y, 1],
	];

	const invertMatrix = (matrix: number[][]): number[][] => {
		const [[a, b, c], [d, e, f], [g, h, i]] = matrix;

		const A = e * i - f * h;
		const B = -(d * i - f * g);
		const C = d * h - e * g;
		const D = -(b * i - c * h);
		const E = a * i - c * g;
		const F = -(a * h - b * g);
		const G = b * f - c * e;
		const H = -(a * f - c * d);
		const I = a * e - b * d;

		const det = a * A + b * B + c * C;

		if (det === 0) throw new Error("Matrix is singular and cannot be inverted.");

		const invDet = 1 / det;

		return [
			[A * invDet, D * invDet, G * invDet],
			[B * invDet, E * invDet, H * invDet],
			[C * invDet, F * invDet, I * invDet],
		];
	};

	const multiplyMatrix = (matrix: number[][], vector: number[]): number[] => {
		return matrix.map((row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]);
	};

	const invA = invertMatrix(A);

	const bx = [p3d1.x, p3d2.x, p3d3.x];
	const bz = [p3d1.z, p3d2.z, p3d3.z];

	const Tx = multiplyMatrix(invA, bx);
	const Tz = multiplyMatrix(invA, bz);

	return (point2D: Point2D): Point3D => {
		const { x, y } = point2D; // y will be used to calculate the mapping, but we ignore it in the result
		const mappedX = Tx[0] * x + Tx[1] * y + Tx[2];
		const mappedZ = Tz[0] * x + Tz[1] * y + Tz[2];

		return { x: mappedX, y: 0, z: mappedZ }; // y is always 0 in the output
	};
};

/**
 * Creates a reverse mapping function to convert a 3D point back to a 2D point
 * ignoring the y coordinate in 3D (assuming y = 0).
 *
 * @param {Point2D} p2d1 The first 2D point.
 * @param {Point2D} p2d2 The second 2D point.
 * @param {Point2D} p2d3 The third 2D point.
 * @param {Point3D} p3d1 The first 3D point.
 * @param {Point3D} p3d2 The second 3D point.
 * @param {Point3D} p3d3 The third 3D point.
 * @returns {Function} A function that maps a 3D point back to its corresponding 2D point.
 */
const createReverseMappingFunction = (
	p2d1: Point2D,
	p2d2: Point2D,
	p2d3: Point2D,
	p3d1: Point3D,
	p3d2: Point3D,
	p3d3: Point3D
): ((point3D: Point3D) => Point2D) => {
	const A = [
		[p3d1.x, p3d1.z, 1],
		[p3d2.x, p3d2.z, 1],
		[p3d3.x, p3d3.z, 1],
	];

	const invertMatrix = (matrix: number[][]): number[][] => {
		const [[a, b, c], [d, e, f], [g, h, i]] = matrix;

		const A = e * i - f * h;
		const B = -(d * i - f * g);
		const C = d * h - e * g;
		const D = -(b * i - c * h);
		const E = a * i - c * g;
		const F = -(a * h - b * g);
		const G = b * f - c * e;
		const H = -(a * f - c * d);
		const I = a * e - b * d;

		const det = a * A + b * B + c * C;

		if (det === 0) throw new Error("Matrix is singular and cannot be inverted.");

		const invDet = 1 / det;

		return [
			[A * invDet, D * invDet, G * invDet],
			[B * invDet, E * invDet, H * invDet],
			[C * invDet, F * invDet, I * invDet],
		];
	};

	const multiplyMatrix = (matrix: number[][], vector: number[]): number[] => {
		return matrix.map((row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]);
	};

	const invA = invertMatrix(A);

	const bx = [p2d1.x, p2d2.x, p2d3.x];
	const bz = [p2d1.y, p2d2.y, p2d3.y];

	const Tx = multiplyMatrix(invA, bx);
	const Tz = multiplyMatrix(invA, bz);

	return (point3D: Point3D): Point2D => {
		const { x, z } = point3D; // Ignore the y component of the 3D point
		const mappedX = Tx[0] * x + Tx[1] * z + Tx[2];
		const mappedY = Tz[0] * x + Tz[1] * z + Tz[2];

		return { x: mappedX, y: mappedY };
	};
};

/////// MAPPING MARS YARD KIELCE
const p2d1 = { x: 0, y: 0 };
const p3d1 = { x: 0, y: 0, z: 0 };

const p2d2 = { x: -6.3, y: 0 };
const p3d2 = { x: -0.1, y: 0, z: -6.24 };

const p2d3 = { x: 0, y: 10 };
const p3d3 = { x: -15.52, y: 0, z: -0.16 };

const map2DTo3DKielce = createMappingFunction(p2d1, p2d2, p2d3, p3d1, p3d2, p3d3);
const map3DTo2DKielce = createReverseMappingFunction(p2d1, p2d2, p2d3, p3d1, p3d2, p3d3);

export { map2DTo3DKielce as map2DTo3D, map3DTo2DKielce as map3DTo2D };
