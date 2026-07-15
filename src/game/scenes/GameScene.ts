import Phaser from 'phaser';
import { COLORS, HUE_HEX, SKINS, type HueId } from '@/data/balance';
import { getEntityDef, resolveTexture } from '@/content/entities';
import { resolveMode, getActiveModeId, loadRemoteBalancePatch } from '@/content/runtimeConfig';
import type { EntityKind, ModeDef, RunEventDef, SpawnRequest } from '@/content/types';
import { drawLantern, laneX, recolorDrawnLantern } from '@/game/assets/generate';
import { placeNightScenery, addBg } from '@/game/assets/scenery';
import { Spawner } from '@/game/systems/Spawner';
import { EventDirector } from '@/game/systems/EventDirector';
import { ScoreSystem } from '@/game/systems/ScoreSystem';
import { StoryDirector } from '@/game/systems/StoryDirector';
import { getSave, patchSave } from '@/data/save';
import { tf, getLang } from '@/i18n';
import { playTone } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';
import type { RunStats } from '@/retention/service';
import { JuiceCamera } from '@/visual/JuiceCamera';
import { VfxDirector } from '@/visual/VfxDirector';
import { ColorGrade } from '@/visual/ColorGrade';
import { Depth } from '@/visual/depths';
import { haptic, hapticCombo } from '@/visual/haptic';

interface FallingEntity {
  kind: EntityKind;
  lane: number;
  hue?: HueId;
  go: Phaser.GameObjects.Image;
}

const CARETAKER_AT = [100, 200, 400] as const;

export class GameScene extends Phaser.Scene {
  private mode!: ModeDef;
  private playerLane = 1;
  private playerHue: HueId = 'amber';
  private lantern!: Phaser.GameObjects.Container;
  private scroll = 0;
  private distance = 0;
  private entities: FallingEntity[] = [];
  private threads: Phaser.GameObjects.TileSprite[] = [];
  private threadBaseX: number[] = [];
  private starField: Phaser.GameObjects.Image[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private heightText!: Phaser.GameObjects.Text;
  private storyText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private colorBadge!: Phaser.GameObjects.Image;
  private laneGlow!: Phaser.GameObjects.Image;
  private matchRing!: Phaser.GameObjects.Image;
  private comboAura!: Phaser.GameObjects.Image;
  private dangerMarks: Phaser.GameObjects.Image[] = [];
  private caretakers: Phaser.GameObjects.Image[] = [];
  private caretakerShown = new Set<number>();
  private ghostLeft!: Phaser.GameObjects.Image;
  private ghostRight!: Phaser.GameObjects.Image;
  private ghostHint!: Phaser.GameObjects.Text;
  private juice!: JuiceCamera;
  private vfx!: VfxDirector;
  private grade!: ColorGrade;
  private ghostUntil = 0;
  private ghostCleared = false;
  private stormRain: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private alive = true;
  private continued = false;
  private pointerDownHandler!: (pointer: Phaser.Input.Pointer) => void;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastMilestone = 0;
  private lastComboTier = 0;
  private camLean = 0;
  private parallax: Phaser.GameObjects.Image[] = [];

  private spawner!: Spawner;
  private eventsDir!: EventDirector;
  private scores!: ScoreSystem;
  private story!: StoryDirector;
  private matchedCollects = 0;
  private voidsPassed = 0;
  private maxCombo = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    loadRemoteBalancePatch();
    this.mode = resolveMode(getActiveModeId());
    const { width, height } = this.scale;
    const save = getSave();
    const skin = SKINS.find((s) => s.id === save.skinId) ?? SKINS[0];

    this.alive = true;
    this.continued = false;
    this.playerLane = 1;
    this.playerHue = 'amber';
    this.scroll = this.mode.baseScroll;
    this.distance = 0;
    this.entities = [];
    this.caretakerShown.clear();
    this.caretakers = [];
    this.ghostCleared = false;
    this.lastComboTier = 0;
    this.camLean = 0;
    this.stormRain = null;

    this.spawner = new Spawner(this.mode);
    this.eventsDir = new EventDirector();
    this.eventsDir.reset(this.mode);
    this.scores = new ScoreSystem();
    this.scores.reset();
    this.story = new StoryDirector();
    this.story.reset();
    this.matchedCollects = 0;
    this.voidsPassed = 0;
    this.maxCombo = 0;
    this.lastMilestone = 0;
    this.dangerMarks = [];

    this.cameras.main.setRotation(0);
    this.cameras.main.setZoom(1);

    this.juice = new JuiceCamera(this);
    this.vfx = new VfxDirector(this);
    this.grade = new ColorGrade();

    addBg(this);

    const parallax: Phaser.GameObjects.Image[] = [];
    placeNightScenery(this, { parallaxLayers: parallax, skipBg: true });
    this.parallax = parallax;
    parallax.forEach((img, i) => {
      if (img.getData('parallax') == null) img.setData('parallax', 4 + i * 3);
    });
    // keep a few drifting sparkles for climb feel
    this.starField = [];
    for (let i = 0; i < 18; i++) {
      const s = this.add
        .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'star')
        .setAlpha(Phaser.Math.FloatBetween(0.3, 0.85))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
        .setDepth(Depth.AMBIENT)
        .setData('drift', Phaser.Math.FloatBetween(18, 48));
      this.starField.push(s);
    }

