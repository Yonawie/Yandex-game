import { Difficulty } from "./data/balance";
import { StyleId } from "./data/styles";
import { Sfx } from "./game/audio/sfx";
import { Game } from "./game/Game";
import { Renderer } from "./game/Renderer";
import { juice } from "./game/visual/JuiceCamera";
import { VfxDirector } from "./game/visual/VfxDirector";
import { WorldView } from "./game/visual/WorldView";

declare global {
  interface Window {
    YaGames?: {
      init: () => Promise<{
        features?: {
          LoadingAPI?: { ready: () => void };
          GameplayAPI?: { start: () => void; stop: () => void };
        };
        adv?: {
          showFullscreenAdv?: (opts: { callbacks?: { onClose?: () => void } }) => void;
          showRewardedVideo?: (opts: {
            callbacks?: {
              onRewarded?: () => void;
              onClose?: () => void;
              onError?: () => void;
            };
          }) => void;
        };
      }>;
    };
  }
}

const stage = document.getElementById("stage") as HTMLDivElement;
const worldCanvas = document.getElementById("world") as HTMLCanvasElement;
const canvas = document.getElementById("game") as HTMLCanvasElement;
const game = new Game();
const renderer = new Renderer(canvas, game);
renderer.worldMode = false;

const world = new WorldView(worldCanvas, game);
let vfx: VfxDirector | null = null;
let worldReady = false;

let ysdk: Awaited<ReturnType<NonNullable<typeof window.YaGames>["init"]>> | null = null;
let deathsSinceFs = 0;
let gameplayOn = false;

function resize() {
  const w = Math.min(window.innerWidth, 480);
  const h = window.innerHeight;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.marginLeft = `${(window.innerWidth - w) / 2}px`;
  renderer.resize(w, h);
  if (worldReady) world.resize(w, h);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

async function bootVisual() {
  juice.attach(stage);
  try {
    await world.init();
    worldReady = true;
    vfx = new VfxDirector(world);
    game.onStrike = (payload) => {
      renderer.strikePress = 1;
      vfx?.playStrike({
        ...payload,
        style: game.style(),
      });
    };
    resize();
  } catch (err) {
    console.warn("WorldView init failed, Canvas juice still active", err);
    renderer.worldMode = false;
    // Canvas-only: still run camera juice on strike
    game.onStrike = (payload) => {
      renderer.strikePress = 1;
      juice.strike(payload.heavy);
    };
  }
}

async function initYandex() {
  try {
    if (window.YaGames) {
      ysdk = await window.YaGames.init();
      ysdk.features?.LoadingAPI?.ready();
    }
  } catch {
    /* stub */
  }
}

function gameplayStart() {
  if (gameplayOn) return;
  gameplayOn = true;
  ysdk?.features?.GameplayAPI?.start();
}

function gameplayStop() {
  if (!gameplayOn) return;
  gameplayOn = false;
  ysdk?.features?.GameplayAPI?.stop();
}

function startDiff(d: Difficulty) {
  Sfx.unlock();
  game.start(d);
  gameplayStart();
  resize();
}

function onPointer(x: number, y: number) {
  Sfx.unlock();
  const id = renderer.hitTest(x, y);
  if (id) handleUi(id);
}

function handleUi(id: string) {
  if (id.startsWith("tray-")) {
    game.selectTray(Number(id.slice(5)));
    return;
  }
  if (id.startsWith("style-")) {
    game.buyOrEquip(id.slice(6) as StyleId);
    return;
  }
  switch (id) {
    case "play-normal":
      startDiff("normal");
      break;
    case "play-easy":
      startDiff("easy");
      break;
    case "play-hard":
      startDiff("hard");
      break;
    case "play-infinity":
      startDiff("infinity");
      break;
    case "open-shop":
      gameplayStop();
      game.openShop();
      break;
    case "close-shop":
      game.closeShop();
      break;
    case "shop-up":
      game.shopScroll = Math.max(0, game.shopScroll - 160);
      break;
    case "undo":
      game.undoLast();
      break;
    case "submit":
      Sfx.strikeButton();
      renderer.strikePress = 1;
      game.submit();
      break;
    case "reshuffle":
      game.reshuffleTray();
      break;
    case "again":
      startDiff(game.difficulty);
      break;
    case "continue":
      showRewardedContinue();
      break;
    case "to-menu":
      gameplayStop();
      game.phase = "menu";
      break;
  }
}

function showRewardedContinue() {
  const apply = () => {
    if (game.rewardedContinue()) gameplayStart();
  };
  if (ysdk?.adv?.showRewardedVideo) {
    gameplayStop();
    ysdk.adv.showRewardedVideo({
      callbacks: {
        onRewarded: apply,
        onError: () => apply(),
      },
    });
  } else {
    apply();
  }
}

function maybeFullscreen() {
  if (deathsSinceFs < 2) return;
  deathsSinceFs = 0;
  ysdk?.adv?.showFullscreenAdv?.({ callbacks: {} });
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    const rect = canvas.getBoundingClientRect();
    onPointer(e.clientX - rect.left, e.clientY - rect.top);
  },
  { passive: true },
);

canvas.addEventListener(
  "wheel",
  (e) => {
    if (game.phase !== "shop") return;
    e.preventDefault();
    game.shopScroll += e.deltaY;
  },
  { passive: false },
);

window.addEventListener("keydown", (e) => {
  if (game.phase === "shop" && e.key === "Escape") game.closeShop();
  if (game.phase !== "playing") return;
  if (e.key === "Enter") {
    Sfx.strikeButton();
    renderer.strikePress = 1;
    game.submit();
  }
  if (e.key === "Backspace" || e.key === "Escape") game.undoLast();
});

window.addEventListener("resize", resize);
resize();

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  juice.update(dt);
  // hit-stop: freeze world sim briefly
  if (!juice.frozen) {
    game.update(dt);
  } else {
    // keep FX timers lightly alive so stamp/flash don't freeze forever
    if (game.stampT > 0) game.stampT = Math.max(0, game.stampT - dt * 0.35);
    if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 0.35);
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt);
  }

  if (game.phase === "result" && gameplayOn) {
    gameplayStop();
    deathsSinceFs++;
    maybeFullscreen();
  }
  if (worldReady) world.sync(t);
  renderer.draw(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

void bootVisual();
void initYandex();
