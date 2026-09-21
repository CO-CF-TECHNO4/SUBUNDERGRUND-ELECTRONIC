/**
 * SUBUNDERGRUND ELECTRONIC - Filter Bank Synthesizer Engine
 * 
 * Pure synthesis engine (NOT a sampler).
 * Takes fundamental frequency (f0) and shapes it through a modular bank
 * of 8 configurable filters (expandable) to sculpt bass, lead, keys,
 * formant vocals, plucks, bells, and ambient textures.
 */

import { INSTRUMENT_PRESETS } from './presets.js';

const MAX_POLYPHONY = 8;

class SynthVoice {
  constructor(ctx, destination, filterCount = 8) {
    this.ctx = ctx;
    this.destination = destination;
    this.filterCount = filterCount;
    this.note = null;
    this.freq = 0;
    this.startTime = 0;
    this.isReleasing = false;
    this.releaseTimer = null;

    // Node chain
    this.osc = null;
    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.value = 0.0001;

    // Series filter bank
    this.filters = [];
    for (let i = 0; i < this.filterCount; i += 1) {
      const fNode = ctx.createBiquadFilter();
      this.filters.push(fNode);
    }

    // Connect filter chain: filter[0] -> filter[1] -> ... -> filter[N-1] -> voiceGain -> destination
    for (let i = 0; i < this.filterCount - 1; i += 1) {
      this.filters[i].connect(this.filters[i + 1]);
    }
    if (this.filters.length > 0) {
      this.filters[this.filters.length - 1].connect(this.voiceGain);
    }
    this.voiceGain.connect(this.destination);
  }

  start(note, freq, velocity, preset) {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    this.note = note;
    this.freq = freq;
    this.isReleasing = false;
    const now = this.ctx.currentTime;
    this.startTime = now;

    // Recreate clean oscillator
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch (e) {}
    }

    this.osc = this.ctx.createOscillator();
    this.osc.type = preset.waveform || 'sawtooth';
    this.osc.frequency.setValueAtTime(freq, now);

    // Apply 8-filter bank settings
    this.applyFilters(preset.filters, freq, now);

    // Connect oscillator to head of filter chain
    if (this.filters.length > 0) {
      this.osc.connect(this.filters[0]);
    } else {
      this.osc.connect(this.voiceGain);
    }

    // ADSR Envelope
    const env = preset.envelope || { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2 };
    const targetGain = Math.max(0.01, Math.min(1.0, velocity || 0.8));

    this.voiceGain.gain.cancelScheduledValues(now);
    this.voiceGain.gain.setValueAtTime(0.0001, now);
    
    // Attack phase (linear ramp)
    const attackEnd = now + Math.max(0.002, env.attack);
    this.voiceGain.gain.linearRampToValueAtTime(targetGain, attackEnd);

    // Decay to Sustain (asymptotic decay via setTargetAtTime)
    const sustainLevel = targetGain * Math.max(0.001, env.sustain);
    const decayTimeConstant = Math.max(0.01, env.decay) / 3;
    this.voiceGain.gain.setTargetAtTime(sustainLevel, attackEnd, decayTimeConstant);

    this.osc.start(now);
  }

  applyFilters(filterConfigs, baseFreq, now = this.ctx.currentTime) {
    for (let i = 0; i < this.filterCount; i += 1) {
      const cfg = filterConfigs && filterConfigs[i];
      const node = this.filters[i];
      if (!node) continue;

      if (!cfg || cfg.bypass) {
        // Transparent allpass when bypassed
        node.type = 'allpass';
        node.frequency.setTargetAtTime(20000, now, 0.01);
        node.Q.setTargetAtTime(0.1, now, 0.01);
        node.gain.setTargetAtTime(0, now, 0.01);
        continue;
      }

      node.type = cfg.type;

      // Tracking frequency vs Fixed frequency
      let targetFreq = 1000;
      if (cfg.tracking) {
        const mult = Number(cfg.freqMult) || 1.0;
        targetFreq = baseFreq * mult;
      } else {
        targetFreq = Number(cfg.freqHz) || 1000;
      }
      targetFreq = Math.max(20, Math.min(20000, targetFreq));

      node.frequency.setTargetAtTime(targetFreq, now, 0.01);
      node.Q.setTargetAtTime(Math.max(0.1, Math.min(30, cfg.q ?? 1)), now, 0.01);
      node.gain.setTargetAtTime(Math.max(-40, Math.min(24, cfg.gain ?? 0)), now, 0.01);
    }
  }

  updateLiveFilter(filterIndex, cfg, now = this.ctx.currentTime) {
    const node = this.filters[filterIndex];
    if (!node || !cfg) return;

    if (cfg.bypass) {
      node.type = 'allpass';
      node.frequency.setTargetAtTime(20000, now, 0.01);
      node.Q.setTargetAtTime(0.1, now, 0.01);
      node.gain.setTargetAtTime(0, now, 0.01);
      return;
    }

    node.type = cfg.type;
    let targetFreq = 1000;
    if (cfg.tracking) {
      targetFreq = (this.freq || 440) * (Number(cfg.freqMult) || 1.0);
    } else {
      targetFreq = Number(cfg.freqHz) || 1000;
    }
    targetFreq = Math.max(20, Math.min(20000, targetFreq));

    node.frequency.setTargetAtTime(targetFreq, now, 0.01);
    node.Q.setTargetAtTime(Math.max(0.1, Math.min(30, cfg.q ?? 1)), now, 0.01);
    node.gain.setTargetAtTime(Math.max(-40, Math.min(24, cfg.gain ?? 0)), now, 0.01);
  }

  stop(presetReleaseTime = 0.2) {
    if (this.isReleasing) return;
    this.isReleasing = true;
    const now = this.ctx.currentTime;

    const releaseDuration = Math.max(0.04, presetReleaseTime);
    this.voiceGain.gain.cancelScheduledValues(now);
    this.voiceGain.gain.setValueAtTime(this.voiceGain.gain.value, now);
    this.voiceGain.gain.setTargetAtTime(0.0001, now, releaseDuration / 3);

    this.releaseTimer = setTimeout(() => {
      this.cleanup();
    }, releaseDuration * 1000 + 80);
  }

  cleanup() {
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch (e) {}
      this.osc = null;
    }
    this.note = null;
    this.freq = 0;
    this.isReleasing = false;
    this.releaseTimer = null;
  }
}