    // caretaker silhouettes wait off / invisible until height milestones
    for (let i = 0; i < CARETAKER_AT.length; i++) {
      const side = i % 2 === 0 ? 0.14 : 0.86;
      const img = this.add
        .image(width * side, height * (0.22 + i * 0.06), 'caretaker')
        .setDepth(4)
        .setAlpha(0)
        .setScale(1.1 + i * 0.15)
        .setFlipX(i % 2 === 1);
      this.caretakers.push(img);
    }

    this.threads = [];
    this.threadBaseX = [];
    for (let lane = 0; lane < this.mode.lanes; lane++) {
      const x = laneX(width, lane, this.mode.lanes, this.mode.lanePadding);
      const thread = this.add
        .tileSprite(x, height / 2, 32, height + 80, 'thread')
        .setAlpha(0.9)
        .setDepth(5);
      this.threads.push(thread);
      this.threadBaseX.push(x);
    }

    const py = height * this.mode.playerYRatio;
    this.laneGlow = this.add
      .image(laneX(width, this.playerLane, this.mode.lanes, this.mode.lanePadding), py + 42, 'lane-glow')
      .setDepth(8)
      .setAlpha(0.95)
      .setScale(1.15);

    this.lantern = drawLantern(
      this,
      laneX(width, this.playerLane),
      py,
      skin,
      this.playerHue,
      1.45,
    );

