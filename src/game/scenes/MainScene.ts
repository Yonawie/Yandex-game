import Phaser from "phaser";
import { Difficulty } from "../../data/balance";
import { StyleId } from "../../data/styles";
import { t } from "../../i18n";
import { trackRetention } from "../../retention";
import {
  gameplayStart,
  gameplayStop,
  isGameplayOn,
  loadingReady,
  noteResultScreen,
  scheduleCloudSave,
  showRewarded,
  submitLeaderboardScore,
} from "../../sdk/yandex";
import { Sfx } from "../audio/sfx";
import { Game } from "../Game";
import { Renderer } from "../Renderer";
import { juice } from "../visual/JuiceCamera";

/**
 * Main Phaser scene — Scale / input / juice / SDK loop.
 * Frame paint stays on a DOM canvas overlay (Canvas materials)
 * until TexturePacker atlases replace MaterialFactory.
 */
export class MainScene extends Phaser.Scene {
  private core!: Game;
  private view!: Renderer;
  private frameCanvas!: HTMLCanvasElement;
  private readyOnce = false;
  private resultSdkDone = false;
  private lastW = 0;
  private lastH = 0;
  private shopDragY: number | null = null;
  private shopDragMoved = false;

  constructor() {
    super("Main");
  }

  create() {
    const w = Math.max(1, Math.floor(this.scale.width));
    const h = Math.max(1, Math.floor(this.scale.height));

    this.core = new Game();
    this.frameCanvas = document.createElement("canvas");
    this.frameCanvas.id = "echo-view";
    Object.assign(this.frameCanvas.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      zIndex: "2",
      pointerEvents: "none",
      display: "block",
    } as CSSStyleDeclaration);

    const parent = this.game.canvas.parentElement ?? document.getElementById("game");
    if (parent) {
      parent.style.position = "relative";
      parent.appendChild(this.frameCanvas);
    }
    // Phaser canvas keeps input; hide visually (view paints the game)
    this.game.canvas.style.opacity = "0";
    this.game.canvas.style.position = "absolute";
    this.game.canvas.style.inset = "0";
    this.game.canvas.style.width = "100%";
    this.game.canvas.style.height = "100%";
    this.game.canvas.style.zIndex = "1";

    this.view = new Renderer(this.frameCanvas, this.core);
    this.view.worldMode = false;
    this.view.resize(w, h);
    this.lastW = w;
    this.lastH = h;

    const stage = document.getElementById("game");
    if (stage) juice.attach(stage);

