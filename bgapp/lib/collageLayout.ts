/** Pure layout maths, shared by the PNG renderer and the on-screen preview. */

export interface Sized {
  ratio: number;   // width / height
}

/** Columns scale with the number of covers so tiles never get silly-small. */
export function columnsFor(n: number): number {
  if (n <= 2)  return n || 1;
  if (n <= 6)  return 3;
  if (n <= 12) return 4;
  if (n <= 24) return 5;
  if (n <= 48) return 7;
  if (n <= 80) return 8;
  return 10;
}

/**
 * Greedy masonry: each cover goes to the currently shortest column. Keeps the
 * bottoms roughly level without cropping anything, which a wrapping flex row
 * cannot do — there every row is as tall as its tallest item.
 */
export function packColumns<T extends Sized>(items: T[], cols: number, colWidth: number): T[][] {
  const columns: T[][] = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);

  // Tallest first (the classic LPT heuristic). Placing big covers while every
  // column is still short leaves only small ones to even things out at the end,
  // which is what keeps the bottom edge from going ragged.
  const order = [...items].sort((a, b) => (1 / (a.ratio || 1) > 1 / (b.ratio || 1) ? -1 : 1));

  for (const item of order) {
    let shortest = 0;
    for (let i = 1; i < cols; i++) if (heights[i] < heights[shortest]) shortest = i;
    columns[shortest].push(item);
    heights[shortest] += colWidth / (item.ratio || 1);
  }
  return columns;
}

/** Tallest column, used to size the output image exactly. */
export function columnHeights<T extends Sized>(columns: T[][], colWidth: number, gap: number): number[] {
  return columns.map(col =>
    col.reduce((h, it) => h + colWidth / (it.ratio || 1), 0) + Math.max(0, col.length - 1) * gap
  );
}
