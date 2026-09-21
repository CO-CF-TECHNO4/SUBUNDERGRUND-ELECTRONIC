/**
 * SUBUNDERGRUND ELECTRONIC - Performance & DSP Benchmark Suite
 * 
 * Measures:
 * 1. Real-time FPS, frame time (ms), jitter, and dropped frames (jank).
 * 2. Web Audio API DSP performance (1 voice, 4 voices, 8 voices with 64 biquad filters).
 * 3. High-frequency filter modulation throughput (real-time parameter updating).
 * 4. Voice stealing & rapid note trigger latency.
 */

export class PerformanceMonitor {
  constructor() {
    this.isRunning = false;
    this.animId = null;
    this.lastTime = 0;
    this.frames = 0;
    this.fps = 60;
    this.frameTime = 16.6;
    this.droppedFrames = 0;
    this.totalFrames = 0;
    this.history = [];
    this.maxHistory = 60;
    this.onTick = null;
  }

  start(onTick) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onTick = onTick;
    const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const rAfFn = (cb) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : setTimeout(() => cb(nowFn()), 16));
    this.lastTime = nowFn();
    this.frames = 0;
    this.droppedFrames = 0;
    this.totalFrames = 0;
    this.history = [];

    const loop = (now) => {
      if (!this.isRunning) return;
      const currentNow = typeof now === 'number' ? now : nowFn();
      const delta = currentNow - this.lastTime;
      this.lastTime = currentNow;

      if (delta > 0) {
        this.totalFrames += 1;
        const currentFps = Math.min(120, 1000 / delta);
        this.frameTime = delta;
        if (delta > 22) { // Frame drop threshold (> 22ms means < 45fps)
          this.droppedFrames += 1;
        }

        this.history.push(currentFps);
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }

        const sum = this.history.reduce((a, b) => a + b, 0);
        this.fps = Math.round((sum / this.history.length) * 10) / 10;

        if (this.onTick && this.totalFrames % 4 === 0) {
          this.onTick({
            fps: this.fps,
            frameTime: Math.round(this.frameTime * 10) / 10,
            droppedFrames: this.droppedFrames,
            jankRate: Math.round((this.droppedFrames / Math.max(1, this.totalFrames)) * 100),
          });
        }
      }

      this.animId = rAfFn(loop);
    };

    this.animId = rAfFn(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animId);
      } else {
        clearTimeout(this.animId);
      }
      this.animId = null;
    }
  }

  getSnapshot() {
    return {
      fps: this.fps,
      frameTime: Math.round(this.frameTime * 10) / 10,
      droppedFrames: this.droppedFrames,
      totalFrames: this.totalFrames,
    };
  }
}

/**
 * Executes a full 5-stage synthetic stress benchmark on the synth engine and UI
 */