    this.core.onStrike = (payload) => {
      this.view.strikePress = 1;
      juice.strike(payload.heavy);
      trackRetention("first_strike");
      if (payload.heavy) trackRetention("echo_combo");
    };

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      Sfx.unlock();
      if (this.core.phase === "shop") {
        const { startY, viewH } = this.view.shopLayout();
        if (pointer.y >= startY && pointer.y <= startY + viewH) {
          this.shopDragY = pointer.y;
          this.shopDragMoved = false;
          return;
        }
      }
      const id = this.view.hitTest(pointer.x, pointer.y);
      if (id) this.handleUi(id);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.core.phase !== "shop" || this.shopDragY == null || !pointer.isDown) return;
      const dy = this.shopDragY - pointer.y;
      if (Math.abs(dy) < 2) return;
      this.shopDragMoved = true;
      this.shopDragY = pointer.y;
      const { maxScroll } = this.view.shopLayout();
      this.core.scrollShop(dy, maxScroll);
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.core.phase === "shop" && this.shopDragY != null) {
        const dragged = this.shopDragMoved;
        this.shopDragY = null;
        this.shopDragMoved = false;
        if (!dragged) {
          const id = this.view.hitTest(pointer.x, pointer.y);
          if (id) this.handleUi(id);
        }
        return;
      }
      this.shopDragY = null;
      this.shopDragMoved = false;
    });

    this.input.on("wheel", (_p: Phaser.Input.Pointer, _g: unknown, _dx: number, dy: number) => {
      if (this.core.phase !== "shop") return;
      const { maxScroll } = this.view.shopLayout();
      this.core.scrollShop(dy * 0.55, maxScroll);
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      if (this.core.phase !== "playing") return;
      Sfx.strikeButton();
      this.view.strikePress = 1;
      this.core.submit();
    });
    this.input.keyboard?.on("keydown-BACKSPACE", () => {
      if (this.core.phase === "playing") this.core.undoLast();
    });
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.core.phase === "shop") this.core.closeShop();
      else if (this.core.phase === "playing") this.core.undoLast();
    });

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    });

    trackRetention("first_play");
    document.title = `${t("brand")} · Phaser`;
  }

  private layout(w: number, h: number) {
    const ww = Math.max(1, Math.floor(w));
    const hh = Math.max(1, Math.floor(h));
    if (ww === this.lastW && hh === this.lastH) return;
    this.lastW = ww;
    this.lastH = hh;
    this.view.resize(ww, hh);
  }

  update(_time: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    const tSec = this.time.now / 1000;

    juice.update(dt);

    if (!juice.frozen) {
      this.core.update(dt);
    } else {
      if (this.core.stampT > 0) this.core.stampT = Math.max(0, this.core.stampT - dt * 0.35);
      if (this.core.flash > 0) this.core.flash = Math.max(0, this.core.flash - dt * 0.35);
      if (this.core.shake > 0) this.core.shake = Math.max(0, this.core.shake - dt);
    }

    if (this.core.phase === "result" && !this.resultSdkDone) {
      this.resultSdkDone = true;
      if (isGameplayOn()) gameplayStop();
      noteResultScreen();
      // Leaderboard "score" + cloud snapshot after settleResult already ran.
      void submitLeaderboardScore(this.core.score);
      scheduleCloudSave(this.core.save);
    }
    if (this.core.phase !== "result") {
      this.resultSdkDone = false;
    }

    this.view.draw(tSec);

    if (!this.readyOnce) {
      this.readyOnce = true;
      loadingReady();
    }
  }

  private startDiff(d: Difficulty) {
    Sfx.unlock();
    this.core.start(d);
    gameplayStart();
    trackRetention("first_play");
  }

  private handleUi(id: string) {
    if (id.startsWith("tray-")) {
      this.core.selectTray(Number(id.slice(5)));
      return;
    }
    if (id.startsWith("style-")) {
      this.core.buyOrEquip(id.slice(6) as StyleId);
      trackRetention("style_buy");
      return;
    }
    switch (id) {
      case "play-normal":
        this.startDiff("normal");
        break;
      case "play-easy":
        this.startDiff("easy");
        break;
      case "play-hard":
        this.startDiff("hard");
        break;
      case "play-infinity":
        this.startDiff("infinity");
        break;
      case "open-shop":
        gameplayStop();
        this.core.openShop();
        break;
      case "close-shop":
        this.core.closeShop();
        break;
      case "shop-up": {
        const { maxScroll, rowH } = this.view.shopLayout();
        this.core.scrollShop(-rowH, maxScroll);
        break;
      }
      case "shop-down": {
        const { maxScroll, rowH } = this.view.shopLayout();
        this.core.scrollShop(rowH, maxScroll);
        break;
      }
      case "undo":
        this.core.undoLast();
        break;
      case "submit":
        Sfx.strikeButton();
        this.view.strikePress = 1;
        this.core.submit();
        break;
      case "reshuffle":
        this.core.reshuffleTray();
        break;
      case "again":
        this.startDiff(this.core.difficulty);
        break;
      case "continue":
        showRewarded(
          () => {
            if (this.core.rewardedContinue()) gameplayStart();
          },
          () => {
            /* ad closed — stay on result unless continue succeeded */
          },
        );
        break;
      case "to-menu":
        gameplayStop();
        this.core.phase = "menu";
        break;
    }
  }
}
