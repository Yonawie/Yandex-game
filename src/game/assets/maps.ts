// @ts-nocheck
import { MAP_W, MAP_H } from "../../data/config";

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(n) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function rgb(r, g, b) {
  return `rgb(${r|0},${g|0},${b|0})`;
}

function drawPerson(ctx, x, y, scale, color, rng) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 8, 6, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f5d0a9";
  ctx.beginPath();
  ctx.arc(0, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  if (rng() > 0.5) {
    ctx.fillStyle = "#333";
    ctx.fillRect(-5, -10, 10, 3);
  }
  ctx.restore();
}

function drawHouse(ctx, x, y, w, h, wall, roof, snow) {
  ctx.fillStyle = wall;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 6, y - h);
  ctx.lineTo(x, y - h - h * 0.45);
  ctx.lineTo(x + w / 2 + 6, y - h);
  ctx.closePath();
  ctx.fill();
  if (snow) {
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 6, y - h);
    ctx.lineTo(x, y - h - h * 0.45);
    ctx.lineTo(x + w / 2 + 6, y - h);
    ctx.lineTo(x + w / 2 + 2, y - h + 4);
    ctx.lineTo(x, y - h - h * 0.35);
    ctx.lineTo(x - w / 2 - 2, y - h + 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ffd166";
  const win = Math.max(4, w * 0.18);
  ctx.fillRect(x - w * 0.28, y - h * 0.55, win, win);
  ctx.fillRect(x + w * 0.1, y - h * 0.55, win, win);
  ctx.fillStyle = "#7c4a2d";
  ctx.fillRect(x - 5, y - 22, 10, 22);
}

