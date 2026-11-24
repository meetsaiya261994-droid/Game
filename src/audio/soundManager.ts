export type MusicMode = 'none' | 'menu' | 'runner' | 'puzzle' | 'treasure';

class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicMode: MusicMode = 'none';
  private musicTimer: number | null = null;
  private musicStep = 0;
  private coinStreak = 0;
  private lastCoinTime = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
    if (this.musicEnabled && this.musicMode !== 'none' && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  public setSettings(soundEnabled: boolean, musicEnabled: boolean): void {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    if (!musicEnabled) {
      this.stopMusicLoop();
    } else if (this.musicMode !== 'none' && this.ctx) {
      this.startMusicLoop();
    }
  }

  public setMusicMode(mode: MusicMode): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.musicStep = 0;
    this.stopMusicLoop();
    if (this.musicEnabled && mode !== 'none' && this.ctx && this.ctx.state === 'running') {
      this.startMusicLoop();
    }
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private startMusicLoop(): void {
    this.stopMusicLoop();
    if (!this.musicEnabled || this.musicMode === 'none') return;

    const intervalMs = this.musicMode === 'runner' ? 210 : this.musicMode === 'puzzle' ? 420 : 480;
    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      this.playMusicBeat();
      this.musicStep = (this.musicStep + 1) % 16;
    }, intervalMs);
  }

  private playMusicBeat(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    if (this.musicMode === 'runner') {
      // Rhythmic tribal temple pulse + pentatonic marimba motif
      const bassPattern = [110, 0, 110, 130.8, 98, 0, 110, 0, 110, 0, 146.8, 130.8, 98, 0, 82.4, 0];
      const leadPattern = [330, 0, 392, 440, 0, 523.2, 440, 392, 330, 0, 440, 523.2, 587.3, 0, 440, 392];

      // Subtle low drum on beats 0, 4, 8, 12 and 6, 14
      if (this.musicStep % 4 === 0 || this.musicStep === 6 || this.musicStep === 14) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(this.musicStep % 4 === 0 ? 115 : 88, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      }

      const bass = bassPattern[this.musicStep];
      if (bass > 0) {
        this.tone(bass, 'triangle', 0.14, 0.035);
      }
      const lead = leadPattern[this.musicStep];
      if (lead > 0) {
        this.tone(lead, 'sine', 0.11, 0.025);
      }
    } else if (this.musicMode === 'puzzle') {
      // Mystical crystal harp arpeggio
      const arp = [261.6, 329.6, 392.0, 493.9, 523.2, 493.9, 392.0, 329.6, 220.0, 261.6, 329.6, 392.0, 440.0, 392.0, 329.6, 293.7];
      const freq = arp[this.musicStep];
      this.tone(freq, 'sine', 0.36, 0.028);
      if (this.musicStep % 4 === 0) {
        this.tone(freq * 0.5, 'triangle', 0.5, 0.022);
      }
    } else {
      // Menu / Treasure sanctuary ambience
      const motif = [293.7, 0, 349.2, 440, 0, 523.2, 440, 0, 261.6, 0, 329.6, 392, 440, 0, 349.2, 0];
      const freq = motif[this.musicStep];
      if (freq > 0) {
        this.tone(freq, 'triangle', 0.35, 0.025);
      }
    }
  }

  private tone(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
    slideTo?: number,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noiseBurst(duration: number, volume: number, filterFreq: number, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  // --- Running SFX ---
  public playClick(): void {
    if (!this.soundEnabled) return;
    this.tone(540, 'triangle', 0.055, 0.08, 720);
  }

  public playFootstep(): void {
    if (!this.soundEnabled) return;
    this.noiseBurst(0.035, 0.022, 420 + Math.random() * 140);
  }

  public playLaneShift(): void {
    if (!this.soundEnabled) return;
    this.tone(240, 'sine', 0.08, 0.07, 360);
  }

  public playJump(): void {
    if (!this.soundEnabled) return;
    this.tone(210, 'triangle', 0.18, 0.11, 560);
  }

  public playSlide(): void {
    if (!this.soundEnabled) return;
    this.noiseBurst(0.22, 0.07, 900);
    this.tone(260, 'sine', 0.18, 0.05, 110);
  }

  public playCoin(): void {
    if (!this.soundEnabled) return;
    const now = performance.now();
    if (now - this.lastCoinTime < 450) {
      this.coinStreak = Math.min(10, this.coinStreak + 1);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;
    const base = 784 * Math.pow(1.06, this.coinStreak);
    this.tone(base, 'sine', 0.09, 0.09, base * 1.25);
    this.tone(base * 1.5, 'triangle', 0.12, 0.06, undefined, 0.045);
  }

  public playPowerUp(): void {
    if (!this.soundEnabled) return;
    const notes = [440, 554.4, 659.3, 880];
    notes.forEach((n, idx) => this.tone(n, 'triangle', 0.16, 0.09, n * 1.05, idx * 0.055));
  }

  public playCollision(shieldBlocked = false): void {
    if (!this.soundEnabled) return;
    if (shieldBlocked) {
      this.tone(660, 'sine', 0.18, 0.12, 220);
      this.noiseBurst(0.15, 0.08, 2200);
    } else {
      this.tone(130, 'sawtooth', 0.28, 0.16, 40);
      this.noiseBurst(0.24, 0.14, 300);
    }
  }

  public playMonsterRoar(): void {
    if (!this.soundEnabled) return;
    this.tone(95, 'sawtooth', 0.55, 0.13, 52);
    this.tone(142, 'sawtooth', 0.45, 0.08, 68, 0.05);
    this.noiseBurst(0.45, 0.1, 240, 0.04);
  }

  // --- Puzzle SFX ---
  public playGemSwap(): void {
    if (!this.soundEnabled) return;
    this.tone(420, 'sine', 0.07, 0.08, 560);
  }

  public playInvalidSwap(): void {
    if (!this.soundEnabled) return;
    this.tone(220, 'triangle', 0.09, 0.09, 160);
    this.tone(160, 'triangle', 0.11, 0.09, 130, 0.08);
  }

  public playGemMatch(comboLevel: number): void {
    if (!this.soundEnabled) return;
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    const freq = scale[Math.min(scale.length - 1, Math.max(0, comboLevel - 1))];
    this.tone(freq, 'sine', 0.16, 0.1, freq * 1.04);
    this.tone(freq * 1.25, 'triangle', 0.18, 0.07, undefined, 0.04);
  }

  public playRocket(): void {
    if (!this.soundEnabled) return;
    this.tone(320, 'sawtooth', 0.25, 0.09, 1120);
    this.noiseBurst(0.24, 0.09, 1600);
  }

  public playBomb(): void {
    if (!this.soundEnabled) return;
    this.tone(140, 'sawtooth', 0.34, 0.18, 34);
    this.noiseBurst(0.32, 0.16, 260);
  }

  public playRainbow(): void {
    if (!this.soundEnabled) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, idx) =>
      this.tone(f, 'sine', 0.22, 0.09, f * 1.05, idx * 0.045)
    );
  }

  public playPuzzleVictory(): void {
    if (!this.soundEnabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) =>
      this.tone(f, 'triangle', 0.3, 0.12, undefined, idx * 0.09)
    );
  }

  public playPuzzleFail(): void {
    if (!this.soundEnabled) return;
    [392, 349.2, 311.1, 261.6].forEach((f, idx) =>
      this.tone(f, 'triangle', 0.24, 0.11, f * 0.96, idx * 0.11)
    );
  }

  // --- Treasure & Level Completion SFX ---
  public playChestUnlock(): void {
    if (!this.soundEnabled) return;
    this.tone(300, 'triangle', 0.12, 0.12, 460);
    this.tone(620, 'sine', 0.2, 0.11, 880, 0.1);
  }

  public playChestOpen(): void {
    if (!this.soundEnabled) return;
    [392, 493.9, 587.3, 784, 987.8, 1174.7].forEach((f, idx) =>
      this.tone(f, 'sine', 0.35, 0.1, f * 1.02, idx * 0.075)
    );
  }

  public playRewardCollect(): void {
    if (!this.soundEnabled) return;
    this.tone(740, 'sine', 0.1, 0.1, 988);
    this.tone(1174, 'triangle', 0.16, 0.09, undefined, 0.07);
  }
}

export const soundManager = new SoundManager();
