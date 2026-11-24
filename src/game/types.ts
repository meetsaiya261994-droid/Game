export type GameState =
  | 'MAIN_MENU'
  | 'LEVEL_SELECTION'
  | 'RUNNING'
  | 'RUNNING_PAUSED'
  | 'TREASURE_CHAMBER'
  | 'PUZZLE'
  | 'PUZZLE_PAUSED'
  | 'PUZZLE_FAILED'
  | 'CHEST_OPENING'
  | 'LEVEL_COMPLETED'
  | 'GAME_OVER';

export type MenuModal =
  | 'CHARACTERS'
  | 'UPGRADES'
  | 'SANCTUARY'
  | 'DAILY_REWARDS'
  | 'SETTINGS'
  | 'ACHIEVEMENTS'
  | null;

export type WorldId = 'jungle' | 'pyramid' | 'ice' | 'underwater' | 'volcano';

export type ObstacleKind =
  | 'FALLEN_LOG'
  | 'VINE_ARCH'
  | 'STONE_BARRIER'
  | 'MOVING_BARRIER'
  | 'FIRE_TRAP'
  | 'SWINGING_AXE'
  | 'ROLLING_BOULDER'
  | 'GAP';

export type PowerUpKind = 'MAGNET' | 'SHIELD' | 'SPEED_BOOST' | 'DOUBLE_COINS';

export type PuzzleBoosterKind = 'hammer' | 'shuffle' | 'extraMoves' | 'rainbow' | 'bomb';

export type GemColor = 'ruby' | 'sapphire' | 'emerald' | 'topaz' | 'amethyst';

export type GemSpecial = 'NONE' | 'ROCKET_H' | 'ROCKET_V' | 'BOMB' | 'RAINBOW';

export interface GemTile {
  id: number;
  color: GemColor;
  special: GemSpecial;
  bonusCell?: boolean;
  iced?: boolean;
  isNew?: boolean;
}

export interface WorldTheme {
  id: WorldId;
  index: number;
  name: string;
  subtitle: string;
  chestName: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  hemiSky: number;
  hemiGround: number;
  pathPrimary: string;
  pathSecondary: string;
  pathAccent: string;
  wallColor: number;
  foliagePrimary: number;
  foliageSecondary: number;
  accentHex: string;
  badgeBg: string;
  unlockedByDefault: boolean;
  requiredLevelToUnlock: number;
  earlyUnlockDiamonds: number;
}

export interface LevelConfig {
  id: number;
  worldId: WorldId;
  levelNumber: number;
  name: string;
  tagline: string;
  runningDifficulty: string;
  puzzleDifficulty: string;
  distanceMeters: number;
  baseSpeed: number;
  obstacleKinds: ObstacleKind[];
  obstacleSpacing: number;
  hasMonsterChase: boolean;
  hasNarrowBridge: boolean;
  puzzleTargetScore: number;
  puzzleMoves: number;
  puzzleSeed: number;
  puzzleBonusCells: number;
  puzzleIcedCells: number;
  rewardCoins: number;
  rewardDiamonds: number;
  artifactName: string;
  artifactIcon: string;
}

export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  perk: string;
  priceCoins: number;
  priceDiamonds: number;
  unlockLevel?: number;
  colors: {
    tunic: number;
    pants: number;
    hat: number;
    accent: number;
    skin: number;
    pack: number;
  };
  speedBonus: number;
  coinBonus: number;
  startsWithShield: boolean;
  accentHex: string;
}

export type UpgradeKey =
  | 'speed'
  | 'magnet'
  | 'shield'
  | 'coinMultiplier'
  | 'nearMissBonus'
  | 'puzzleBonus';

export interface UpgradeConfig {
  key: UpgradeKey;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  effectLabel: (level: number) => string;
}

export interface TrailCosmeticConfig {
  id: string;
  name: string;
  description: string;
  priceCoins: number;
  priceDiamonds: number;
  colorHex: string;
  colorNum: number;
  scoreBonusPct: number;
}

export interface CompanionPetConfig {
  id: string;
  name: string;
  title: string;
  perk: string;
  priceCoins: number;
  priceDiamonds: number;
  bodyColor: number;
  glowColor: number;
  accentHex: string;
  coinBonusPct: number;
  puzzleBonusPct: number;
  grantsStartShield: boolean;
}

export interface SanctuaryMonumentConfig {
  id: string;
  name: string;
  description: string;
  maxTier: number;
  baseCoins: number;
  baseDiamonds: number;
  perkPerTier: string;
  tributeCoinsPerRun: number;
  tributeDiamondsPerRun: number;
}

export interface LevelProgressRecord {
  stars: number;
  bestRunScore: number;
  bestPuzzleScore: number;
  bestTimeSec: number;
}

export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  rewardCoins: number;
  rewardDiamonds: number;
}

export interface SaveData {
  unlockedLevel: number;
  unlockedWorlds: WorldId[];
  completedLevels: Record<number, LevelProgressRecord>;
  coins: number;
  diamonds: number;
  artifacts: string[];
  unlockedCharacters: string[];
  selectedCharacterId: string;
  unlockedTrails: string[];
  selectedTrailId: string;
  unlockedPets: string[];
  selectedPetId: string | null;
  monuments: Record<string, number>; // monumentId -> tier (0..maxTier)
  upgrades: Record<UpgradeKey, number>;
  boosters: Record<PuzzleBoosterKind | 'revive', number>;
  achievements: Record<string, { unlocked: boolean; claimed: boolean }>;
  totalCoinsCollected: number;
  totalMatchesMade: number;
  totalLevelsCleared: number;
  totalNearMisses: number;
  dailyBounties: {
    date: string;
    dodgesToday: number;
    coinsToday: number;
    matchesToday: number;
    claimedIds: string[];
  };
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
  };
}

export interface RunnerHudSnapshot {
  distanceCovered: number;
  distanceTotal: number;
  score: number;
  coinsCollected: number;
  totalCoinsInLevel: number;
  health: number; // Strictly 1 life!
  maxHealth: number; // Strictly 1 life!
  streakCount: number;
  streakMultiplier: number;
  monsterProximity: number;
  activePowerUps: Partial<Record<PowerUpKind, number>>;
  bannerText: string | null;
  hitFlash: number;
  shieldFlash: number;
}

export interface RunSessionResult {
  levelId: number;
  runScore: number;
  coinsCollected: number;
  totalCoinsInLevel: number;
  allCoinsCollected: boolean;
  timeSec: number;
  damageTaken: number;
  nearMissCount: number;
}

export interface LevelCompletionSummary {
  level: LevelConfig;
  runResult: RunSessionResult;
  puzzleScore: number;
  movesLeft: number;
  stars: number;
  isFirstClear: boolean;
  newStarsEarned: number;
  earnedCoins: number;
  earnedDiamonds: number;
  sanctuaryTributeCoins: number;
  sanctuaryTributeDiamonds: number;
  allCoinsBonus: number;
  artifactAwarded: string | null;
  bonusBooster: PuzzleBoosterKind | null;
  unlockedNextLevel: boolean;
}