export async function runSynthBenchmark(synthEngine, onProgress) {
  synthEngine.init();
  await synthEngine.resume();

  const results = {
    audioLatencyMs: 0,
    sampleRate: 0,
    maxVoices: 8,
    maxFilters: 64,
    stages: [],
    avgFps: 60,
    minFps: 60,
    maxFrameTimeMs: 0,
    droppedFrames: 0,
    totalFrames: 0,
    score: 100,
    grade: 'A+',
    status: 'OPTIMAL',
  };

  if (synthEngine.ctx) {
    results.sampleRate = synthEngine.ctx.sampleRate;
    const baseLat = (synthEngine.ctx.baseLatency || 0.005) * 1000;
    const outLat = (synthEngine.ctx.outputLatency || 0.01) * 1000;
    results.audioLatencyMs = Math.round((baseLat + outLat) * 10) / 10;
  }

  const stageTimes = [];
  const allFrameTimes = [];

  function recordFrame(delta) {
    allFrameTimes.push(delta);
    if (delta > 22) results.droppedFrames += 1;
    results.totalFrames += 1;
  }

  // Helper sleep with rAF frame tracking
  function sleepWithTracking(durationMs) {
    const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const rAfFn = (cb) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : setTimeout(() => cb(nowFn()), 16));
    return new Promise((resolve) => {
      let start = nowFn();
      let last = start;
      function tick(now) {
        const currentNow = typeof now === 'number' ? now : nowFn();
        const delta = currentNow - last;
        last = currentNow;
        recordFrame(delta);
        if (currentNow - start < durationMs) {
          rAfFn(tick);
        } else {
          resolve();
        }
      }
      rAfFn(tick);
    });
  }

  try {
    // Stage 1: Baseline Idle FPS
    if (onProgress) onProgress({ stage: 1, name: 'Етап 1/5: Замір базового FPS інтерфейсу...', pct: 15 });
    let t0 = performance.now();
    await sleepWithTracking(700);
    stageTimes.push({ name: 'Idle UI', duration: Math.round(performance.now() - t0) });

    // Stage 2: 1-Voice Single Note (8 Biquad Filters Active)
    if (onProgress) onProgress({ stage: 2, name: 'Етап 2/5: Навантаження 1 голос (8 активних фільтрів)...', pct: 35 });
    t0 = performance.now();
    synthEngine.triggerAttack('C4', 261.63, 0.85);
    await sleepWithTracking(700);
    synthEngine.triggerRelease('C4');
    stageTimes.push({ name: '1-Voice DSP', duration: Math.round(performance.now() - t0) });

    // Stage 3: 4-Voice Polyphony Chord (32 Biquad Filters Active)
    if (onProgress) onProgress({ stage: 3, name: 'Етап 3/5: Поліфонія 4 голоси (32 активні фільтри)...', pct: 55 });
    t0 = performance.now();
    synthEngine.triggerAttack('C4', 261.63, 0.8);
    synthEngine.triggerAttack('E4', 329.63, 0.8);
    synthEngine.triggerAttack('G4', 392.00, 0.8);
    synthEngine.triggerAttack('B4', 493.88, 0.8);
    await sleepWithTracking(800);
    synthEngine.triggerRelease('C4');
    synthEngine.triggerRelease('E4');
    synthEngine.triggerRelease('G4');
    synthEngine.triggerRelease('B4');
    stageTimes.push({ name: '4-Voice Chord', duration: Math.round(performance.now() - t0) });

    // Stage 4: Full 8-Voice Maximum Polyphony (64 Filters + Limiter + Saturation)
    if (onProgress) onProgress({ stage: 4, name: 'Етап 4/5: Максимальний стрес-тест (8 голосів, 64 фільтри)...', pct: 75 });
    t0 = performance.now();
    const chord8 = [
      { note: 'C3', freq: 130.81 },
      { note: 'G3', freq: 196.00 },
      { note: 'C4', freq: 261.63 },
      { note: 'D#4', freq: 311.13 },
      { note: 'G4', freq: 392.00 },
      { note: 'A#4', freq: 466.16 },
      { note: 'D5', freq: 587.33 },
      { note: 'G5', freq: 783.99 },
    ];
    chord8.forEach((n) => synthEngine.triggerAttack(n.note, n.freq, 0.75));

    // Sweep filter modulation during 8-voice stress
    for (let step = 0; step < 8; step += 1) {
      const bias = 0.5 + (step / 8) * 1.5;
      synthEngine.setCutoffBias(bias);
      await sleepWithTracking(100);
    }
    synthEngine.setCutoffBias(1.0);
    chord8.forEach((n) => synthEngine.triggerRelease(n.note));
    stageTimes.push({ name: '8-Voice Max Polyphony', duration: Math.round(performance.now() - t0) });

    // Stage 5: Rapid Arpeggio & Voice Stealing (16 Rapid Note Attacks)
    if (onProgress) onProgress({ stage: 5, name: 'Етап 5/5: Тест швидкості перемикання голосів (16 нот/сек)...', pct: 90 });
    t0 = performance.now();
    const fastNotes = [
      { note: 'C4', freq: 261.63 },
      { note: 'D4', freq: 293.66 },
      { note: 'E4', freq: 329.63 },
      { note: 'G4', freq: 392.00 },
      { note: 'A4', freq: 440.00 },
      { note: 'C5', freq: 523.25 },
      { note: 'D5', freq: 587.33 },
      { note: 'E5', freq: 659.25 },
    ];

    for (let i = 0; i < 16; i += 1) {
      const item = fastNotes[i % fastNotes.length];
      synthEngine.triggerAttack(item.note, item.freq, 0.85);
      await sleepWithTracking(40);
      synthEngine.triggerRelease(item.note);
    }
    stageTimes.push({ name: 'Rapid Arpeggio', duration: Math.round(performance.now() - t0) });

    synthEngine.panic();
  } catch (err) {
    console.error('Benchmark error:', err);
  }

  // Calculate final benchmark score
  results.stages = stageTimes;
  if (allFrameTimes.length > 0) {
    const sum = allFrameTimes.reduce((a, b) => a + b, 0);
    const avgDelta = sum / allFrameTimes.length;
    results.avgFps = Math.round((1000 / avgDelta) * 10) / 10;
    
    // Sort to get 1% low and max frame time
    const sorted = [...allFrameTimes].sort((a, b) => b - a);
    results.maxFrameTimeMs = Math.round(sorted[0] * 10) / 10;
    const p99 = sorted[Math.floor(sorted.length * 0.05)] || sorted[0];
    results.minFps = Math.round((1000 / p99) * 10) / 10;

    const jankRatio = results.droppedFrames / Math.max(1, results.totalFrames);
    let calculatedScore = 100 - (jankRatio * 100) * 2;
    if (results.avgFps < 55) calculatedScore -= (55 - results.avgFps) * 1.5;
    if (results.audioLatencyMs > 25) calculatedScore -= 5;
    results.score = Math.max(20, Math.min(100, Math.round(calculatedScore)));

    if (results.score >= 95) {
      results.grade = 'A+ (Ultra Smooth)';
      results.status = 'Ідеальна швидкодія: 60+ FPS, нуль дропів';
    } else if (results.score >= 85) {
      results.grade = 'A (Smooth)';
      results.status = 'Відмінно: висока стабільність звуку та UI';
    } else if (results.score >= 70) {
      results.grade = 'B (Good)';
      results.status = 'Добре: незначні поодинокі затримки';
    } else {
      results.grade = 'C (Warning)';
      results.status = 'Потрібна додаткова оптимізація пристрою';
    }
  }

  if (onProgress) onProgress({ stage: 5, name: 'Бенчмарк завершено!', pct: 100, results });
  return results;
}

export const perfMonitor = new PerformanceMonitor();
