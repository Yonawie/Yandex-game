export type CellPos = { c: number; r: number };

export function keyOf(p: CellPos): string {
  return `${p.c},${p.r}`;
}

export function parseKey(k: string): CellPos {
  const [c, r] = k.split(",").map(Number);
  return { c, r };
}

const DIRS: CellPos[] = [
  { c: 1, r: 0 },
  { c: -1, r: 0 },
  { c: 0, r: 1 },
  { c: 0, r: -1 },
];

export function neighbors(p: CellPos): CellPos[] {
  return DIRS.map((d) => ({ c: p.c + d.c, r: p.r + d.r }));
}

export function isNeighbor(a: CellPos, b: CellPos): boolean {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
}

export function inBounds(p: CellPos, cols: number, rows: number): boolean {
  return p.c >= 0 && p.r >= 0 && p.c < cols && p.r < rows;
}

export function allCells(cols: number, rows: number): CellPos[] {
  const out: CellPos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out.push({ c, r });
  }
  return out;
}
