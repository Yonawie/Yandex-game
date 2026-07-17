(() => {
  const COLS = 14;
  const ROWS = 18;
  const MIN_LEN = 3;
  const START_LEN = 3;
  const MIN_LETTERS = 10;
  const MAX_LETTERS = 18;
  const MOVE_MS = 160;
  const SPAWN_MS = 2200;

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
    classic: {
      name: "Змейка",
      head: "#2f9e5b",
      body: "#3ecf7a",
      letter: "#f0c14b",
    },
    train: {
      name: "Паровозик",
      head: "#b8452f",
      body: "#d9783a",
      letter: "#f2d36b",
    },
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

  let snake = [];
  let dir = { x: 1, y: 0 };
  let pending = { x: 1, y: 0 };
  let letters = new Map(); // "x,y" -> char
  let prefix = "";
  let score = 0;
  let streak = 0;
  let running = false;
  let lastMove = 0;
  let lastSpawn = 0;
  let cell = 24;
  let flies = [];
  let toastTimer = 0;

  function key(x, y) { return `${x},${y}`; }

  function normalize(w) {
    return String(w || "").trim().toUpperCase().replace(/Ё/g, "Е");
  }

  function buildDictionary(list) {
    words = list.map(normalize).filter((w) => w.length >= 3 && w.length <= 8);
    words = [...new Set(words)].sort((a, b) => a.localeCompare(b, "ru"));
    wordSet = new Set(words);
    prefixSet = new Set();
    for (const w of words) {
      for (let i = 1; i <= w.length; i++) prefixSet.add(w.slice(0, i));
    }
  }

  function pickLetter() {
    let roll = Math.random() * FREQ_SUM;
    for (const [ch, w] of FREQ) {
      roll -= w;
      if (roll <= 0) return ch;
    }
    return "А";
  }

  function occupied() {
    const set = new Set(snake.map((s) => key(s.x, s.y)));
    for (const k of letters.keys()) set.add(k);
    return set;
  }

  function randomFreeCell() {
    const occ = occupied();
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() * COLS) | 0;
      const y = (Math.random() * ROWS) | 0;
      const k = key(x, y);
      if (!occ.has(k)) return { x, y };
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const k = key(x, y);
        if (!occ.has(k)) return { x, y };
      }
    }
    return null;
  }

  function spawnLetter() {
    if (letters.size >= MAX_LETTERS) return;
    const cellPos = randomFreeCell();
    if (!cellPos) return;
    letters.set(key(cellPos.x, cellPos.y), pickLetter());
  }

  function fillLetters() {
    let guard = 0;
    while (letters.size < MIN_LETTERS && guard++ < 64) spawnLetter();
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

  function resetGame() {
    snake = [];
    const sx = 3, sy = (ROWS / 2) | 0;
    for (let i = 0; i < START_LEN; i++) snake.push({ x: sx - i, y: sy, kind: "body", letter: null });
    dir = { x: 1, y: 0 };
    pending = { x: 1, y: 0 };
    letters.clear();
    prefix = "";
    score = 0;
    streak = 0;
    flies = [];
    running = true;
    fillLetters();
    setPrefix("");
    setStatus("Собирай слова из букв");
    refreshHud();
  }

  function opposite(a, b) { return a.x + b.x === 0 && a.y + b.y === 0; }

  function queueDir(x, y) {
    const n = { x, y };
    if (!opposite(n, dir)) pending = n;
  }

  function clearLetterSegments() {
    for (let i = snake.length - 1; i >= 0; i--) {
      if (snake.length <= MIN_LEN) break;
      if (snake[i].kind !== "letter") continue;
      const s = snake[i];
      flies.push({
        x: s.x + 0.5, y: s.y + 0.5, ch: s.letter || "·",
        vx: (Math.random() - 0.5) * 2, vy: -2.5 - Math.random(), life: 0.9,
      });
      snake.splice(i, 1);
    }
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
    clearLetterSegments();
    prefix = "";
    setPrefix("");
    showToast(isNew ? `${word} → копилка  +${gained}` : `${word}  +${gained}`);
    setStatus(isNew ? `В копилку: ${word}` : `Слово: ${word}`);
    refreshHud();
  }

  function step() {
    if (!running) return;
    if (!opposite(pending, dir)) dir = pending;
    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
      die();
      return;
    }

    const k = key(nx, ny);
    let ate = null;
    if (letters.has(k)) {
      ate = letters.get(k);
      letters.delete(k);
    }

    const willGrow = ate != null && prefixSet.has(prefix + ate);
    for (let i = 0; i < snake.length - (willGrow ? 0 : 1); i++) {
      if (snake[i].x === nx && snake[i].y === ny) {
        die();
        return;
      }
    }

    const oldTail = { ...snake[snake.length - 1] };
    const follow = willGrow ? snake : snake.slice(0, -1);
    const newHead = { x: nx, y: ny, kind: "body", letter: null };
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
        };
        if (wordSet.has(prefix)) commitWord(prefix);
      }
    }

    fillLetters();
  }

  function die() {
    running = false;
    setStatus(`Конец · очки ${score}${best ? ` · рекорд ${best}` : ""} · Заново`);
  }

  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cell = Math.floor(Math.min(w / COLS, h / ROWS));
    const cw = cell * COLS;
    const ch = cell * ROWS;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    canvas.style.margin = "0 auto";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const style = STYLES[styleId] || STYLES.classic;
    const w = cell * COLS;
    const h = cell * ROWS;
    ctx.clearRect(0, 0, w, h);

    // board
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#10261c");
    g.addColorStop(1, "#183528");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2) continue;
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    // letters
    for (const [k, ch] of letters) {
      const [x, y] = k.split(",").map(Number);
      const px = x * cell + cell * 0.08;
      const py = y * cell + cell * 0.08;
      const s = cell * 0.84;
      roundRect(px, py, s, s, 8, "#e7c356", "#2a2110");
      ctx.fillStyle = "#1a1408";
      ctx.font = `800 ${Math.floor(cell * 0.48)}px Unbounded, Manrope, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, x * cell + cell / 2, y * cell + cell / 2 + 1);
    }

    // snake
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const isHead = i === 0;
      const color = isHead ? style.head : (s.kind === "letter" ? style.letter : style.body);
      const pad = isHead ? 0.06 : 0.1;
      const px = s.x * cell + cell * pad;
      const py = s.y * cell + cell * pad;
      const size = cell * (1 - pad * 2);
      roundRect(px, py, size, size, isHead ? 10 : (styleId === "train" ? 4 : 9), color, "rgba(0,0,0,.25)");
      if (s.kind === "letter" && s.letter) {
        ctx.fillStyle = "#1a1408";
        ctx.font = `800 ${Math.floor(cell * 0.4)}px Unbounded, Manrope, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.letter, s.x * cell + cell / 2, s.y * cell + cell / 2 + 1);
      }
      if (isHead) {
        ctx.fillStyle = "#0b1612";
        const ex = s.x * cell + cell * (0.35 + dir.x * 0.12);
        const ey = s.y * cell + cell * (0.38 + dir.y * 0.12);
        ctx.beginPath();
        ctx.arc(ex, ey, cell * 0.07, 0, Math.PI * 2);
        ctx.arc(ex + cell * 0.18, ey, cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // flies
    for (const f of flies) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = "#f0c14b";
      ctx.font = `800 ${Math.floor(cell * 0.42)}px Unbounded, Manrope, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(f.ch, f.x * cell, f.y * cell);
      ctx.globalAlpha = 1;
    }
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
    if (running && ts - lastMove >= MOVE_MS) {
      lastMove = ts;
      step();
    }
    if (running && ts - lastSpawn >= SPAWN_MS) {
      lastSpawn = ts;
      if (letters.size < MAX_LETTERS) spawnLetter();
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

  // input
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
