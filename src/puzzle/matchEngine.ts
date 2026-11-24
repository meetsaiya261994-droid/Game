import { GemColor, GemSpecial, GemTile, LevelConfig } from '../game/types';

export const BOARD_SIZE = 8;
export const GEM_COLORS: GemColor[] = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'];

let nextTileId = 1;

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createGem(
  color: GemColor,
  special: GemSpecial = 'NONE',
  bonusCell = false,
  iced = false,
  isNew = false
): GemTile {
  return {
    id: nextTileId++,
    color,
    special,
    bonusCell,
    iced,
    isNew,
  };
}

export interface GridCoord {
  r: number;
  c: number;
}

export interface MatchGroup {
  cells: GridCoord[];
  color: GemColor;
  spawnSpecial: GemSpecial;
  spawnAt: GridCoord;
}

export interface ValidMoveHint {
  a: GridCoord;
  b: GridCoord;
  priority: number; // Higher = better move (special combos > match-5 > bomb > rocket > match-3)
  tier: 'COMBO' | 'SPECIAL' | 'NORMAL';
  label: string;
}

export function cloneBoard(board: (GemTile | null)[][]): (GemTile | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell, isNew: false } : null)));
}

export function isAdjacent(a: GridCoord, b: GridCoord): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function generatePuzzleBoard(level: LevelConfig): (GemTile | null)[][] {
  const rng = createSeededRandom(level.puzzleSeed);
  const board: (GemTile | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  const allCoords: GridCoord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      allCoords.push({ r, c });
    }
  }
  for (let i = allCoords.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allCoords[i], allCoords[j]] = [allCoords[j], allCoords[i]];
  }

  const bonusSet = new Set<string>();
  for (let i = 0; i < Math.min(level.puzzleBonusCells, 16); i++) {
    bonusSet.add(`${allCoords[i].r},${allCoords[i].c}`);
  }
  const icedSet = new Set<string>();
  for (
    let i = level.puzzleBonusCells;
    i < Math.min(allCoords.length, level.puzzleBonusCells + level.puzzleIcedCells);
    i++
  ) {
    icedSet.add(`${allCoords[i].r},${allCoords[i].c}`);
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const forbidden = new Set<GemColor>();
      if (c >= 2 && board[r][c - 1]?.color === board[r][c - 2]?.color) {
        forbidden.add(board[r][c - 1]!.color);
      }
      if (r >= 2 && board[r - 1][c]?.color === board[r - 2][c]?.color) {
        forbidden.add(board[r - 1][c]!.color);
      }
      const candidates = GEM_COLORS.filter((col) => !forbidden.has(col));
      const color = candidates[Math.floor(rng() * candidates.length)];
      const key = `${r},${c}`;
      board[r][c] = createGem(color, 'NONE', bonusSet.has(key), icedSet.has(key), false);
    }
  }

  if (!findAnyValidMove(board)) {
    return shuffleBoard(board);
  }
  return board;
}

interface RawRun {
  cells: GridCoord[];
  color: GemColor;
  orientation: 'H' | 'V';
}

