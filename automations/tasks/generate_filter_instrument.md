# Task Specification for OpenClaw / Grok: Multi-Filter Base Synthesizer Engine

You are a Senior Audio DSP and Web Audio API Engineer.
Develop a production-grade Web Audio synthesizer engine for the project "SUBUNDERGRUND ELECTRONIC".

## Architecture & Concept:
1. **Pure Synthesis (NOT A SAMPLER)**:
   - Takes a base fundamental frequency ($f_0$) controlled by user / MIDI / keyboard.
   - Generates a harmonically rich base signal (e.g. multi-waveform oscillator or rich saw/pulse/square core).
   - Routes the signal through a configurable bank/chain of filters.
   
2. **Configurable Filter Bank (Default: 8 Built-in Filters)**:
   - Default quantity is 8 filters, but the architecture must allow dynamic expansion or contraction.
   - Each filter unit must support:
     - `type`: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peaking' | 'lowshelf' | 'highshelf' | 'allpass'
     - `tracking`: boolean (whether cutoff tracks the base frequency with a multiplier `freqMult`, or uses a fixed `freqHz`)
     - `freqMult`: harmonic multiplier relative to fundamental $f_0$ (e.g. 1.0, 2.0, 3.5, 4.0, 8.0)
     - `freqHz`: fixed frequency in Hz (20 Hz - 20,000 Hz)
     - `q`: resonance / Q-factor (0.1 to 30.0)
     - `gain`: gain in dB (-40 to +24 dB for peaking/shelf)
     - `bypass`: boolean (enable/disable filter)
   - The filters shape the raw fundamental harmonics into completely different acoustic & synthetic characters: from deep sub-bass to bright leads, vocal formants, brass, keys, and metallic inharmonic bells.

3. **8 Factory Instrument Presets**:
   Provide 8 rich, distinct instrument presets showcasing the filter bank's versatility:
   1. `Sub Bass`: Deep bottom-end focused lowpass cascade with resonant sub emphasis.
   2. `Acid Reso 303`: Screaming resonant filter sweep with sharp decay.
   3. `Electric Tine Piano`: Harmonic peaking filters tuned to bell-like Rhodes/Wurlitzer overtones.
   4. `Cyberpunk Saw Lead`: Aggressive dual lowpass and high-shelf presence for cutting solos.
   5. `Vocal Formant (A-O-U)`: Bandpass filters tuned to human vocal tract formant frequencies (F1, F2, F3).
   6. `Resonant Pluck`: Snappy percussive filter envelope for melodic pluck arpeggios.
   7. `Metallic Bell / Anvil`: Inharmonic Q-peaks producing metallic, gong-like ringing timbres.
   8. `Atmospheric Ambient Pad`: Soft slow-attack allpass/bandpass resonance for spacious, evolving pads.

4. **Engine Requirements**:
   - **Voice Management**: Polyphonic voice allocation (e.g. 8-16 voices) with LRU (Least Recently Used) voice stealing.
   - **Click-Free Modulation**: Use `setTargetAtTime` or linear/exponential ramps scheduled properly with `cancelScheduledValues` to prevent clicks/pops and avoid `InvalidAccessError` (never ramp to 0 with exponentialRamp).
   - **Master Dynamics**: Master `DynamicsCompressorNode` / limiter at the output stage to guarantee zero digital clipping (0 dBFS protection) when multiple resonant filters overlap.
   - **Real-Time Control API**:
     - `init(audioContext)`
     - `setPreset(presetIdOrIndex)`
     - `triggerAttack(note, frequency, velocity)`
     - `triggerRelease(note)`
     - `panic()`
     - `setFilter(filterIndex, config)`
     - `getFilters()`
     - `getPresets()`
     - `getActiveVoices()`

5. **Code Output Requirements**:
   - Return clean, well-structured, production-ready JavaScript (ES Module syntax: `export class FilterBankSynth ...`).
   - Include complete preset definitions and export `PRESETS` array.
   - Self-contained, zero external npm dependencies (pure Web Audio API).
