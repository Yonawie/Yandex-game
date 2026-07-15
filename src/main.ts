import { Difficulty } from "./data/balance";
import { Sfx } from "./game/audio/sfx";
import { Game } from "./game/Game";
import { Renderer } from "./game/Renderer";

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

const canvas = document.getElementById("game") as HTMLCanvasElement;
const game = new Game();
const renderer = new Renderer(canvas, game);

let ysdk: Awaited<ReturnType<NonNullable<typeof window.YaGames>["init"]>> | null = null;
let deathsSinceFs = 0;
let gameplayOn = false;

function resize() {
  const w = Math.min(window.innerWidth, 480);
  const h = window.innerHeight;
  renderer.resize(w, h);
  // center canvas in body
  canvas.style.marginLeft = `${(window.innerWidth - w) / 2}px`;
}

async function initYandex() {
  try {
    if (window.YaGames) {
      ysdk = await window.YaGames.init();
      ysdk.features?.LoadingAPI?.ready();
    }
  } catch {
    // offline / stub
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
  if (id) {
    handleUi(id);
    return;
  }
  if (game.phase === "playing") {
    const a = renderer.cellAt(x, y);
    game.tapCell(a);
  }
}

function handleUi(id: string) {
  if (id.startsWith("tray-")) {
    game.selectTray(Number(id.slice(5)));
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
    case "undo":
      game.undoLast();
      break;
    case "submit": {
      game.submit();
      break;
    }
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
        onClose: () => {
          /* no reward if closed early — SDK usually still calls onRewarded only when earned */
        },
        onError: () => apply(), // offline stub path
      },
    });
  } else {
    apply();
  }
}

function maybeFullscreen() {
  if (deathsSinceFs < 2) return;
  deathsSinceFs = 0;
  if (ysdk?.adv?.showFullscreenAdv) {
    ysdk.adv.showFullscreenAdv({ callbacks: {} });
  }
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    const rect = canvas.getBoundingClientRect();
    onPointer(e.clientX - rect.left, e.clientY - rect.top);
  },
  { passive: true },
);

window.addEventListener("keydown", (e) => {
  if (game.phase !== "playing") return;
  if (e.key === "Enter") game.submit();
  if (e.key === "Backspace" || e.key === "Escape") game.undoLast();
});

window.addEventListener("resize", resize);
resize();

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  // detect result transition mid-frame (full board)
  if (game.phase === "result" && gameplayOn) {
    gameplayStop();
    deathsSinceFs++;
    maybeFullscreen();
  }
  renderer.draw(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

void initYandex();
