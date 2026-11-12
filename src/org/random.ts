// A seeded random, so the same mock organisation is drawn every time.
export function seeded(seed: string) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
    weighted: <T extends string>(w: Partial<Record<T, number>>) => {
      const entries = Object.entries(w) as [T, number][];
      let r = next() * entries.reduce((s, [, n]) => s + n, 0);
      for (const [k, n] of entries) if ((r -= n) < 0) return k;
      return entries[entries.length - 1][0];
    },
  };
}
