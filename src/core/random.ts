import { hashString, seededRandom } from './daily';

/** Combine plusieurs éléments en une graine 32 bits stable. */
export function deriveSeed(...parts: (string | number)[]): number {
  return hashString(parts.join('|'));
}

/** Générateur pseudo-aléatoire reproductible avec utilitaires. */
export class Rng {
  private readonly r: () => number;

  constructor(seed: number | string) {
    this.r = seededRandom(typeof seed === 'number' ? seed : hashString(seed));
  }

  next(): number {
    return this.r();
  }

  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number {
    return min + Math.floor(this.r() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.r() * items.length)];
  }

  chance(p: number): boolean {
    return this.r() < p;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

/** Graine aléatoire non déterministe pour une manche libre. */
export function randomSeed(): string {
  const buf = new Uint32Array(2);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
  else buf[0] = Math.floor(Math.random() * 2 ** 32);
  return `${buf[0].toString(36)}${buf[1].toString(36)}`;
}
