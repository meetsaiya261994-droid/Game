import React, { useState } from 'react';
import {
  Award,
  Check,
  Coins,
  Flame,
  Gem,
  Gift,
  Landmark,
  Music,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import {
  ACHIEVEMENTS,
  BOOSTER_ITEMS,
  CHARACTERS,
  COMPANION_PETS,
  DAILY_BOUNTIES,
  SANCTUARY_MONUMENTS,
  TRAIL_COSMETICS,
  UPGRADES,
} from '../game/config';
import { MenuModal, PuzzleBoosterKind, SaveData, UpgradeKey } from '../game/types';
import {
  getMonumentUpgradeCost,
  getSanctuaryRankTitle,
  getTotalMonumentTiers,
  getUpgradeCost,
  normalizeDailyBounties,
} from '../storage/saveSystem';

interface MenuModalsProps {
  modal: MenuModal;
  save: SaveData;
  onClose: () => void;
  onSelectCharacter: (id: string) => void;
  onUnlockCharacter: (id: string) => void;
  onBuyUpgrade: (key: UpgradeKey) => void;
  onBuyBooster: (key: PuzzleBoosterKind | 'revive') => void;
  onBuyOrEquipTrail: (trailId: string) => void;
  onBuyOrEquipPet: (petId: string) => void;
  onUpgradeMonument: (monumentId: string) => void;
  onClaimDailyBounty: (bountyId: string) => void;
  onClaimAchievement: (id: string) => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onResetSave: () => void;
}

export const MenuModals: React.FC<MenuModalsProps> = ({
  modal,
  save,
  onClose,
  onSelectCharacter,
  onUnlockCharacter,
  onBuyUpgrade,
  onBuyBooster,
  onBuyOrEquipTrail,
  onBuyOrEquipPet,
  onUpgradeMonument,
  onClaimDailyBounty,
  onClaimAchievement,
  onToggleSound,
  onToggleMusic,
  onResetSave,
}) => {
  const [storeTab, setStoreTab] = useState<'upgrades' | 'boosters' | 'trails' | 'pets'>('upgrades');
  const [confirmReset, setConfirmReset] = useState(false);

  if (!modal) return null;

  const dailyBounties = normalizeDailyBounties(save).dailyBounties;
  const totalMonuments = getTotalMonumentTiers(save);
  const rankTitle = getSanctuaryRankTitle(totalMonuments);

  return (
    <div className="fixed inset-0 z-40 bg-black/82 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[88vh] bg-[#101c16] border border-amber-500/35 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 bg-[#14241c]">
          <div className="flex items-center gap-2.5">
            {modal === 'SANCTUARY' && <Landmark className="w-5 h-5 text-amber-400" />}
            {modal === 'CHARACTERS' && <Users className="w-5 h-5 text-sky-400" />}
            {modal === 'UPGRADES' && <ShoppingBag className="w-5 h-5 text-emerald-400" />}
            {modal === 'DAILY_REWARDS' && <Gift className="w-5 h-5 text-rose-400" />}
            {modal === 'ACHIEVEMENTS' && <Award className="w-5 h-5 text-amber-300" />}
            <h2 className="font-display text-lg sm:text-xl font-bold text-amber-200">
              {modal === 'SANCTUARY' && 'Temple Sanctuary Builder'}
              {modal === 'CHARACTERS' && 'Adventurers'}
              {modal === 'UPGRADES' && 'Store · Upgrades · 3D Pets & Trails'}
              {modal === 'DAILY_REWARDS' && 'Daily Skill Bounties'}
              {modal === 'ACHIEVEMENTS' && 'Vault Artifacts & Trophies'}
              {modal === 'SETTINGS' && 'Settings & Controls'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-mono-nums">
              <span className="flex items-center gap-1 text-amber-200">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> {save.coins.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-sky-200">
                <Gem className="w-3.5 h-3.5 text-sky-400" /> {save.diamonds.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setConfirmReset(false);
                onClose();
              }}
              className="w-9 h-9 rounded-lg bg-stone-900 border border-white/15 hover:border-amber-400/50 text-stone-300 flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* --- TEMPLE SANCTUARY BUILDER (Deep Coin & Gem Meta-Progression!) --- */}
          {modal === 'SANCTUARY' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-950/60 via-[#15281f] to-emerald-950/60 border border-amber-400/35 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                    Your Explorer Rank
                  </div>
                  <div className="font-display text-xl font-bold text-stone-100 mt-0.5">
                    {rankTitle}
                  </div>
                  <p className="text-xs text-stone-300 mt-1">
                    Invest earned Coins &amp; Gems to restore 4 ancient monuments. Every tier permanently boosts first-clear chest tributes &amp; slashes Puzzle Hint costs!
                  </p>
                </div>
                <div className="text-right font-mono-nums">
                  <div className="text-2xl font-bold text-amber-300">{totalMonuments} / 20</div>
                  <div className="text-[11px] text-stone-400">Sanctuary Restored</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {SANCTUARY_MONUMENTS.map((m) => {
                  const tier = save.monuments[m.id] ?? 0;
                  const maxed = tier >= m.maxTier;
                  const cost = getMonumentUpgradeCost(m.id, tier);
                  const canAfford =
                    !maxed && save.coins >= cost.coins && save.diamonds >= cost.diamonds;

                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl p-4 bg-[#13211a] border border-white/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-bold text-base text-amber-200">
                            {m.name}
                          </h3>
                          <span className="font-mono-nums text-xs font-bold text-emerald-300">
                            Tier {tier}/{m.maxTier}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-1">{m.description}</p>
                        <div className="text-xs font-medium text-amber-300/95 mt-2">
                          {m.perkPerTier}
                        </div>

                        <div className="flex items-center gap-1.5 mt-3">
                          {Array.from({ length: m.maxTier }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-2 flex-1 rounded-full ${
                                idx < tier ? 'bg-amber-400' : 'bg-stone-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onUpgradeMonument(m.id)}
                        className={`mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 ${
                          maxed
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/35 cursor-default'
                            : canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                            : 'bg-stone-900 text-stone-500 border border-white/10 cursor-not-allowed'
                        }`}
                      >
                        {maxed ? (
                          'MONUMENT RESTORED'
                        ) : (
                          <>
                            <span>{tier === 0 ? 'Build' : `Upgrade Tier ${tier + 1}`}</span>
                            {cost.coins > 0 && (
                              <span className="inline-flex items-center gap-1 font-mono-nums">
                                <Coins className="w-3.5 h-3.5" /> {cost.coins.toLocaleString()}
                              </span>
                            )}
                            {cost.diamonds > 0 && (
                              <span className="inline-flex items-center gap-1 font-mono-nums">
                                <Gem className="w-3.5 h-3.5" /> {cost.diamonds}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- CHARACTER SELECTION --- */}
          {modal === 'CHARACTERS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CHARACTERS.map((char) => {
                const unlocked = save.unlockedCharacters.includes(char.id);
                const selected = save.selectedCharacterId === char.id;
                const canAfford =
                  save.coins >= char.priceCoins && save.diamonds >= char.priceDiamonds;

                return (
                  <div
                    key={char.id}
                    className={`rounded-2xl p-4 border flex flex-col justify-between ${
                      selected
                        ? 'bg-[#192e23] border-amber-400'
                        : 'bg-[#13211a] border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center font-display font-bold text-stone-950"
                            style={{ backgroundColor: char.accentHex }}
                          >
                            {char.name[0]}
                          </div>
                          <div>
                            <div className="font-display font-bold text-stone-100">{char.name}</div>
                            <div className="text-xs text-stone-400">{char.title}</div>
                          </div>
                        </div>
                        {selected && (
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-300/90 mt-3">{char.perk}</p>
                    </div>

                    <div className="mt-4">
                      {unlocked ? (
                        <button
                          type="button"
                          disabled={selected}
                          onClick={() => {
                            soundManager.playClick();
                            onSelectCharacter(char.id);
                          }}
                          className={`w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                            selected
                              ? 'bg-stone-800 text-stone-400 cursor-default'
                              : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          }`}
                        >
                          {selected ? 'Equipped' : 'Equip Adventurer'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onUnlockCharacter(char.id)}
                          className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                            canAfford
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer'
                              : 'bg-stone-900 text-stone-500 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          {char.priceDiamonds > 0 ? (
                            <>
                              <Gem className="w-4 h-4" /> Unlock ({char.priceDiamonds} Diamonds)
                            </>
                          ) : (
                            <>
                              <Coins className="w-4 h-4" /> Unlock ({char.priceCoins.toLocaleString()} Coins)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* --- STORE: UPGRADES, BOOSTERS, 3D TRAILS, 3D PETS --- */}
          {modal === 'UPGRADES' && (
            <div>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-950/75 rounded-xl mb-4 w-fit border border-white/10">
                {(
                  [
                    { id: 'upgrades', label: 'Upgrades' },
                    { id: 'pets', label: '3D Pets' },
                    { id: 'trails', label: '3D Trails' },
                    { id: 'boosters', label: 'Boosters' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setStoreTab(t.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap ${
                      storeTab === t.id
                        ? 'bg-amber-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {storeTab === 'upgrades' && (
                <div className="space-y-3">
                  {UPGRADES.map((up) => {
                    const lvl = save.upgrades[up.key] ?? 0;
                    const maxed = lvl >= up.maxLevel;
                    const cost = getUpgradeCost(up.key, lvl);
                    const canBuy = !maxed && save.coins >= cost;

                    return (
                      <div
                        key={up.key}
                        className="rounded-xl p-3.5 bg-[#13211a] border border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-100 text-sm">{up.name}</span>
                            <span className="text-xs font-mono-nums text-emerald-300">
                              {up.effectLabel(lvl)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5">{up.description}</p>
                          <div className="flex items-center gap-1 mt-2">
                            {Array.from({ length: up.maxLevel }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 w-7 rounded-full ${
                                  i < lvl ? 'bg-amber-400' : 'bg-stone-800'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => onBuyUpgrade(up.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                            maxed
                              ? 'bg-stone-800 text-emerald-300 cursor-default'
                              : canBuy
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                              : 'bg-stone-900 text-stone-500 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          {maxed ? (
                            'MAXED'
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" /> {cost.toLocaleString()}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {storeTab === 'pets' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {COMPANION_PETS.map((pet) => {
                    const owned = save.unlockedPets.includes(pet.id);
                    const equipped = save.selectedPetId === pet.id;
                    const canBuy =
                      save.coins >= pet.priceCoins && save.diamonds >= pet.priceDiamonds;

                    return (
                      <div
                        key={pet.id}
                        className={`rounded-2xl p-4 border flex flex-col justify-between ${
                          equipped
                            ? 'bg-[#192e23] border-amber-400'
                            : 'bg-[#13211a] border-white/10'
                        }`}
                      >
                        <div>
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 border border-white/20"
                            style={{ backgroundColor: pet.accentHex }}
                          >
                            <Sparkles className="w-5 h-5 text-stone-950" />
                          </div>
                          <div className="font-display font-bold text-stone-100">{pet.name}</div>
                          <div className="text-[11px] text-stone-400">{pet.title}</div>
                          <p className="text-xs text-emerald-300 mt-2">{pet.perk}</p>
                        </div>

                        <button
                          type="button"
                          disabled={!owned && !canBuy}
                          onClick={() => onBuyOrEquipPet(pet.id)}
                          className={`mt-4 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                            equipped
                              ? 'bg-stone-800 text-amber-300 cursor-pointer'
                              : owned
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer'
                              : canBuy
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                              : 'bg-stone-900 text-stone-500 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            'Equipped (Tap to Rest)'
                          ) : owned ? (
                            'Fly With Me'
                          ) : pet.priceDiamonds > 0 ? (
                            <>
                              <Gem className="w-3.5 h-3.5" /> {pet.priceDiamonds} Diamonds
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" /> {pet.priceCoins.toLocaleString()}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {storeTab === 'trails' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TRAIL_COSMETICS.map((trail) => {
                    const owned = save.unlockedTrails.includes(trail.id);
                    const equipped = save.selectedTrailId === trail.id;
                    const canBuy =
                      save.coins >= trail.priceCoins && save.diamonds >= trail.priceDiamonds;

                    return (
                      <div
                        key={trail.id}
                        className={`rounded-2xl p-4 border flex flex-col justify-between ${
                          equipped
                            ? 'bg-[#192e23] border-amber-400'
                            : 'bg-[#13211a] border-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full border border-white/30 inline-block"
                                style={{ backgroundColor: trail.colorHex }}
                              />
                              <span className="font-semibold text-sm text-stone-100">
                                {trail.name}
                              </span>
                            </div>
                            {trail.scoreBonusPct > 0 && (
                              <span className="text-xs font-mono-nums font-bold text-emerald-300">
                                +{trail.scoreBonusPct}% Score
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-1.5">{trail.description}</p>
                        </div>

                        <button
                          type="button"
                          disabled={equipped || (!owned && !canBuy)}
                          onClick={() => onBuyOrEquipTrail(trail.id)}
                          className={`mt-3.5 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                            equipped
                              ? 'bg-stone-800 text-amber-300 cursor-default'
                              : owned
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer'
                              : canBuy
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                              : 'bg-stone-900 text-stone-500 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            'Equipped'
                          ) : owned ? (
                            'Equip Trail'
                          ) : trail.priceDiamonds > 0 ? (
                            <>
                              <Gem className="w-3.5 h-3.5" /> {trail.priceDiamonds} Diamonds
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" /> {trail.priceCoins.toLocaleString()}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {storeTab === 'boosters' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BOOSTER_ITEMS.map((item) => {
                    const owned = save.boosters[item.key] ?? 0;
                    const canBuy =
                      save.coins >= item.priceCoins && save.diamonds >= item.priceDiamonds;
                    return (
                      <div
                        key={item.key}
                        className="rounded-xl p-3.5 bg-[#13211a] border border-white/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-stone-100">{item.name}</span>
                            <span className="font-mono-nums text-xs text-amber-300">
                              Owned: {owned}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{item.description}</p>
                        </div>
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => onBuyBooster(item.key)}
                          className={`mt-3 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                            canBuy
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                              : 'bg-stone-900 text-stone-500 border border-white/10 cursor-not-allowed'
                          }`}
                        >
                          {item.priceDiamonds > 0 ? (
                            <>
                              <Gem className="w-3.5 h-3.5" /> Buy ({item.priceDiamonds} Diamonds)
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" /> Buy ({item.priceCoins} Coins)
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* --- DAILY SKILL BOUNTIES (Earned Strictly Through Real Gameplay!) --- */}
          {modal === 'DAILY_REWARDS' && (
            <div className="space-y-4">
              <div className="rounded-xl p-3.5 bg-amber-950/35 border border-amber-500/30 text-xs text-stone-300">
                No free handouts — complete today’s skill targets during real 1-Life runs and gem puzzles to earn bonus Coins, Diamonds, and Boosters. Each bounty can be claimed once per day.
              </div>

              <div className="space-y-3">
                {DAILY_BOUNTIES.map((bounty) => {
                  const current = Math.min(bounty.target, dailyBounties[bounty.metric] ?? 0);
                  const pct = Math.min(100, Math.round((current / bounty.target) * 100));
                  const claimed = dailyBounties.claimedIds.includes(bounty.id);
                  const ready = current >= bounty.target && !claimed;

                  return (
                    <div
                      key={bounty.id}
                      className={`rounded-2xl p-4 border ${
                        ready
                          ? 'bg-amber-950/45 border-amber-400'
                          : claimed
                          ? 'bg-emerald-950/30 border-emerald-500/35'
                          : 'bg-[#13211a] border-white/10'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-base text-amber-200">
                              {bounty.title}
                            </h3>
                            <span className="font-mono-nums text-xs text-stone-300">
                              {current} / {bounty.target}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5">{bounty.description}</p>

                          <div className="h-2 w-full bg-stone-900 rounded-full overflow-hidden mt-2.5">
                            <div
                              className={`h-full origin-left transition-transform duration-200 ${
                                claimed
                                  ? 'bg-emerald-500'
                                  : ready
                                  ? 'bg-amber-400'
                                  : 'bg-sky-400'
                              }`}
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs font-mono-nums">
                            <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                              <Coins className="w-3.5 h-3.5" /> +{bounty.rewardCoins} Coins
                            </span>
                            <span className="inline-flex items-center gap-1 text-sky-300 font-semibold">
                              <Gem className="w-3.5 h-3.5" /> +{bounty.rewardDiamonds} Diamonds
                            </span>
                            {bounty.rewardBooster && (
                              <span className="text-emerald-300 font-semibold">
                                +1 {bounty.rewardBooster}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 self-center">
                          {claimed ? (
                            <span className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/35 text-emerald-300 text-xs font-bold inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Claimed
                            </span>
                          ) : ready ? (
                            <button
                              type="button"
                              onClick={() => onClaimDailyBounty(bounty.id)}
                              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer"
                            >
                              Claim Bounty
                            </button>
                          ) : (
                            <span className="px-3.5 py-2 rounded-xl bg-stone-900 border border-white/10 text-stone-500 text-xs font-semibold">
                              {pct}% Done
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- ACHIEVEMENTS & COLLECTED ARTIFACTS --- */}
          {modal === 'ACHIEVEMENTS' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2.5">
                  Ancient Artifacts Collected ({save.artifacts.length})
                </h3>
                {save.artifacts.length === 0 ? (
                  <p className="text-xs text-stone-400 bg-black/30 rounded-xl p-3.5 border border-white/10">
                    Survive 1-Life runs and unlock treasure chests to collect ancient temple artifacts.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {save.artifacts.map((art) => (
                      <div
                        key={art}
                        className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/35 text-xs font-medium text-amber-200"
                      >
                        {art}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-sky-300 uppercase tracking-wider mb-2.5">
                  Expedition Trophies
                </h3>
                <div className="space-y-2.5">
                  {ACHIEVEMENTS.map((ach) => {
                    const state = save.achievements[ach.id];
                    const unlocked = Boolean(state?.unlocked);
                    const claimed = Boolean(state?.claimed);
                    return (
                      <div
                        key={ach.id}
                        className="rounded-xl p-3.5 bg-[#13211a] border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-sm text-stone-100">{ach.name}</div>
                          <div className="text-xs text-stone-400 mt-0.5">{ach.description}</div>
                          <div className="text-[11px] text-amber-300 mt-1 font-mono-nums">
                            Reward: +{ach.rewardCoins} Coins · +{ach.rewardDiamonds} Diamonds
                          </div>
                        </div>

                        {claimed ? (
                          <span className="text-xs font-semibold text-emerald-400 shrink-0">
                            Claimed
                          </span>
                        ) : unlocked ? (
                          <button
                            type="button"
                            onClick={() => onClaimAchievement(ach.id)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shrink-0 cursor-pointer"
                          >
                            Claim
                          </button>
                        ) : (
                          <span className="text-xs text-stone-500 shrink-0">In Progress</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* --- SETTINGS & CONTROLS --- */}
          {modal === 'SETTINGS' && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 bg-[#13211a] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="font-semibold text-sm text-stone-100">Sound Effects</div>
                    <div className="text-xs text-stone-400">
                      Footsteps, coins, dodge streaks, gems, explosions &amp; chest chimes
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    save.settings.soundEnabled
                      ? 'bg-emerald-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {save.settings.soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="rounded-xl p-4 bg-[#13211a] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-sm text-stone-100">Background Music</div>
                    <div className="text-xs text-stone-400">
                      Adaptive temple adventure &amp; puzzle ambience
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleMusic}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    save.settings.musicEnabled
                      ? 'bg-emerald-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {save.settings.musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="rounded-xl p-4 bg-[#13211a] border border-white/10 text-xs text-stone-300 space-y-1.5">
                <div className="font-semibold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400" /> 1-Life Rules &amp; Controls
                </div>
                <div>
                  <strong>1 Life Only:</strong> One unshielded hit ends your run — pick up Jade Shields, equip Orin/Mini Sun Dragon, or carry Ankh Revives!
                </div>
                <div>
                  <strong>Running:</strong> Swipe or A/D to switch lanes · W/Up/Space to jump · S/Down to slide · Chain clean dodges for up to ×5 Score &amp; bonus Coins!
                </div>
                <div>
                  <strong>Unlocking Chests:</strong> Spend Coins during the puzzle to highlight the Best Move, reveal ALL valid moves at once, or activate All-Hints Every Turn!
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="text-xs text-stone-400">
                  Progress saves automatically offline on this device.
                </div>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="px-3.5 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Reset Progress
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onResetSave();
                        setConfirmReset(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
