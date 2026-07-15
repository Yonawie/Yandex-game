import { COLORS, FONT_DISPLAY, FONT_UI } from "./config.js";

export function paintPremiumBg(scene, width, height) {
  const g = scene.add.graphics();
  g.fillGradientStyle(COLORS.bgDeep, COLORS.bg, COLORS.bg, 0x152036, 1);
  g.fillRect(0, 0, width, height);

  // soft gold light bloom top
  const bloom = scene.add.circle(width * 0.5, -40, 280, COLORS.gold, 0.07);
  const bloom2 = scene.add.circle(width * 0.15, height * 0.7, 160, 0x3ecf8e, 0.04);
  const bloom3 = scene.add.circle(width * 0.9, height * 0.35, 140, 0xe85d4c, 0.04);

  // fine grain lines
  for (let i = 0; i < 6; i++) {
    const y = 40 + i * ((height - 80) / 5);
    g.lineStyle(1, COLORS.line, 0.15);
    g.lineBetween(40, y, width - 40, y);
  }

  return { g, bloom, bloom2, bloom3 };
}

export function makeGoldButton(scene, x, y, w, h, label, onClick) {
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
  body.on("pointerdown", onClick);
  return c;
}

export function makeGhostButton(scene, x, y, w, h, label, onClick) {
  const c = scene.add.container(x, y);
  const body = scene.add.rectangle(0, 0, w, h, COLORS.panelSoft, 0.95).setStrokeStyle(1.5, COLORS.gold, 0.55);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT_UI,
      fontSize: "17px",
      fontStyle: "600",
      color: "#f3ead7",
    })
    .setOrigin(0.5);
  c.add([body, text]);
  body.setInteractive({ useHandCursor: true });
  body.on("pointerover", () => body.setStrokeStyle(2, COLORS.goldSoft));
  body.on("pointerout", () => body.setStrokeStyle(1.5, COLORS.gold, 0.55));
  body.on("pointerdown", onClick);
  return c;
}

export function titleStyle(size = "42px", color = "#f3ead7") {
  return {
    fontFamily: FONT_DISPLAY,
    fontSize: size,
    color,
  };
}

export function uiStyle(size = "15px", color = "#8b9bb4") {
  return {
    fontFamily: FONT_UI,
    fontSize: size,
    color,
  };
}

export function starRow(n, max = 3) {
  return "★".repeat(n) + "☆".repeat(Math.max(0, max - n));
}
