(() => {
  // F2 world + fullscreen view + Pixel Flow-style juice
  const WORLD_COLS = 36;
  const WORLD_ROWS = 48;
  const TARGET_CELL = 32;
  const MIN_LEN = 3;
  const START_LEN = 3;
  const BASE_MOVE_MS = 190;
  const SPAWN_MS = 1600;
  const LETTER_TTL_MS = 15000;
  const TURN_QUEUE_MAX = 2;
  const NEAR_HEAD_RADIUS = 8;
  const NEAR_HEAD_CHANCE = 0.5;
  const CAMERA_LERP = 0.12;
  const GRACE_TICKS = 2;

  const FREQ = [
    ["О", 10], ["Е", 9], ["А", 8], ["И", 8], ["Н", 7], ["Т", 7],
    ["С", 6], ["Р", 6], ["В", 5], ["Л", 5], ["К", 4], ["М", 4],
    ["Д", 4], ["П", 3], ["У", 3], ["Я", 3], ["Ы", 2], ["Ь", 2],
    ["Г", 2], ["З", 2], ["Б", 2], ["Ч", 1], ["Й", 1], ["Х", 1],
    ["Ж", 1], ["Ш", 1], ["Ю", 1], ["Ц", 1], ["Щ", 1], ["Ф", 1],
    ["Э", 1], ["Ъ", 1],
  ];
  const FREQ_SUM = FREQ.reduce((a, [, w]) => a + w, 0);

  const STYLES = {
    classic: { name: "Змейка", head: "#2f9e5b", body: "#3ecf7a", letter: "#f0c14b" },
    train: { name: "Паровозик", head: "#b8452f", body: "#d9783a", letter: "#f2d36b" },
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const elScore = document.getElementById("score");
  const elPiggy = document.getElementById("piggy");
  const elPrefix = document.getElementById("prefix");
  const elStatus = document.getElementById("status");
  const elToast = document.getElementById("toast");
  const modal = document.getElementById("modal");
  const modalProgress = document.getElementById("modalProgress");
  const modalWords = document.getElementById("modalWords");
  const elCombo = document.getElementById("combo");
  const btnMute = document.getElementById("btnMute");

  let words = [];
  let wordSet = new Set();
  let prefixSet = new Set();
  let unlocked = new Set(JSON.parse(localStorage.getItem("ls_piggy") || "[]"));
  let styleId = localStorage.getItem("ls_style") || "classic";
  let best = Number(localStorage.getItem("ls_best") || 0);
  let muted = localStorage.getItem("ls_muted") === "1";

  let snake = [];
  let dir = { x: 1, y: 0 };
  let turnQueue = [];
  let letters = new Map();
  let prefix = "";
  let score = 0;
  let streak = 0;
  let running = false;
  let lastMove = 0;
  let lastSpawn = 0;
  let moveInterval = BASE_MOVE_MS;
  let moveProgress = 0;
  let cell = 24;
  let viewW = 16;
  let viewH = 22;
  let camX = 0;
  let camY = 0;
  let camTargetX = 0;
  let camTargetY = 0;
  let grace = 0;
  let flies = [];
  let particles = [];
  let ripples = [];
  let toastTimer = 0;
  let comboTimer = 0;
  let reserveWords = [];
  let viewOffsetX = 0;
  let viewOffsetY = 0;
  let canvasCssW = 0;
  let canvasCssH = 0;

  // Juice state
  let hitStopUntil = 0;
  let shakeAmp = 0;
  let shakeX = 0;
  let shakeY = 0;
  let flashAlpha = 0;
  let headSquash = 0; // 0..1
  let deathAnim = null; // {t, reason}
  let chromaPulse = 0;

  // --- Audio (Web Audio, no assets) ---
  const AudioFX = {
    ctx: null,
    ensure() {
      if (muted) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    beep(freq, dur, type, vol, slide) {
      const ac = this.ensure();
      if (!ac) return;
      const t0 = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    move() { this.beep(180, 0.03, "triangle", 0.02); },
    eat() { this.beep(420, 0.07, "square", 0.07, 660); },
    bad() { this.beep(160, 0.12, "sawtooth", 0.06, 80); },
    word(len, isNew) {
      const base = 380 + len * 40;
      this.beep(base, 0.08, "square", 0.08, base * 1.4);
      setTimeout(() => this.beep(base * 1.25, 0.1, "square", 0.07, base * 1.8), 60);
      if (isNew) setTimeout(() => this.beep(880, 0.14, "triangle", 0.06, 1200), 140);
    },
    die() { this.beep(220, 0.08, "sawtooth", 0.08, 90); setTimeout(() => this.beep(90, 0.22, "triangle", 0.07), 90); },
  };

  function key(x, y) { return `${x},${y}`; }
  function area() { return WORLD_COLS * WORLD_ROWS; }
  function letterMin() { return Math.max(18, Math.round(area() * 0.05)); }
  function letterMax() { return Math.max(letterMin() + 8, Math.round(area() * 0.085)); }
  function normalize(w) {
    return String(w || "").trim().toUpperCase().replace(/Ё/g, "Е");
  }

  function buildDictionary(list) {
    words = [...new Set(list.map(normalize).filter((w) => w.length >= 3 && w.length <= 8))]
      .sort((a, b) => a.localeCompare(b, "ru"));
    wordSet = new Set(words);
    prefixSet = new Set();
    for (const w of words) {
      for (let i = 1; i <= w.length; i++) prefixSet.add(w.slice(0, i));
    }
  }

  function pickLetterRaw() {
    let roll = Math.random() * FREQ_SUM;
    for (const [ch, w] of FREQ) {
      roll -= w;
      if (roll <= 0) return ch;
    }
    return "А";
  }

  function refreshReserve() {
    while (reserveWords.length < 2 && words.length) {
      const w = words[(Math.random() * words.length) | 0];
      if (!reserveWords.includes(w)) reserveWords.push(w);
    }
  }

  function letterBagOnField() {
    const bag = new Map();
    for (const { ch } of letters.values()) bag.set(ch, (bag.get(ch) || 0) + 1);
    return bag;
  }

  function missingForWord(word, bag) {
    const need = [];
    const used = new Map(bag);
    for (const ch of word) {
      const n = used.get(ch) || 0;
      if (n > 0) used.set(ch, n - 1);
      else need.push(ch);
    }
    return need;
  }

  function pickLetterSmart() {
    refreshReserve();
    if (prefix && Math.random() < 0.35) {
      const nexts = [];
      for (const w of words) {
        if (w.startsWith(prefix) && w.length > prefix.length) nexts.push(w[prefix.length]);
      }
      if (nexts.length) return nexts[(Math.random() * nexts.length) | 0];
    }
    if (Math.random() < 0.6 && reserveWords.length) {
      const candidates = [];
      for (const w of reserveWords) {
        if (prefix && !w.startsWith(prefix)) continue;
        candidates.push(...missingForWord(w.slice(prefix.length), letterBagOnField()));
      }
      if (candidates.length) return candidates[(Math.random() * candidates.length) | 0];
    }
    return pickLetterRaw();
  }

  function occupied() {
    const set = new Set(snake.map((s) => key(s.x, s.y)));
    for (const k of letters.keys()) set.add(k);
    return set;
  }

  function head() { return snake[0]; }

  function randomFreeCell(preferNearHead) {
    const occ = occupied();
    const h = head();
    if (preferNearHead && h) {
      for (let i = 0; i < 50; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 2 + Math.random() * NEAR_HEAD_RADIUS;
        const x = Math.round(h.x + Math.cos(ang) * dist);
        const y = Math.round(h.y + Math.sin(ang) * dist);
        if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) continue;
        const k = key(x, y);
        if (!occ.has(k)) return { x, y };
      }
    }
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() * WORLD_COLS) | 0;
      const y = (Math.random() * WORLD_ROWS) | 0;
      const k = key(x, y);
      if (!occ.has(k)) return { x, y };
    }
    for (let y = 0; y < WORLD_ROWS; y++) {
      for (let x = 0; x < WORLD_COLS; x++) {
        const k = key(x, y);
        if (!occ.has(k)) return { x, y };
      }
    }
    return null;
  }

  function spawnLetter(forceNear) {
    if (letters.size >= letterMax()) return;
    const near = forceNear || Math.random() < NEAR_HEAD_CHANCE;
    const cellPos = randomFreeCell(near);
    if (!cellPos) return;
    letters.set(key(cellPos.x, cellPos.y), { ch: pickLetterSmart(), born: performance.now() });
  }

  function fillLetters() {
    let guard = 0;
    while (letters.size < letterMin() && guard++ < 120) spawnLetter(guard < 40);
  }

  function expireLetters(now) {
    for (const [k, v] of [...letters.entries()]) {
      if (now - v.born > LETTER_TTL_MS) {
        burstParticles(v.ch ? cellCenter(k) : null, "#888", 4);
        letters.delete(k);
      }
    }
  }

  function cellCenter(k) {
    if (!k) return null;
    const [x, y] = k.split(",").map(Number);
    return { x: x + 0.5, y: y + 0.5 };
  }

  function burstParticles(pos, color, n) {
    if (!pos) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 3.5;
      particles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        size: 0.12 + Math.random() * 0.18,
        color,
      });
    }
  }

  function addRipple(wx, wy, color) {
    ripples.push({ x: wx, y: wy, r: 0.2, max: 3.2, life: 1, color });
  }

  function punch(amp, flash, stopMs) {
    shakeAmp = Math.max(shakeAmp, amp);
    flashAlpha = Math.max(flashAlpha, flash || 0);
    if (stopMs) hitStopUntil = Math.max(hitStopUntil, performance.now() + stopMs);
  }

  function savePiggy() {
    localStorage.setItem("ls_piggy", JSON.stringify([...unlocked]));
  }

  function setStatus(t) { if (elStatus) elStatus.textContent = t; }
  function setPrefix(p) { if (elPrefix) elPrefix.textContent = p || "· · ·"; }
  function refreshHud() {
    if (elScore) elScore.textContent = String(score);
    if (elPiggy) elPiggy.textContent = `Копилка ${unlocked.size}/${words.length || 1}`;
    if (btnMute) btnMute.textContent = muted ? "🔇" : "🔊";
  }

  function showToast(text) {
    if (!elToast) return;
    elToast.textContent = text;
    elToast.classList.add("show");
    toastTimer = 1400;
  }

  function showCombo(n) {
    if (!elCombo) return;
    if (n < 2) { elCombo.classList.remove("show"); return; }
    elCombo.textContent = `COMBO ×${n}`;
    elCombo.classList.add("show");
    comboTimer = 900;
  }

  function opposite(a, b) { return a.x + b.x === 0 && a.y + b.y === 0; }

  function queueDir(x, y) {
    const n = { x, y };
    const last = turnQueue.length ? turnQueue[turnQueue.length - 1] : dir;
    if (opposite(n, last)) return;
    if (turnQueue.length && turnQueue[turnQueue.length - 1].x === n.x && turnQueue[turnQueue.length - 1].y === n.y) return;
    if (turnQueue.length >= TURN_QUEUE_MAX) turnQueue.shift();
    turnQueue.push(n);
  }

  function applyQueuedTurn() {
    while (turnQueue.length) {
      const n = turnQueue.shift();
      if (!opposite(n, dir)) { dir = n; break; }
    }
  }

  function updateCameraTarget() {
    const h = head();
    if (!h) return;
    // slight look-ahead
    camTargetX = h.x + 0.5 + dir.x * 1.2 - viewW / 2;
    camTargetY = h.y + 0.5 + dir.y * 1.2 - viewH / 2;
    camTargetX = Math.max(0, Math.min(WORLD_COLS - viewW, camTargetX));
    camTargetY = Math.max(0, Math.min(WORLD_ROWS - viewH, camTargetY));
  }

  function resetGame() {
    snake = [];
    const sx = (WORLD_COLS / 2) | 0;
    const sy = (WORLD_ROWS / 2) | 0;
    for (let i = 0; i < START_LEN; i++) {
      snake.push({ x: sx - i, y: sy, kind: "body", letter: null, px: sx - i, py: sy });
    }
    dir = { x: 1, y: 0 };
    turnQueue = [];
    letters.clear();
    prefix = "";
    score = 0;
    streak = 0;
    flies = [];
    particles = [];
    ripples = [];
    grace = 0;
    deathAnim = null;
    shakeAmp = 0;
    flashAlpha = 0;
    headSquash = 0;
    chromaPulse = 0;
    hitStopUntil = 0;
    reserveWords = [];
    refreshReserve();
    running = true;
    moveInterval = BASE_MOVE_MS;
    moveProgress = 0;
    fillLetters();
    updateCameraTarget();
    camX = camTargetX;
    camY = camTargetY;
    setPrefix("");
    setStatus("Собирай слова из букв");
    showCombo(0);
    refreshHud();
    AudioFX.ensure();
  }

  function clearLetterSegments(toPiggy) {
    const h = head();
    const target = { x: camX + viewW * 0.82, y: camY + 1.2 }; // toward piggy HUD
    for (let i = snake.length - 1; i >= 0; i--) {
      if (snake.length <= MIN_LEN) break;
      if (snake[i].kind !== "letter") continue;
      const s = snake[i];
      const from = { x: (s.px ?? s.x) + 0.5, y: (s.py ?? s.y) + 0.5 };
      flies.push({
        x: from.x, y: from.y, ch: s.letter || "·",
        tx: toPiggy ? target.x : from.x + (Math.random() - 0.5),
        ty: toPiggy ? target.y : from.y - 1.5,
        life: 1, max: 1,
        mode: toPiggy ? "piggy" : "fade",
      });
      burstParticles(from, STYLES[styleId].letter, 8);
      snake.splice(i, 1);
    }
    grace = GRACE_TICKS;
    moveInterval = BASE_MOVE_MS + 80;
  }

  function commitWord(word) {
    const isNew = !unlocked.has(word);
    if (isNew) {
      unlocked.add(word);
      savePiggy();
    }
    streak += 1;
    const gained = 10 * word.length * word.length + streak * 5 + (isNew ? 50 + word.length * 10 : 0);
    score += gained;
    if (score > best) {
      best = score;
      localStorage.setItem("ls_best", String(best));
    }
    reserveWords = reserveWords.filter((w) => w !== word);
    refreshReserve();

    const h = head();
    if (h) addRipple(h.x + 0.5, h.y + 0.5, isNew ? "#ffe08a" : "#7dffb0");
    punch(0.35 + word.length * 0.04, isNew ? 0.35 : 0.22, 90 + word.length * 12);
    chromaPulse = 1;
    headSquash = 1;
    AudioFX.word(word.length, isNew);
    showCombo(streak);

    clearLetterSegments(true);
    prefix = "";
    setPrefix("");
    showToast(isNew ? `${word} → копилка  +${gained}` : `${word}  +${gained}`);
    setStatus(isNew ? `В копилку: ${word}` : `Слово: ${word}`);
    refreshHud();
  }

  function onEatSuccess(ch, at) {
    headSquash = 1;
    burstParticles(at, "#ffe08a", 10);
    addRipple(at.x, at.y, "#ffd56a");
    punch(0.12, 0.08, 40);
    AudioFX.eat();
  }

  function onEatFail(at) {
    if (at) burstParticles(at, "#ff6b5a", 10);
    punch(0.28, 0.18, 70);
    AudioFX.bad();
    chromaPulse = 0.4;
  }

  function step() {
    if (!running || deathAnim) return;
    applyQueuedTurn();
    const h = head();
    const nx = h.x + dir.x;
    const ny = h.y + dir.y;

    if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) {
      if (grace > 0) return;
      die("wall");
      return;
    }

    const k = key(nx, ny);
    let ate = null;
    if (letters.has(k)) {
      ate = letters.get(k).ch;
      letters.delete(k);
    }

    const willGrow = ate != null && prefixSet.has(prefix + ate);
    for (let i = 0; i < snake.length - (willGrow ? 0 : 1); i++) {
      if (snake[i].x === nx && snake[i].y === ny) {
        if (grace > 0) return;
        die("self");
        return;
      }
    }

    for (const s of snake) {
      s.px = s.x;
      s.py = s.y;
    }

    const oldTail = { ...snake[snake.length - 1] };
    const follow = willGrow ? snake : snake.slice(0, -1);
    const newHead = { x: nx, y: ny, kind: "body", letter: null, px: h.x, py: h.y };
    snake = [newHead, ...follow.map((s) => ({ ...s }))];

    if (ate != null) {
      const at = { x: nx + 0.5, y: ny + 0.5 };
      const next = prefix + ate;
      if (!prefixSet.has(next)) {
        prefix = "";
        setPrefix("");
        clearLetterSegments(false);
        streak = 0;
        showCombo(0);
        setStatus("Цепочка сброшена");
        onEatFail(at);
      } else {
        prefix = next;
        setPrefix(prefix);
        snake[snake.length - 1] = {
          x: oldTail.x,
          y: oldTail.y,
          kind: "letter",
          letter: ate,
          px: oldTail.px ?? oldTail.x,
          py: oldTail.py ?? oldTail.y,
        };
        onEatSuccess(ate, at);
        if (wordSet.has(prefix)) commitWord(prefix);
      }
    } else {
      AudioFX.move();
    }

    if (grace > 0) grace -= 1;
    moveInterval = Math.max(140, BASE_MOVE_MS * (0.88 + 0.025 * Math.min(snake.length, 12)));
    moveProgress = 0;
    fillLetters();
    updateCameraTarget();
  }

  function die(reason) {
    if (deathAnim) return;
    running = false;
    deathAnim = { t: 0, reason };
    AudioFX.die();
    punch(0.5, 0.3, 120);
    const h = head();
    if (h) burstParticles({ x: h.x + 0.5, y: h.y + 0.5 }, "#ff6b5a", 18);
    setStatus(reason === "wall" ? "Врезался в край" : "Врезался в себя");
  }

  function finishDeath() {
    setStatus(`Конец · очки ${score}${best ? ` · рекорд ${best}` : ""} · Заново`);
    deathAnim = null;
  }

  function resize() {
    const wrap = canvas.parentElement;
    const w = Math.max(320, wrap.clientWidth || window.innerWidth);
    const h = Math.max(480, wrap.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasCssW = w;
    canvasCssH = h;

    cell = Math.max(18, Math.min(44, Math.round(TARGET_CELL * (w < 480 ? 0.85 : 1))));
    viewW = Math.min(WORLD_COLS, Math.max(12, Math.ceil(w / cell)));
    viewH = Math.min(WORLD_ROWS, Math.max(16, Math.ceil(h / cell)));
    cell = Math.max(14, Math.floor(Math.min(w / viewW, h / viewH)));

    const gridW = cell * viewW;
    const gridH = cell * viewH;
    viewOffsetX = Math.floor((w - gridW) / 2);
    viewOffsetY = Math.floor((h - gridH) / 2);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.style.margin = "0";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    updateCameraTarget();
    camX = camTargetX;
    camY = camTargetY;
  }

  function worldToScreen(wx, wy) {
    return {
      x: viewOffsetX + (wx - camX) * cell + shakeX,
      y: viewOffsetY + (wy - camY) * cell + shakeY,
    };
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function draw() {
    const style = STYLES[styleId] || STYLES.classic;
    const w = canvasCssW || cell * viewW;
    const h = canvasCssH || cell * viewH;
    ctx.clearRect(0, 0, w, h);

    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0a1812");
    g.addColorStop(1, "#142a1e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const x0 = Math.floor(camX);
    const y0 = Math.floor(camY);
    const x1 = Math.ceil(camX + viewW);
    const y1 = Math.ceil(camY + viewH);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) continue;
        if ((x + y) % 2) continue;
        const p = worldToScreen(x, y);
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(p.x, p.y, cell, cell);
      }
    }

    // ripples
    for (const r of ripples) {
      const p = worldToScreen(r.x, r.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r.r * cell, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, r.life) * 0.55;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const b0 = worldToScreen(0, 0);
    const b1 = worldToScreen(WORLD_COLS, WORLD_ROWS);
    ctx.strokeStyle = "rgba(240,193,75,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b0.x, b0.y, b1.x - b0.x, b1.y - b0.y);

    for (const [k, v] of letters) {
      const [x, y] = k.split(",").map(Number);
      if (x < camX - 1 || y < camY - 1 || x > camX + viewW + 1 || y > camY + viewH + 1) continue;
      const p = worldToScreen(x, y);
      const age = Math.min(1, (performance.now() - v.born) / LETTER_TTL_MS);
      const flash = age > 0.75 && ((performance.now() / 120) | 0) % 2 === 0;
      const s = cell * 0.84;
      roundRect(p.x + cell * 0.08, p.y + cell * 0.08, s, s, 8, flash ? "#fff0a8" : "#e7c356", "#2a2110");
      ctx.fillStyle = "#1a1408";
      ctx.font = `800 ${Math.floor(cell * 0.48)}px Unbounded, Manrope, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.ch, p.x + cell / 2, p.y + cell / 2 + 1);
    }

    const t = moveProgress;
    const deathFade = deathAnim ? Math.min(1, deathAnim.t / 0.85) : 0;
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const isHead = i === 0;
      const rx = (s.px ?? s.x) + (s.x - (s.px ?? s.x)) * t;
      const ry = (s.py ?? s.y) + (s.y - (s.py ?? s.y)) * t;
      if (rx < camX - 1 || ry < camY - 1 || rx > camX + viewW + 1 || ry > camY + viewH + 1) continue;
      const p = worldToScreen(rx, ry);
      const color = isHead ? style.head : (s.kind === "letter" ? style.letter : style.body);
      const pad = isHead ? 0.06 : 0.1;
      let bw = cell * (1 - pad * 2);
      let bh = cell * (1 - pad * 2);
      if (isHead && headSquash > 0) {
        const sq = headSquash;
        if (Math.abs(dir.x) > 0) { bw *= 1 + 0.25 * sq; bh *= 1 - 0.2 * sq; }
        else { bh *= 1 + 0.25 * sq; bw *= 1 - 0.2 * sq; }
      }
      if (deathAnim) {
        ctx.globalAlpha = 1 - deathFade * 0.85;
        const jitter = deathFade * 4;
        p.x += (Math.random() - 0.5) * jitter;
        p.y += (Math.random() - 0.5) * jitter;
      }
      roundRect(
        p.x + cell * pad + (cell * (1 - pad * 2) - bw) / 2,
        p.y + cell * pad + (cell * (1 - pad * 2) - bh) / 2,
        bw, bh,
        isHead ? 10 : (styleId === "train" ? 4 : 9),
        color,
        "rgba(0,0,0,.25)"
      );
      if (s.kind === "letter" && s.letter) {
        ctx.fillStyle = "#1a1408";
        ctx.font = `800 ${Math.floor(cell * 0.4)}px Unbounded, Manrope, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.letter, p.x + cell / 2, p.y + cell / 2 + 1);
      }
      if (isHead && !deathAnim) {
        ctx.fillStyle = "#0b1612";
        ctx.beginPath();
        ctx.arc(p.x + cell * (0.35 + dir.x * 0.12), p.y + cell * (0.38 + dir.y * 0.12), cell * 0.07, 0, Math.PI * 2);
        ctx.arc(p.x + cell * (0.53 + dir.x * 0.12), p.y + cell * (0.38 + dir.y * 0.12), cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    for (const f of flies) {
      const p = worldToScreen(f.x, f.y);
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = "#f0c14b";
      ctx.font = `800 ${Math.floor(cell * 0.42)}px Unbounded, Manrope, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(f.ch, p.x, p.y);
      ctx.globalAlpha = 1;
    }

    for (const p of particles) {
      const sp = worldToScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(sp.x, sp.y, p.size * cell, p.size * cell);
      ctx.globalAlpha = 1;
    }

    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,240,180,${flashAlpha * 0.55})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (chromaPulse > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(120,255,180,${chromaPulse * 0.08})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (deathAnim && deathAnim.t > 0.5) {
      ctx.fillStyle = `rgba(0,0,0,${(deathAnim.t - 0.5) * 0.7})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function updateJuice(dt) {
    if (shakeAmp > 0) {
      shakeX = (Math.random() - 0.5) * shakeAmp * cell;
      shakeY = (Math.random() - 0.5) * shakeAmp * cell;
      shakeAmp *= Math.pow(0.01, dt);
      if (shakeAmp < 0.02) { shakeAmp = 0; shakeX = 0; shakeY = 0; }
    }
    flashAlpha = Math.max(0, flashAlpha - dt * 2.2);
    headSquash = Math.max(0, headSquash - dt * 3.5);
    chromaPulse = Math.max(0, chromaPulse - dt * 1.8);

    for (const r of ripples) {
      r.r += dt * 4.5;
      r.life -= dt * 1.4;
    }
    ripples = ripples.filter((r) => r.life > 0 && r.r < r.max);

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += dt * 1.2;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);

    for (const f of flies) {
      if (f.mode === "piggy") {
        f.x += (f.tx - f.x) * Math.min(1, dt * 4.5);
        f.y += (f.ty - f.y) * Math.min(1, dt * 4.5);
        f.life -= dt * 0.9;
      } else {
        f.x += (f.tx - f.x) * dt * 2;
        f.y += (f.ty - f.y) * dt * 2;
        f.life -= dt * 1.2;
      }
    }
    flies = flies.filter((f) => f.life > 0);

    if (deathAnim) {
      deathAnim.t += dt;
      if (deathAnim.t >= 1.05) finishDeath();
    }
  }

  function loop(ts) {
    if (!lastMove) lastMove = ts;
    if (!lastSpawn) lastSpawn = ts;
    const dt = Math.min(0.05, (ts - (loop.prev || ts)) / 1000);
    loop.prev = ts;

    const inHitStop = ts < hitStopUntil;

    if (running && !deathAnim && !inHitStop) {
      moveProgress = Math.min(1, (ts - lastMove) / moveInterval);
      camX += (camTargetX - camX) * CAMERA_LERP;
      camY += (camTargetY - camY) * CAMERA_LERP;

      if (ts - lastMove >= moveInterval) {
        lastMove = ts;
        step();
        moveProgress = 0;
      }
      if (ts - lastSpawn >= SPAWN_MS) {
        lastSpawn = ts;
        expireLetters(ts);
        if (letters.size < letterMax()) spawnLetter();
      }
    } else if (!inHitStop) {
      // still ease camera a bit
      camX += (camTargetX - camX) * CAMERA_LERP;
      camY += (camTargetY - camY) * CAMERA_LERP;
    }

    updateJuice(dt);

    if (toastTimer > 0) {
      toastTimer -= dt * 1000;
      if (toastTimer <= 0 && elToast) elToast.classList.remove("show");
    }
    if (comboTimer > 0) {
      comboTimer -= dt * 1000;
      if (comboTimer <= 0 && elCombo) elCombo.classList.remove("show");
    }

    draw();
    requestAnimationFrame(loop);
  }

  function openPiggy() {
    modalProgress.textContent = `Открыто ${unlocked.size} из ${words.length}`;
    modalWords.innerHTML = "";
    for (const w of words) {
      const span = document.createElement("span");
      const open = unlocked.has(w);
      span.className = open ? "open" : "locked";
      span.textContent = open ? w : "•".repeat(w.length);
      modalWords.appendChild(span);
    }
    modal.classList.add("open");
  }

  function unlockAudioOnce() {
    AudioFX.ensure();
    window.removeEventListener("pointerdown", unlockAudioOnce);
    window.removeEventListener("keydown", unlockAudioOnce);
  }
  window.addEventListener("pointerdown", unlockAudioOnce);
  window.addEventListener("keydown", unlockAudioOnce);

  window.addEventListener("keydown", (e) => {
    const map = {
      ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
      ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
    };
    if (map[e.key]) { e.preventDefault(); queueDir(...map[e.key]); }
    if (e.key === "r" || e.key === "R") resetGame();
    if (e.key === "Tab") { e.preventDefault(); openPiggy(); }
    if (e.key === "Escape") modal.classList.remove("open");
    if (e.key === "m" || e.key === "M") toggleMute();
    if (e.key === "1") { styleId = "classic"; localStorage.setItem("ls_style", styleId); setStatus("Стиль: Змейка"); }
    if (e.key === "2") {
      if (unlocked.size >= 10) {
        styleId = "train";
        localStorage.setItem("ls_style", styleId);
        setStatus("Стиль: Паровозик");
      } else setStatus(`Паровозик откроется с 10 слов (сейчас ${unlocked.size})`);
    }
  });

  function toggleMute() {
    muted = !muted;
    localStorage.setItem("ls_muted", muted ? "1" : "0");
    refreshHud();
    if (!muted) AudioFX.ensure();
  }

  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 1 : -1, 0);
    else queueDir(0, dy > 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });

  document.querySelectorAll(".pad button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [x, y] = btn.dataset.dir.split(",").map(Number);
      queueDir(x, y);
    });
  });
  document.getElementById("btnRestart").onclick = () => resetGame();
  document.getElementById("btnPiggy").onclick = () => openPiggy();
  document.getElementById("btnClose").onclick = () => modal.classList.remove("open");
  if (btnMute) btnMute.onclick = () => toggleMute();
  document.getElementById("btnStyle").onclick = () => {
    if (styleId === "classic") {
      if (unlocked.size >= 10) {
        styleId = "train";
        setStatus("Стиль: Паровозик");
      } else {
        setStatus(`Паровозик откроется с 10 слов (сейчас ${unlocked.size})`);
        return;
      }
    } else {
      styleId = "classic";
      setStatus("Стиль: Змейка");
    }
    localStorage.setItem("ls_style", styleId);
  };
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });
  window.addEventListener("resize", resize);

  async function boot() {
    try {
      if (window.__WORDS__) buildDictionary(window.__WORDS__);
      else {
        const res = await fetch("./words.json");
        buildDictionary(await res.json());
      }
    } catch {
      buildDictionary(["ДОМ", "КОТ", "МОРЕ", "ЛЕС", "РЕКА", "СОН", "ИГРА", "СЛОВО", "ПОЛЕ", "НОС"]);
    }
    resize();
    resetGame();
    requestAnimationFrame(loop);
  }

  boot();
})();
