import {
  ACHIEVEMENTS,
  COMPANION_PETS,
  DAILY_BOUNTIES,
  HINT_ALL_TURN_COST_COINS,
  HINT_ORACLE_PUZZLE_COST_COINS,
  HINT_SINGLE_COST_COINS,
  SANCTUARY_MONUMENTS,
  TRAIL_COSMETICS,
  UPGRADES,
  getCharacterById,
} from '../game/config';
import { SaveData, UpgradeKey } from '../game/types';

const STORAGE_KEY = 'temple_quest_run_crush_save_v3';

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDefaultSave(): SaveData {
  return {
    unlockedLevel: 1,
    unlockedWorlds: ['jungle'],
    completedLevels: {},
    coins: 0,
    diamonds: 0,
    artifacts: [],
    unlockedCharacters: ['aria'],
    selectedCharacterId: 'aria',
    unlockedTrails: ['none'],
    selectedTrailId: 'none',
    unlockedPets: [],
    selectedPetId: null,
    monuments: {
      sun_obelisk: 0,
      emerald_fountain: 0,
      oracle_observatory: 0,
      vault_of_kings: 0,
    },
    upgrades: {
      speed: 0,
      magnet: 0,
      shield: 0,
      coinMultiplier: 0,
      nearMissBonus: 0,
      puzzleBonus: 0,
    },
    boosters: {
      hammer: 0,
      shuffle: 0,
      extraMoves: 0,
      rainbow: 0,
      bomb: 0,
      revive: 0,
    },
    achievements: {},
    totalCoinsCollected: 0,
    totalMatchesMade: 0,
    totalLevelsCleared: 0,
    totalNearMisses: 0,
    dailyBounties: {
      date: getTodayIsoDate(),
      dodgesToday: 0,
      coinsToday: 0,
      matchesToday: 0,
      claimedIds: [],
    },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}

export function normalizeDailyBounties(save: SaveData): SaveData {
  const today = getTodayIsoDate();
  if (save.dailyBounties?.date === today) return save;
  return {
    ...save,
    dailyBounties: {
      date: today,
      dodgesToday: 0,
      coinsToday: 0,
      matchesToday: 0,
      claimedIds: [],
    },
  };
}

export function loadSaveData(): SaveData {
  const defaults = createDefaultSave();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const merged: SaveData = {
      ...defaults,
      ...parsed,
      unlockedWorlds:
        Array.isArray(parsed.unlockedWorlds) && parsed.unlockedWorlds.length > 0
          ? parsed.unlockedWorlds
          : defaults.unlockedWorlds,
      completedLevels: { ...defaults.completedLevels, ...(parsed.completedLevels ?? {}) },
      upgrades: { ...defaults.upgrades, ...(parsed.upgrades ?? {}) },
      monuments: { ...defaults.monuments, ...(parsed.monuments ?? {}) },
      boosters: { ...defaults.boosters, ...(parsed.boosters ?? {}) },
      achievements: { ...defaults.achievements, ...(parsed.achievements ?? {}) },
      dailyBounties: { ...defaults.dailyBounties, ...(parsed.dailyBounties ?? {}) },
      settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
      unlockedCharacters:
        Array.isArray(parsed.unlockedCharacters) && parsed.unlockedCharacters.length > 0
          ? parsed.unlockedCharacters
          : defaults.unlockedCharacters,
      unlockedTrails:
        Array.isArray(parsed.unlockedTrails) && parsed.unlockedTrails.length > 0
          ? parsed.unlockedTrails
          : defaults.unlockedTrails,
      unlockedPets: Array.isArray(parsed.unlockedPets) ? parsed.unlockedPets : [],
      artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : defaults.artifacts,
    };
    return normalizeDailyBounties(merged);
  } catch {
    return defaults;
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues
  }
}

export function resetSaveData(): SaveData {
  const fresh = createDefaultSave();
  persistSaveData(fresh);
  return fresh;
}

export function getClaimableDailyBountiesCount(save: SaveData): number {
  const normalized = normalizeDailyBounties(save);
  return DAILY_BOUNTIES.filter(
    (b) =>
      normalized.dailyBounties[b.metric] >= b.target &&
      !normalized.dailyBounties.claimedIds.includes(b.id)
  ).length;
}

export function getUpgradeCost(key: UpgradeKey, currentLevel: number): number {
  const cfg = UPGRADES.find((u) => u.key === key);
  if (!cfg) return 9999;
  return cfg.baseCost + currentLevel * cfg.costStep;
}

export function getMonumentUpgradeCost(
  monumentId: string,
  currentTier: number
): { coins: number; diamonds: number } {
  const m = SANCTUARY_MONUMENTS.find((x) => x.id === monumentId);
  if (!m) return { coins: 9999, diamonds: 99 };
  const mult = 1 + currentTier * 0.75;
  return {
    coins: Math.round((m.baseCoins * mult) / 10) * 10,
    diamonds: Math.round(m.baseDiamonds * mult),
  };
}

