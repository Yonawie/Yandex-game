import { hideBoot, setBootHint } from "./bootUi";

const MAX_W = 480;

async function waitFonts(ms = 900) {
  const fonts = document.fonts;
  if (!fonts?.load) return;
  try {
    await Promise.race([
      Promise.all([
        fonts.load("600 16px Manrope"),
        fonts.load("700 48px Unbounded"),
        fonts.ready,
      ]),
      new Promise<void>((r) => setTimeout(r, ms)),
    ]);
  } catch {
    /* system fallback */
  }
}

async function boot() {
  const parent = document.getElementById("game");
  if (!parent) throw new Error("#game missing");

  setBootHint("Шрифты…");
  await waitFonts();

  setBootHint("Движок…");
  // Dynamic import → separate phaser chunk; HTML splash paints first.
  const [{ default: Phaser }, { BootScene }, { MainScene }] = await Promise.all([
    import("phaser"),
    import("./game/scenes/BootScene"),
    import("./game/scenes/MainScene"),
  ]);

  setBootHint("Старт…");
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: "game",
    backgroundColor: "#0A0610",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Math.min(window.innerWidth, MAX_W),
      height: window.innerHeight,
      expandParent: true,
    },
    input: {
      activePointers: 2,
    },
    scene: [BootScene, MainScene],
    banner: false,
    audio: {
      disableWebAudio: true,
    },
    render: {
      antialias: true,
      powerPreference: "high-performance",
      transparent: false,
    },
  });

  (window as unknown as { __echoGame?: Phaser.Game }).__echoGame = game;

  window.addEventListener("resize", () => {
    game.scale.resize(Math.min(window.innerWidth, MAX_W), window.innerHeight);
  });
}

boot().catch((err) => {
  console.error(err);
  setBootHint("Ошибка загрузки");
  // Keep splash visible with error; still allow dismiss after a beat.
  window.setTimeout(hideBoot, 2400);
});
