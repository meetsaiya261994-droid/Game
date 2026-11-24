import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bomb,
  Coins,
  Eye,
  Gem,
  Hammer,
  Home,
  Lightbulb,
  Pause,
  Play,
  PlusCircle,
  RotateCcw,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { getWorldById } from '../game/config';
import {
  GameState,
  GemTile,
  LevelConfig,
  PuzzleBoosterKind,
} from '../game/types';
import {
  BOARD_SIZE,
  GridCoord,
  ValidMoveHint,
  applyGravityAndRefill,
  cloneBoard,
  createGem,
  detectMatches,
  evaluateSpecialSwapCombo,
  expandSpecialClears,
  findAllValidMoves,
  findAnyValidMove,
  generatePuzzleBoard,
  isAdjacent,
  shuffleBoard,
} from './matchEngine';
import { GemSvg } from './GemSvg';

interface FloatingPopup {
  id: number;
  r: number;
  c: number;
  text: string;
  accent?: boolean;
}

export interface PuzzleScreenProps {
  gameState: GameState;
  level: LevelConfig;
  puzzleScoreMultiplier: number;
  boosters: Record<PuzzleBoosterKind | 'revive', number>;
  coins: number;
  diamonds: number;
  hintSingleCost: number;
  hintAllTurnCost: number;
  hintOracleCost: number;
  onSpendCoins: (amount: number) => boolean;
  onConsumeBooster: (kind: PuzzleBoosterKind) => boolean;
  onBuyExtraMoves: () => boolean;
  onRecordMatches: (count: number) => void;
  onPuzzleVictory: (finalScore: number, movesLeft: number) => void;
  onPuzzleFailed: () => void;
  onRetryPuzzle: () => void;
  onTogglePause: () => void;
  onReturnMenu: () => void;
}

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const PuzzleScreen: React.FC<PuzzleScreenProps> = ({
  gameState,
  level,
  puzzleScoreMultiplier,
  boosters,
  coins,
  diamonds,
  hintSingleCost,
  hintAllTurnCost,
  hintOracleCost,
  onSpendCoins,
  onConsumeBooster,
  onBuyExtraMoves,
  onRecordMatches,
  onPuzzleVictory,
  onPuzzleFailed,
  onRetryPuzzle,
  onTogglePause,
  onReturnMenu,
}) => {
  const world = getWorldById(level.worldId);
  const [board, setBoard] = useState<(GemTile | null)[][]>(() => generatePuzzleBoard(level));
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(level.puzzleMoves);
  const [selected, setSelected] = useState<GridCoord | null>(null);
  const [activeBooster, setActiveBooster] = useState<PuzzleBoosterKind | null>(null);
  const [clearingSet, setClearingSet] = useState<Set<string>>(new Set());
  const [invalidPair, setInvalidPair] = useState<Set<string>>(new Set());
  const [revealedHints, setRevealedHints] = useState<ValidMoveHint[]>([]);
  const [oracleModeActive, setOracleModeActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [victoryBanner, setVictoryBanner] = useState(false);

  const popupIdRef = useRef(1);
  const mountedRef = useRef(true);
  const dragStartRef = useRef<{ r: number; c: number; x: number; y: number } | null>(null);
  const scoreRef = useRef(0);
  const movesRef = useRef(level.puzzleMoves);
  const oracleRef = useRef(false);
  scoreRef.current = score;
  movesRef.current = movesLeft;
  oracleRef.current = oracleModeActive;

  const resetPuzzleBoard = useCallback(() => {
    const fresh = generatePuzzleBoard(level);
    setBoard(fresh);
    setScore(0);
    scoreRef.current = 0;
    setMovesLeft(level.puzzleMoves);
    movesRef.current = level.puzzleMoves;
    setSelected(null);
    setActiveBooster(null);
    setClearingSet(new Set());
    setInvalidPair(new Set());
    setOracleModeActive(false);
    oracleRef.current = false;
    setRevealedHints([]);
    setIsBusy(false);
    setVictoryBanner(false);
    setBanner(`Crack the lock: ${level.puzzleTargetScore.toLocaleString()} pts in ${level.puzzleMoves} moves!`);
    window.setTimeout(() => {
      if (mountedRef.current) setBanner(null);
    }, 2400);
  }, [level]);

  useEffect(() => {
    mountedRef.current = true;
    resetPuzzleBoard();
    return () => {
      mountedRef.current = false;
    };
  }, [resetPuzzleBoard]);

  const addPopup = (r: number, c: number, text: string, accent = false) => {
    const id = popupIdRef.current++;
    setPopups((prev) => [...prev.slice(-8), { id, r, c, text, accent }]);
    window.setTimeout(() => {
      if (mountedRef.current) {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }
    }, 760);
  };

  const showTempBanner = (text: string, ms = 1700) => {
    setBanner(text);
    window.setTimeout(() => {
      if (mountedRef.current) setBanner((curr) => (curr === text ? null : curr));
    }, ms);
  };

  const resolveBoardCascades = async (
    initialBoard: (GemTile | null)[][],
    preferCoords: GridCoord[],
    startingCombo = 1,
    nextMovesLeft: number
  ) => {
    let working = initialBoard;
    let combo = startingCombo;
    let runningScore = scoreRef.current;
    let totalMatchesThisTurn = 0;

    while (mountedRef.current) {
      const groups = detectMatches(working, combo === 1 ? preferCoords : []);
      if (groups.length === 0) break;

      totalMatchesThisTurn += groups.length;
      const initialCoords: GridCoord[] = [];
      const specialsToSpawn: Array<{
        coord: GridCoord;
        color: GemTile['color'];
        special: GemTile['special'];
      }> = [];

      for (const g of groups) {
        for (const cell of g.cells) initialCoords.push(cell);
        if (g.spawnSpecial !== 'NONE') {
          specialsToSpawn.push({
            coord: g.spawnAt,
            color: g.color,
            special: g.spawnSpecial,
          });
        }
      }

      const { cleared, triggeredSpecials } = expandSpecialClears(working, initialCoords);
      const clearKeys = new Set(cleared.map((pt) => `${pt.r},${pt.c}`));
      setClearingSet(clearKeys);

      if (triggeredSpecials.includes('RAINBOW')) soundManager.playRainbow();
      else if (triggeredSpecials.includes('BOMB')) soundManager.playBomb();
      else if (triggeredSpecials.includes('ROCKET_H') || triggeredSpecials.includes('ROCKET_V')) {
        soundManager.playRocket();
      } else {
        soundManager.playGemMatch(combo);
      }

      let bonusMult = 1;
      for (const pt of cleared) {
        if (working[pt.r][pt.c]?.bonusCell) bonusMult += 0.35;
      }
      const basePts =
        cleared.length * 40 + (groups.length > 1 ? 85 : 0) + triggeredSpecials.length * 145;
      const gained = Math.round(basePts * combo * bonusMult * puzzleScoreMultiplier);
      runningScore += gained;
      scoreRef.current = runningScore;
      setScore(runningScore);

      const center = cleared[Math.floor(cleared.length / 2)] ?? { r: 3, c: 3 };
      addPopup(
        center.r,
        center.c,
        combo > 1 ? `+${gained} ×${combo}` : `+${gained}`,
        combo >= 2 || triggeredSpecials.length > 0
      );
      if (combo >= 2) {
        showTempBanner(`CASCADE COMBO ×${combo}!`, 1100);
      }

      await delay(220);
      if (!mountedRef.current) return;

      const afterClear = cloneBoard(working);
      for (const pt of cleared) {
        const tile = afterClear[pt.r][pt.c];
        if (!tile) continue;
        if (tile.iced && triggeredSpecials.length === 0) {
          afterClear[pt.r][pt.c] = { ...tile, iced: false };
        } else {
          afterClear[pt.r][pt.c] = null;
        }
      }

      for (const sp of specialsToSpawn) {
        const wasBonus = working[sp.coord.r][sp.coord.c]?.bonusCell ?? false;
        afterClear[sp.coord.r][sp.coord.c] = createGem(sp.color, sp.special, wasBonus, false, false);
        const spLabel =
          sp.special === 'RAINBOW'
            ? 'RAINBOW RELIC!'
            : sp.special === 'BOMB'
            ? 'SUN BOMB!'
            : 'ROCKET GEM!';
        addPopup(sp.coord.r, sp.coord.c, spLabel, true);
      }

      setClearingSet(new Set());
      setBoard(afterClear);
      await delay(85);
      if (!mountedRef.current) return;

      working = applyGravityAndRefill(afterClear);
      setBoard(working);
      await delay(205);
      combo++;
    }

    if (totalMatchesThisTurn > 0) {
      onRecordMatches(totalMatchesThisTurn);
    }

    if (mountedRef.current && !findAnyValidMove(working)) {
      showTempBanner('No moves left — Auto-Shuffling Gems!', 1600);
      await delay(300);
      working = shuffleBoard(working);
      setBoard(working);
    }

    if (!mountedRef.current) return;

    // If All-Hints Oracle is active for this puzzle, automatically reveal ALL hints after every settle!
    if (oracleRef.current) {
      setRevealedHints(findAllValidMoves(working));
    }

    setIsBusy(false);

    if (runningScore >= level.puzzleTargetScore) {
      setVictoryBanner(true);
      soundManager.playPuzzleVictory();
      await delay(900);
      if (mountedRef.current) {
        onPuzzleVictory(runningScore, nextMovesLeft);
      }
    } else if (nextMovesLeft <= 0) {
      soundManager.playPuzzleFail();
      onPuzzleFailed();
    }
  };

  const attemptSwap = async (a: GridCoord, b: GridCoord) => {
    if (isBusy || gameState !== 'PUZZLE' || victoryBanner) return;
    if (!isAdjacent(a, b)) return;
    if (!oracleRef.current) setRevealedHints([]);
    setSelected(null);

    const ta = board[a.r][a.c];
    const tb = board[b.r][b.c];
    if (!ta || !tb) return;

    setIsBusy(true);
    soundManager.playGemSwap();

    const comboResult = evaluateSpecialSwapCombo(board, a, b);
    if (comboResult) {
      const nextMoves = Math.max(0, movesRef.current - 1);
      movesRef.current = nextMoves;
      setMovesLeft(nextMoves);

      const clearKeys = new Set(comboResult.cleared.map((pt) => `${pt.r},${pt.c}`));
      setClearingSet(clearKeys);
      if (comboResult.effectType === 'RAINBOW') soundManager.playRainbow();
      else if (comboResult.effectType === 'BOMB') soundManager.playBomb();
      else soundManager.playRocket();

      const gained = Math.round(
        (comboResult.cleared.length * 45 + comboResult.bonusPoints) * puzzleScoreMultiplier
      );
      const nextScore = scoreRef.current + gained;
      scoreRef.current = nextScore;
      setScore(nextScore);
      showTempBanner(comboResult.label, 1400);
      addPopup(b.r, b.c, `+${gained}`, true);

      await delay(250);
      if (!mountedRef.current) return;
      const afterClear = cloneBoard(board);
      for (const pt of comboResult.cleared) {
        afterClear[pt.r][pt.c] = null;
      }
      setClearingSet(new Set());
      const refilled = applyGravityAndRefill(afterClear);
      setBoard(refilled);
      await delay(210);
      await resolveBoardCascades(refilled, [], 2, nextMoves);
      return;
    }

    const swapped = cloneBoard(board);
    swapped[a.r][a.c] = { ...tb, bonusCell: ta.bonusCell };
    swapped[b.r][b.c] = { ...ta, bonusCell: tb.bonusCell };

    const matches = detectMatches(swapped, [a, b]);
    if (matches.length === 0) {
      soundManager.playInvalidSwap();
      setInvalidPair(new Set([`${a.r},${a.c}`, `${b.r},${b.c}`]));
      await delay(220);
      if (mountedRef.current) {
        setInvalidPair(new Set());
        setIsBusy(false);
      }
      return;
    }

    const nextMoves = Math.max(0, movesRef.current - 1);
    movesRef.current = nextMoves;
    setMovesLeft(nextMoves);
    setBoard(swapped);
    await delay(115);
    await resolveBoardCascades(swapped, [a, b], 1, nextMoves);
  };

  const applyTargetedBooster = async (coord: GridCoord) => {
    if (!activeBooster || isBusy) return;
    const tile = board[coord.r][coord.c];
    if (!tile) return;

    const ok = onConsumeBooster(activeBooster);
    if (!ok) {
      setActiveBooster(null);
      return;
    }

    const chosenBooster = activeBooster;
    setActiveBooster(null);
    setIsBusy(true);
    if (!oracleRef.current) setRevealedHints([]);

    const targets: GridCoord[] = [];
    if (chosenBooster === 'hammer') {
      targets.push(coord);
      soundManager.playGemMatch(2);
    } else if (chosenBooster === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = coord.r + dr;
          const nc = coord.c + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            targets.push({ r: nr, c: nc });
          }
        }
      }
      soundManager.playBomb();
    } else if (chosenBooster === 'rainbow') {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c]?.color === tile.color) targets.push({ r, c });
        }
      }
      soundManager.playRainbow();
    }

    const { cleared } = expandSpecialClears(board, targets);
    setClearingSet(new Set(cleared.map((pt) => `${pt.r},${pt.c}`)));
    const gained = Math.round(cleared.length * 55 * puzzleScoreMultiplier);
    const nextScore = scoreRef.current + gained;
    scoreRef.current = nextScore;
    setScore(nextScore);
    addPopup(coord.r, coord.c, `+${gained}`, true);

    await delay(230);
    if (!mountedRef.current) return;
    const afterClear = cloneBoard(board);
    for (const pt of cleared) {
      afterClear[pt.r][pt.c] = null;
    }
    setClearingSet(new Set());
    const refilled = applyGravityAndRefill(afterClear);
    setBoard(refilled);
    await delay(205);
    await resolveBoardCascades(refilled, [], 2, movesRef.current);
  };

  const handleCellClick = (r: number, c: number) => {
    soundManager.unlock();
    if (isBusy || gameState !== 'PUZZLE' || victoryBanner) return;

    if (activeBooster === 'hammer' || activeBooster === 'bomb' || activeBooster === 'rainbow') {
      applyTargetedBooster({ r, c });
      return;
    }

    if (!selected) {
      setSelected({ r, c });
      soundManager.playClick();
      return;
    }

    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }

    if (isAdjacent(selected, { r, c })) {
      attemptSwap(selected, { r, c });
    } else {
      setSelected({ r, c });
      soundManager.playClick();
    }
  };

  const handleBoosterButton = (kind: PuzzleBoosterKind) => {
    soundManager.unlock();
    if (isBusy || gameState !== 'PUZZLE') return;
    if ((boosters[kind] ?? 0) <= 0) {
      showTempBanner('Out of this booster — buy more in Upgrades & Store!', 1500);
      return;
    }

    if (kind === 'shuffle') {
      if (onConsumeBooster('shuffle')) {
        soundManager.playPowerUp();
        const shuffled = shuffleBoard(board);
        setBoard(shuffled);
        if (oracleRef.current) setRevealedHints(findAllValidMoves(shuffled));
        showTempBanner('BOARD SHUFFLED!', 1400);
      }
      return;
    }

    if (kind === 'extraMoves') {
      if (onConsumeBooster('extraMoves')) {
        soundManager.playPowerUp();
        setMovesLeft((m) => m + 5);
        movesRef.current += 5;
        showTempBanner('+5 EXTRA MOVES ADDED!', 1400);
      }
      return;
    }

    setActiveBooster((curr) => (curr === kind ? null : kind));
    setSelected(null);
    soundManager.playClick();
  };

  // --- Paid Coin Hint Actions ---
  const handleBuyBestHint = () => {
    soundManager.unlock();
    if (isBusy || gameState !== 'PUZZLE') return;
    if (coins < hintSingleCost) {
      showTempBanner(`Need ${hintSingleCost} Coins for Best Move Hint!`, 1500);
      return;
    }
    const all = findAllValidMoves(board);
    if (all.length === 0) return;
    if (onSpendCoins(hintSingleCost)) {
      soundManager.playPowerUp();
      setRevealedHints([all[0]]);
      showTempBanner(`BEST MOVE: ${all[0].label.toUpperCase()}!`, 1800);
    }
  };

  const handleBuyAllHintsThisTurn = () => {
    soundManager.unlock();
    if (isBusy || gameState !== 'PUZZLE') return;
    if (coins < hintAllTurnCost) {
      showTempBanner(`Need ${hintAllTurnCost} Coins to reveal ALL hints!`, 1500);
      return;
    }
    const all = findAllValidMoves(board);
    if (all.length === 0) return;
    if (onSpendCoins(hintAllTurnCost)) {
      soundManager.playRainbow();
      setRevealedHints(all);
      showTempBanner(`ALL ${all.length} VALID MOVES REVEALED! (Gold = Special)`, 2200);
    }
  };

  const handleBuyAllHintsOracle = () => {
    soundManager.unlock();
    if (isBusy || gameState !== 'PUZZLE' || oracleModeActive) return;
    if (coins < hintOracleCost) {
      showTempBanner(`Need ${hintOracleCost} Coins for All-Hints Oracle!`, 1500);
      return;
    }
    if (onSpendCoins(hintOracleCost)) {
      soundManager.playChestOpen();
      setOracleModeActive(true);
      oracleRef.current = true;
      const all = findAllValidMoves(board);
      setRevealedHints(all);
      showTempBanner(`ORACLE UNLOCKED! ALL ${all.length} HINTS SHOWN EVERY TURN!`, 2400);
    }
  };

  // Build lookup map of highlighted cells from revealedHints
  const hintCellMap = new Map<string, { tier: ValidMoveHint['tier']; index: number }>();
  revealedHints.forEach((h, idx) => {
    for (const pt of [h.a, h.b]) {
      const k = `${pt.r},${pt.c}`;
      const existing = hintCellMap.get(k);
      if (
        !existing ||
        (h.tier === 'COMBO' && existing.tier !== 'COMBO') ||
        (h.tier === 'SPECIAL' && existing.tier === 'NORMAL')
      ) {
        hintCellMap.set(k, { tier: h.tier, index: idx + 1 });
      }
    }
  });

  const progressPct = Math.min(
    100,
    Math.round((score / Math.max(1, level.puzzleTargetScore)) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col items-center justify-between px-3 py-2.5 sm:py-3.5 overflow-hidden"
      style={{
        background: `radial-gradient(circle at 50% 18%, ${world.badgeBg} 0%, #090f0c 78%)`,
      }}
    >
      {/* Top Puzzle HUD */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-2.5 bg-[#121c17] border border-amber-500/25 rounded-xl px-3.5 py-2 shadow-lg">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-mono-nums">
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {coins.toLocaleString()}
            </span>
            <span className="text-stone-600">·</span>
            <span className="flex items-center gap-1 text-sky-300 font-bold">
              <Gem className="w-3.5 h-3.5 text-sky-400" />
              {diamonds.toLocaleString()}
            </span>
          </div>
          <div className="font-display text-xs sm:text-sm font-bold text-stone-100 truncate">
            L{level.levelNumber} · {level.name}
          </div>
        </div>

        {/* Target Score Progress */}
        <div className="flex-1 max-w-xs mx-1">
          <div className="flex items-baseline justify-between text-xs mb-1">
            <span className="font-mono-nums font-bold text-amber-300">
              {score.toLocaleString()}
            </span>
            <span className="text-stone-400 font-mono-nums">
              / {level.puzzleTargetScore.toLocaleString()} pts
            </span>
          </div>
          <div className="h-2.5 bg-stone-900 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-transform duration-200 origin-left"
              style={{ transform: `scaleX(${progressPct / 100})` }}
            />
          </div>
        </div>

        {/* Moves Remaining + Pause */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`px-3 py-1 rounded-lg border text-center min-w-[62px] ${
              movesLeft <= 5
                ? 'bg-red-950/80 border-red-400/50 text-red-200'
                : 'bg-stone-900/90 border-amber-400/30 text-amber-100'
            }`}
          >
            <div className="text-[10px] text-stone-400 leading-none">Moves</div>
            <div className="font-mono-nums text-lg font-bold leading-tight">{movesLeft}</div>
          </div>

          <button
            type="button"
            onClick={onTogglePause}
            title="Pause Puzzle"
            className="w-10 h-10 rounded-lg bg-stone-900 border border-white/15 hover:border-amber-400/60 text-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paid Coin Hint Bar (Spend Coins for Best Hint, ALL Hints, or All-Hints Oracle!) */}
      <div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2 my-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={isBusy || coins < hintSingleCost}
            onClick={handleBuyBestHint}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              coins >= hintSingleCost && !isBusy
                ? 'bg-[#17261f] hover:bg-[#1f342a] text-amber-200 border-amber-500/40 cursor-pointer'
                : 'bg-stone-900/60 text-stone-500 border-white/10 cursor-not-allowed'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Best Hint
            <span className="font-mono-nums text-amber-300 flex items-center gap-0.5">
              <Coins className="w-3 h-3" /> {hintSingleCost}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy || coins < hintAllTurnCost}
            onClick={handleBuyAllHintsThisTurn}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              coins >= hintAllTurnCost && !isBusy
                ? 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-100 border-amber-400/60 cursor-pointer'
                : 'bg-stone-900/60 text-stone-500 border-white/10 cursor-not-allowed'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-300" />
            All Hints
            <span className="font-mono-nums text-amber-300 flex items-center gap-0.5">
              <Coins className="w-3 h-3" /> {hintAllTurnCost}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy || oracleModeActive || coins < hintOracleCost}
            onClick={handleBuyAllHintsOracle}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              oracleModeActive
                ? 'bg-emerald-900/70 text-emerald-200 border-emerald-400/60 cursor-default'
                : coins >= hintOracleCost && !isBusy
                ? 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-100 border-emerald-400/50 cursor-pointer'
                : 'bg-stone-900/60 text-stone-500 border-white/10 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            {oracleModeActive ? (
              'Oracle Active (All Turns)'
            ) : (
              <>
                All Hints Every Turn
                <span className="font-mono-nums text-amber-300 flex items-center gap-0.5">
                  <Coins className="w-3 h-3" /> {hintOracleCost}
                </span>
              </>
            )}
          </button>
        </div>

        <div className="text-xs font-medium text-amber-300 truncate max-w-[260px]">
          {activeBooster ? (
            <button
              type="button"
              onClick={() => setActiveBooster(null)}
              className="underline text-amber-200 cursor-pointer"
            >
              Tap a gem for {activeBooster} (Cancel)
            </button>
          ) : banner ? (
            banner
          ) : revealedHints.length > 0 ? (
            `${revealedHints.length} moves lit · Gold = Special`
          ) : (
            'Gold = 4+/Combo · Emerald = Match-3'
          )}
        </div>
      </div>

      {/* 8x8 Temple Gem Board */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
        <div
          className="relative p-2 sm:p-2.5 rounded-2xl bg-[#111915] border-2 border-amber-500/35 shadow-2xl"
          style={{
            width: 'min(92vw, 485px, calc(100vh - 220px))',
            height: 'min(92vw, 485px, calc(100vh - 220px))',
          }}
        >
          <div className="grid grid-cols-8 grid-rows-8 gap-1 w-full h-full">
            {board.map((row, r) =>
              row.map((tile, c) => {
                const key = `${r},${c}`;
                const isSelected = selected?.r === r && selected?.c === c;
                const isClearing = clearingSet.has(key);
                const isInvalid = invalidPair.has(key);
                const hintInfo = hintCellMap.get(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    onPointerDown={(e) => {
                      dragStartRef.current = { r, c, x: e.clientX, y: e.clientY };
                    }}
                    onPointerMove={(e) => {
                      const st = dragStartRef.current;
                      if (!st || (st.r !== r && st.c !== c)) return;
                      const dx = e.clientX - st.x;
                      const dy = e.clientY - st.y;
                      if (Math.hypot(dx, dy) < 22) return;
                      dragStartRef.current = null;
                      const dr = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 1 : -1) : 0;
                      const dc = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0;
                      const nr = st.r + dr;
                      const nc = st.c + dc;
                      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                        attemptSwap({ r: st.r, c: st.c }, { r: nr, c: nc });
                      }
                    }}
                    onPointerUp={() => {
                      dragStartRef.current = null;
                    }}
                    className={`relative rounded-lg flex items-center justify-center p-0.5 sm:p-1 transition-transform duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                      tile?.bonusCell
                        ? 'bg-amber-900/45 border border-amber-400/55'
                        : (r + c) % 2 === 0
                        ? 'bg-stone-900/85 border border-white/5'
                        : 'bg-stone-800/65 border border-white/5'
                    } ${isSelected ? 'ring-2 ring-white scale-108 z-10' : ''} ${
                      hintInfo?.tier === 'COMBO' || hintInfo?.tier === 'SPECIAL'
                        ? 'ring-2 ring-amber-300 bg-amber-500/25 scale-105 z-10'
                        : hintInfo
                        ? 'ring-2 ring-emerald-400 bg-emerald-500/15'
                        : ''
                    } ${isInvalid ? 'animate-shake-invalid' : ''} ${
                      activeBooster ? 'hover:ring-2 hover:ring-amber-300' : ''
                    }`}
                    aria-label={tile ? `${tile.color} gem row ${r + 1} col ${c + 1}` : 'empty'}
                  >
                    {tile && (
                      <div
                        className={`w-full h-full ${
                          isClearing ? 'animate-gem-pop' : tile.isNew ? 'animate-gem-drop' : ''
                        }`}
                      >
                        <GemSvg color={tile.color} special={tile.special} />
                      </div>
                    )}

                    {/* Pair Number Tag when multiple hints are revealed so player sees which two gems swap! */}
                    {hintInfo && revealedHints.length > 1 && (
                      <span
                        className={`pointer-events-none absolute bottom-0.5 left-0.5 px-1 rounded text-[9px] font-mono-nums font-bold leading-tight ${
                          hintInfo.tier !== 'NORMAL'
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-emerald-500 text-stone-950'
                        }`}
                      >
                        {hintInfo.index}
                      </span>
                    )}

                    {tile?.bonusCell && (
                      <span className="pointer-events-none absolute top-0.5 right-0.5 text-[9px] font-bold text-amber-300 leading-none">
                        2×
                      </span>
                    )}

                    {tile?.iced && (
                      <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-sky-300/80 bg-sky-300/20" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Floating Score Popups */}
          {popups.map((p) => (
            <div
              key={p.id}
              className={`pointer-events-none absolute z-20 font-display font-bold whitespace-nowrap animate-float-score ${
                p.accent ? 'text-amber-300 text-base sm:text-lg' : 'text-white text-sm'
              }`}
              style={{
                left: `${((p.c + 0.5) / BOARD_SIZE) * 100}%`,
                top: `${((p.r + 0.5) / BOARD_SIZE) * 100}%`,
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
              }}
            >
              {p.text}
            </div>
          ))}

          {victoryBanner && (
            <div className="absolute inset-0 z-30 rounded-2xl bg-black/70 flex flex-col items-center justify-center text-center p-6">
              <div className="font-display text-3xl font-bold text-amber-300 tracking-wide">
                LOCK BROKEN!
              </div>
              <p className="text-stone-200 text-sm mt-2">
                Returning to the Treasure Chamber to open your chest...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Booster Dock */}
      <div className="w-full max-w-2xl flex items-center justify-center gap-2 sm:gap-3 pt-1.5">
        {(
          [
            { key: 'hammer', label: 'Hammer', icon: Hammer },
            { key: 'shuffle', label: 'Shuffle', icon: Shuffle },
            { key: 'extraMoves', label: '+5 Moves', icon: PlusCircle },
            { key: 'bomb', label: 'Bomb', icon: Bomb },
            { key: 'rainbow', label: 'Rainbow', icon: Sparkles },
          ] as Array<{
            key: PuzzleBoosterKind;
            label: string;
            icon: React.ComponentType<{ className?: string }>;
          }>
        ).map(({ key, label, icon: Icon }) => {
          const count = boosters[key] ?? 0;
          const isActive = activeBooster === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleBoosterButton(key)}
              disabled={count <= 0}
              className={`flex flex-col items-center justify-center min-w-[58px] sm:min-w-[82px] px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-stone-950 border-amber-200 scale-105'
                  : count > 0
                  ? 'bg-[#15221c] hover:bg-[#1e3128] text-stone-100 border-amber-500/30'
                  : 'bg-stone-900/60 text-stone-500 border-white/10 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1">
                <Icon className="w-4 h-4" />
                <span className="font-mono-nums text-xs font-bold">{count}</span>
              </div>
              <span className="text-[11px] font-medium mt-0.5 whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Puzzle Paused Modal */}
      {gameState === 'PUZZLE_PAUSED' && (
        <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131d18] border border-amber-500/40 rounded-2xl p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-amber-300">Puzzle Paused</h2>
            <p className="text-sm text-stone-400 mt-1">
              Your running stage is safely banked. Resume unlocking the chest anytime.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Resume Puzzle
              </button>
              <button
                type="button"
                onClick={() => {
                  onTogglePause();
                  resetPuzzleBoard();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restart Puzzle Only
              </button>
              <button
                type="button"
                onClick={onReturnMenu}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10 font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Puzzle Failed Modal */}
      {gameState === 'PUZZLE_FAILED' && (
        <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#171414] border border-red-500/40 rounded-2xl p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-red-400">PUZZLE FAILED!</h2>
            <p className="text-sm text-stone-300 mt-2">
              You reached{' '}
              <span className="font-mono-nums font-bold text-amber-300">
                {score.toLocaleString()}
              </span>{' '}
              / <span className="font-mono-nums">{level.puzzleTargetScore.toLocaleString()}</span> pts.
            </p>
            <p className="text-xs text-emerald-300/90 mt-1">
              Your temple run is saved — retry the puzzle without replaying the run!
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              {boosters.extraMoves > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onConsumeBooster('extraMoves')) {
                      soundManager.playPowerUp();
                      setMovesLeft(5);
                      movesRef.current = 5;
                      onTogglePause();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Use +5 Moves Booster ({boosters.extraMoves} left)
                </button>
              ) : coins >= 350 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onBuyExtraMoves()) {
                      soundManager.playPowerUp();
                      setMovesLeft(5);
                      movesRef.current = 5;
                      onTogglePause();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Continue (+5 Moves for 350 Coins)
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  resetPuzzleBoard();
                  onRetryPuzzle();
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Retry Puzzle
              </button>

              <button
                type="button"
                onClick={onReturnMenu}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10 font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
