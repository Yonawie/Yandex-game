(() => {
  // F2: large logical world + camera follow
  const WORLD_COLS = 36;
  const WORLD_ROWS = 48;
  const TARGET_CELL = 32; // px preference; view expands to fill screen
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

  let words = [];
  let wordSet = new Set();
  let prefixSet = new Set();
  let unlocked = new Set(JSON.parse(localStorage.getItem("ls_piggy") || "[]"));
  let styleId = localStorage.getItem("ls_style") || "classic";
  let best = Number(localStorage.getItem("ls_best") || 0);

  /** @type {{x:number,y:number,kind:string,letter:string|null,px:number,py:number}[]} */
  let snake = [];
  let dir = { x: 1, y: 0 };
  /** @type {{x:number,y:number}[]} */
  let turnQueue = [];
  /** @type {Map<string,{ch:string,born:number}>} */
  let letters = new Map();
  let prefix = "";
  let score = 0;
  let streak = 0;
  let running = false;
  let lastMove = 0;
  let lastSpawn = 0;
  let moveInterval = BASE_MOVE_MS;
  let moveProgress = 0; // 0..1 between ticks
  let cell = 24;
  let viewW = VIEW_COLS;
  let viewH = VIEW_ROWS;
  let camX = 0; // world cells, top-left of view
  let camY = 0;
  let camTargetX = 0;
  let camTargetY = 0;
  let grace = 0;
  let flies = [];
  let toastTimer = 0;
  let reserveWords = [];

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
        if (w.startsWith(prefix) && w.length > prefix.length) {
          nexts.push(w[prefix.length]);
        }
      }
      if (nexts.length) return nexts[(Math.random() * nexts.length) | 0];
    }
    if (Math.random() < 0.6 && reserveWords.length) {
      const bag = letterBagOnField();
      for (const seg of snake) {
        if (seg.kind === "letter" && seg.letter) {
          bag.set(seg.letter, (bag.get(seg.letter) || 0) + 1);
        }
      }
      // Prefer letters missing for reserve words starting with current prefix
      const candidates = [];
      for (const w of reserveWords) {
        if (prefix && !w.startsWith(prefix)) continue;
        const fieldBag = letterBagOnField();
        candidates.push(...missingForWord(w.slice(prefix.length), fieldBag));
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
      if (now - v.born > LETTER_TTL_MS) letters.delete(k);
    }
  }

  function savePiggy() {
    localStorage.setItem("ls_piggy", JSON.stringify([...unlocked]));
  }

  function setStatus(t) { elStatus.textContent = t; }
  function setPrefix(p) { elPrefix.textContent = p || "· · ·"; }
  function refreshHud() {
    elScore.textContent = String(score);
    elPiggy.textContent = `Копилка ${unlocked.size}/${words.length || 1}`;
  }

  function showToast(text) {
    elToast.textContent = text;
    elToast.classList.add("show");
    toastTimer = 1400;
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
      if (!opposite(n, dir)) {
        dir = n;
        break;
      }
    }
  }

  function syncRenderPos(instant) {
    for (const s of snake) {
      if (instant || s.px == null) {
        s.px = s.x;
        s.py = s.y;
      }
    }
  }

  function updateCameraTarget() {
    const h = head();
    if (!h) return;
    camTargetX = h.x + 0.5 - viewW / 2;
    camTargetY = h.y + 0.5 - viewH / 2;
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
    grace = 0;
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
    setStatus(`Поле ${WORLD_COLS}×${WORLD_ROWS} · камера следует за головой`);
    refreshHud();
  }

  function clearLetterSegments() {
    for (let i = snake.length - 1; i >= 0; i--) {
      if (snake.length <= MIN_LEN) break;
      if (snake[i].kind !== "letter") continue;
      const s = snake[i];
      flies.push({
        x: s.px + 0.5, y: s.py + 0.5, ch: s.letter || "·",
        vx: (Math.random() - 0.5) * 2, vy: -2.5 - Math.random(), life: 0.9,
      });
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
    clearLetterSegments();
    prefix = "";
    setPrefix("");
    showToast(isNew ? `${word} → копилка  +${gained}` : `${word}  +${gained}`);
    setStatus(isNew ? `В копилку: ${word}` : `Слово: ${word}`);
    refreshHud();
  }

  function step() {
    if (!running) return;
    applyQueuedTurn();
    const h = head();
    const nx = h.x + dir.x;
    const ny = h.y + dir.y;

    if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) {
      if (grace > 0) {
        // slide along edge during grace
        return;
      }
      die();
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
        die();
        return;
      }
    }

    // snapshot previous for lerp
    for (const s of snake) {
      s.px = s.x;
      s.py = s.y;
    }

    const oldTail = { ...snake[snake.length - 1] };
    const follow = willGrow ? snake : snake.slice(0, -1);
    const newHead = { x: nx, y: ny, kind: "body", letter: null, px: h.x, py: h.y };
    snake = [newHead, ...follow.map((s) => ({ ...s }))];

    if (ate != null) {
      const next = prefix + ate;
      if (!prefixSet.has(next)) {
        prefix = "";
        setPrefix("");
        clearLetterSegments();
        streak = 0;
        setStatus("Цепочка сброшена");
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
        if (wordSet.has(prefix)) commitWord(prefix);
      }
    }

    if (grace > 0) grace -= 1;
    moveInterval = Math.max(140, BASE_MOVE_MS * (0.88 + 0.025 * Math.min(snake.length, 12)));
    moveProgress = 0;
    fillLetters();
    updateCameraTarget();
  }

  function die() {
    running = false;
    setStatus(`Конец · очки ${score}${best ? ` · рекорд ${best}` : ""} · Заново`);
  }

  let viewOffsetX = 0;
  let viewOffsetY = 0;
  let canvasCssW = 0;
  let canvasCssH = 0;

  function resize() {
    const wrap = canvas.parentElement;
    const w = Math.max(320, wrap.clientWidth || window.innerWidth);
    const h = Math.max(480, wrap.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasCssW = w;
    canvasCssH = h;

    // Fullscreen: choose cell size so the view covers the whole screen.
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
      x: viewOffsetX + (wx - camX) * cell,
      y: viewOffsetY + (wy - camY) * cell,
    };
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

    // visible world tiles
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

    // world border hint
    const b0 = worldToScreen(0, 0);
    const b1 = worldToScreen(WORLD_COLS, WORLD_ROWS);
    ctx.strokeStyle = "rgba(240,193,75,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(b0.x, b0.y, b1.x - b0.x, b1.y - b0.y);

    // letters (only near view)
    for (const [k, v] of letters) {
      const [x, y] = k.split(",").map(Number);
      if (x < camX - 1 || y < camY - 1 || x > camX + viewW + 1 || y > camY + viewH + 1) continue;
      const p = worldToScreen(x, y);
      const age = Math.min(1, (performance.now() - v.born) / LETTER_TTL_MS);
      const flash = age > 0.75 && ((performance.now() / 120) | 0) % 2 === 0;
      const px = p.x + cell * 0.08;
      const py = p.y + cell * 0.08;
      const s = cell * 0.84;
      roundRect(px, py, s, s, 8, flash ? "#fff0a8" : "#e7c356", "#2a2110");
      ctx.fillStyle = "#1a1408";
      ctx.font = `800 ${Math.floor(cell * 0.48)}px Unbounded, Manrope, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.ch, p.x + cell / 2, p.y + cell / 2 + 1);
    }

    // snake with lerp
    const t = moveProgress;
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const isHead = i === 0;
      const rx = (s.px ?? s.x) + (s.x - (s.px ?? s.x)) * t;
      const ry = (s.py ?? s.y) + (s.y - (s.py ?? s.y)) * t;
      if (rx < camX - 1 || ry < camY - 1 || rx > camX + viewW + 1 || ry > camY + viewH + 1) continue;
      const p = worldToScreen(rx, ry);
      const color = isHead ? style.head : (s.kind === "letter" ? style.letter : style.body);
      const pad = isHead ? 0.06 : 0.1;
      const size = cell * (1 - pad * 2);
      roundRect(p.x + cell * pad, p.y + cell * pad, size, size, isHead ? 10 : (styleId === "train" ? 4 : 9), color, "rgba(0,0,0,.25)");
      if (s.kind === "letter" && s.letter) {
        ctx.fillStyle = "#1a1408";
        ctx.font = `800 ${Math.floor(cell * 0.4)}px Unbounded, Manrope, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.letter, p.x + cell / 2, p.y + cell / 2 + 1);
      }
      if (isHead) {
        ctx.fillStyle = "#0b1612";
        ctx.beginPath();
        ctx.arc(p.x + cell * (0.35 + dir.x * 0.12), p.y + cell * (0.38 + dir.y * 0.12), cell * 0.07, 0, Math.PI * 2);
        ctx.arc(p.x + cell * (0.53 + dir.x * 0.12), p.y + cell * (0.38 + dir.y * 0.12), cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
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

    // Soft edge vignette only — no minimap (Pixel Flow: field owns the screen)
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function loop(ts) {
    if (!lastMove) lastMove = ts;
    if (!lastSpawn) lastSpawn = ts;

    if (running) {
      const dt = Math.min(48, ts - (loop.prev || ts));
      loop.prev = ts;
      moveProgress = Math.min(1, (ts - lastMove) / moveInterval);

      // smooth camera
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
    }

    if (toastTimer > 0) {
      toastTimer -= 16;
      if (toastTimer <= 0) elToast.classList.remove("show");
    }
    for (const f of flies) {
      f.x += f.vx * 0.016;
      f.y += f.vy * 0.016;
      f.vy *= 0.99;
      f.life -= 0.018;
    }
    flies = flies.filter((f) => f.life > 0);
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

  window.addEventListener("keydown", (e) => {
    const map = {
      ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
      ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
    };
    if (map[e.key]) {
      e.preventDefault();
      queueDir(...map[e.key]);
    }
    if (e.key === "r" || e.key === "R") resetGame();
    if (e.key === "Tab") { e.preventDefault(); openPiggy(); }
    if (e.key === "Escape") modal.classList.remove("open");
    if (e.key === "1") { styleId = "classic"; localStorage.setItem("ls_style", styleId); setStatus("Стиль: Змейка"); }
    if (e.key === "2") {
      if (unlocked.size >= 10) {
        styleId = "train";
        localStorage.setItem("ls_style", styleId);
        setStatus("Стиль: Паровозик");
      } else setStatus(`Паровозик откроется с 10 слов (сейчас ${unlocked.size})`);
    }
  });

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