export class FilterBankSynth {
  constructor() {
    this.ctx = null;
    this.voices = [];
    this.activeVoiceMap = new Map(); // note -> SynthVoice
    this.presets = INSTRUMENT_PRESETS;
    this.activePreset = JSON.parse(JSON.stringify(this.presets[0]));
    this.masterGain = null;
    this.limiter = null;
    this.analyser = null;
    this.isInitialized = false;
  }

  init(audioContext) {
    if (this.isInitialized && this.ctx) return;
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    // Master Signal Chain:
    // Voices -> Master Bus Gain -> Limiter (0 dBFS protection) -> Master Gain -> Analyser -> Destination
    this.masterBus = this.ctx.createGain();
    this.masterBus.gain.value = 1.0;

    // Hard-knee limiter / compressor for zero distortion
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-1.5, this.ctx.currentTime); // -1.5 dBFS
    this.limiter.knee.setValueAtTime(3.0, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.05, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.75;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterBus.connect(this.limiter);
    this.limiter.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Initialize voice pool (8 polyphonic voices)
    this.voices = [];
    for (let i = 0; i < MAX_POLYPHONY; i += 1) {
      this.voices.push(new SynthVoice(this.ctx, this.masterBus, 8));
    }

    this.isInitialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  loadPreset(presetOrId) {
    let preset = null;
    if (typeof presetOrId === 'string') {
      preset = this.presets.find((p) => p.id === presetOrId);
    } else if (typeof presetOrId === 'number') {
      preset = this.presets[presetOrId];
    } else if (presetOrId && typeof presetOrId === 'object') {
      preset = presetOrId;
    }

    if (!preset) return;
    this.activePreset = JSON.parse(JSON.stringify(preset));

    // Update ongoing voices in real-time
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.activeVoiceMap.forEach((voice) => {
      voice.applyFilters(this.activePreset.filters, voice.freq, now);
      if (voice.osc) voice.osc.type = this.activePreset.waveform;
    });

    return this.activePreset;
  }

  triggerAttack(note, frequency, velocity = 0.8) {
    if (!this.isInitialized) return;
    this.resume();

    // If note already ringing, trigger release first
    if (this.activeVoiceMap.has(note)) {
      this.triggerRelease(note);
    }

    // Find available free voice or steal least recently used (LRU)
    let voice = this.voices.find((v) => !v.note);

    if (!voice) {
      // Voice stealing: find oldest active voice
      let oldestTime = Infinity;
      this.voices.forEach((v) => {
        if (v.startTime < oldestTime) {
          oldestTime = v.startTime;
          voice = v;
        }
      });
      if (voice && voice.note) {
        this.activeVoiceMap.delete(voice.note);
      }
    }

    if (voice) {
      voice.start(note, frequency, velocity, this.activePreset);
      this.activeVoiceMap.set(note, voice);
    }
  }

  triggerRelease(note) {
    if (!this.activeVoiceMap.has(note)) return;
    const voice = this.activeVoiceMap.get(note);
    this.activeVoiceMap.delete(note);
    if (voice) {
      const releaseTime = (this.activePreset.envelope && this.activePreset.envelope.release) || 0.2;
      voice.stop(releaseTime);
    }
  }

  panic() {
    if (!this.isInitialized) return;
    this.voices.forEach((v) => v.cleanup());
    this.activeVoiceMap.clear();
  }

  updateFilter(filterIndex, changes) {
    if (!this.activePreset.filters[filterIndex]) return;
    Object.assign(this.activePreset.filters[filterIndex], changes);

    const now = this.ctx ? this.ctx.currentTime : 0;
    const cfg = this.activePreset.filters[filterIndex];

    this.activeVoiceMap.forEach((voice) => {
      voice.updateLiveFilter(filterIndex, cfg, now);
    });
  }

  setWaveform(waveform) {
    this.activePreset.waveform = waveform;
    this.activeVoiceMap.forEach((voice) => {
      if (voice.osc) voice.osc.type = waveform;
    });
  }

  setVolume(volPercent) {
    if (!this.masterGain || !this.ctx) return;
    const val = Math.max(0, Math.min(1.0, volPercent / 100));
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.02);
  }

  getPresets() {
    return this.presets;
  }

  getActivePreset() {
    return this.activePreset;
  }

  getActiveVoiceCount() {
    return this.activeVoiceMap.size;
  }
}

// Export singleton instance
export const synthEngine = new FilterBankSynth();
export default synthEngine;
