/**
 * Cases du mode Observation.
 * La comparaison de deux cases se fait toujours sur leur APPARENCE (signature
 * canonique) : un carré tourné de 90° est identique à un carré non tourné.
 */

export type ObsShape = 'arrow' | 'half' | 'tri' | 'square' | 'circle' | 'cross';
export type ObsColor = 'ivory' | 'red' | 'grey';
export type ObsSize = 'm' | 's';

export interface ObsCell {
  shape: ObsShape;
  color: ObsColor;
  /** Rotation en degrés (multiple de 15). */
  rot: number;
  size: ObsSize;
  /** Petit point dans le coin : le « détail caché ». */
  mark: boolean;
}

/** Ordre de symétrie de rotation (en degrés) ; 0 = invariant par toute rotation. */
export const SYMMETRY: Record<ObsShape, number> = {
  arrow: 360,
  half: 360,
  tri: 120,
  square: 90,
  cross: 90,
  circle: 0,
};

/** Formes dont l'orientation se voit franchement. */
export const ORIENTED: ObsShape[] = ['arrow', 'half'];
export const ALL_SHAPES: ObsShape[] = ['arrow', 'half', 'tri', 'square', 'circle', 'cross'];
export const ALL_COLORS: ObsColor[] = ['ivory', 'red', 'grey'];

export function canonicalRot(shape: ObsShape, rot: number): number {
  const sym = SYMMETRY[shape];
  if (sym === 0) return 0;
  return ((rot % sym) + sym) % sym;
}

/** Signature visuelle : deux cases identiques à l'œil ont la même signature. */
export function signature(c: ObsCell): string {
  return `${c.shape}|${c.color}|${canonicalRot(c.shape, c.rot)}|${c.size}|${c.mark ? 1 : 0}`;
}

export function sameLook(a: ObsCell, b: ObsCell): boolean {
  return signature(a) === signature(b);
}

export function cell(shape: ObsShape, color: ObsColor, rot = 0, size: ObsSize = 'm', mark = false): ObsCell {
  return { shape, color, rot, size, mark };
}

// ---------- Vocabulaire ----------

const SHAPE_NAME: Record<ObsShape, { one: string; many: string; fem: boolean }> = {
  arrow: { one: 'flèche', many: 'flèches', fem: true },
  half: { one: 'demi-disque', many: 'demi-disques', fem: false },
  tri: { one: 'triangle', many: 'triangles', fem: false },
  square: { one: 'carré', many: 'carrés', fem: false },
  circle: { one: 'rond', many: 'ronds', fem: false },
  cross: { one: 'croix', many: 'croix', fem: true },
};
const COLOR_NAME: Record<ObsColor, { one: string; many: string }> = {
  ivory: { one: 'ivoire', many: 'ivoire' },
  red: { one: 'rouge', many: 'rouges' },
  grey: { one: 'gris', many: 'gris' },
};
const DIRECTION: Record<number, string> = { 0: 'vers le haut', 90: 'vers la droite', 180: 'vers le bas', 270: 'vers la gauche' };

export function shapeName(s: ObsShape, plural = false): string {
  return plural ? SHAPE_NAME[s].many : SHAPE_NAME[s].one;
}

export function colorName(c: ObsColor, plural = false, fem = false): string {
  if (c === 'grey') return fem ? (plural ? 'grises' : 'grise') : 'gris';
  return plural ? COLOR_NAME[c].many : COLOR_NAME[c].one;
}

export function describeCell(c: ObsCell, plural = false): string {
  const fem = SHAPE_NAME[c.shape].fem;
  return `${shapeName(c.shape, plural)} ${colorName(c.color, plural, fem)}`;
}

export function directionName(rot: number): string | null {
  return DIRECTION[((rot % 360) + 360) % 360] ?? null;
}

/** « ligne 2, colonne 3 » (1-indexé). */
export function position(index: number, cols: number): string {
  return `ligne ${Math.floor(index / cols) + 1}, colonne ${(index % cols) + 1}`;
}

/** Ce qui distingue `b` de `a`, en mots (pour les explications). */
export function describeChange(a: ObsCell, b: ObsCell): string {
  if (a.shape !== b.shape) return `${shapeName(a.shape)} → ${shapeName(b.shape)}`;
  if (a.color !== b.color) return `couleur ${colorName(a.color)} → ${colorName(b.color)}`;
  if (a.size !== b.size) return b.size === 's' ? 'forme plus petite' : 'forme plus grande';
  if (a.mark !== b.mark) return b.mark ? 'un point en plus' : 'un point en moins';
  const d = ((canonicalRot(b.shape, b.rot - a.rot) + 180) % 360) - 180;
  return `rotation de ${Math.abs(d)}°`;
}