export function detectMatches(
  board: (GemTile | null)[][],
  preferCoords: GridCoord[] = []
): MatchGroup[] {
  const runs: RawRun[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    let c = 0;
    while (c < BOARD_SIZE) {
      const tile = board[r][c];
      if (!tile || tile.special === 'RAINBOW') {
        c++;
        continue;
      }
      let end = c + 1;
      while (
        end < BOARD_SIZE &&
        board[r][end] &&
        board[r][end]!.special !== 'RAINBOW' &&
        board[r][end]!.color === tile.color
      ) {
        end++;
      }
      if (end - c >= 3) {
        const cells: GridCoord[] = [];
        for (let k = c; k < end; k++) cells.push({ r, c: k });
        runs.push({ cells, color: tile.color, orientation: 'H' });
      }
      c = end;
    }
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let r = 0;
    while (r < BOARD_SIZE) {
      const tile = board[r][c];
      if (!tile || tile.special === 'RAINBOW') {
        r++;
        continue;
      }
      let end = r + 1;
      while (
        end < BOARD_SIZE &&
        board[end][c] &&
        board[end][c]!.special !== 'RAINBOW' &&
        board[end][c]!.color === tile.color
      ) {
        end++;
      }
      if (end - r >= 3) {
        const cells: GridCoord[] = [];
        for (let k = r; k < end; k++) cells.push({ r: k, c });
        runs.push({ cells, color: tile.color, orientation: 'V' });
      }
      r = end;
    }
  }

  if (runs.length === 0) return [];

  const visited = new Array<boolean>(runs.length).fill(false);
  const groups: MatchGroup[] = [];

  const shareCell = (a: RawRun, b: RawRun): boolean => {
    if (a.color !== b.color) return false;
    return a.cells.some((ca) => b.cells.some((cb) => ca.r === cb.r && ca.c === cb.c));
  };

  for (let i = 0; i < runs.length; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const cluster: RawRun[] = [runs[i]];
    const queue = [runs[i]];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (let j = 0; j < runs.length; j++) {
        if (!visited[j] && shareCell(curr, runs[j])) {
          visited[j] = true;
          cluster.push(runs[j]);
          queue.push(runs[j]);
        }
      }
    }

    const cellMap = new Map<string, GridCoord>();
    let maxStraight = 0;
    let hasH = false;
    let hasV = false;
    let mainOrientation: 'H' | 'V' = cluster[0].orientation;

    for (const run of cluster) {
      if (run.orientation === 'H') hasH = true;
      if (run.orientation === 'V') hasV = true;
      if (run.cells.length > maxStraight) {
        maxStraight = run.cells.length;
        mainOrientation = run.orientation;
      }
      for (const cell of run.cells) {
        cellMap.set(`${cell.r},${cell.c}`, cell);
      }
    }

    const uniqueCells = Array.from(cellMap.values());
    let spawnSpecial: GemSpecial = 'NONE';
    if (maxStraight >= 5) {
      spawnSpecial = 'RAINBOW';
    } else if (hasH && hasV) {
      spawnSpecial = 'BOMB';
    } else if (maxStraight === 4) {
      spawnSpecial = mainOrientation === 'H' ? 'ROCKET_H' : 'ROCKET_V';
    }

    let spawnAt = uniqueCells[Math.floor(uniqueCells.length / 2)];
    for (const pref of preferCoords) {
      if (cellMap.has(`${pref.r},${pref.c}`)) {
        spawnAt = pref;
        break;
      }
    }

    groups.push({
      cells: uniqueCells,
      color: cluster[0].color,
      spawnSpecial,
      spawnAt,
    });
  }

  return groups;
}

export function expandSpecialClears(
  board: (GemTile | null)[][],
  initialCoords: GridCoord[]
): { cleared: GridCoord[]; triggeredSpecials: GemSpecial[] } {
  const clearedMap = new Map<string, GridCoord>();
  const queue: GridCoord[] = [];
  const triggeredSpecials: GemSpecial[] = [];
  const activated = new Set<string>();

  const enqueue = (r: number, c: number) => {
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;
    if (!board[r][c]) return;
    const key = `${r},${c}`;
    if (!clearedMap.has(key)) {
      clearedMap.set(key, { r, c });
      queue.push({ r, c });
    }
  };

  for (const coord of initialCoords) enqueue(coord.r, coord.c);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const key = `${curr.r},${curr.c}`;
    if (activated.has(key)) continue;
    activated.add(key);

    const tile = board[curr.r][curr.c];
    if (!tile || tile.special === 'NONE') continue;

    triggeredSpecials.push(tile.special);

    if (tile.special === 'ROCKET_H') {
      for (let col = 0; col < BOARD_SIZE; col++) enqueue(curr.r, col);
    } else if (tile.special === 'ROCKET_V') {
      for (let row = 0; row < BOARD_SIZE; row++) enqueue(row, curr.c);
    } else if (tile.special === 'BOMB') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          enqueue(curr.r + dr, curr.c + dc);
        }
      }
    } else if (tile.special === 'RAINBOW') {
      const counts = new Map<GemColor, number>();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const t = board[r][c];
          if (t && t.special !== 'RAINBOW') {
            counts.set(t.color, (counts.get(t.color) ?? 0) + 1);
          }
        }
      }
      let bestColor: GemColor = 'ruby';
      let bestCount = -1;
      counts.forEach((cnt, col) => {
        if (cnt > bestCount) {
          bestCount = cnt;
          bestColor = col;
        }
      });
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c]?.color === bestColor) enqueue(r, c);
        }
      }
    }
  }

  return { cleared: Array.from(clearedMap.values()), triggeredSpecials };
}

