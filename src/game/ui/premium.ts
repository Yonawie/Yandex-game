import Phaser from "phaser";
import { COLORS, FONT_DISPLAY, FONT_UI } from "../../data/config";
import { buttonPress } from "../../visual/juice";
import { sfx } from "../audio/sfx";

export function paintPremiumBg(scene: Phaser.Scene, width: number, height: number) {
  const g = scene.add.graphics();
  g.fillGradientStyle(COLORS.bgDeep, COLORS.bg, COLORS.bg, 0x152036, 1);
  g.fillRect(0, 0, width, height);

  const bloom = scene.add.circle(width * 0.5, -40, 280, COLORS.gold, 0.07);
  const bloom2 = scene.add.circle(width * 0.15, height * 0.7, 160, 0x3ecf8e, 0.04);
  const bloom3 = scene.add.circle(width * 0.9, height * 0.35, 140, 0xe85d4c, 0.04);

  for (let i = 0; i < 6; i++) {
    const y = 40 + i * ((height - 80) / 5);
    g.lineStyle(1, COLORS.line, 0.15);
    g.lineBetween(40, y, width - 40, y);
  }

  return { g, bloom, bloom2, bloom3 };
}

export function makeGoldButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void
) {
  const c = scene.add.container(x, y);
  const shadow = scene.add.rectangle(3, 5, w, h, 0x000000, 0.35);
  const body = scene.add.rectangle(0, 0, w, h, COLORS.gold).setStrokeStyle(1.5, COLORS.goldSoft);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT_UI,
      fontSize: "20px",
      fontStyle: "700",
      color: "#0a0e17",
    })
    .setOrigin(0.5);
  c.add([shadow, body, text]);
  c.setSize(w, h);
  body.setInteractive({ useHandCursor: true });
  body.on("pointerover", () => {
    body.setFillStyle(COLORS.goldSoft);
    c.setScale(1.03);
  });
  body.on("pointerout", () => {
    body.setFillStyle(COLORS.gold);
    c.setScale(1);
  });
  body.on("pointerdown", () => {
    buttonPress(c);
    sfx.click();
    onClick();
  });
  return c;
}

export function titleStyle(size = "42px", color = "#f3ead7") {
  return { fontFamily: FONT_DISPLAY, fontSize: size, color };
}

export function uiStyle(size = "15px", color = "#8b9bb4") {
  return { fontFamily: FONT_UI, fontSize: size, color };
}

export function starRow(n: number, max = 3): string {
  const filled = Math.max(0, Math.min(max, Math.floor(n)));
  return "★".repeat(filled) + "☆".repeat(max - filled);
}
