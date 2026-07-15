/** Axial hex helpers (pointy-top). */

export type Axial = { q: number; r: number };

export function keyOf(a: Axial): string {
  return `${a.q},${a.r}`;
}

export function parseKey(k: string): Axial {
  const [q, r] = k.split(",").map(Number);
  return { q, r };
}

const DIRS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function neighbors(a: Axial): Axial[] {
  return DIRS.map((d) => ({ q: a.q + d.q, r: a.r + d.r }));
}

export function isNeighbor(a: Axial, b: Axial): boolean {
  return neighbors(a).some((n) => n.q === b.q && n.r === b.r);
}

export function hexDistance(a: Axial, b: Axial): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function cellsInRadius(R: number): Axial[] {
  const out: Axial[] = [];
  for (let q = -R; q <= R; q++) {
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
      out.push({ q, r });
    }
  }
  return out;
}

export function axialToPixel(a: Axial, size: number): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (a.q + a.r / 2);
  const y = size * (3 / 2) * a.r;
  return { x, y };
}

export function pixelToAxial(x: number, y: number, size: number): Axial {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound(q, r);
}

function hexRound(qf: number, rf: number): Axial {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const qDiff = Math.abs(q - qf);
  const rDiff = Math.abs(r - rf);
  const sDiff = Math.abs(s - sf);
  if (qDiff > rDiff && qDiff > sDiff) q = -r - s;
  else if (rDiff > sDiff) r = -q - s;
  return { q, r };
}

export function hexCorner(cx: number, cy: number, size: number, i: number): { x: number; y: number } {
  const angle = ((60 * i - 30) * Math.PI) / 180;
  return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
}