export interface SpecialComboResult {
  isCombo: boolean;
  label: string;
  cleared: GridCoord[];
  bonusPoints: number;
  effectType: 'ROCKET' | 'BOMB' | 'RAINBOW';
}

export function evaluateSpecialSwapCombo(
  board: (GemTile | null)[][],
  a: GridCoord,
  b: GridCoord
): SpecialComboResult | null {
  const ta = board[a.r][a.c];
  const tb = board[b.r][b.c];
  if (!ta || !tb) return null;

  const isRocket = (s: GemSpecial) => s === 'ROCKET_H' || s === 'ROCKET_V';

  if (ta.special === 'RAINBOW' && tb.special === 'RAINBOW') {
    const all: GridCoord[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c]) all.push({ r, c });
      }
    }
    return {
      isCombo: true,
      label: 'PRISM SUPERNOVA!',
      cleared: all,
      bonusPoints: 1200,
      effectType: 'RAINBOW',
    };
  }

  if (ta.special === 'RAINBOW' || tb.special === 'RAINBOW') {
    const other = ta.special === 'RAINBOW' ? tb : ta;
    const targets: GridCoord[] = [a, b];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c]?.color === other.color) {
          targets.push({ r, c });
          if (other.special === 'BOMB') {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                  targets.push({ r: nr, c: nc });
                }
              }
            }
          } else if (isRocket(other.special)) {
            for (let k = 0; k < BOARD_SIZE; k++) {
              targets.push({ r, c: k });
            }
          }
        }
      }
    }
    const { cleared } = expandSpecialClears(board, targets);
    return {
      isCombo: true,
      label: other.special !== 'NONE' ? 'RAINBOW OVERDRIVE!' : 'RAINBOW BURST!',
      cleared,
      bonusPoints: other.special !== 'NONE' ? 750 : 350,
      effectType: 'RAINBOW',
    };
  }

  if (isRocket(ta.special) && isRocket(tb.special)) {
    const seeds: GridCoord[] = [];
    for (let k = 0; k < BOARD_SIZE; k++) {
      seeds.push({ r: b.r, c: k });
      seeds.push({ r: k, c: b.c });
    }
    const { cleared } = expandSpecialClears(board, seeds);
    return {
      isCombo: true,
      label: 'CROSS ROCKET!',
      cleared,
      bonusPoints: 400,
      effectType: 'ROCKET',
    };
  }

  if (
    (isRocket(ta.special) && tb.special === 'BOMB') ||
    (ta.special === 'BOMB' && isRocket(tb.special))
  ) {
    const seeds: GridCoord[] = [];
    for (let d = -1; d <= 1; d++) {
      for (let k = 0; k < BOARD_SIZE; k++) {
        if (b.r + d >= 0 && b.r + d < BOARD_SIZE) seeds.push({ r: b.r + d, c: k });
        if (b.c + d >= 0 && b.c + d < BOARD_SIZE) seeds.push({ r: k, c: b.c + d });
      }
    }
    const { cleared } = expandSpecialClears(board, seeds);
    return {
      isCombo: true,
      label: 'MEGA BLAST CROSS!',
      cleared,
      bonusPoints: 600,
      effectType: 'BOMB',
    };
  }

  if (ta.special === 'BOMB' && tb.special === 'BOMB') {
    const seeds: GridCoord[] = [];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = b.r + dr;
        const nc = b.c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          seeds.push({ r: nr, c: nc });
        }
      }
    }
    const { cleared } = expandSpecialClears(board, seeds);
    return {
      isCombo: true,
      label: 'SOLAR DETONATION!',
      cleared,
      bonusPoints: 550,
      effectType: 'BOMB',
    };
  }

  return null;
}

export function applyGravityAndRefill(board: (GemTile | null)[][]): (GemTile | null)[][] {
  const next = cloneBoard(board);
  for (let c = 0; c < BOARD_SIZE; c++) {
    const bonusRows = new Set<number>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c]?.bonusCell) bonusRows.add(r);
    }

    let writeRow = BOARD_SIZE - 1;
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (next[r][c] !== null) {
        const moving = next[r][c]!;
        if (writeRow !== r) {
          next[writeRow][c] = { ...moving, isNew: true };
          next[r][c] = null;
        }
        writeRow--;
      }
    }

    for (let r = writeRow; r >= 0; r--) {
      const color = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
      next[r][c] = createGem(color, 'NONE', bonusRows.has(r), false, true);
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
      if (next[r][c]) {
        next[r][c]!.bonusCell = bonusRows.has(r);
      }
    }
  }
  return next;
}

