import React, { useState } from 'react';
import { ArrowLeft, Coins, Flame, Gem, Lock, Play, Star, Unlock } from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { WORLDS, getLevelsByWorld } from '../game/config';
import { LevelConfig, SaveData, WorldId } from '../game/types';

interface LevelSelectionScreenProps {
  save: SaveData;
  onSelectLevel: (level: LevelConfig) => void;
  onUnlockWorldWithDiamonds: (worldId: WorldId) => void;
  onBack: () => void;
}

export const LevelSelectionScreen: React.FC<LevelSelectionScreenProps> = ({
  save,
  onSelectLevel,
  onUnlockWorldWithDiamonds,
  onBack,
}) => {
  const [selectedWorldId, setSelectedWorldId] = useState<WorldId>('jungle');
  const activeWorld = WORLDS.find((w) => w.id === selectedWorldId) ?? WORLDS[0];
  const worldLevels = getLevelsByWorld(activeWorld.id);

  const isWorldUnlocked = (worldId: WorldId, reqLevel: number) =>
    save.unlockedLevel >= reqLevel || save.unlockedWorlds.includes(worldId);

  const activeWorldOpen = isWorldUnlocked(activeWorld.id, activeWorld.requiredLevelToUnlock);
  const canAffordEarlyUnlock =
    !activeWorldOpen &&
    activeWorld.earlyUnlockDiamonds > 0 &&
    save.diamonds >= activeWorld.earlyUnlockDiamonds;

  const isLevelAccessible = (lvl: LevelConfig) => {
    if (lvl.id <= save.unlockedLevel) return true;
    // If world was early-unlocked with Gems, unlock level 1 of that world and any subsequent completed+1
    if (save.unlockedWorlds.includes(lvl.worldId)) {
      if (lvl.levelNumber === 1) return true;
      return Boolean(save.completedLevels[lvl.id - 1]);
    }
    return false;
  };

  return (
    <div className="fixed inset-0 z-30 bg-[#0b1410]/96 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-b border-amber-500/20 bg-[#101d17]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onBack();
            }}
            className="w-10 h-10 rounded-xl bg-stone-900 border border-white/15 hover:border-amber-400/50 text-stone-200 flex items-center justify-center cursor-pointer"
            aria-label="Back to Main Menu"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-amber-300">
              Expedition Map
            </h1>
            <p className="text-xs text-stone-400">
              1-Life Runs · Hardcore Traps · Spend Gems to Unlock New Worlds Early
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm font-mono-nums">
          <span className="flex items-center gap-1.5 text-amber-200">
            <Coins className="w-4 h-4 text-amber-400" />
            {save.coins.toLocaleString()}
          </span>
          <span className="text-stone-600" aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5 text-sky-200">
            <Gem className="w-4 h-4 text-sky-400" />
            {save.diamonds.toLocaleString()}
          </span>
        </div>
      </div>

      {/* World Selector Tabs */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 overflow-x-auto border-b border-white/10 bg-[#0d1813]">
        {WORLDS.map((w) => {
          const isOpen = isWorldUnlocked(w.id, w.requiredLevelToUnlock);
          const isSelected = w.id === selectedWorldId;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setSelectedWorldId(w.id);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500 text-stone-950 border-amber-300'
                  : 'bg-[#13221b] text-stone-300 border-white/10 hover:border-amber-500/40'
              }`}
            >
              {!isOpen && <Lock className="w-3.5 h-3.5 opacity-75" />}
              <span>
                World {w.index}: {w.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* World Banner + 10-Level Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-amber-400 flex items-center gap-2">
                <span>World {activeWorld.index} · {activeWorld.chestName}</span>
                <span className="text-rose-400 inline-flex items-center gap-1 font-bold">
                  <Flame className="w-3.5 h-3.5" /> 1 LIFE MODE
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-100">
                {activeWorld.name}
              </h2>
              <p className="text-sm text-stone-400 mt-0.5">{activeWorld.subtitle}</p>
            </div>

            {!activeWorldOpen && activeWorld.earlyUnlockDiamonds > 0 && (
              <button
                type="button"
                disabled={!canAffordEarlyUnlock}
                onClick={() => onUnlockWorldWithDiamonds(activeWorld.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                  canAffordEarlyUnlock
                    ? 'bg-sky-500 hover:bg-sky-400 text-stone-950 cursor-pointer shadow-lg'
                    : 'bg-stone-900 text-stone-400 border border-white/10 cursor-not-allowed'
                }`}
              >
                <Unlock className="w-4 h-4" />
                Unlock World Early ({activeWorld.earlyUnlockDiamonds} Diamonds)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {worldLevels.map((lvl) => {
              const isUnlocked = isLevelAccessible(lvl);
              const record = save.completedLevels[lvl.id];
              const isNextTarget = lvl.id === save.unlockedLevel;

              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (!isUnlocked) return;
                    soundManager.unlock();
                    soundManager.playClick();
                    onSelectLevel(lvl);
                  }}
                  className={`text-left rounded-2xl p-4 border transition-all flex flex-col justify-between min-h-[182px] ${
                    isUnlocked
                      ? isNextTarget
                        ? 'bg-[#182c22] border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.2)] hover:scale-[1.02] cursor-pointer'
                        : 'bg-[#122019] border-white/12 hover:border-amber-400/60 hover:scale-[1.02] cursor-pointer'
                      : 'bg-stone-950/70 border-white/5 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-nums text-xs font-bold text-amber-400">
                        LVL {lvl.levelNumber}
                      </span>
                      {isUnlocked ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                (record?.stars ?? 0) >= s
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-stone-700'
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        <Lock className="w-4 h-4 text-stone-500" />
                      )}
                    </div>

                    <h3 className="font-display text-base font-bold text-stone-100 mt-1.5 leading-snug">
                      {lvl.name}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">{lvl.tagline}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <div className="text-[11px] text-stone-400 flex items-center justify-between font-mono-nums">
                      <span>{lvl.distanceMeters}m Run</span>
                      <span>{lvl.puzzleTargetScore.toLocaleString()} pts</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-rose-300 font-semibold">
                        {lvl.runningDifficulty}
                      </span>
                      {isUnlocked && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                          <Play className="w-3 h-3 fill-emerald-300" />
                          {record ? 'Replay' : 'Play'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
