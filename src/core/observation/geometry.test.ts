import { describe, expect, it } from 'vitest';
import { ALL_SHAPES, SYMMETRY, cell, sameLook, type ObsShape } from './cells';
import { CENTER, POLYGONS, invariantUnderRotation } from './geometry';

const ANGLES = Array.from({ length: 24 }, (_, k) => k * 15); // 0°, 15°, … 345°

describe('Géométrie des formes : le dessin a exactement les symétries supposées par la validation', () => {
  for (const [shape, pts] of Object.entries(POLYGONS) as [ObsShape, [number, number][]][]) {
    it(`${shape} : invariant par ${SYMMETRY[shape]}°, et seulement par ses multiples`, () => {
      for (const a of ANGLES) {
        const expected = a % SYMMETRY[shape] === 0;
        expect(invariantUnderRotation(pts, a)).toBe(expected);
      }
    });
  }

  it('le triangle est équilatéral et centré sur son centre de gravité', () => {
    const t = POLYGONS.tri!;
    const g = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];
    expect(g[0]).toBeCloseTo(CENTER[0], 9);
    expect(g[1]).toBeCloseTo(CENTER[1], 9);
    const d = (i: number, j: number) => Math.hypot(t[i][0] - t[j][0], t[i][1] - t[j][1]);
    expect(d(0, 1)).toBeCloseTo(d(1, 2), 9);
    expect(d(1, 2)).toBeCloseTo(d(2, 0), 9);
  });

  it('toutes les formes sont centrées (boîte englobante symétrique autour de 20, 20)', () => {
    for (const pts of Object.values(POLYGONS)) {
      const xs = pts!.map((p) => p[0]);
      const ys = pts!.map((p) => p[1]);
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(20, 6);
      // le triangle est centré sur son centre de gravité (testé plus haut), pas sur sa boîte
      if (pts !== POLYGONS.tri) expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(20, 6);
    }
  });

  it('« même apparence » (validation) ⇔ « même dessin » (géométrie), pour toutes les paires d’angles', () => {
    for (const shape of ALL_SHAPES) {
      for (const a of ANGLES) {
        for (const b of ANGLES) {
          const look = sameLook(cell(shape, 'red', a), cell(shape, 'red', b));
          const pts = POLYGONS[shape];
          const geometric = pts
            ? invariantUnderRotation(pts, b - a)
            : shape === 'circle' ? true : (b - a) % 360 === 0; // demi-disque : aucune symétrie
          expect(look, `${shape} ${a}° vs ${b}°`).toBe(geometric);
        }
      }
    }
  });
});