/** Find ALL valid swaps on the board, ranked highest-value first (used for paid Single & All-Hints Oracle!) */
export function findAllValidMoves(board: (GemTile | null)[][]): ValidMoveHint[] {
  const results: ValidMoveHint[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const curr = board[r][c];
      if (!curr) continue;
      const neighbors: GridCoord[] = [
        { r, c: c + 1 },
        { r: r + 1, c },
      ];
      for (const n of neighbors) {
        if (n.r >= BOARD_SIZE || n.c >= BOARD_SIZE) continue;
        const other = board[n.r][n.c];
        if (!other) continue;

        const combo = evaluateSpecialSwapCombo(board, { r, c }, n);
        if (combo) {
          results.push({
            a: { r, c },
            b: n,
            priority: 1000 + combo.cleared.length * 10,
            tier: 'COMBO',
            label: combo.label,
          });
          continue;
        }

        const test = cloneBoard(board);
        test[r][c] = other;
        test[n.r][n.c] = curr;
        const groups = detectMatches(test, [{ r, c }, n]);
        if (groups.length > 0) {
          let totalCells = 0;
          let bestSpecial: GemSpecial = 'NONE';
          for (const g of groups) {
            totalCells += g.cells.length;
            if (g.spawnSpecial === 'RAINBOW') bestSpecial = 'RAINBOW';
            else if (g.spawnSpecial === 'BOMB' && bestSpecial !== 'RAINBOW') bestSpecial = 'BOMB';
            else if (
              (g.spawnSpecial === 'ROCKET_H' || g.spawnSpecial === 'ROCKET_V') &&
              bestSpecial === 'NONE'
            ) {
              bestSpecial = g.spawnSpecial;
            }
          }

          let priority = totalCells * 10 + groups.length * 20;
          let tier: ValidMoveHint['tier'] = 'NORMAL';
          let label = 'Match 3';
          if (bestSpecial === 'RAINBOW') {
            priority += 500;
            tier = 'SPECIAL';
            label = 'Rainbow 5!';
          } else if (bestSpecial === 'BOMB') {
            priority += 320;
            tier = 'SPECIAL';
            label = 'Sun Bomb!';
          } else if (bestSpecial === 'ROCKET_H' || bestSpecial === 'ROCKET_V') {
            priority += 180;
            tier = 'SPECIAL';
            label = 'Rocket 4!';
          }

          results.push({ a: { r, c }, b: n, priority, tier, label });
        }
      }
    }
  }

  results.sort((x, y) => y.priority - x.priority);
  return results;
}

export function findAnyValidMove(board: (GemTile | null)[][]): [GridCoord, GridCoord] | null {
  const all = findAllValidMoves(board);
  if (all.length === 0) return null;
  return [all[0].a, all[0].b];
}

export function shuffleBoard(board: (GemTile | null)[][]): (GemTile | null)[][] {
  for (let attempt = 0; attempt < 25; attempt++) {
    const next = cloneBoard(board);
    const colors: GemColor[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (next[r][c]) colors.push(next[r][c]!.color);
      }
    }
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    let idx = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (next[r][c]) {
          next[r][c]!.color = colors[idx++];
          next[r][c]!.isNew = true;
        }
      }
    }
    if (detectMatches(next).length === 0 && findAnyValidMove(next)) {
      return next;
    }
  }

  const guaranteed = cloneBoard(board);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (guaranteed[r][c]) {
        guaranteed[r][c]!.color = GEM_COLORS[(r * 2 + c) % GEM_COLORS.length];
        guaranteed[r][c]!.isNew = true;
      }
    }
  }
  if (guaranteed[3][2] && guaranteed[3][3] && guaranteed[3][4] && guaranteed[2][4]) {
    guaranteed[3][2]!.color = 'ruby';
    guaranteed[3][3]!.color = 'ruby';
    guaranteed[3][4]!.color = 'sapphire';
    guaranteed[2][4]!.color = 'ruby';
    if (guaranteed[4][4]) guaranteed[4][4]!.color = 'ruby';
  }
  return guaranteed;
}
