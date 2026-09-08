// Web Audio API Synthesizer & Haptic Feedback Engine
// Completely client-side, zero external sound files, works offline.

class AudioFeedbackEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Check initial mute state from localStorage
    try {
      const savedMute = localStorage.getItem('pennyHunterAudioMuted');
      this.isMuted = savedMute === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public isAudioMuted(): boolean {
    return this.isMuted;
  }

  public setAudioMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('pennyHunterAudioMuted', muted ? 'true' : 'false');
    } catch {
      // Ignore localStorage errors
    }
  }

  public toggleMute(): boolean {
    this.setAudioMuted(!this.isMuted);
    if (!this.isMuted) {
      this.playStandardScan();
    }
    return this.isMuted;
  }

  // High-energy 4-note ascending arpeggio for 1¢ drops, .02/.03 Lowe's RTV tags, or .04 Target salvages
  public playPennyJackpot() {
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([100, 50, 100, 50, 150]);

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.1, dur: 0.12 }, // E5
        { freq: 783.99, time: 0.2, dur: 0.14 }, // G5
        { freq: 1046.5, time: 0.32, dur: 0.35 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.25, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Crisp positive two-tone harmonic chime for high profit / ROI > 50%
  public playHighProfitChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([80, 40, 100]);

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 659.25, time: 0.0, dur: 0.15 }, // E5
        { freq: 880.0, time: 0.12, dur: 0.28 }, // A5
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.2, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Standard clean laser confirmation blip
  public playStandardScan() {
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([40]);

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Subtle low double-tone for out of stock or negative profit
  public playPassBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([120]);

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Satisfying cash register / payout chime for logging hauls and receipts
  public playCashRegister() {
    const ctx = this.getContext();
    if (!ctx) return;

    this.triggerHaptic([60, 40, 120]);

    try {
      const now = ctx.currentTime;
      // High bell strike + coins
      const bell = ctx.createOscillator();
      const gain = ctx.createGain();

      bell.type = 'sine';
      bell.frequency.setValueAtTime(1760, now); // A6
      bell.frequency.exponentialRampToValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      bell.connect(gain);
      gain.connect(ctx.destination);

      bell.start(now);
      bell.stop(now + 0.35);

      // Secondary coin resonance
      setTimeout(() => {
        const c2 = this.getContext();
        if (!c2) return;
        const now2 = c2.currentTime;
        const o2 = c2.createOscillator();
        const g2 = c2.createGain();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(2093, now2); // C7
        g2.gain.setValueAtTime(0.001, now2);
        g2.gain.exponentialRampToValueAtTime(0.15, now2 + 0.02);
        g2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.25);
        o2.connect(g2);
        g2.connect(c2.destination);
        o2.start(now2);
        o2.stop(now2 + 0.25);
      }, 70);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Safe device vibration / haptic engine
  public triggerHaptic(pattern: number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore haptic vibration errors
      }
    }
  }
}

export const soundFx = new AudioFeedbackEngine();