    this.matchRing = this.add
      .image(this.lantern.x, py, 'match-ring')
      .setDepth(18)
      .setTint(HUE_HEX[this.playerHue])
      .setAlpha(0.55)
      .setScale(1.15);
    this.tweens.add({
      targets: this.matchRing,
      scale: 1.32,
      alpha: 0.85,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.comboAura = this.add
      .image(this.lantern.x, py, 'combo-aura')
      .setDepth(17)
      .setTint(HUE_HEX[this.playerHue])
      .setAlpha(0)
      .setScale(0.8);

    this.dangerMarks = [];
    for (let lane = 0; lane < this.mode.lanes; lane++) {
      const mark = this.add
        .image(laneX(width, lane, this.mode.lanes, this.mode.lanePadding), py - 70, 'danger-mark')
        .setDepth(19)
        .setAlpha(0)
        .setScale(1.2);
      this.dangerMarks.push(mark);
    }

    this.grade.attach(this, {
      vignetteAlpha: this.mode.id === 'storm' ? 0.55 : 0.38,
      gradeTint: this.mode.id === 'storm' ? 0x1a2840 : 0x1a3a55,
      gradeAlpha: this.mode.id === 'storm' ? 0.14 : 0.08,
    });

    this.trailEmitter = this.add.particles(0, 0, 'px', {
      follow: this.lantern,
      followOffset: { x: 0, y: 18 },
      lifespan: 450,
      speed: { min: 10, max: 40 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: HUE_HEX[this.playerHue],
      frequency: 40,
      blendMode: 'ADD',
      emitting: true,
    });
    this.trailEmitter.setDepth(15);

    if (this.mode.id === 'storm') {
      this.stormRain = this.add.particles(width / 2, -20, 'rain-drop', {
        x: { min: 0, max: width },
        y: -20,
        lifespan: 1400,
        speedY: { min: 420, max: 720 },
        speedX: { min: -40, max: 20 },
        scale: { min: 0.7, max: 1.4 },
        alpha: { start: 0.45, end: 0 },
        quantity: 2,
        frequency: 40,
        tint: [0x8ecae6, 0xcbd5e1, 0xf4a261],
        blendMode: 'ADD',
      });
      this.stormRain.setDepth(6);
    }

    this.add.image(28, 56, 'hud-chip').setOrigin(0, 0.5).setDisplaySize(210, 44).setDepth(39).setAlpha(0.9);
    this.add
      .image(width - 28, 56, 'hud-chip')
      .setOrigin(1, 0.5)
      .setDisplaySize(170, 44)
      .setDepth(39)
      .setAlpha(0.9);

    this.scoreText = this.add
      .text(48, 44, `${tf('score')}: 0`, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '24px',
        color: '#FFF8EC',
      })
      .setDepth(40);
    this.comboText = this.add
      .text(48, 70, '', {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '18px',
        color: '#FFB347',
      })
      .setDepth(40);
    this.heightText = this.add
      .text(width - 48, 44, `${tf('height')}: 0`, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '20px',
        color: '#D6E8F2',
      })
      .setOrigin(1, 0)
      .setDepth(40);

    this.colorBadge = this.add.image(56, 122, 'badge-amber').setDepth(40).setScale(1.15);
    this.add
      .text(78, 122, tf('yourLight'), {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '16px',
        color: '#FFF8EC',
      })
      .setOrigin(0, 0.5)
      .setDepth(40);

    this.add
      .text(width / 2, height - 48, `${tf('collectHint')}  ·  ${tf('avoidHint')}`, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '18px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setDepth(40);

    this.storyText = this.add
      .text(width / 2, height * 0.18, '', {
        fontFamily: 'Literata, Georgia, serif',
        fontSize: '26px',
        color: '#FFF8EC',
        align: 'center',
        wordWrap: { width: width * 0.78 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(45);

    this.eventText = this.add
      .text(width / 2, height * 0.12, '', {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '20px',
        color: '#A8E4F5',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(45);

    // ghost tap onboarding — first ~10s of early runs
    this.ghostLeft = this.add
      .image(width * 0.18, height * 0.55, 'ghost-chevron')
      .setDepth(42)
      .setAlpha(0)
      .setScale(1.2);
    this.ghostRight = this.add
      .image(width * 0.82, height * 0.55, 'ghost-chevron')
      .setDepth(42)
      .setAlpha(0)
      .setScale(1.2)
      .setFlipX(true);
    this.ghostHint = this.add
      .text(width / 2, height * 0.48, tf('ghostHint'), {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '20px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5)
      .setDepth(42)
      .setAlpha(0);

    const showGhost = save.runs <= 3;
    this.ghostUntil = showGhost ? this.time.now + 10000 : 0;
    if (showGhost) {
      this.tweens.add({
        targets: [this.ghostLeft, this.ghostRight, this.ghostHint],
        alpha: { from: 0.15, to: 0.75 },
        duration: 700,
        yoyo: true,
        repeat: 6,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: this.ghostLeft,
        x: width * 0.18 - 10,
        duration: 600,
        yoyo: true,
        repeat: 6,
      });
      this.tweens.add({
        targets: this.ghostRight,
        x: width * 0.82 + 10,
        duration: 600,
        yoyo: true,
        repeat: 6,
      });
    }

    const firstBeat = this.story.tick(0);
    if (firstBeat) this.showStory(firstBeat.ru, firstBeat.en);

    this.pointerDownHandler = (pointer) => {
      if (!this.alive) return;
      this.clearGhostTutor();
      if (pointer.x < width / 2) this.moveLane(-1);
      else this.moveLane(1);
    };
    this.input.on('pointerdown', this.pointerDownHandler);
    this.input.keyboard?.on('keydown-LEFT', () => {
      this.clearGhostTutor();
      this.moveLane(-1);
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.clearGhostTutor();
      this.moveLane(1);
    });
    this.input.keyboard?.on('keydown-A', () => {
      this.clearGhostTutor();
      this.moveLane(-1);
    });
    this.input.keyboard?.on('keydown-D', () => {
      this.clearGhostTutor();
      this.moveLane(1);
    });

    void patchSave({ runs: save.runs + 1 });
    yandex.startGameplay();
    this.cameras.main.fadeIn(350, 7, 16, 24);
  }

  update(_time: number, delta: number): void {
    if (!this.alive) return;
    const dt = delta / 1000;
    const { width, height } = this.scale;

    const active = this.eventsDir.getActive();
    const scrollMul = active?.def.scrollMul ?? 1;
    const spawnMul = active?.def.spawnIntervalMul ?? 1;

    this.scroll = Math.min(
      this.mode.maxScroll,
      this.scroll + this.mode.scrollAccelPerSec * dt,
    );
    this.distance += this.scroll * scrollMul * dt * 0.08;

    this.spawner.updateScrollProgress(this.scroll);
    const started = this.eventsDir.update(this.distance, this.mode);
    if (started) this.announceEvent(started);

    this.starField.forEach((img) => {
      img.y += (img.getData('drift') as number) * dt;
      if (img.y > height + 10) {
        img.y = -10;
        img.x = Phaser.Math.Between(0, width);
      }
    });
    this.parallax.forEach((img) => {
      const speed = (img.getData('parallax') as number) || 6;
      // ridges sway horizontally; stars drift downward
      if (img.texture.key.startsWith('ridge')) {
        const baseX = img.getData('baseX') ?? img.x;
        img.setData('baseX', baseX);
        img.x = (baseX as number) + Math.sin(this.time.now / 2200 + speed) * 10;
        return;
      }
      img.y += speed * dt * 0.08;
      if (img.y > height + 100) img.y = -60;
    });

    const stormAmp = this.mode.id === 'storm' ? 5 : 0;
    this.threads.forEach((t, i) => {
      t.tilePositionY -= this.scroll * scrollMul * dt * 0.9;
      if (stormAmp) {
        t.x = this.threadBaseX[i] + Math.sin(this.time.now / 180 + i * 1.3) * stormAmp;
      }
    });

    if (this.mode.id === 'storm' && Math.random() < dt * 1.2) {
      this.juice.tapShake(0.0025, 60);
    }

    if (!this.ghostCleared && this.ghostUntil > 0 && this.time.now > this.ghostUntil) {
      this.clearGhostTutor();
    }

    const table =
      active?.def.spawnTable ??
      (this.distance < 55
        ? [
            { id: 'firefly' as const, weight: 0.78 },
            { id: 'portal' as const, weight: 0.14 },
            { id: 'shard' as const, weight: 0.06 },
            { id: 'void' as const, weight: 0.02 },
          ]
        : this.distance < 110
          ? [
              { id: 'firefly' as const, weight: 0.68 },
              { id: 'portal' as const, weight: 0.14 },
              { id: 'void' as const, weight: 0.12 },
              { id: 'shard' as const, weight: 0.06 },
            ]
          : undefined);
    const prefer = this.distance < 90 ? 0.72 : 0.35;
    const requests = this.spawner.tick(
      dt,
      this.mode.lanes,
      table,
      spawnMul,
      this.playerHue,
      prefer,
    );
    for (const req of requests) this.materialize(req);

    const playerY = height * this.mode.playerYRatio;
    const dangerNear = new Array(this.mode.lanes).fill(false);
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const def = getEntityDef(e.kind);
      e.go.y += this.scroll * scrollMul * dt;
      if (def.rotates) e.go.rotation += dt * 1.4;

      if (e.kind === 'firefly' && e.hue) {
        const match = e.hue === this.playerHue;
        const pulse = 0.75 + Math.sin(this.time.now / 180 + i) * 0.2;
        e.go.setAlpha(match ? Math.min(1, pulse) : 0.55);
        e.go.setScale(def.scale * (match ? 1 + Math.sin(this.time.now / 220 + i) * 0.06 : 0.92));
      }

      if (e.kind === 'void') {
        const approach = e.go.y > playerY - 280 && e.go.y < playerY + 40;
        if (approach) dangerNear[e.lane] = true;
      }

      const near =
        e.lane === this.playerLane &&
        Math.abs(e.go.y - playerY) < def.hitRadius &&
        e.go.y > playerY - 70;
      if (near) {
        this.handleHit(e);
        e.go.destroy();
        this.entities.splice(i, 1);
        continue;
      }
      if (e.go.y > playerY + 8 && e.kind === 'void' && !(e.go.getData('passed') as boolean)) {
        e.go.setData('passed', true);
        this.voidsPassed += 1;
        const laneDelta = Math.abs(e.lane - this.playerLane);
        if (laneDelta === 1) {
          this.nearMiss(e.go.x, playerY - 36);
        } else {
          this.popFloat(e.go.x, playerY - 40, '+1', COLORS.danger);
        }
      }

      if (e.go.y > height + 60) {
        e.go.destroy();
        this.entities.splice(i, 1);
      }
    }

    this.dangerMarks.forEach((mark, lane) => {
      const want = dangerNear[lane] ? 0.95 : 0;
      mark.setAlpha(Phaser.Math.Linear(mark.alpha, want, 1 - Math.pow(0.001, dt)));
      if (dangerNear[lane] && this.mode.id !== 'storm') {
        this.threads[lane]?.setTint(COLORS.danger);
      } else if (!stormAmp) {
        this.threads[lane]?.clearTint();
      } else if (dangerNear[lane]) {
        this.threads[lane]?.setTint(COLORS.danger);
      } else {
        this.threads[lane]?.setTint(0x8ecae6);
      }
    });

    this.maxCombo = Math.max(this.maxCombo, this.scores.combo);
    this.scoreText.setText(`${tf('score')}: ${Math.floor(this.scores.score)}`);
    this.heightText.setText(`${tf('height')}: ${Math.floor(this.distance)}`);
    this.comboText.setText(this.scores.combo > 1 ? `${tf('combo')} ×${this.scores.combo}` : '');
    this.refreshComboAura();

    const milestone = Math.floor(this.distance / 50) * 50;
    if (milestone >= 50 && milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      this.vfx.stamp(`${milestone}`, '#FFB347');
      this.juice.punchZoom(1.03, 80, 160);
      this.cameras.main.flash(90, 30, 40, 50);
      playTone('stamp');
      haptic(16);
    }

    this.revealCaretakers();

    const beat = this.story.tick(this.distance);
    if (beat && beat.meters > 0) this.showStory(beat.ru, beat.en);

    this.lantern.x = Phaser.Math.Linear(
      this.lantern.x,
      laneX(width, this.playerLane, this.mode.lanes, this.mode.lanePadding),
      1 - Math.pow(0.001, dt),
    );
    this.laneGlow.x = this.lantern.x;
    this.matchRing.x = this.lantern.x;
    this.matchRing.y = this.lantern.y;
    this.comboAura.x = this.lantern.x;
    this.comboAura.y = this.lantern.y;

    // ease camera lean back
    this.camLean = Phaser.Math.Linear(this.camLean, 0, 1 - Math.pow(0.02, dt));
    this.cameras.main.setRotation(this.camLean);
  }

  private clearGhostTutor(): void {
    if (this.ghostCleared) return;
    this.ghostCleared = true;
    this.tweens.killTweensOf([this.ghostLeft, this.ghostRight, this.ghostHint]);
    this.tweens.add({
      targets: [this.ghostLeft, this.ghostRight, this.ghostHint],
      alpha: 0,
      duration: 220,
    });
  }

  private revealCaretakers(): void {
    for (let i = 0; i < CARETAKER_AT.length; i++) {
      const at = CARETAKER_AT[i];
      if (this.distance < at || this.caretakerShown.has(at)) continue;
      this.caretakerShown.add(at);
      const img = this.caretakers[i];
      if (!img) continue;
      this.tweens.add({
        targets: img,
        alpha: 0.55,
        y: img.y - 18,
        duration: 900,
        ease: 'Sine.easeOut',
      });
      this.popFloat(img.x, img.y - 40, getLang() === 'ru' ? 'хранитель' : 'keeper', COLORS.amber);
      playTone('portal');
    }
  }

  private nearMiss(x: number, y: number): void {
    this.vfx.shred(x, y, 0xffc9b8, 8);
    this.popFloat(x, y, tf('nearMiss'), COLORS.coral);
    const spark = this.add.image(x, y, 'spark').setDepth(Depth.VFX).setTint(COLORS.coral).setScale(1.6);
    this.tweens.add({
      targets: spark,
      scale: 3,
      alpha: 0,
      duration: 380,
      onComplete: () => spark.destroy(),
    });
    playTone('ui');
    haptic(10);
  }

  private portalRipple(x: number, y: number, tint: number): void {
    this.vfx.shockwave(x, y, tint, 2.4);
    this.juice.punchZoom(1.05, 120, 180);
  }

  private refreshComboAura(): void {
    const combo = this.scores.combo;
    const tier = combo >= 10 ? 2 : combo >= 5 ? 1 : 0;
    const wantAlpha = tier === 0 ? 0 : tier === 1 ? 0.45 : 0.7;
    const wantScale = tier === 0 ? 0.8 : tier === 1 ? 1.35 : 1.8;
    this.comboAura.setAlpha(Phaser.Math.Linear(this.comboAura.alpha, wantAlpha, 0.12));
    this.comboAura.setScale(Phaser.Math.Linear(this.comboAura.scale, wantScale, 0.12));
    this.comboAura.setTint(HUE_HEX[this.playerHue]);

    if (tier > this.lastComboTier) {
      this.lastComboTier = tier;
      this.tweens.add({
        targets: this.comboAura,
        scale: wantScale * 1.25,
        duration: 160,
        yoyo: true,
      });
      this.vfx.shred(this.lantern.x, this.lantern.y, HUE_HEX[this.playerHue], 16);
      this.vfx.shockwave(this.lantern.x, this.lantern.y, HUE_HEX[this.playerHue], 1.8);
      const stamp =
        tier >= 2
          ? getLang() === 'ru'
            ? 'ПЛАМЯ!'
            : 'BLAZE!'
          : getLang() === 'ru'
            ? 'ЖАР'
            : 'HEAT';
      this.vfx.stamp(stamp, '#FFB347');
      playTone('stamp');
      hapticCombo(tier);
      this.juice.hitStop(tier >= 2 ? 65 : 48);
      this.juice.punchZoom(tier >= 2 ? 1.06 : 1.04);
    } else if (tier < this.lastComboTier) {
      this.lastComboTier = tier;
    }
  }

  private materialize(req: SpawnRequest): void {
    const def = getEntityDef(req.kind);
    const { width } = this.scale;
    const x = laneX(width, req.lane, this.mode.lanes, this.mode.lanePadding);
    const key = resolveTexture(def, req.hue);
    const go = this.add.image(x, -50, key).setDepth(12).setScale(def.scale * 0.6).setAlpha(0);
    this.tweens.add({
      targets: go,
      alpha: 1,
      scale: def.scale,
      duration: 220,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: go,
      scaleX: def.scale * 1.06,
      scaleY: def.scale * 0.94,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    if (def.rotates) {
      this.tweens.add({
        targets: go,
        angle: req.kind === 'shard' ? 360 : 180,
        duration: req.kind === 'shard' ? 2000 : 3500,
        repeat: -1,
      });
    }
    this.entities.push({ kind: req.kind, lane: req.lane, hue: req.hue, go });
  }

  private moveLane(dir: number): void {
    if (!this.alive) return;
    this.playerLane = Phaser.Math.Clamp(this.playerLane + dir, 0, this.mode.lanes - 1);
    playTone('ui');
    this.tweens.add({
      targets: this.lantern,
      scaleX: 1.18,
      scaleY: 0.95,
      duration: 70,
      yoyo: true,
    });
    this.camLean = dir * 0.028;
  }

  private handleHit(e: FallingEntity): void {
    const def = getEntityDef(e.kind);
    if (def.lethal) {
      this.die();
      return;
    }
    if (def.recolors && e.hue) {
      this.playerHue = e.hue;
      this.recolorLantern();
      playTone('portal');
      this.vfx.shred(e.go.x, e.go.y, HUE_HEX[e.hue], 12);
      this.portalRipple(e.go.x, e.go.y, HUE_HEX[e.hue]);
      this.popFloat(e.go.x, e.go.y - 30, getLang() === 'ru' ? 'новый свет' : 'new light', HUE_HEX[e.hue]);
      this.cameras.main.flash(120, 40, 60, 70);
      this.juice.hitStop(50);
      haptic(18);
      return;
    }
    if (def.score != null && def.colored) {
      if (e.hue === this.playerHue) {
        this.scores.collect(def.score, this.time.now, this.mode, Boolean(def.forceCombo));
        this.matchedCollects += 1;
        this.maxCombo = Math.max(this.maxCombo, this.scores.combo);
        playTone('collect', this.scores.combo);
        this.vfx.shred(e.go.x, e.go.y, HUE_HEX[e.hue ?? 'amber'], 10);
        this.vfx.shockwave(e.go.x, e.go.y, HUE_HEX[e.hue ?? 'amber'], 1.4);
        this.juice.hitStop(42);
        this.juice.tapShake(0.004, 55);
        haptic(14);
        const label =
          this.scores.combo > 1
            ? `+${def.score} ×${this.scores.combo}`
            : `+${def.score}`;
        this.popFloat(e.go.x, e.go.y - 24, label, HUE_HEX[e.hue ?? 'amber']);
      } else {
        this.scores.penalize(def.wrongPenalty ?? 5);
        playTone('hit');
        this.popFloat(e.go.x, e.go.y - 20, `−${def.wrongPenalty ?? 5}`, COLORS.danger);
        this.juice.hardHit();
        this.grade.pulse(this, 0x4a1020, 0.2, 180);
        haptic(28);
      }
      return;
    }
    if (def.score != null) {
      this.scores.collect(def.score, this.time.now, this.mode, Boolean(def.forceCombo));
      playTone('combo', this.scores.combo);
      this.vfx.shred(e.go.x, e.go.y, COLORS.mint, 12);
      this.juice.hitStop(48);
      haptic(16);
      this.popFloat(e.go.x, e.go.y - 24, `+${def.score}`, COLORS.mint);
    }
  }

  private popFloat(x: number, y: number, label: string, color: number): void {
    const hex = `#${color.toString(16).padStart(6, '0')}`;
    const t = this.add
      .text(x, y, label, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '22px',
        color: hex,
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0.95);
    this.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private recolorLantern(): void {
    recolorDrawnLantern(this.lantern, this.playerHue);
    this.trailEmitter.setParticleTint(HUE_HEX[this.playerHue]);
    this.colorBadge.setTexture(`badge-${this.playerHue}`);
    this.laneGlow.setTint(HUE_HEX[this.playerHue]);
    this.matchRing.setTint(HUE_HEX[this.playerHue]);
    this.comboAura.setTint(HUE_HEX[this.playerHue]);
    this.tweens.add({
      targets: this.colorBadge,
      scale: 1.35,
      duration: 120,
      yoyo: true,
    });
    this.tweens.add({
      targets: this.matchRing,
      scale: 1.55,
      duration: 160,
      yoyo: true,
    });
  }

  private showStory(ru: string, en: string): void {
    this.storyText.setText(getLang() === 'ru' ? ru : en);
    this.tweens.killTweensOf(this.storyText);
    this.storyText.setAlpha(0);
    this.tweens.add({
      targets: this.storyText,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 1800,
    });
  }

  private announceEvent(ev: RunEventDef): void {
    if (!ev.announce) return;
    this.eventText.setText(getLang() === 'ru' ? ev.nameRu : ev.nameEn);
    this.tweens.killTweensOf(this.eventText);
    this.eventText.setAlpha(0);
    this.tweens.add({
      targets: this.eventText,
      alpha: 1,
      duration: 250,
      yoyo: true,
      hold: 1200,
    });
    this.vfx.stamp(getLang() === 'ru' ? ev.nameRu : ev.nameEn, '#A8E4F5');
    playTone('stamp');
    this.juice.punchZoom(1.03);
  }

  private die(): void {
    if (!this.alive) return;
    this.alive = false;
    playTone('hit');
    haptic(32);
    yandex.stopGameplay();
    this.juice.hardHit();
    this.cameras.main.shake(180, 0.018);
    this.grade.pulse(this, 0x2a0810, 0.28, 260);
    this.vfx.shred(this.lantern.x, this.lantern.y, COLORS.danger, 18);
    this.cameras.main.setRotation(0);
    this.camLean = 0;
    this.trailEmitter.stop();
    this.stormRain?.stop();
    this.clearGhostTutor();
    this.tweens.add({
      targets: this.lantern,
      alpha: 0.2,
      scale: 0.6,
      duration: 280,
    });
    this.comboAura.setAlpha(0);
    void this.afterDeath();
  }

  private async afterDeath(): Promise<void> {
    const save = getSave();
    const deaths = save.deathsSinceFullscreen + 1;
    await patchSave({ deathsSinceFullscreen: deaths });

    if (!this.continued && this.mode.continueOncePerRun) {
      this.showContinue();
      return;
    }

    if (deaths >= this.mode.fullscreenEveryDeaths) {
      await yandex.showFullscreen();
      await patchSave({ deathsSinceFullscreen: 0 });
    }
    this.goResult();
  }

  private showContinue(): void {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(60);
    const title = this.add
      .text(width / 2, height * 0.38, tf('gameOver'), {
        fontFamily: 'Literata, Georgia, serif',
        fontSize: '48px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(61);

    const adBtn = this.add
      .image(width / 2, height * 0.52, 'ui-btn')
      .setDisplaySize(360, 70)
      .setDepth(61)
      .setInteractive({ useHandCursor: true });
    const adText = this.add
      .text(width / 2, height * 0.52, tf('continueAd'), {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '24px',
        color: '#0C1C2E',
      })
      .setOrigin(0.5)
      .setDepth(62);

    const skip = this.add
      .text(width / 2, height * 0.62, tf('again'), {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '20px',
        color: '#D6E8F2',
      })
      .setOrigin(0.5)
      .setDepth(62)
      .setInteractive({ useHandCursor: true });

    const cleanup = () => {
      overlay.destroy();
      title.destroy();
      adBtn.destroy();
      adText.destroy();
      skip.destroy();
    };

    adBtn.on('pointerup', async () => {
      const ok = await yandex.showRewarded();
      if (ok) {
        cleanup();
        this.revive();
      }
    });

    skip.on('pointerup', async () => {
      cleanup();
      const save = getSave();
      if (save.deathsSinceFullscreen >= this.mode.fullscreenEveryDeaths) {
        await yandex.showFullscreen();
        await patchSave({ deathsSinceFullscreen: 0 });
      }
      this.goResult();
    });
  }

  private revive(): void {
    this.continued = true;
    this.alive = true;
    this.lastComboTier = 0;

    // relight: wick from dark → flame bloom
    this.lantern.setAlpha(0.15).setScale(0.55);
    const flame = this.lantern.getData('flame') as Phaser.GameObjects.Triangle | undefined;
    const outer = this.lantern.getData('outerGlow') as Phaser.GameObjects.Rectangle | undefined;
    flame?.setScale(0.2);
    outer?.setAlpha(0);

    this.tweens.add({
      targets: this.lantern,
      alpha: 1,
      scale: 1.45,
      duration: 520,
      ease: 'Back.easeOut',
    });
    if (flame) {
      this.tweens.add({
        targets: flame,
        scaleX: 1,
        scaleY: 1,
        duration: 420,
        ease: 'Back.easeOut',
      });
    }
    if (outer) {
      this.tweens.add({
        targets: outer,
        alpha: 0.28,
        scale: 1.15,
        duration: 500,
      });
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.kind === 'void' && Math.abs(e.go.y - this.lantern.y) < 220) {
        e.go.destroy();
        this.entities.splice(i, 1);
      }
    }

    this.time.delayedCall(180, () => {
      this.vfx.shred(this.lantern.x, this.lantern.y, HUE_HEX[this.playerHue], 14);
      this.vfx.shockwave(this.lantern.x, this.lantern.y, HUE_HEX[this.playerHue], 1.6);
      this.trailEmitter.start();
      this.stormRain?.start();
    });

    this.popFloat(this.lantern.x, this.lantern.y - 50, tf('relight'), HUE_HEX[this.playerHue]);
    this.cameras.main.flash(280, 244, 162, 97);
    playTone('start');
    haptic(20);
    yandex.startGameplay();
  }

  private goResult(): void {
    this.input.off('pointerdown', this.pointerDownHandler);
    this.cameras.main.setRotation(0);
    this.cameras.main.setZoom(1);
    const stats: RunStats = {
      score: Math.floor(this.scores.score),
      height: Math.floor(this.distance),
      maxCombo: this.maxCombo,
      matchedCollects: this.matchedCollects,
      voidsPassed: this.voidsPassed,
    };
    this.scene.start('Result', {
      score: stats.score,
      height: stats.height,
      combo: this.scores.combo,
      modeId: this.mode.id,
      stats,
    });
  }
}