export function getTotalMonumentTiers(save: SaveData): number {
  return Object.values(save.monuments).reduce((sum, t) => sum + (t || 0), 0);
}

export function getSanctuaryRankTitle(totalTiers: number): string {
  if (totalTiers >= 16) return 'Emperor of the Sun Temple';
  if (totalTiers >= 12) return 'Grand Guardian of Gold';
  if (totalTiers >= 8) return 'Master Relic Architect';
  if (totalTiers >= 4) return 'Sanctuary Restorer';
  if (totalTiers >= 1) return 'Temple Pathfinder';
  return 'Novice Explorer';
}

export interface PlayerComputedStats {
  speedMultiplier: number;
  magnetDurationSec: number;
  shieldDurationSec: number;
  coinValueMultiplier: number;
  nearMissMultiplier: number;
  runScoreMultiplier: number;
  maxHealth: 1; // Strictly 1 life!
  startsWithShield: boolean;
  puzzleScoreMultiplier: number;
  hintSingleCost: number;
  hintAllTurnCost: number;
  hintOracleCost: number;
  sanctuaryTributeCoins: number;
  sanctuaryTributeDiamonds: number;
}

export function computePlayerStats(save: SaveData): PlayerComputedStats {
  const char = getCharacterById(save.selectedCharacterId);
  const trail = TRAIL_COSMETICS.find((t) => t.id === save.selectedTrailId) ?? TRAIL_COSMETICS[0];
  const pet = COMPANION_PETS.find((p) => p.id === save.selectedPetId) ?? null;
  const up = save.upgrades;
  const charPuzzleBonus = char.id === 'zara' ? 0.18 : 0;

  const oracleTier = save.monuments.oracle_observatory ?? 0;
  const hintDiscount = Math.max(0.4, 1 - oracleTier * 0.12);

  let tributeCoins = 0;
  let tributeDiamonds = 0;
  for (const m of SANCTUARY_MONUMENTS) {
    const tier = save.monuments[m.id] ?? 0;
    tributeCoins += tier * m.tributeCoinsPerRun;
    tributeDiamonds += tier * m.tributeDiamondsPerRun;
  }

  return {
    speedMultiplier: 1 + up.speed * 0.04 + char.speedBonus,
    magnetDurationSec: 7 + up.magnet * 2.5,
    shieldDurationSec: 7 + up.shield * 2.5,
    coinValueMultiplier:
      1 + up.coinMultiplier * 0.25 + char.coinBonus + (pet ? pet.coinBonusPct / 100 : 0),
    nearMissMultiplier: 1 + up.nearMissBonus * 0.3,
    runScoreMultiplier: 1 + trail.scoreBonusPct / 100,
    maxHealth: 1,
    startsWithShield: char.startsWithShield || Boolean(pet?.grantsStartShield),
    puzzleScoreMultiplier:
      1 + up.puzzleBonus * 0.1 + charPuzzleBonus + (pet ? pet.puzzleBonusPct / 100 : 0),
    hintSingleCost: Math.max(25, Math.round((HINT_SINGLE_COST_COINS * hintDiscount) / 5) * 5),
    hintAllTurnCost: Math.max(60, Math.round((HINT_ALL_TURN_COST_COINS * hintDiscount) / 5) * 5),
    hintOracleCost: Math.max(150, Math.round((HINT_ORACLE_PUZZLE_COST_COINS * hintDiscount) / 10) * 10),
    sanctuaryTributeCoins: tributeCoins,
    sanctuaryTributeDiamonds: tributeDiamonds,
  };
}

export function evaluateAchievements(save: SaveData): SaveData {
  const nextAch = { ...save.achievements };
  const unlock = (id: string, condition: boolean) => {
    if (!condition) return;
    if (!nextAch[id]?.unlocked) {
      nextAch[id] = { unlocked: true, claimed: false };
    }
  };

  unlock('first_vault', Boolean(save.completedLevels[1]));
  unlock('daredevil', (save.totalNearMisses ?? 0) >= 25);
  unlock('coin_collector', save.totalCoinsCollected >= 200);
  unlock('gem_master', save.totalMatchesMade >= 50);
  unlock('sanctuary_builder', getTotalMonumentTiers(save) >= 5);
  unlock('guardian_escape', Boolean(save.completedLevels[5]));
  unlock(
    'jungle_conqueror',
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((id) => Boolean(save.completedLevels[id]))
  );

  for (const a of ACHIEVEMENTS) {
    if (!nextAch[a.id]) {
      nextAch[a.id] = { unlocked: false, claimed: false };
    }
  }

  return { ...save, achievements: nextAch };
}
