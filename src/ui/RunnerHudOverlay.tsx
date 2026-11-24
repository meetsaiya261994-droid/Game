import React from 'react';
import {
  ArrowRight,
  Coins,
  Flame,
  Gem,
  Heart,
  Home,
  Lock,
  Magnet,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { getWorldById } from '../game/config';
import {
  GameState,
  LevelCompletionSummary,
  LevelConfig,
  PowerUpKind,
  RunSessionResult,
  RunnerHudSnapshot,
} from '../game/types';

interface RunnerHudOverlayProps {
  gameState: GameState;
  level: LevelConfig;
  hud: RunnerHudSnapshot;
  reviveCount: number;
  diamonds: number;
  lastRunResult: RunSessionResult | null;
  completionSummary: LevelCompletionSummary | null;
  onTogglePause: () => void;
  onRestartRun: () => void;
  onUseRevive: () => void;
  onBuyAndUseRevive: () => void;
  onEnterPuzzle: () => void;
  onNextLevel: () => void;
  onReplayLevel: () => void;
  onReturnMenu: () => void;
}

export const RunnerHudOverlay: React.FC<RunnerHudOverlayProps> = ({
  gameState,
  level,
  hud,
  reviveCount,
  diamonds,
  lastRunResult,
  completionSummary,
  onTogglePause,
  onRestartRun,
  onUseRevive,
  onBuyAndUseRevive,
  onEnterPuzzle,
  onNextLevel,
  onReplayLevel,
  onReturnMenu,
}) => {
  const world = getWorldById(level.worldId);
  const distRemaining = Math.max(0, Math.round(hud.distanceTotal - hud.distanceCovered));
  const distPct = Math.min(
    100,
    Math.round((hud.distanceCovered / Math.max(1, hud.distanceTotal)) * 100)
  );

  const powerLabels: Record<
    PowerUpKind,
    { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    MAGNET: { label: 'Magnet', color: 'text-rose-300', icon: Magnet },
    SHIELD: { label: 'Shield', color: 'text-sky-300', icon: Shield },
    SPEED_BOOST: { label: 'Speed', color: 'text-amber-300', icon: Zap },
    DOUBLE_COINS: { label: '2× Coins', color: 'text-emerald-300', icon: Coins },
  };

  return (
    <>
      {gameState === 'RUNNING' && hud.hitFlash > 0 && (
        <div
          key={`hit-${hud.hitFlash}`}
          className="fixed inset-0 z-10 pointer-events-none bg-red-600/45 animate-screen-flash"
        />
      )}
      {gameState === 'RUNNING' && hud.shieldFlash > 0 && (
        <div
          key={`shield-${hud.shieldFlash}`}
          className="fixed inset-0 z-10 pointer-events-none bg-sky-400/35 animate-screen-flash"
        />
      )}

      {/* --- RUNNING HUD (Strictly 1 Life + Live Dodge Streak Multiplier!) --- */}
      {(gameState === 'RUNNING' || gameState === 'RUNNING_PAUSED') && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            {/* Top-Left: Strictly 1 Life + Dodge Streak + Active Power-Ups */}
            <div className="flex flex-col gap-2">
              <div className="bg-[#0e1914]/92 border border-rose-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Heart
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    hud.health > 0 ? 'text-rose-500 fill-rose-500' : 'text-stone-700'
                  }`}
                />
                <span className="font-mono-nums text-xs font-bold text-rose-200">
                  1 LIFE
                </span>
              </div>

              {hud.streakCount > 0 && (
                <div className="bg-[#1b140d]/92 border border-amber-400/50 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs font-mono-nums">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-200 font-bold">
                    {hud.streakCount} Dodge
                  </span>
                  <span className="text-emerald-300 font-bold">
                    ×{hud.streakMultiplier}
                  </span>
                </div>
              )}

              {(Object.entries(hud.activePowerUps) as [PowerUpKind, number][]).map(([kind, rem]) => {
                const info = powerLabels[kind];
                const Icon = info.icon;
                return (
                  <div
                    key={kind}
                    className="bg-[#0e1914]/92 border border-amber-500/35 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs font-mono-nums"
                  >
                    <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                    <span className={info.color}>{info.label}</span>
                    <span className="text-stone-200">{rem.toFixed(1)}s</span>
                  </div>
                );
              })}

              {hud.monsterProximity > 0.15 && (
                <div className="bg-red-950/92 border border-red-500/50 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-red-200">
                  Guardian Right Behind!
                </div>
              )}
            </div>

            {/* Top-Center: Finite Level Progress to Treasure Vault */}
            <div className="flex-1 max-w-xs sm:max-w-sm bg-[#0e1914]/92 border border-amber-500/30 rounded-xl px-3.5 py-2">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-display font-bold text-amber-300 truncate">
                  L{level.levelNumber} · {level.name}
                </span>
                <span className="font-mono-nums text-stone-200 shrink-0 ml-2">
                  {distRemaining}m left
                </span>
              </div>
              <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-300 origin-left transition-transform duration-150"
                  style={{ transform: `scaleX(${distPct / 100})` }}
                />
              </div>
            </div>

            {/* Top-Right: Score, Coins & Pause */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="bg-[#0e1914]/92 border border-white/15 rounded-xl px-3 py-1.5 text-right">
                <div className="font-mono-nums text-sm sm:text-base font-bold text-stone-100 leading-tight">
                  {hud.score.toLocaleString()}
                </div>
                <div className="flex items-center justify-end gap-1 text-xs font-mono-nums text-amber-300">
                  <Coins className="w-3.5 h-3.5" />
                  {hud.coinsCollected}
                </div>
              </div>

              <button
                type="button"
                onClick={onTogglePause}
                aria-label="Pause Game"
                className="w-11 h-11 rounded-xl bg-[#0e1914]/92 border border-white/15 hover:border-amber-400/60 text-stone-100 flex items-center justify-center cursor-pointer"
              >
                <Pause className="w-5 h-5" />
              </button>
            </div>
          </div>

          {hud.bannerText && (
            <div className="self-center mb-auto mt-6 bg-[#0e1914]/90 border border-amber-400/45 rounded-xl px-5 py-2">
              <span className="font-display text-sm sm:text-base font-bold text-amber-300 tracking-wide">
                {hud.bannerText}
              </span>
            </div>
          )}

          <div className="self-center text-[11px] sm:text-xs text-stone-300/80 bg-[#0b130f]/75 px-3.5 py-1 rounded-lg">
            Swipe or A/D Switch Lane · W/Space Jump · S Slide · Chain Dodges for ×5 Multiplier!
          </div>
        </div>
      )}

      {/* --- RUNNING PAUSED MODAL --- */}
      {gameState === 'RUNNING_PAUSED' && (
        <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121e18] border border-amber-500/40 rounded-2xl p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-amber-300">Expedition Paused</h2>
            <p className="text-sm text-stone-400 mt-1">
              {distRemaining}m remaining to the {world.chestName} (1 Life)
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-stone-950" /> Resume Run
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onRestartRun();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restart Level
              </button>
              <button
                type="button"
                onClick={onReturnMenu}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10 font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RUNNING GAME OVER MODAL (Instant 1-Life Wipeout + Ankh Revive) --- */}
      {gameState === 'GAME_OVER' && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1a1313] border border-red-500/45 rounded-2xl p-6 text-center shadow-2xl">
            <div className="text-xs font-bold text-rose-400 tracking-widest uppercase">
              One-Life Challenge
            </div>
            <h2 className="font-display text-2xl font-bold text-red-400 mt-0.5">
              WIPED OUT!
            </h2>
            <p className="text-sm text-stone-300 mt-1">
              You survived <span className="font-mono-nums font-bold text-amber-300">{distPct}%</span> of the temple gauntlet!
            </p>
            {lastRunResult && (
              <>
                <div className="mt-4 py-3 px-4 rounded-xl bg-black/40 border border-white/10 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-stone-400">Score</div>
                    <div className="font-mono-nums font-bold text-sm text-stone-100">
                      {lastRunResult.runScore.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-stone-400">Salvaged</div>
                    <div className="font-mono-nums font-bold text-sm text-amber-300">
                      +{Math.floor(lastRunResult.coinsCollected * 0.5)}
                    </div>
                  </div>
                  <div>
                    <div className="text-stone-400">Dodges</div>
                    <div className="font-mono-nums font-bold text-sm text-emerald-300">
                      {lastRunResult.nearMissCount}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 mt-2">
                  Wipeout penalty: only 50% of loose track coins salvaged. Survive to bank 100% &amp; unlock the chest!
                </p>
              </>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              {reviveCount > 0 ? (
                <button
                  type="button"
                  onClick={onUseRevive}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Use Ankh Revive ({reviveCount} owned)
                </button>
              ) : diamonds >= 10 ? (
                <button
                  type="button"
                  onClick={onBuyAndUseRevive}
                  className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Gem className="w-4 h-4" /> Revive Here (10 Diamonds)
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onRestartRun();
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Retry Run
              </button>

              <button
                type="button"
                onClick={onReturnMenu}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10 font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STAGE 4: TREASURE CHAMBER --- */}
      {gameState === 'TREASURE_CHAMBER' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
          <div className="self-center bg-[#0f1a15]/92 border border-amber-400/40 rounded-xl px-5 py-2 text-center">
            <span className="text-xs text-emerald-300 font-semibold">
              FLAWLESS 1-LIFE RUN COMPLETE · {lastRunResult?.coinsCollected ?? 0} COINS BANKED · {lastRunResult?.nearMissCount ?? 0} DODGES
            </span>
          </div>

          <div className="self-center w-full max-w-lg bg-[#111c17]/95 border-2 border-amber-500/50 rounded-2xl p-5 sm:p-6 text-center shadow-2xl pointer-events-auto">
            <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-bold tracking-widest uppercase">
              <Lock className="w-4 h-4" />
              {world.chestName}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-amber-200 mt-1">
              THE TREASURE IS LOCKED!
            </h2>
            <p className="text-sm text-stone-300 mt-1.5">
              Crack the magical gem lock to open your chest. You can spend Coins inside the puzzle to reveal ALL valid hints!
            </p>
            <div className="mt-3 text-xs text-stone-400 flex items-center justify-center gap-4">
              <span>
                Target:{' '}
                <strong className="text-amber-300 font-mono-nums">
                  {level.puzzleTargetScore.toLocaleString()} pts
                </strong>
              </span>
              <span>·</span>
              <span>
                Moves: <strong className="text-stone-100 font-mono-nums">{level.puzzleMoves}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onEnterPuzzle();
              }}
              className="mt-5 w-full sm:w-auto px-9 py-3.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-display font-extrabold text-base tracking-wider shadow-[0_6px_24px_rgba(245,158,11,0.45)] cursor-pointer transition-transform active:scale-95"
            >
              UNLOCK CHEST
            </button>
          </div>
        </div>
      )}

      {/* --- STAGE 6: CINEMATIC 3D CHEST OPENING --- */}
      {gameState === 'CHEST_OPENING' && (
        <div className="fixed inset-x-0 bottom-8 z-20 pointer-events-none flex justify-center px-4">
          <div className="bg-[#121e17]/90 border border-amber-400/50 rounded-2xl px-7 py-3.5 text-center shadow-2xl">
            <div className="font-display text-xl sm:text-2xl font-bold text-amber-300 tracking-wider">
              TREASURE UNLOCKED!
            </div>
            <div className="text-xs sm:text-sm text-stone-300 mt-0.5">
              Opening the {world.chestName}...
            </div>
          </div>
        </div>
      )}

      {/* --- STAGE 7: LEVEL COMPLETED & REWARDS SUMMARY --- */}
      {gameState === 'LEVEL_COMPLETED' && completionSummary && (
        <div className="fixed inset-0 z-30 bg-black/72 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#111c17] border-2 border-amber-400/55 rounded-2xl p-6 text-center shadow-2xl my-auto">
            <div className="text-xs font-semibold text-emerald-300 tracking-wider uppercase">
              Level {completionSummary.level.levelNumber} · {completionSummary.level.name}
            </div>
            <h2 className="font-display text-3xl font-extrabold text-amber-300 mt-1">
              LEVEL COMPLETED!
            </h2>

            <div className="flex items-center justify-center gap-3 my-4">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  style={{ animationDelay: `${(s - 1) * 140}ms` }}
                  className={`w-10 h-10 animate-star-reveal ${
                    completionSummary.stars >= s
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.65)]'
                      : 'text-stone-700'
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-left bg-black/35 border border-white/10 rounded-xl p-3.5 text-xs">
              <div>
                <div className="text-stone-400">Running Score</div>
                <div className="font-mono-nums font-bold text-sm text-stone-100">
                  {completionSummary.runResult.runScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-stone-400">Puzzle Score</div>
                <div className="font-mono-nums font-bold text-sm text-stone-100">
                  {completionSummary.puzzleScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-stone-400">Clean Dodges</div>
                <div className="font-mono-nums font-bold text-sm text-emerald-300">
                  {completionSummary.runResult.nearMissCount} obstacles
                </div>
              </div>
              <div>
                <div className="text-stone-400">Run Time</div>
                <div className="font-mono-nums font-bold text-sm text-stone-100">
                  {completionSummary.runResult.timeSec}s
                </div>
              </div>
            </div>

            <div className="mt-3.5 bg-amber-950/35 border border-amber-500/35 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-2">
                {completionSummary.isFirstClear
                  ? 'First-Clear Chest & Sanctuary Loot'
                  : completionSummary.newStarsEarned > 0
                  ? `Replay Star Upgrade (+${completionSummary.newStarsEarned} New Star Bonus)`
                  : 'Chest Already Looted (Replay Clear)'}
              </div>

              {completionSummary.earnedCoins > 0 || completionSummary.earnedDiamonds > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-mono-nums font-bold">
                  <span className="flex items-center gap-1.5 text-amber-200">
                    <Coins className="w-4 h-4 text-amber-400" />
                    +{completionSummary.earnedCoins.toLocaleString()} Coins
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-200">
                    <Gem className="w-4 h-4 text-sky-400" />
                    +{completionSummary.earnedDiamonds} Diamonds
                  </span>
                </div>
              ) : (
                <div className="text-xs text-stone-300">
                  Track coins from this run were banked! Push into newer levels or beat your star record for fresh chest treasure.
                </div>
              )}

              {(completionSummary.sanctuaryTributeCoins > 0 ||
                completionSummary.sanctuaryTributeDiamonds > 0) && (
                <div className="mt-1.5 text-xs text-amber-200/90">
                  Includes Sanctuary Tribute: +{completionSummary.sanctuaryTributeCoins} Coins
                  {completionSummary.sanctuaryTributeDiamonds > 0
                    ? ` · +${completionSummary.sanctuaryTributeDiamonds} Diamonds`
                    : ''}
                </div>
              )}
              {completionSummary.artifactAwarded && (
                <div className="mt-1.5 text-xs text-emerald-300 font-medium">
                  Ancient Artifact Unlocked: {completionSummary.level.artifactIcon}{' '}
                  {completionSummary.artifactAwarded}
                </div>
              )}
              {completionSummary.bonusBooster && (
                <div className="mt-1 text-xs text-amber-200">
                  Bonus Chest Booster: +1 {completionSummary.bonusBooster}
                </div>
              )}
              {completionSummary.allCoinsBonus > 0 && (
                <div className="mt-1 text-xs text-yellow-300">
                  All-Coins Perfect Bonus: +{completionSummary.allCoinsBonus} Coins!
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {completionSummary.level.id < 50 && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onNextLevel();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-display font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  NEXT LEVEL <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onReplayLevel();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Replay
                </button>
                <button
                  type="button"
                  onClick={onReturnMenu}
                  className="py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10 text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-4 h-4" /> Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
