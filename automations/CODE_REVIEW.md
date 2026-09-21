# Код-рев'ю проєкту: SUBUNDERGRUND ELECTRONIC
**Дата**: 2026-09-20  
**Ціль проєкту**: Повноцінний цифровий синтезатор (DSP Audio Synthesizer) з апаратними інтерфейсами (MIDI, Web Serial) та кросплатформною підтримкою (Web, Android Cordova, Electron).

---

## 1. Загальний огляд архітектури

| Компонент | Поточний стан | Оцінка |
| :--- | :--- | :--- |
| **Фреймворк UI** | Techno4 v2.0.5 (`.t4` компоненти, dom64) | 🟢 Легкий, швидкий реактивний UI на базі мобільних UI-патернів |
| **Збирач / Бандлер** | Vite v8.3.0 + `rollup-plugin-techno4` | 🟢 Швидкий HMR та збірка |
| **Аудіо-рушій** | Web Audio API на сторінці `audio-workshop.t4` | 🟡 Базовий прототип; потребує винесення в окремий модульний шар |
| **MIDI інтеграція** | Web MIDI API на сторінці `hardware.t4` | 🔴 Виявляє пристрої, але **не підключений до генерації звуку** |
| **Serial / Hardware** | Web Serial API на сторінці `hardware.t4` | 🟡 Реалізовано надсилання команд, відсутній цикл читання потоку |
| **Керування станом** | `src/js/store.js` | 🔴 Залишився шаблонний код магазину товарів (iPhone), не адаптований під синтезатор |
| **Кросплатформність** | Cordova (Android + Electron) | 🟢 Налаштовані скрипти збірки та маніфести |

---

## 2. Детальний аналіз аудіо-рушія (`src/pages/audio-workshop.t4`)

### 2.1. Ланцюг проходження сигналу (Audio Signal Graph)
Поточний ланцюг:
```
[OscillatorNode] ──> [Voice GainNode] ──> [Master GainNode] ──> [BiquadFilterNode] ──> [AnalyserNode] ──> [AudioDestination]
```
#### Зауваження:
1. **Відсутність майстер-лімітера/компресора (`DynamicsCompressorNode`)**:
   - При поліфонії (натисканні кількох клавіш одночасно) або при високому резонансі фільтра ($Q > 4$), сума амплітуд перевищує $0\text{ dBFS}$. Це викликає жорсткий цифровий кліпінг і спотворення звуку.
   - **Рекомендація**: Перед `AudioDestination` обов'язково встановити захисний лімітер:
     ```javascript
     const limiter = audioCtx.createDynamicsCompressor();
     limiter.threshold.setValueAtTime(-1.0, audioCtx.currentTime);
     limiter.ratio.setValueAtTime(20.0, audioCtx.currentTime);
     ```

2. **Керування голосами (Voice Allocation & Stealing)**:
   - Голоси зберігаються у `Map` за назвою ноти (`activeVoices.set(note, ...)`).
   - Немає ліміту поліфонії. При швидкій грі через зовнішній MIDI-секвенсор можуть одночасно генеруватися десятки осциляторів, викликаючи падіння FPS та тротлінг аудіо-потоку.
   - **Рекомендація**: Реалізувати пул фіксованої кількості голосів (наприклад, 8 або 16 голосів) із чергою LRU (Least Recently Used) для перехоплення найстарішого голосу (Voice Stealing).

3. **Огинаюча (ADSR Envelope)**:
   - Наразі реалізовано лише спрощений підйом (Attack $\approx 0.02\text{s}$) та спад (Release $\approx 0.08\text{s}$). Відсутні стадії Decay та Sustain.
   - У методі `stopNote`:
     ```javascript
     voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
     voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
     ```
     `exponentialRampToValueAtTime` викликає критичну помилку `DOMException: InvalidAccessError`, якщо стартове значення виявиться $\le 0$. Безпечніше використовувати:
     ```javascript
     voice.gain.gain.setTargetAtTime(0.0001, now, releaseTime / 3);
     ```

4. **Окремі фільтри або модуляція фільтра на кожен голос**:
   - Зараз фільтр спільний для всіх нот, тому всі натиснуті клавіші зрізаються однаково. Для класичного аналогового або сучасного басового звучання потрібна індивідуальна модуляція частоти зрізу фільтра (Filter Envelope).