function drawTree(ctx, x, y, scale, leaf) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(-3, -8, 6, 14);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(16, -8);
  ctx.lineTo(-16, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.lineTo(12, -22);
  ctx.lineTo(-12, -22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBalloon(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#666";
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.quadraticCurveTo(x + 4, y + 22, x, y + 30);
  ctx.stroke();
}

function fillBg(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, MAP_H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MAP_W, MAP_H);
}

function terraces(ctx, rng, colors, rows = 8) {
  for (let r = 0; r < rows; r++) {
    const y0 = 280 + r * ((MAP_H - 400) / rows);
    const h = 180 + rng() * 80;
    ctx.fillStyle = colors[r % colors.length];
    ctx.beginPath();
    ctx.moveTo(0, y0 + 40);
    for (let x = 0; x <= MAP_W; x += 80) {
      ctx.lineTo(x, y0 + Math.sin(x * 0.01 + r) * 20);
    }
    ctx.lineTo(MAP_W, y0 + h);
    ctx.lineTo(0, y0 + h);
    ctx.closePath();
    ctx.fill();
  }
}

export function createMapCanvas(mapId) {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d");
  const painters = {
    winter: paintWinter,
    paris: paintParis,
    circus: paintCircus,
    underwater: paintUnderwater,
    jungle: paintJungle,
    neon: paintNeon,
    venice: paintVenice,
    tokyo: paintTokyo,
    desert: paintDesert,
    castle: paintCastle,
  };
  (painters[mapId] || paintWinter)(ctx);
  return canvas;
}

function paintWinter(ctx) {
  const rng = mulberry32(101);
  fillBg(ctx, "#1a3a6b", "#7eb8e8");
  // aurora
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = `rgba(${40 + i * 30},${200 - i * 10},160,0.12)`;
    ctx.beginPath();
    ctx.ellipse(400 + i * 450, 180, 280, 90, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // stars
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(rng() * MAP_W, rng() * 500, rng() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  terraces(ctx, rng, ["#e8f1fa", "#d4e6f7", "#c5daf0", "#b8d0ea"], 10);

  // frozen pond
  ctx.fillStyle = "#9ad4ef";
  ctx.beginPath();
  ctx.ellipse(MAP_W * 0.48, 1680, 320, 160, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(MAP_W * 0.48 - 200 + i * 50, 1680);
    ctx.lineTo(MAP_W * 0.48 - 180 + i * 50, 1750);
    ctx.stroke();
  }

  // christmas tree
  ctx.fillStyle = "#1f6b3a";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(MAP_W * 0.48, 1280 - i * 70);
    ctx.lineTo(MAP_W * 0.48 + 110 - i * 18, 1450 - i * 40);
    ctx.lineTo(MAP_W * 0.48 - 110 + i * 18, 1450 - i * 40);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = ["#ff6b6b", "#ffd166", "#4cc9f0", "#f72585"][i % 4];
    ctx.beginPath();
    ctx.arc(MAP_W * 0.48 + (rng() - 0.5) * 140, 1320 + rng() * 160, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ferris wheel
  const fx = 2100, fy = 1450;
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(fx, fy, 160, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(a) * 160, fy + Math.sin(a) * 160);
    ctx.stroke();
    ctx.fillStyle = ["#ef476f", "#06d6a0", "#118ab2", "#ffd166"][i % 4];
    ctx.fillRect(fx + Math.cos(a) * 160 - 12, fy + Math.sin(a) * 160 - 10, 24, 20);
  }

  // train track + train
  ctx.strokeStyle = "#5c4033";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(100, 700);
  ctx.bezierCurveTo(800, 620, 1600, 780, 2700, 650);
  ctx.stroke();
  ctx.fillStyle = "#e63946";
  ctx.fillRect(900, 640, 90, 40);
  ctx.fillStyle = "#457b9d";
  ctx.fillRect(1000, 645, 70, 35);
  ctx.fillRect(1080, 645, 70, 35);
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(920, 685, 12, 0, Math.PI * 2);
  ctx.arc(970, 685, 12, 0, Math.PI * 2);
  ctx.arc(1020, 685, 10, 0, Math.PI * 2);
  ctx.arc(1120, 685, 10, 0, Math.PI * 2);
  ctx.fill();

  // houses & trees & people
  for (let i = 0; i < 55; i++) {
    const x = 80 + rng() * (MAP_W - 160);
    const y = 900 + rng() * 2400;
    drawHouse(
      ctx, x, y,
      50 + rng() * 40, 45 + rng() * 35,
      ["#c97b63", "#e9c46a", "#8ab17d", "#f4a261", "#457b9d"][i % 5],
      ["#8b1e3f", "#264653", "#e76f51", "#2a9d8f"][i % 4],
      true
    );
  }
  for (let i = 0; i < 90; i++) {
    drawTree(ctx, rng() * MAP_W, 850 + rng() * 2500, 0.6 + rng() * 0.7, "#1b6b3a");
  }
  for (let i = 0; i < 180; i++) {
    drawPerson(ctx, rng() * MAP_W, 900 + rng() * 2500, 0.7 + rng() * 0.6,
      ["#ef476f", "#118ab2", "#06d6a0", "#ffd166", "#9b5de5"][i % 5], rng);
  }
  for (let i = 0; i < 40; i++) {
    drawBalloon(ctx, rng() * MAP_W, 800 + rng() * 2000,
      ["#ff006e", "#3a86ff", "#ffbe0b", "#8338ec"][i % 4]);
  }
  // snowflakes overlay
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 400; i++) {
    ctx.beginPath();
    ctx.arc(rng() * MAP_W, rng() * MAP_H, rng() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // market stalls
  for (let i = 0; i < 12; i++) {
    const x = 400 + i * 160;
    const y = 2100;
    ctx.fillStyle = "#d62828";
    ctx.beginPath();
    ctx.moveTo(x - 35, y - 40);
    ctx.lineTo(x, y - 70);
    ctx.lineTo(x + 35, y - 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f1faee";
    ctx.fillRect(x - 30, y - 40, 60, 40);
  }
}

function paintParis(ctx) {
  const rng = mulberry32(202);
  fillBg(ctx, "#87ceeb", "#fef6e4");
  terraces(ctx, rng, ["#cfcfcf", "#bdbdbd", "#d9d9d9", "#a8a8a8"], 9);

  // Seine
  ctx.fillStyle = "#4ea8de";
  ctx.beginPath();
  ctx.moveTo(0, 900);
  ctx.bezierCurveTo(900, 820, 1600, 1100, MAP_W, 950);
  ctx.lineTo(MAP_W, 1180);
  ctx.bezierCurveTo(1600, 1300, 900, 1050, 0, 1120);
  ctx.closePath();
  ctx.fill();
  // boats
  for (let i = 0; i < 14; i++) {
    const x = 120 + i * 180 + rng() * 40;
    const y = 980 + rng() * 80;
    ctx.fillStyle = ["#e63946", "#ffffff", "#ffd166", "#457b9d"][i % 4];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 50, y);
    ctx.lineTo(x + 40, y + 16);
    ctx.lineTo(x + 8, y + 16);
    ctx.closePath();
    ctx.fill();
  }

  // Eiffel
  const ex = 700, ey = 1600;
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ex - 90, ey);
  ctx.lineTo(ex, ey - 420);
  ctx.lineTo(ex + 90, ey);
  ctx.moveTo(ex - 55, ey - 140);
  ctx.lineTo(ex + 55, ey - 140);
  ctx.moveTo(ex - 35, ey - 260);
  ctx.lineTo(ex + 35, ey - 260);
  ctx.stroke();
  ctx.fillStyle = "#2d6a4f";
  ctx.fillRect(ex - 160, ey - 20, 320, 90);

  // Louvre pyramid
  const lx = 500, ly = 2800;
  ctx.fillStyle = "#dfe7ef";
  ctx.beginPath();
  ctx.moveTo(lx, ly - 160);
  ctx.lineTo(lx + 120, ly);
  ctx.lineTo(lx - 120, ly);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.stroke();
  ctx.fillStyle = "#c4a484";
  ctx.fillRect(lx - 260, ly - 40, 120, 100);
  ctx.fillRect(lx + 140, ly - 40, 120, 100);

  // Notre Dame
  const nx = 1900, ny = 2700;
  ctx.fillStyle = "#c2a878";
  ctx.fillRect(nx - 100, ny - 180, 200, 180);
  ctx.fillStyle = "#3d5a80";
  ctx.fillRect(nx - 110, ny - 210, 90, 40);
  ctx.fillRect(nx + 20, ny - 210, 90, 40);
  ctx.fillStyle = "#e0c097";
  ctx.beginPath();
  ctx.arc(nx, ny - 100, 40, Math.PI, 0);
  ctx.fill();

  // Arc
  const ax = 2200, ay = 1700;
  ctx.fillStyle = "#d6c7a1";
  ctx.fillRect(ax - 70, ay - 160, 140, 160);
  ctx.fillStyle = "#87ceeb";
  ctx.beginPath();
  ctx.arc(ax, ay - 40, 40, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(ax - 40, ay - 40, 80, 40);

  // Sacré-Cœur
  ctx.fillStyle = "#f8f9fa";
  ctx.beginPath();
  ctx.arc(2300, 700, 70, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(2230, 700, 140, 90);
  ctx.beginPath();
  ctx.arc(2300, 640, 28, Math.PI, 0);
  ctx.fill();

  // buildings densely
  for (let i = 0; i < 120; i++) {
    const x = 60 + (i % 15) * 180 + (rng() - 0.5) * 40;
    const y = 1200 + Math.floor(i / 15) * 280 + rng() * 40;
    const h = 90 + rng() * 100;
    ctx.fillStyle = ["#f4a261", "#e9c46a", "#82a3b0", "#e76f51", "#2a9d8f", "#c9ada7"][i % 6];
    ctx.fillRect(x, y - h, 70 + rng() * 40, h);
    ctx.fillStyle = "#4a6fa5";
    ctx.beginPath();
    ctx.moveTo(x - 4, y - h);
    ctx.lineTo(x + 35, y - h - 28);
    ctx.lineTo(x + 90, y - h);
    ctx.fill();
    for (let wy = 0; wy < 4; wy++) {
      for (let wx = 0; wx < 3; wx++) {
        ctx.fillStyle = rng() > 0.4 ? "#ffe8a3" : "#7f9db9";
        ctx.fillRect(x + 10 + wx * 22, y - h + 15 + wy * 22, 12, 14);
      }
    }
  }

  // streets people & cars
  for (let i = 0; i < 220; i++) {
    drawPerson(ctx, rng() * MAP_W, 1100 + rng() * 2300, 0.65 + rng() * 0.5,
      ["#ef476f", "#118ab2", "#ffd166", "#06d6a0", "#222"][i % 5], rng);
  }
  for (let i = 0; i < 40; i++) {
    const x = rng() * MAP_W;
    const y = 1300 + rng() * 2000;
    ctx.fillStyle = ["#e63946", "#222", "#3a86ff", "#ffbe0b", "#8338ec"][i % 5];
    ctx.fillRect(x, y, 36, 16);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(x + 8, y + 16, 5, 0, Math.PI * 2);
    ctx.arc(x + 28, y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 25; i++) {
    drawBalloon(ctx, rng() * MAP_W, 1000 + rng() * 1800, ["#ff006e", "#ffbe0b", "#3a86ff"][i % 3]);
  }
  // pink trees near eiffel
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = ["#ff8fab", "#f72585", "#b5179e"][i % 3];
    ctx.beginPath();
    ctx.arc(ex - 200 + rng() * 400, ey - 40 + rng() * 120, 18 + rng() * 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCircus(ctx) {
  const rng = mulberry32(303);
  fillBg(ctx, "#ff9e00", "#ffe66d");
  terraces(ctx, rng, ["#ffb703", "#fb8500", "#ffd166", "#f4a261"], 8);

  // big top
  const tx = MAP_W * 0.5, ty = 1400;
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(tx - 280, ty);
  ctx.lineTo(tx, ty - 260);
  ctx.lineTo(tx + 280, ty);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f8f9fa";
  for (let i = -3; i <= 3; i++) {
    if (i % 2 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(tx + i * 40 - 30, ty);
    ctx.lineTo(tx, ty - 260);
    ctx.lineTo(tx + i * 40 + 30, ty);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#e63946";
  ctx.fillRect(tx - 250, ty, 500, 120);

  // smaller tents
  for (let i = 0; i < 10; i++) {
    const x = 200 + i * 250;
    const y = 2200 + (i % 2) * 200;
    ctx.fillStyle = ["#8338ec", "#3a86ff", "#06d6a0", "#ff006e"][i % 4];
    ctx.beginPath();
    ctx.moveTo(x - 70, y);
    ctx.lineTo(x, y - 100);
    ctx.lineTo(x + 70, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 60, y, 120, 50);
  }

  // carousel
  const cx = 700, cy = 2800;
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ef476f";
  ctx.beginPath();
  ctx.moveTo(cx - 100, cy - 20);
  ctx.lineTo(cx, cy - 90);
  ctx.lineTo(cx + 100, cy - 20);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillStyle = "#9b5de5";
    ctx.fillRect(cx + Math.cos(a) * 70 - 8, cy + Math.sin(a) * 70 - 12, 16, 24);
  }

  // popcorn carts & booths
  for (let i = 0; i < 18; i++) {
    const x = 150 + rng() * (MAP_W - 300);
    const y = 1600 + rng() * 1700;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y - 40, 50, 40);
    ctx.fillStyle = "#e63946";
    ctx.fillRect(x, y - 50, 50, 12);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x + 10, y - 70, 30, 20);
  }

  for (let i = 0; i < 200; i++) {
    drawPerson(ctx, rng() * MAP_W, 1200 + rng() * 2200, 0.7 + rng() * 0.55,
      ["#ef476f", "#ffd166", "#8338ec", "#06d6a0", "#3a86ff"][i % 5], rng);
  }
  for (let i = 0; i < 60; i++) {
    drawBalloon(ctx, rng() * MAP_W, 900 + rng() * 2000,
      ["#ff006e", "#3a86ff", "#ffbe0b", "#06d6a0", "#8338ec"][i % 5]);
  }
  // confetti
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = ["#ff006e", "#ffbe0b", "#3a86ff", "#06d6a0"][i % 4];
    ctx.fillRect(rng() * MAP_W, rng() * MAP_H, 6, 10);
  }
}

function paintUnderwater(ctx) {
  const rng = mulberry32(404);
  fillBg(ctx, "#023e8a", "#48cae4");
  // light rays
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(400 + i * 280, 0);
    ctx.lineTo(520 + i * 280, 0);
    ctx.lineTo(300 + i * 280, MAP_H);
    ctx.lineTo(100 + i * 280, MAP_H);
    ctx.fill();
  }
  // sand bottom ridges
  for (let r = 0; r < 6; r++) {
    const y = 1200 + r * 400;
    ctx.fillStyle = rgb(210 - r * 10, 180 - r * 8, 120);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= MAP_W; x += 60) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + r) * 30);
    }
    ctx.lineTo(MAP_W, MAP_H);
    ctx.lineTo(0, MAP_H);
    ctx.fill();
  }
  // coral
  for (let i = 0; i < 70; i++) {
    const x = rng() * MAP_W;
    const y = 1400 + rng() * 2000;
    ctx.fillStyle = ["#ff006e", "#ff8500", "#ffbe0b", "#fb5607", "#ff4d6d"][i % 5];
    for (let b = 0; b < 5; b++) {
      ctx.beginPath();
      ctx.ellipse(x + (b - 2) * 8, y - b * 12, 8, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // seaweed
  for (let i = 0; i < 80; i++) {
    const x = rng() * MAP_W;
    const y = 1600 + rng() * 1800;
    ctx.strokeStyle = "#2d6a4f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 20, y - 40, x - 20, y - 80, x + 10, y - 120);
    ctx.stroke();
  }
  // fish schools
  for (let i = 0; i < 150; i++) {
    const x = rng() * MAP_W;
    const y = 200 + rng() * 1400;
    ctx.fillStyle = ["#ffd166", "#ef476f", "#06d6a0", "#3a86ff", "#ff006e"][i % 5];
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x - 24, y - 8);
    ctx.lineTo(x - 24, y + 8);
    ctx.fill();
  }
  // ruins / market chests
  for (let i = 0; i < 20; i++) {
    const x = 100 + rng() * (MAP_W - 200);
    const y = 2000 + rng() * 1400;
    ctx.fillStyle = "#bc6c25";
    ctx.fillRect(x, y, 50, 30);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x + 10, y + 8, 30, 10);
  }
  // bubbles
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(rng() * MAP_W, rng() * MAP_H, 3 + rng() * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  // castle
  ctx.fillStyle = "#90e0ef";
  ctx.fillRect(1200, 2400, 200, 180);
  ctx.fillRect(1180, 2320, 50, 80);
  ctx.fillRect(1370, 2320, 50, 80);
  ctx.fillStyle = "#0077b6";
  ctx.beginPath();
  ctx.moveTo(1180, 2320);
  ctx.lineTo(1205, 2280);
  ctx.lineTo(1230, 2320);
  ctx.fill();
}

function paintJungle(ctx) {
  const rng = mulberry32(505);
  fillBg(ctx, "#74c69d", "#d8f3dc");
  terraces(ctx, rng, ["#40916c", "#52b788", "#74c69d", "#95d5b2"], 9);

  // river
  ctx.fillStyle = "#48cae4";
  ctx.beginPath();
  ctx.moveTo(MAP_W * 0.55, 600);
  ctx.bezierCurveTo(MAP_W * 0.7, 1400, MAP_W * 0.4, 2200, MAP_W * 0.6, MAP_H);
  ctx.lineTo(MAP_W * 0.72, MAP_H);
  ctx.bezierCurveTo(MAP_W * 0.52, 2200, MAP_W * 0.82, 1400, MAP_W * 0.68, 600);
  ctx.closePath();
  ctx.fill();

  // dense trees
  for (let i = 0; i < 160; i++) {
    const x = rng() * MAP_W;
    const y = 700 + rng() * 2700;
    drawTree(ctx, x, y, 0.8 + rng(), ["#1b4332", "#2d6a4f", "#40916c"][i % 3]);
    if (rng() > 0.6) {
      ctx.fillStyle = ["#ff006e", "#ffbe0b", "#e63946", "#8338ec"][i % 4];
      ctx.beginPath();
      ctx.arc(x + (rng() - 0.5) * 30, y - 40 - rng() * 30, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // village huts
  for (let i = 0; i < 35; i++) {
    const x = 100 + rng() * (MAP_W - 200);
    const y = 1400 + rng() * 1800;
    ctx.fillStyle = "#bc6c25";
    ctx.fillRect(x - 35, y - 40, 70, 40);
    ctx.fillStyle = "#6a994e";
    ctx.beginPath();
    ctx.moveTo(x - 45, y - 40);
    ctx.lineTo(x, y - 85);
    ctx.lineTo(x + 45, y - 40);
    ctx.fill();
  }
  // waterfall
  ctx.fillStyle = "rgba(200,240,255,0.7)";
  ctx.fillRect(400, 900, 60, 400);
  ctx.fillStyle = "#48cae4";
  ctx.beginPath();
  ctx.ellipse(430, 1320, 90, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // animals silhouettes-ish
  for (let i = 0; i < 40; i++) {
    const x = rng() * MAP_W;
    const y = 1200 + rng() * 2000;
    ctx.fillStyle = ["#6f4e37", "#ffb703", "#222", "#e9c46a"][i % 4];
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 16, y - 4, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 150; i++) {
    drawPerson(ctx, rng() * MAP_W, 1300 + rng() * 2000, 0.65 + rng() * 0.5,
      ["#ef476f", "#ffd166", "#06d6a0", "#118ab2"][i % 4], rng);
  }
  // butterflies
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = ["#ff006e", "#8338ec", "#ffbe0b", "#3a86ff"][i % 4];
    const x = rng() * MAP_W, y = 800 + rng() * 2000;
    ctx.beginPath();
    ctx.ellipse(x - 6, y, 8, 5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + 6, y, 8, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintNeon(ctx) {
  const rng = mulberry32(606);
  fillBg(ctx, "#10002b", "#240046");
  // moon
  ctx.fillStyle = "#e0aaff";
  ctx.beginPath();
  ctx.arc(2400, 280, 70, 0, Math.PI * 2);
  ctx.fill();
  // stars
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = rng() > 0.5 ? "#fff" : "#c77dff";
    ctx.fillRect(rng() * MAP_W, rng() * 800, 2, 2);
  }
  // ground
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 900, MAP_W, MAP_H);

  // grid streets
  ctx.strokeStyle = "#3a0ca3";
  ctx.lineWidth = 18;
  for (let x = 200; x < MAP_W; x += 320) {
    ctx.beginPath();
    ctx.moveTo(x, 900);
    ctx.lineTo(x, MAP_H);
    ctx.stroke();
  }
  for (let y = 1100; y < MAP_H; y += 280) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_W, y);
    ctx.stroke();
  }
  // neon buildings
  for (let i = 0; i < 90; i++) {
    const col = i % 8;
    const row = Math.floor(i / 8);
    const x = 40 + col * 340 + (rng() - 0.5) * 30;
    const y = 1050 + row * 280;
    const h = 120 + rng() * 160;
    const wall = ["#3c096c", "#5a189a", "#240046", "#10002b"][i % 4];
    ctx.fillStyle = wall;
    ctx.fillRect(x, y - h, 100 + rng() * 60, h);
    const neon = ["#ff006e", "#00f5d4", "#fee440", "#7b2cbf", "#4cc9f0"][i % 5];
    ctx.strokeStyle = neon;
    ctx.shadowColor = neon;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y - h + 4, 90, h - 8);
    ctx.shadowBlur = 0;
    for (let wy = 0; wy < 5; wy++) {
      for (let wx = 0; wx < 3; wx++) {
        ctx.fillStyle = rng() > 0.35 ? neon : "#222";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x + 14 + wx * 28, y - h + 18 + wy * 24, 14, 14);
        ctx.globalAlpha = 1;
      }
    }
  }
  // neon signs
  for (let i = 0; i < 30; i++) {
    const x = rng() * MAP_W;
    const y = 1000 + rng() * 2200;
    ctx.fillStyle = ["#ff006e", "#00f5d4", "#fee440"][i % 3];
    ctx.font = "bold 22px Nunito, sans-serif";
    ctx.fillText(["ラーメン", "OPEN", "CLUB", "寿司", "NEON", "BAR"][i % 6], x, y);
  }
  // traffic
  for (let i = 0; i < 60; i++) {
    const x = rng() * MAP_W;
    const y = 1100 + Math.floor(rng() * 8) * 280;
    ctx.fillStyle = ["#ff006e", "#00f5d4", "#fee440", "#4cc9f0"][i % 4];
    ctx.fillRect(x, y - 6, 40, 14);
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(x + 34, y - 2, 4, 4);
  }
  for (let i = 0; i < 180; i++) {
    drawPerson(ctx, rng() * MAP_W, 1000 + rng() * 2400, 0.65 + rng() * 0.5,
      ["#ff006e", "#00f5d4", "#fee440", "#c77dff", "#4cc9f0"][i % 5], rng);
  }
}

function paintVenice(ctx) {
  const rng = mulberry32(707);
  fillBg(ctx, "#7ec8e3", "#f7e1c6");
  terraces(ctx, rng, ["#e8d5b7", "#d4b896", "#c9ada7", "#b8a99a"], 8);
  // canals
  ctx.fillStyle = "#2a9d8f";
  for (let i = 0; i < 5; i++) {
    const y = 900 + i * 500;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(900, y - 40, 1800, y + 60, MAP_W, y);
    ctx.lineTo(MAP_W, y + 70);
    ctx.bezierCurveTo(1800, y + 130, 900, y + 30, 0, y + 70);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = rng() * MAP_W;
    const y = 920 + Math.floor(rng() * 5) * 500 + rng() * 40;
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 40, y);
    ctx.lineTo(x + 55, y + 18);
    ctx.lineTo(x + 10, y + 28);
    ctx.fill();
  }
  for (let i = 0; i < 80; i++) {
    drawHouse(ctx, 80 + rng() * (MAP_W - 160), 700 + rng() * 2600, 55 + rng() * 35, 70 + rng() * 50,
      ["#e76f51", "#f4a261", "#e9c46a", "#2a9d8f", "#c9ada7"][i % 5],
      ["#9b2226", "#264653", "#6a4c93"][i % 3], false);
  }
  for (let i = 0; i < 160; i++) {
    drawPerson(ctx, rng() * MAP_W, 800 + rng() * 2500, 0.65 + rng() * 0.5,
      ["#e63946", "#457b9d", "#ffd166", "#fff"][i % 4], rng);
  }
}

function paintTokyo(ctx) {
  const rng = mulberry32(808);
  fillBg(ctx, "#a0e9ff", "#ffe5ec");
  terraces(ctx, rng, ["#ffc2d4", "#ffd6e0", "#caf0f8", "#bde0fe"], 8);
  for (let i = 0; i < 100; i++) {
    const x = 40 + (i % 12) * 220 + rng() * 20;
    const y = 900 + Math.floor(i / 12) * 300;
    const h = 100 + rng() * 140;
    ctx.fillStyle = ["#ff8fab", "#90e0ef", "#fff", "#cdb4db", "#ffd6a5"][i % 5];
    ctx.fillRect(x, y - h, 80 + rng() * 40, h);
    ctx.fillStyle = "#e63946";
    ctx.fillRect(x + 10, y - h - 18, 60, 10);
  }
  // torii
  ctx.strokeStyle = "#e63946";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(600, 1600);
  ctx.lineTo(600, 1300);
  ctx.moveTo(900, 1600);
  ctx.lineTo(900, 1300);
  ctx.moveTo(560, 1320);
  ctx.lineTo(940, 1320);
  ctx.moveTo(580, 1280);
  ctx.lineTo(920, 1280);
  ctx.stroke();
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = ["#ff8fab", "#ffc2d4", "#fff"][i % 3];
    ctx.beginPath();
    ctx.arc(rng() * MAP_W, 700 + rng() * 2500, 10 + rng() * 12, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 180; i++) {
    drawPerson(ctx, rng() * MAP_W, 900 + rng() * 2400, 0.65 + rng() * 0.5,
      ["#e63946", "#ff8fab", "#222", "#3a86ff"][i % 4], rng);
  }
}

function paintDesert(ctx) {
  const rng = mulberry32(909);
  fillBg(ctx, "#f4a261", "#e9c46a");
  terraces(ctx, rng, ["#e76f51", "#f4a261", "#e9c46a", "#d4a373"], 9);
  // oasis
  ctx.fillStyle = "#48cae4";
  ctx.beginPath();
  ctx.ellipse(MAP_W * 0.5, 1800, 220, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 25; i++) {
    drawTree(ctx, MAP_W * 0.5 + (rng() - 0.5) * 400, 1750 + rng() * 80, 1 + rng(), "#2d6a4f");
  }
  // palace
  ctx.fillStyle = "#fff3b0";
  ctx.fillRect(1100, 2400, 280, 160);
  ctx.beginPath();
  ctx.arc(1240, 2400, 70, Math.PI, 0);
  ctx.fill();
  for (let i = 0; i < 30; i++) {
    const x = rng() * MAP_W;
    const y = 1200 + rng() * 2000;
    ctx.fillStyle = ["#e63946", "#8338ec", "#06d6a0", "#ffd166"][i % 4];
    ctx.beginPath();
    ctx.moveTo(x - 40, y);
    ctx.lineTo(x, y - 70);
    ctx.lineTo(x + 40, y);
    ctx.fill();
  }
  for (let i = 0; i < 140; i++) {
    drawPerson(ctx, rng() * MAP_W, 1000 + rng() * 2300, 0.65 + rng() * 0.5,
      ["#e63946", "#fff", "#264653", "#ffd166"][i % 4], rng);
  }
}

function paintCastle(ctx) {
  const rng = mulberry32(1010);
  fillBg(ctx, "#89c2d9", "#f8edeb");
  terraces(ctx, rng, ["#95d5b2", "#b7e4c7", "#d8f3dc", "#a3b18a"], 8);
  // castle
  const cx = MAP_W * 0.5;
  ctx.fillStyle = "#edf2f4";
  ctx.fillRect(cx - 200, 1200, 400, 280);
  ctx.fillRect(cx - 250, 1100, 80, 380);
  ctx.fillRect(cx + 170, 1100, 80, 380);
  ctx.fillStyle = "#014f86";
  ctx.beginPath();
  ctx.moveTo(cx - 260, 1100);
  ctx.lineTo(cx - 210, 1020);
  ctx.lineTo(cx - 160, 1100);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 160, 1100);
  ctx.lineTo(cx + 210, 1020);
  ctx.lineTo(cx + 260, 1100);
  ctx.fill();
  ctx.fillStyle = "#48cae4";
  ctx.fillRect(cx - 320, 1480, 640, 50);
  for (let i = 0; i < 50; i++) {
    drawHouse(ctx, 100 + rng() * (MAP_W - 200), 1800 + rng() * 1500, 50 + rng() * 30, 45 + rng() * 40,
      ["#f4a261", "#e9c46a", "#cdb4db", "#bde0fe"][i % 4],
      ["#014f86", "#e63946", "#2d6a4f"][i % 3], false);
  }
  for (let i = 0; i < 160; i++) {
    drawPerson(ctx, rng() * MAP_W, 1400 + rng() * 2000, 0.65 + rng() * 0.55,
      ["#e63946", "#014f86", "#ffd166", "#8338ec"][i % 4], rng);
  }
}

export const MAP_META = {
  winter: {
    id: "winter",
    title: "Зимний фестиваль",
    emoji: "🎄",
    subtitle: "Снежная деревня, каток и ярмарка",
    accent: 0x4cc9f0,
    preview: ["#1a3a6b", "#e8f1fa", "#ef476f"],
  },
  paris: {
    id: "paris",
    title: "Париж",
    emoji: "🗼",
    subtitle: "Эйфель, Сена и улочки",
    accent: 0xf4a261,
    preview: ["#87ceeb", "#e63946", "#4ea8de"],
  },
  circus: {
    id: "circus",
    title: "Цирк и ярмарка",
    emoji: "🎪",
    subtitle: "Шатры, карусель и шарики",
    accent: 0xe63946,
    preview: ["#ff9e00", "#e63946", "#8338ec"],
  },
  underwater: {
    id: "underwater",
    title: "Подводный город",
    emoji: "🐠",
    subtitle: "Кораллы, рыбы и затонувший рынок",
    accent: 0x00b4d8,
    preview: ["#023e8a", "#ff006e", "#48cae4"],
  },
  jungle: {
    id: "jungle",
    title: "Тропическая деревня",
    emoji: "🌴",
    subtitle: "Джунгли, река и водопад",
    accent: 0x52b788,
    preview: ["#40916c", "#ff006e", "#48cae4"],
  },
  neon: {
    id: "neon",
    title: "Неоновый мегаполис",
    emoji: "🌃",
    subtitle: "Ночные улицы и вывески",
    accent: 0xd4a84b,
    preview: ["#10002b", "#ff006e", "#00f5d4"],
  },
  venice: {
    id: "venice",
    title: "Венеция",
    emoji: "🛶",
    subtitle: "Каналы, маски и гондолы",
    accent: 0x2a9d8f,
    preview: ["#7ec8e3", "#e76f51", "#2a9d8f"],
  },
  tokyo: {
    id: "tokyo",
    title: "Токио",
    emoji: "🏯",
    subtitle: "Сакура, тории и перекрёстки",
    accent: 0xff8fab,
    preview: ["#ffe5ec", "#e63946", "#90e0ef"],
  },
  desert: {
    id: "desert",
    title: "Пустынный оазис",
    emoji: "🏜️",
    subtitle: "Дюны, базар и дворец",
    accent: 0xe9c46a,
    preview: ["#f4a261", "#e76f51", "#48cae4"],
  },
  castle: {
    id: "castle",
    title: "Сказочный замок",
    emoji: "🏰",
    subtitle: "Рыцари, дракон и турнир",
    accent: 0x014f86,
    preview: ["#89c2d9", "#edf2f4", "#e63946"],
  },
};
