import { useCallback, useEffect, useMemo, useState } from 'react';
import { soundManager } from './audio/soundManager';
import {
  ACHIEVEMENTS,
  BOOSTER_ITEMS,
  CHARACTERS,
  COMPANION_PETS,
  DAILY_BOUNTIES,
  SANCTUARY_MONUMENTS,
  TRAIL_COSMETICS,
  WORLDS,
  getLevelById,
} from './game/config';
import {
  GameState,
  LevelCompletionSummary,
  LevelConfig,
  MenuModal,
  PuzzleBoosterKind,
  RunSessionResult,
  RunnerHudSnapshot,
  SaveData,
  UpgradeKey,
  WorldId,
} from './game/types';
import { PuzzleScreen } from './puzzle/PuzzleScreen';
import { RunnerViewport } from './runner/RunnerViewport';
import {
  computePlayerStats,
  evaluateAchievements,
  getMonumentUpgradeCost,
  getUpgradeCost,
  loadSaveData,
  normalizeDailyBounties,
  persistSaveData,
  resetSaveData,
} from './storage/saveSystem';
import { LevelSelectionScreen } from './ui/LevelSelectionScreen';
import { MainMenuOverlay } from './ui/MainMenuOverlay';
import { MenuModals } from './ui/MenuModals';
import { RunnerHudOverlay } from './ui/RunnerHudOverlay';

const INITIAL_HUD: RunnerHudSnapshot = {
  distanceCovered: 0,
  distanceTotal: 620,
  score: 0,
  coinsCollected: 0,
  totalCoinsInLevel: 0,
  health: 1,
  maxHealth: 1,
  streakCount: 0,
  streakMultiplier: 1,
  monsterProximity: 0,
  activePowerUps: {},
  bannerText: null,
  hitFlash: 0,
  shieldFlash: 0,
};