5. **Продуктивність осцилографа (`requestAnimationFrame`)**:
   - Функція `draw()` працює безперервно у фоні, навіть коли синтезатор мовчить.
   - **Рекомендація**: Призупиняти цикл рендерингу осцилографа, коли `activeVoiceCount === 0`, і відновлювати при появі звуку, що заощадить до 15-20% заряду батареї на мобільних пристроях.

---

## 3. Апаратні інтерфейси (`src/pages/hardware.t4`)

### 3.1. Web MIDI API
- **Позитивно**: Коректне використання `navigator.requestMIDIAccess()`, відслідковування списку підключених контролерів та прийом `onmidimessage`.
- **Проблема**: Сторінка лише виводить HEX-код події (`0x90 60 100`). Синтезатор **не реагує** на клавіші зовнішньої MIDI-клавіатури!
- **Рішення**: Підключити MIDI-події до глобального диспетчера:
  - `0x90` (Note On) з velocity > 0 $\rightarrow$ `synth.triggerAttack(note, velocity)`
  - `0x80` (Note Off) або `0x90` з velocity 0 $\rightarrow$ `synth.triggerRelease(note)`
  - `0xB0` (Control Change) $\rightarrow$ мапінг CC на Cutoff, Resonance, Volume, Pitch Bend.

### 3.2. Web Serial API
- **Позитивно**: Реалізовано відкриття порту на 115200 бод та відправку рядкових команд через `TextEncoder`.
- **Проблема**: Відсутній цикл читання вхідних даних з мікроконтролера (`serialPort.readable.getReader()`). Якщо підключити плату (ESP32 / Teensy / Arduino / Eurorack-контролер), синтезатор не отримає дані енкодерів чи датчиків.
- **Рішення**: Додати асинхронну функцію безперервного читання:
  ```javascript
  async function readSerialLoop(port) {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) handleIncomingHardwarePacket(value);
    }
  }
  ```

---

## 4. Стан та архітектура коду (`src/js/store.js`, модульність)

1. **`src/js/store.js`**:
   - Містить залишкові дані інтернет-магазину.
   - Необхідно трансформувати в **AudioSynthStore**:
     - `synth`: параметри осциляторів (Osc1, Osc2, Sub, Noise), параметри мікшера, параметри фільтра, ADSR амплітуди, ADSR фільтра, LFO 1/2, FX (Delay, Reverb, Distortion).
     - `presets`: банк збережених звуків (Init Patch, Techno Bass, Cyber Lead, Deep Pad).
     - `hardware`: активний MIDI вхід, статус Serial з'єднання.

2. **Виділення чистого аудіо-модуля (`src/audio/`)**:
   - Зараз логіка Web Audio знаходиться всередині розмітки компонента `audio-workshop.t4`.
   - Рекомендується створити незалежний рушій `src/audio/engine.js`:
     - Клас `SynthesizerEngine`
     - Клас `Voice`
     - Модуль `MidiBridge`
     - Модуль `PresetManager`
   - Це дозволить тестувати аудіо-логіку автономно та легко підключати до будь-яких інтерфейсів чи тестів.

---

## 5. Робота з OpenClaw для обчислювальних задач

Синтезатор потребує низки ресурсомістких і складних алгоритмічних розрахунків:
1. **Генерація вейвтейблів (Wavetable Synthesis)**: Розрахунок дискретних таблиць хвильових форм через ряди Фур'є (Band-limited Fourier series) для запобігання аліасингу (anti-aliasing).
2. **AudioWorklet DSP код**: Створення оптимізованих процесорів обробки звуку на низькому рівні (Moog Ladder Filter, Overdrive saturation, Reverb delay networks).
3. **Генерація патчів**: Створення банків пресетів у форматі JSON за описом тембру.
4. **Прошивки для мікроконтролерів**: Генерація C++/Arduino коду для комунікації по Web Serial.

Всі ці задачі делегуються локальному помічнику **OpenClaw** через створений раннер `automations/openclaw-runner.mjs`.

---

## 6. План дій (Next Steps)

1. **Крок 1**: Рефакторинг `src/js/store.js` — перехід на структуру параметрів синтезатора.
2. **Крок 2**: Створення модульного ядра `src/audio/` (DSP Engine, Voice Manager з Voice Stealing, захисний компресор/лімітер, повний ADSR).
3. **Крок 3**: Інтеграція Web MIDI та Web Serial безпосередньо з `src/audio/engine.js`.
4. **Крок 4**: Використання OpenClaw для розрахунку та створення алгоритмів синтезу (Wavetable / AudioWorklet).
