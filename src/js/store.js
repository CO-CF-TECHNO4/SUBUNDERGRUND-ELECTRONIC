import { createStore } from 'techno4';
import { INSTRUMENT_PRESETS } from '../audio/presets.js';
import synthEngine from '../audio/filter-bank-synth.js';

const store = createStore({
  state: {
    presets: INSTRUMENT_PRESETS,
    activePresetId: INSTRUMENT_PRESETS[0].id,
    activePreset: JSON.parse(JSON.stringify(INSTRUMENT_PRESETS[0])),
    masterVolume: 75,
    activeVoiceCount: 0,
  },
  getters: {
    presets({ state }) {
      return state.presets;
    },
    activePreset({ state }) {
      return state.activePreset;
    },
    activePresetId({ state }) {
      return state.activePresetId;
    },
    masterVolume({ state }) {
      return state.masterVolume;
    },
    activeVoiceCount({ state }) {
      return state.activeVoiceCount;
    },
  },
  actions: {
    selectPreset({ state }, presetId) {
      const found = state.presets.find((p) => p.id === presetId);
      if (found) {
        state.activePresetId = presetId;
        state.activePreset = JSON.parse(JSON.stringify(found));
        synthEngine.loadPreset(state.activePreset);
      }
    },
    updateFilter({ state }, { index, changes }) {
      if (state.activePreset.filters[index]) {
        Object.assign(state.activePreset.filters[index], changes);
        synthEngine.updateFilter(index, changes);
      }
    },
    setMasterVolume({ state }, volume) {
      state.masterVolume = volume;
      synthEngine.setVolume(volume);
    },
    setWaveform({ state }, waveform) {
      state.activePreset.waveform = waveform;
      synthEngine.setWaveform(waveform);
    },
  },
});

export default store;
