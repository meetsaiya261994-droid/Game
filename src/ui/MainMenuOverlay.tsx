import React, { useEffect } from 'react';
import {
  Award,
  Coins,
  Gem,
  Gift,
  Landmark,
  Map,
  Music,
  Play,
  Settings,
  ShoppingBag,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { getLevelById } from '../game/config';
import { MenuModal, SaveData } from '../game/types';
import {
  getClaimableDailyBountiesCount,
  getSanctuaryRankTitle,
  getTotalMonumentTiers,
} from '../storage/saveSystem';

interface MainMenuOverlayProps {
  save: SaveData;
  onPlayContinue: () => void;
  onOpenLevels: () => void;
  onOpenModal: (modal: MenuModal) => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}

export const MainMenuOverlay: React.FC<MainMenuOverlayProps> = ({
  save,
  onPlayContinue,
  onOpenLevels,
  onOpenModal,
  onToggleSound,
  onToggleMusic,
}) => {
  const nextLevel = getLevelById(Math.min(50, save.unlockedLevel));
  const claimableBounties = getClaimableDailyBountiesCount(save);
  const unclaimedAch = Object.values(save.achievements).filter(
    (a) => a.unlocked && !a.claimed
  ).length;
  const totalMonuments = getTotalMonumentTiers(save);
  const rankTitle = getSanctuaryRankTitle(totalMonuments);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundManager.unlock();
        soundManager.playClick();
        onPlayContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPlayContinue]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
      <div
        className="fixed inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(7,14,11,0.84), transparent)' }}
      />
      <div
        className="fixed inset-x-0 bottom-0 h-60 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(7,14,11,0.94) 18%, transparent)' }}
      />

      {/* Top Currency, Rank & Audio Row */}
      <div className="relative z-10 flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-4 bg-[#101c16]/92 border border-amber-500/30 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-nums font-bold text-sm text-amber-100">
              {save.coins.toLocaleString()}
            </span>
          </div>
          <span className="text-stone-600" aria-hidden="true">|</span>
          <div className="flex items-center gap-1.5">
            <Gem className="w-4 h-4 text-sky-400" />
            <span className="font-mono-nums font-bold text-sm text-sky-100">
              {save.diamonds.toLocaleString()}
            </span>
          </div>
          <span className="hidden md:inline text-stone-600" aria-hidden="true">|</span>
          <span className="hidden md:inline text-xs font-medium text-emerald-300">
            {rankTitle} · {totalMonuments}/20 Sanctuary
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              onToggleSound();
            }}
            aria-label={save.settings.soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="w-10 h-10 rounded-xl bg-[#101c16]/92 border border-white/15 hover:border-amber-400/50 text-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            {save.settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-300" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              onToggleMusic();
            }}
            aria-label={save.settings.musicEnabled ? 'Mute background music' : 'Enable background music'}
            className="w-10 h-10 rounded-xl bg-[#101c16]/92 border border-white/15 hover:border-amber-400/50 text-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Music
              className={`w-4 h-4 ${save.settings.musicEnabled ? 'text-emerald-300' : 'text-stone-500'}`}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onOpenModal('SETTINGS');
            }}
            aria-label="Open Settings"
            className="w-10 h-10 rounded-xl bg-[#101c16]/92 border border-white/15 hover:border-amber-400/50 text-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bespoke Inline SVG Title Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center mt-2 sm:mt-4">
        <svg
          viewBox="0 0 640 165"
          className="w-[min(92vw,540px)] h-auto drop-shadow-[0_10px_28px_rgba(0,0,0,0.85)]"
          role="img"
          aria-label="Temple Quest – Run & Crush"
        >
          <defs>
            <linearGradient id="goldTitle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="48%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="emeraldBanner" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <polygon points="320,6 334,26 320,44 306,26" fill="#34d399" stroke="#fde047" strokeWidth="2.5" />
          <line x1="210" y1="26" x2="294" y2="26" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.8" />
          <line x1="346" y1="26" x2="430" y2="26" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.8" />

          <text
            x="320"
            y="96"
            textAnchor="middle"
            fontFamily="Cinzel, Georgia, serif"
            fontWeight="800"
            fontSize="58"
            letterSpacing="4"
            fill="url(#goldTitle)"
            stroke="#231407"
            strokeWidth="3"
            paintOrder="stroke"
          >
            TEMPLE QUEST
          </text>

          <polygon
            points="165,114 475,114 458,148 182,148"
            fill="url(#emeraldBanner)"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <text
            x="320"
            y="137"
            textAnchor="middle"
            fontFamily="Cinzel, Georgia, serif"
            fontWeight="700"
            fontSize="20"
            letterSpacing="6"
            fill="#fef3c7"
          >
            RUN &amp; CRUSH
          </text>
        </svg>
      </div>

      {/* Bottom Action Dock */}
      <div className="relative z-10 flex flex-col items-center gap-3 pb-1 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onPlayContinue();
            }}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-display font-extrabold text-lg tracking-wider shadow-[0_8px_28px_rgba(245,158,11,0.4)] flex items-center gap-2.5 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-stone-950" />
            PLAY LEVEL {nextLevel.levelNumber}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onOpenLevels();
            }}
            className="px-5 py-3.5 rounded-xl bg-[#13221b]/95 hover:bg-[#1c3127] text-amber-100 border border-amber-500/40 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Map className="w-4 h-4 text-amber-400" />
            Worlds &amp; Levels
          </button>
        </div>

        {/* Rich Meta-Progression & Economy Dock */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-[#0d1713]/94 border border-white/12 rounded-2xl p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onOpenModal('SANCTUARY');
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Landmark className="w-4 h-4 text-amber-400" />
            Build Sanctuary
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onOpenModal('UPGRADES');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-white/10 text-stone-200 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Store · Pets · Trails
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onOpenModal('CHARACTERS');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-white/10 text-stone-200 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Users className="w-4 h-4 text-sky-400" />
            Characters
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onOpenModal('DAILY_REWARDS');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-white/10 text-stone-200 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Gift className="w-4 h-4 text-rose-400" />
            Bounties
            {claimableBounties > 0 && (
              <span className="font-mono-nums text-[11px] font-bold text-amber-300">
                ({claimableBounties})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.unlock();
              soundManager.playClick();
              onOpenModal('ACHIEVEMENTS');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-white/10 text-stone-200 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Award className="w-4 h-4 text-amber-300" />
            Trophies
            {unclaimedAch > 0 && (
              <span className="font-mono-nums text-[11px] font-bold text-amber-300">
                ({unclaimedAch})
              </span>
            )}
          </button>
        </div>

        <p className="text-xs text-stone-400 tracking-wide">
          1-Life Hardcore Run · Earn Every Coin &amp; Diamond Through Skill · A/D Move · W/Space Jump · S Slide
        </p>
      </div>
    </div>
  );
};