export default function App() {
  const [save, setSave] = useState<SaveData>(() => evaluateAchievements(loadSaveData()));
  const [gameState, setGameState] = useState<GameState>('MAIN_MENU');
  const [activeModal, setActiveModal] = useState<MenuModal>(null);
  const [activeLevel, setActiveLevel] = useState<LevelConfig>(() =>
    getLevelById(Math.min(50, loadSaveData().unlockedLevel))
  );
  const [runNonce, setRunNonce] = useState(1);
  const [reviveNonce, setReviveNonce] = useState(0);
  const [hud, setHud] = useState<RunnerHudSnapshot>(INITIAL_HUD);
  const [lastRunResult, setLastRunResult] = useState<RunSessionResult | null>(null);
  const [completionSummary, setCompletionSummary] = useState<LevelCompletionSummary | null>(null);

  const stats = useMemo(() => computePlayerStats(save), [save]);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const updated = evaluateAchievements(updater(prev));
      persistSaveData(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    soundManager.setSettings(save.settings.soundEnabled, save.settings.musicEnabled);
  }, [save.settings.soundEnabled, save.settings.musicEnabled]);

  useEffect(() => {
    if (gameState === 'RUNNING') {
      soundManager.setMusicMode('runner');
    } else if (gameState === 'PUZZLE') {
      soundManager.setMusicMode('puzzle');
    } else if (gameState === 'TREASURE_CHAMBER' || gameState === 'CHEST_OPENING') {
      soundManager.setMusicMode('treasure');
    } else if (gameState === 'MAIN_MENU' || gameState === 'LEVEL_SELECTION') {
      soundManager.setMusicMode('menu');
    } else {
      soundManager.setMusicMode('none');
    }
  }, [gameState]);

  const startLevelRun = useCallback((level: LevelConfig) => {
    setActiveModal(null);
    setActiveLevel(level);
    setLastRunResult(null);
    setCompletionSummary(null);
    setRunNonce((n) => n + 1);
    setGameState('RUNNING');
  }, []);

  const handlePlayContinue = useCallback(() => {
    const target = getLevelById(Math.min(50, save.unlockedLevel));
    startLevelRun(target);
  }, [save.unlockedLevel, startLevelRun]);

  const handleReachTreasureChamber = useCallback(
    (result: RunSessionResult) => {
      setLastRunResult(result);
      updateSave((prev) => {
        const norm = normalizeDailyBounties(prev);
        return {
          ...norm,
          coins: norm.coins + result.coinsCollected,
          totalCoinsCollected: norm.totalCoinsCollected + result.coinsCollected,
          totalNearMisses: (norm.totalNearMisses ?? 0) + result.nearMissCount,
          dailyBounties: {
            ...norm.dailyBounties,
            dodgesToday: norm.dailyBounties.dodgesToday + result.nearMissCount,
            coinsToday: norm.dailyBounties.coinsToday + result.coinsCollected,
          },
        };
      });
      setGameState('TREASURE_CHAMBER');
    },
    [updateSave]
  );

  const handleRunnerGameOver = useCallback(
    (result: RunSessionResult) => {
      setLastRunResult(result);
      const salvagedCoins = Math.floor(result.coinsCollected * 0.5);
      updateSave((prev) => {
        const norm = normalizeDailyBounties(prev);
        return {
          ...norm,
          coins: norm.coins + salvagedCoins,
          totalCoinsCollected: norm.totalCoinsCollected + salvagedCoins,
          totalNearMisses: (norm.totalNearMisses ?? 0) + result.nearMissCount,
          dailyBounties: {
            ...norm.dailyBounties,
            dodgesToday: norm.dailyBounties.dodgesToday + result.nearMissCount,
            coinsToday: norm.dailyBounties.coinsToday + salvagedCoins,
          },
        };
      });
      setGameState('GAME_OVER');
    },
    [updateSave]
  );

  const handleUseRevive = useCallback(() => {
    if (save.boosters.revive <= 0) return;
    updateSave((prev) => ({
      ...prev,
      boosters: { ...prev.boosters, revive: Math.max(0, prev.boosters.revive - 1) },
    }));
    setReviveNonce((n) => n + 1);
    setGameState('RUNNING');
  }, [save.boosters.revive, updateSave]);

  const handleBuyAndUseRevive = useCallback(() => {
    if (save.diamonds < 10) return;
    updateSave((prev) => ({
      ...prev,
      diamonds: prev.diamonds - 10,
    }));
    setReviveNonce((n) => n + 1);
    setGameState('RUNNING');
  }, [save.diamonds, updateSave]);

  const handleToggleRunningPause = useCallback(() => {
    setGameState((curr) =>
      curr === 'RUNNING' ? 'RUNNING_PAUSED' : curr === 'RUNNING_PAUSED' ? 'RUNNING' : curr
    );
  }, []);

  const handleSpendCoins = useCallback(
    (amount: number): boolean => {
      if (save.coins < amount) return false;
      updateSave((prev) => ({ ...prev, coins: Math.max(0, prev.coins - amount) }));
      return true;
    },
    [save.coins, updateSave]
  );

  const handleConsumeBooster = useCallback(
    (kind: PuzzleBoosterKind): boolean => {
      if ((save.boosters[kind] ?? 0) <= 0) return false;
      updateSave((prev) => ({
        ...prev,
        boosters: { ...prev.boosters, [kind]: Math.max(0, (prev.boosters[kind] ?? 0) - 1) },
      }));
      return true;
    },
    [save.boosters, updateSave]
  );

  const handleBuyExtraMovesInPuzzle = useCallback((): boolean => {
    return handleSpendCoins(350);
  }, [handleSpendCoins]);

  const handleRecordMatches = useCallback(
    (count: number) => {
      updateSave((prev) => {
        const norm = normalizeDailyBounties(prev);
        return {
          ...norm,
          totalMatchesMade: norm.totalMatchesMade + count,
          dailyBounties: {
            ...norm.dailyBounties,
            matchesToday: norm.dailyBounties.matchesToday + count,
          },
        };
      });
    },
    [updateSave]
  );

  const handlePuzzleVictory = useCallback(
    (puzzleScore: number, movesLeft: number) => {
      const runRes: RunSessionResult = lastRunResult ?? {
        levelId: activeLevel.id,
        runScore: 500,
        coinsCollected: 0,
        totalCoinsInLevel: 10,
        allCoinsCollected: false,
        timeSec: 35,
        damageTaken: 0,
        nearMissCount: 0,
      };

      let stars = 1;
      if (movesLeft >= 2 || runRes.nearMissCount >= 10) stars = 2;
      if (movesLeft >= 4 || puzzleScore >= activeLevel.puzzleTargetScore * 1.35) stars = 3;

      const prevRec = save.completedLevels[activeLevel.id];
      const isFirstClear = !prevRec;
      const prevStars = prevRec?.stars ?? 0;
      const newStarsEarned = Math.max(0, stars - prevStars);

      // Zero infinite farming: full chest coins, diamonds, Sanctuary tributes, and bonus boosters
      // are awarded ONLY on First-Time Clear. Replays only reward genuine new Star upgrades!
      const allCoinsBonus = isFirstClear && runRes.allCoinsCollected ? 300 : 0;
      const starBonusCoins = isFirstClear
        ? stars === 3
          ? 200
          : stars === 2
          ? 100
          : 0
        : newStarsEarned * 100;
      const sanctuaryTributeCoins = isFirstClear ? stats.sanctuaryTributeCoins : 0;
      const sanctuaryTributeDiamonds = isFirstClear ? stats.sanctuaryTributeDiamonds : 0;

      const earnedCoins = isFirstClear
        ? activeLevel.rewardCoins + starBonusCoins + allCoinsBonus + sanctuaryTributeCoins
        : starBonusCoins;

      const starUpgradeDiamonds =
        (stars === 3 && prevStars < 3 ? 6 : 0) + (!isFirstClear ? newStarsEarned * 2 : 0);
      const earnedDiamonds = isFirstClear
        ? activeLevel.rewardDiamonds + starUpgradeDiamonds + sanctuaryTributeDiamonds
        : starUpgradeDiamonds;

      const boosterPool: PuzzleBoosterKind[] = ['hammer', 'shuffle', 'extraMoves', 'bomb'];
      const bonusBooster: PuzzleBoosterKind | null =
        isFirstClear && stars >= 2 ? boosterPool[activeLevel.id % boosterPool.length] : null;

      const alreadyHasArtifact = save.artifacts.includes(activeLevel.artifactName);
      const artifactAwarded = isFirstClear && !alreadyHasArtifact ? activeLevel.artifactName : null;
      const unlockedNextLevel = activeLevel.id >= save.unlockedLevel && activeLevel.id < 50;

      updateSave((prev) => {
        const existingRec = prev.completedLevels[activeLevel.id];
        const nextRec = {
          stars: Math.max(existingRec?.stars ?? 0, stars),
          bestRunScore: Math.max(existingRec?.bestRunScore ?? 0, runRes.runScore),
          bestPuzzleScore: Math.max(existingRec?.bestPuzzleScore ?? 0, puzzleScore),
          bestTimeSec: existingRec
            ? Math.min(existingRec.bestTimeSec, runRes.timeSec)
            : runRes.timeSec,
        };

        return {
          ...prev,
          unlockedLevel: Math.max(prev.unlockedLevel, Math.min(50, activeLevel.id + 1)),
          completedLevels: { ...prev.completedLevels, [activeLevel.id]: nextRec },
          coins: prev.coins + earnedCoins,
          diamonds: prev.diamonds + earnedDiamonds,
          artifacts: artifactAwarded ? [...prev.artifacts, artifactAwarded] : prev.artifacts,
          boosters: bonusBooster
            ? { ...prev.boosters, [bonusBooster]: (prev.boosters[bonusBooster] ?? 0) + 1 }
            : prev.boosters,
          totalLevelsCleared: existingRec ? prev.totalLevelsCleared : prev.totalLevelsCleared + 1,
        };
      });

      setCompletionSummary({
        level: activeLevel,
        runResult: runRes,
        puzzleScore,
        movesLeft,
        stars,
        isFirstClear,
        newStarsEarned,
        earnedCoins,
        earnedDiamonds,
        sanctuaryTributeCoins,
        sanctuaryTributeDiamonds,
        allCoinsBonus,
        artifactAwarded,
        bonusBooster,
        unlockedNextLevel,
      });

      setGameState('CHEST_OPENING');
    },
    [
      activeLevel,
      lastRunResult,
      save.artifacts,
      save.completedLevels,
      save.unlockedLevel,
      stats.sanctuaryTributeCoins,
      stats.sanctuaryTributeDiamonds,
      updateSave,
    ]
  );

  const handleChestOpenComplete = useCallback(() => {
    soundManager.playRewardCollect();
    setGameState('LEVEL_COMPLETED');
  }, []);

  // --- Economy, Store, Pets, Trails, Sanctuary & Early World Unlocks ---
  const handleSelectCharacter = useCallback(
    (id: string) => {
      updateSave((prev) => ({ ...prev, selectedCharacterId: id }));
    },
    [updateSave]
  );

  const handleUnlockCharacter = useCallback(
    (id: string) => {
      const char = CHARACTERS.find((c) => c.id === id);
      if (!char) return;
      if (save.unlockedCharacters.includes(id)) return;
      if (save.coins < char.priceCoins || save.diamonds < char.priceDiamonds) return;
      soundManager.playRewardCollect();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins - char.priceCoins,
        diamonds: prev.diamonds - char.priceDiamonds,
        unlockedCharacters: [...prev.unlockedCharacters, id],
        selectedCharacterId: id,
      }));
    },
    [save.coins, save.diamonds, save.unlockedCharacters, updateSave]
  );

  const handleBuyUpgrade = useCallback(
    (key: UpgradeKey) => {
      const currLvl = save.upgrades[key] ?? 0;
      const cost = getUpgradeCost(key, currLvl);
      if (save.coins < cost) return;
      soundManager.playRewardCollect();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins - cost,
        upgrades: { ...prev.upgrades, [key]: currLvl + 1 },
      }));
    },
    [save.coins, save.upgrades, updateSave]
  );

  const handleBuyBooster = useCallback(
    (key: PuzzleBoosterKind | 'revive') => {
      const item = BOOSTER_ITEMS.find((b) => b.key === key);
      if (!item) return;
      if (save.coins < item.priceCoins || save.diamonds < item.priceDiamonds) return;
      soundManager.playRewardCollect();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins - item.priceCoins,
        diamonds: prev.diamonds - item.priceDiamonds,
        boosters: { ...prev.boosters, [key]: (prev.boosters[key] ?? 0) + 1 },
      }));
    },
    [save.coins, save.diamonds, updateSave]
  );

  const handleBuyOrEquipTrail = useCallback(
    (trailId: string) => {
      const trail = TRAIL_COSMETICS.find((t) => t.id === trailId);
      if (!trail) return;
      const owned = save.unlockedTrails.includes(trailId);
      if (owned) {
        soundManager.playClick();
        updateSave((prev) => ({ ...prev, selectedTrailId: trailId }));
        return;
      }
      if (save.coins < trail.priceCoins || save.diamonds < trail.priceDiamonds) return;
      soundManager.playChestOpen();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins - trail.priceCoins,
        diamonds: prev.diamonds - trail.priceDiamonds,
        unlockedTrails: [...prev.unlockedTrails, trailId],
        selectedTrailId: trailId,
      }));
    },
    [save.coins, save.diamonds, save.unlockedTrails, updateSave]
  );

  const handleBuyOrEquipPet = useCallback(
    (petId: string) => {
      const pet = COMPANION_PETS.find((p) => p.id === petId);
      if (!pet) return;
      const owned = save.unlockedPets.includes(petId);
      if (owned) {
        soundManager.playClick();
        updateSave((prev) => ({
          ...prev,
          selectedPetId: prev.selectedPetId === petId ? null : petId,
        }));
        return;
      }
      if (save.coins < pet.priceCoins || save.diamonds < pet.priceDiamonds) return;
      soundManager.playChestOpen();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins - pet.priceCoins,
        diamonds: prev.diamonds - pet.priceDiamonds,
        unlockedPets: [...prev.unlockedPets, petId],
        selectedPetId: petId,
      }));
    },
    [save.coins, save.diamonds, save.unlockedPets, updateSave]
  );

  const handleUpgradeMonument = useCallback(
    (monumentId: string) => {
      const m = SANCTUARY_MONUMENTS.find((x) => x.id === monumentId);
      if (!m) return;
      const tier = save.monuments[monumentId] ?? 0;
      if (tier >= m.maxTier) return;
      const cost = getMonumentUpgradeCost(monumentId, tier);
      if (save.coins < cost.coins || save.diamonds < cost.diamonds) return;
      soundManager.playChestOpen();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins - cost.coins,
        diamonds: prev.diamonds - cost.diamonds,
        monuments: { ...prev.monuments, [monumentId]: tier + 1 },
      }));
    },
    [save.coins, save.diamonds, save.monuments, updateSave]
  );

  const handleUnlockWorldWithDiamonds = useCallback(
    (worldId: WorldId) => {
      const w = WORLDS.find((x) => x.id === worldId);
      if (!w || w.earlyUnlockDiamonds <= 0) return;
      if (save.unlockedWorlds.includes(worldId)) return;
      if (save.diamonds < w.earlyUnlockDiamonds) return;
      soundManager.playChestOpen();
      updateSave((prev) => ({
        ...prev,
        diamonds: prev.diamonds - w.earlyUnlockDiamonds,
        unlockedWorlds: [...prev.unlockedWorlds, worldId],
      }));
    },
    [save.diamonds, save.unlockedWorlds, updateSave]
  );

  const handleClaimDailyBounty = useCallback(
    (bountyId: string) => {
      const bounty = DAILY_BOUNTIES.find((b) => b.id === bountyId);
      if (!bounty) return;
      const norm = normalizeDailyBounties(save);
      if (norm.dailyBounties.claimedIds.includes(bountyId)) return;
      if ((norm.dailyBounties[bounty.metric] ?? 0) < bounty.target) return;

      soundManager.playChestOpen();
      updateSave((prev) => {
        const cur = normalizeDailyBounties(prev);
        if (cur.dailyBounties.claimedIds.includes(bountyId)) return cur;
        return {
          ...cur,
          coins: cur.coins + bounty.rewardCoins,
          diamonds: cur.diamonds + bounty.rewardDiamonds,
          boosters: bounty.rewardBooster
            ? {
                ...cur.boosters,
                [bounty.rewardBooster]: (cur.boosters[bounty.rewardBooster] ?? 0) + 1,
              }
            : cur.boosters,
          dailyBounties: {
            ...cur.dailyBounties,
            claimedIds: [...cur.dailyBounties.claimedIds, bountyId],
          },
        };
      });
    },
    [save, updateSave]
  );

  const handleClaimAchievement = useCallback(
    (id: string) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      if (!ach) return;
      const st = save.achievements[id];
      if (!st?.unlocked || st.claimed) return;
      soundManager.playRewardCollect();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins + ach.rewardCoins,
        diamonds: prev.diamonds + ach.rewardDiamonds,
        achievements: {
          ...prev.achievements,
          [id]: { unlocked: true, claimed: true },
        },
      }));
    },
    [save.achievements, updateSave]
  );

  const handleToggleSound = useCallback(() => {
    updateSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, soundEnabled: !prev.settings.soundEnabled },
    }));
  }, [updateSave]);

  const handleToggleMusic = useCallback(() => {
    updateSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, musicEnabled: !prev.settings.musicEnabled },
    }));
  }, [updateSave]);

  const handleResetSave = useCallback(() => {
    const fresh = evaluateAchievements(resetSaveData());
    setSave(fresh);
    setActiveLevel(getLevelById(1));
    setRunNonce((n) => n + 1);
    setGameState('MAIN_MENU');
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b130f]">
      {/* Persistent Isolated 3D WebGL World */}
      <RunnerViewport
        gameState={gameState}
        level={activeLevel}
        characterId={save.selectedCharacterId}
        trailId={save.selectedTrailId}
        petId={save.selectedPetId}
        stats={stats}
        runNonce={runNonce}
        reviveNonce={reviveNonce}
        onHudUpdate={setHud}
        onReachTreasureChamber={handleReachTreasureChamber}
        onRunnerGameOver={handleRunnerGameOver}
        onChestOpenComplete={handleChestOpenComplete}
        onTogglePause={handleToggleRunningPause}
      />

      {/* STAGE 1: MAIN MENU */}
      {gameState === 'MAIN_MENU' && (
        <MainMenuOverlay
          save={save}
          onPlayContinue={handlePlayContinue}
          onOpenLevels={() => setGameState('LEVEL_SELECTION')}
          onOpenModal={(m) => setActiveModal(m)}
          onToggleSound={handleToggleSound}
          onToggleMusic={handleToggleMusic}
        />
      )}

      {/* STAGE 2: LEVEL SELECTION MAP */}
      {gameState === 'LEVEL_SELECTION' && (
        <LevelSelectionScreen
          save={save}
          onSelectLevel={startLevelRun}
          onUnlockWorldWithDiamonds={handleUnlockWorldWithDiamonds}
          onBack={() => setGameState('MAIN_MENU')}
        />
      )}

      {/* STAGES 3, 4, 6, 7: RUNNING HUD, TREASURE CHAMBER, CHEST OPENING & LEVEL COMPLETE */}
      <RunnerHudOverlay
        gameState={gameState}
        level={activeLevel}
        hud={hud}
        reviveCount={save.boosters.revive}
        diamonds={save.diamonds}
        lastRunResult={lastRunResult}
        completionSummary={completionSummary}
        onTogglePause={handleToggleRunningPause}
        onRestartRun={() => startLevelRun(activeLevel)}
        onUseRevive={handleUseRevive}
        onBuyAndUseRevive={handleBuyAndUseRevive}
        onEnterPuzzle={() => setGameState('PUZZLE')}
        onNextLevel={() => startLevelRun(getLevelById(Math.min(50, activeLevel.id + 1)))}
        onReplayLevel={() => startLevelRun(activeLevel)}
        onReturnMenu={() => {
          soundManager.playClick();
          setGameState('MAIN_MENU');
        }}
      />

      {/* STAGE 5: FULL-SCREEN 8x8 MATCH-3 GEM PUZZLE (with Paid Coin Hints!) */}
      {(gameState === 'PUZZLE' || gameState === 'PUZZLE_PAUSED' || gameState === 'PUZZLE_FAILED') && (
        <PuzzleScreen
          gameState={gameState}
          level={activeLevel}
          puzzleScoreMultiplier={stats.puzzleScoreMultiplier}
          boosters={save.boosters}
          coins={save.coins}
          diamonds={save.diamonds}
          hintSingleCost={stats.hintSingleCost}
          hintAllTurnCost={stats.hintAllTurnCost}
          hintOracleCost={stats.hintOracleCost}
          onSpendCoins={handleSpendCoins}
          onConsumeBooster={handleConsumeBooster}
          onBuyExtraMoves={handleBuyExtraMovesInPuzzle}
          onRecordMatches={handleRecordMatches}
          onPuzzleVictory={handlePuzzleVictory}
          onPuzzleFailed={() => setGameState('PUZZLE_FAILED')}
          onRetryPuzzle={() => setGameState('PUZZLE')}
          onTogglePause={() =>
            setGameState((curr) => (curr === 'PUZZLE' ? 'PUZZLE_PAUSED' : 'PUZZLE'))
          }
          onReturnMenu={() => {
            soundManager.playClick();
            setGameState('MAIN_MENU');
          }}
        />
      )}

      {/* SANCTUARY / STORE (UPGRADES, 3D PETS, 3D TRAILS, BOOSTERS) / CHARACTERS / DAILY / TROPHIES / SETTINGS */}
      <MenuModals
        modal={activeModal}
        save={save}
        onClose={() => setActiveModal(null)}
        onSelectCharacter={handleSelectCharacter}
        onUnlockCharacter={handleUnlockCharacter}
        onBuyUpgrade={handleBuyUpgrade}
        onBuyBooster={handleBuyBooster}
        onBuyOrEquipTrail={handleBuyOrEquipTrail}
        onBuyOrEquipPet={handleBuyOrEquipPet}
        onUpgradeMonument={handleUpgradeMonument}
        onClaimDailyBounty={handleClaimDailyBounty}
        onClaimAchievement={handleClaimAchievement}
        onToggleSound={handleToggleSound}
        onToggleMusic={handleToggleMusic}
        onResetSave={handleResetSave}
      />
    </div>
  );
}
