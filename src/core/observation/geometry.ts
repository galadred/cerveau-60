/**
 * Géométrie des formes d'observation, centrée sur (20, 20) dans un carré 40 × 40.
 * Source unique : le rendu (ObsGlyph) et les tests de symétrie utilisent ces
 * mêmes coordonnées, ce qui garantit que l'apparence correspond exactement aux
 * symétries supposées par la validation (cells.ts → SYMMETRY).
 */
import type { ObsShape } from './cells';

export type Point = [number, number];
export const CENTER: Point = [20, 20];

const H = 14 * Math.sin(Math.PI / 3); // demi-base du triangle équilatéral de rayon 14

export const POLYGONS: Partial<Record<ObsShape, Point[]>> = {
  // triangle équilatéral dont le centre de gravité est (20, 20)
  tri: [[20, 6], [20 + H, 27], [20 - H, 27]],
  square: [[9, 9], [31, 9], [31, 31], [9, 31]],
  cross: [[17, 7], [23, 7], [23, 17], [33, 17], [33, 23], [23, 23], [23, 33], [17, 33], [17, 23], [7, 23], [7, 17], [17, 17]],
  arrow: [[20, 6], [31, 18], [24.5, 18], [24.5, 34], [15.5, 34], [15.5, 18], [9, 18]],
};

export const CIRCLE_R = 12;
export const HALF_R = 11.5;

export function polygonPath(points: readonly Point[]): string {
  return `M${points.map(([x, y]) => `${+x.toFixed(4)} ${+y.toFixed(4)}`).join('L')}Z`;
}

export function rotatePoint([x, y]: Point, deg: number, [cx, cy]: Point = CENTER): Point {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Vrai si la rotation de `deg` laisse le polygone visuellement inchangé. */
export function invariantUnderRotation(points: readonly Point[], deg: number, eps = 1e-6): boolean {
  const rotated = points.map((p) => rotatePoint(p, deg));
  return rotated.every(([x, y]) => points.some(([u, v]) => Math.abs(u - x) < eps && Math.abs(v - y) < eps));
}
