import type { AlignmentOp } from './types';

export class AlignmentTooLargeError extends Error {
  constructor(public cells: number, public limit: number) {
    super(`Alignment table of ${cells} cells exceeds limit ${limit}`);
    this.name = 'AlignmentTooLargeError';
  }
}

export interface AlignOptions {
  /** If true, the reference may end early (end-free in the reference): best reference prefix is chosen. */
  referencePrefix: boolean;
  maxCells: number;
}

export interface AlignResult {
  ops: AlignmentOp[];
  /** Number of reference elements in scope (full length, or the chosen prefix length). */
  referenceInScope: number;
  editDistance: number;
}

// Direction codes stored per DP cell.
const D_MATCH = 0;
const D_SUB = 1;
const D_MISSING = 2; // consume reference only
const D_EXTRA = 3; // consume typed only

/**
 * Levenshtein alignment (unit costs) with full traceback.
 *
 * Deterministic tie-breaking when several moves give the same minimum cost:
 *   match  >  substitution  >  missing (deletion)  >  extra (insertion)
 * The traceback starts at the end and walks back, so ties are resolved at the latest position first.
 * In prefix mode, among equally cheap reference prefixes the LONGEST one wins
 * (so one wrong key counts as a substitution instead of an extra + a skipped element).
 *
 * Time O(m*n), memory O(m*n) bytes for directions + O(n) for cost rows.
 */
export function align(ref: string[], typed: string[], opts: AlignOptions): AlignResult {
  const m = ref.length;
  const n = typed.length;
  const cells = (m + 1) * (n + 1);
  if (cells > opts.maxCells) throw new AlignmentTooLargeError(cells, opts.maxCells);

  const dir = new Uint8Array(cells);
  const w = n + 1;
  let prev = new Uint32Array(w);
  let cur = new Uint32Array(w);
  for (let j = 1; j <= n; j++) {
    prev[j] = j;
    dir[j] = D_EXTRA;
  }
  // cost of aligning ref[:i] with all typed -> column n, needed for prefix choice
  let bestI = 0;
  let bestCost = prev[n];

  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    dir[i * w] = D_MISSING;
    for (let j = 1; j <= n; j++) {
      const same = ref[i - 1] === typed[j - 1];
      const diag = prev[j - 1] + (same ? 0 : 1);
      const del = prev[j] + 1;
      const ins = cur[j - 1] + 1;
      let best = diag;
      let d = same ? D_MATCH : D_SUB;
      if (del < best) {
        best = del;
        d = D_MISSING;
      }
      if (ins < best) {
        best = ins;
        d = D_EXTRA;
      }
      cur[j] = best;
      dir[i * w + j] = d;
    }
    if (cur[n] <= bestCost) {
      bestCost = cur[n];
      bestI = i; // <= keeps the longest prefix among ties
    }
    const t = prev;
    prev = cur;
    cur = t;
  }

  const endI = opts.referencePrefix ? bestI : m;
  const distance = opts.referencePrefix ? bestCost : m === 0 ? n : prev[n];

  const ops: AlignmentOp[] = [];
  let i = endI;
  let j = n;
  while (i > 0 || j > 0) {
    const d = dir[i * w + j];
    if (d === D_MATCH) {
      ops.push({ type: 'correct', ref: ref[i - 1], typed: typed[j - 1], refIndex: i - 1, typedIndex: j - 1 });
      i--;
      j--;
    } else if (d === D_SUB) {
      ops.push({ type: 'substitute', ref: ref[i - 1], typed: typed[j - 1], refIndex: i - 1, typedIndex: j - 1 });
      i--;
      j--;
    } else if (d === D_MISSING) {
      ops.push({ type: 'missing', ref: ref[i - 1], refIndex: i - 1 });
      i--;
    } else {
      ops.push({ type: 'extra', typed: typed[j - 1], typedIndex: j - 1 });
      j--;
    }
  }
  ops.reverse();
  return { ops, referenceInScope: endI, editDistance: distance };
}
