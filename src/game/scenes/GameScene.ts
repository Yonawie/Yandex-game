import Phaser from 'phaser';
import { COLORS, HUE_HEX, SKINS, type HueId } from '@/data/balance';
import { getEntityDef, resolveTexture } from '@/content/entities';
import { resolveMode, getActiveModeId, loadRemoteBalancePatch } from '@/content/runtimeConfig';
import type { EntityKind, ModeDef, RunEventDef, SpawnRequest } from '@/content/types';
import { drawLantern, laneX } from '@/game/assets/generate';
import { Spawner } from '@/game/systems/Spawner';
import { EventDirector } from '@/game/systems/EventDirector';
import { ScoreSystem } from '@/game/systems/ScoreSystem';
import { StoryDirector } from '@/game/systems/StoryDirector';
import { getSave, patchSave } from '@/data/save';
import { tf, getLang } from '@/i18n';
import { playTone } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';

interface FallingEntity {
  kind: EntityKind;
  lane: number;
  hue?: HueId;
  go: Phaser.GameObjects.Image;
}

export class GameScene extends Phaser.Scene {
  private mode!: ModeDef;
  private playerLane = 1;
  private playerHue: HueId = 'amber';
  private lantern!: Phaser.GameObjects.Container;
  private scroll = 0;
  private distance = 0;
  private entities: FallingEntity[] = [];
  private threads: Phaser.GameObjects.TileSprite[] = [];
  private stars!: Phaser.GameObjects.TileSprite;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private heightText!: Phaser.GameObjects.Text;
  private storyText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private alive = true;
  private continued = false;
  private pointerDownHandler!: (pointer: Phaser.Input.Pointer) => void;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private spawner!: Spawner;
  private eventsDir!: EventDirector;
  private scores!: ScoreSystem;
  private story!: StoryDirector;

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

    this.spawner = new Spawner(this.mode);
    this.eventsDir = new EventDirector();
    this.eventsDir.reset(this.mode);
    this.scores = new ScoreSystem();
    this.scores.reset();
    this.story = new StoryDirector();
    this.story.reset();

    this.add.image(width / 2, height / 2, 'bg-grad').setDisplaySize(width, height).setDepth(0);
    this.stars = this.add
      .tileSprite(width / 2, height / 2, width, height, 'star')
      .setAlpha(0.35)
      .setDepth(1);
    for (let i = 0; i < 40; i++) {
      this.add
        .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'star')
        .setAlpha(Phaser.Math.FloatBetween(0.12, 0.55))
        .setScale(Phaser.Math.FloatBetween(0.4, 1.2))
        .setDepth(1)
        .setData('drift', Phaser.Math.FloatBetween(20, 60));
    }

    this.threads = [];
    for (let lane = 0; lane < this.mode.lanes; lane++) {
      const x = laneX(width, lane, this.mode.lanes, this.mode.lanePadding);
      const thread = this.add
        .tileSprite(x, height / 2, 10, height + 40, 'thread')
        .setAlpha(0.55)
        .setDepth(5);
      this.threads.push(thread);
    }

    const py = height * this.mode.playerYRatio;
    this.lantern = drawLantern(this, laneX(width, this.playerLane), py, skin, this.playerHue, 1.1);

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

    this.scoreText = this.add
      .text(32, 36, `${tf('score')}: 0`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '28px',
        color: '#F7F3E8',
      })
      .setDepth(40);
    this.comboText = this.add
      .text(32, 72, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#F4A261',
      })
      .setDepth(40);
    this.heightText = this.add
      .text(width - 32, 36, `${tf('height')}: 0`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#9BB0C1',
      })
      .setOrigin(1, 0)
      .setDepth(40);

    this.storyText = this.add
      .text(width / 2, height * 0.18, '', {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '26px',
        color: '#F7F3E8',
        align: 'center',
        wordWrap: { width: width * 0.78 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(45);

    this.eventText = this.add
      .text(width / 2, height * 0.12, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#8ECAE6',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(45);

    const firstBeat = this.story.tick(0);
    if (firstBeat) this.showStory(firstBeat.ru, firstBeat.en);

    this.pointerDownHandler = (pointer) => {
      if (!this.alive) return;
      if (pointer.x < width / 2) this.moveLane(-1);
      else this.moveLane(1);
    };
    this.input.on('pointerdown', this.pointerDownHandler);
    this.input.keyboard?.on('keydown-LEFT', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-A', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-D', () => this.moveLane(1));

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

    this.stars.tilePositionY -= this.scroll * scrollMul * dt * 0.15;
    this.children.list.forEach((child) => {
      if (child.getData('drift')) {
        const img = child as Phaser.GameObjects.Image;
        img.y += (img.getData('drift') as number) * dt;
        if (img.y > height + 10) {
          img.y = -10;
          img.x = Phaser.Math.Between(0, width);
        }
      }
    });
    this.threads.forEach((t) => {
      t.tilePositionY -= this.scroll * scrollMul * dt * 0.9;
    });

    const table = active?.def.spawnTable;
    const requests = this.spawner.tick(dt, this.mode.lanes, table, spawnMul);
    for (const req of requests) this.materialize(req);

    const playerY = height * this.mode.playerYRatio;
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const def = getEntityDef(e.kind);
      e.go.y += this.scroll * scrollMul * dt;
      if (def.rotates) e.go.rotation += dt * 1.4;

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
      if (e.go.y > height + 60) {
        e.go.destroy();
        this.entities.splice(i, 1);
      }
    }

    this.scoreText.setText(`${tf('score')}: ${Math.floor(this.scores.score)}`);
    this.heightText.setText(`${tf('height')}: ${Math.floor(this.distance)}`);
    this.comboText.setText(this.scores.combo > 1 ? `${tf('combo')} ×${this.scores.combo}` : '');

    const beat = this.story.tick(this.distance);
    if (beat && beat.meters > 0) this.showStory(beat.ru, beat.en);

    this.lantern.x = Phaser.Math.Linear(
      this.lantern.x,
      laneX(width, this.playerLane, this.mode.lanes, this.mode.lanePadding),
      1 - Math.pow(0.001, dt),
    );
  }

  private materialize(req: SpawnRequest): void {
    const def = getEntityDef(req.kind);
    const { width } = this.scale;
    const x = laneX(width, req.lane, this.mode.lanes, this.mode.lanePadding);
    const key = resolveTexture(def, req.hue);
    const go = this.add.image(x, -40, key).setDepth(12).setScale(def.scale);
    if (req.kind === 'portal') go.setAlpha(0.95);
    if (def.rotates && req.kind === 'shard') {
      this.tweens.add({ targets: go, angle: 360, duration: 1800, repeat: -1 });
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
      this.burst(e.go.x, e.go.y, HUE_HEX[e.hue]);
      this.cameras.main.flash(120, 40, 60, 70);
      return;
    }
    if (def.score != null && def.colored) {
      if (e.hue === this.playerHue) {
        this.scores.collect(def.score, this.time.now, this.mode, Boolean(def.forceCombo));
        playTone('collect', this.scores.combo);
        this.burst(e.go.x, e.go.y, HUE_HEX[e.hue ?? 'amber']);
        if (this.scores.combo === 5 || this.scores.combo === 10) playTone('combo', this.scores.combo);
      } else {
        this.scores.penalize(def.wrongPenalty ?? 5);
        playTone('hit');
        this.cameras.main.shake(100, this.mode.softShake);
      }
      return;
    }
    if (def.score != null) {
      this.scores.collect(def.score, this.time.now, this.mode, Boolean(def.forceCombo));
      playTone('combo', this.scores.combo);
      this.burst(e.go.x, e.go.y, COLORS.mint);
    }
  }

  private recolorLantern(): void {
    const glow = this.lantern.list[0] as Phaser.GameObjects.Arc;
    glow.setFillStyle(HUE_HEX[this.playerHue], 0.28);
    this.trailEmitter.setParticleTint(HUE_HEX[this.playerHue]);
  }

  private burst(x: number, y: number, tint: number): void {
    const emitter = this.add.particles(x, y, 'px', {
      speed: { min: 40, max: 160 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint,
      quantity: 10,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.setDepth(30);
    emitter.explode(12);
    this.time.delayedCall(500, () => emitter.destroy());
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
    playTone('portal');
  }

  private die(): void {
    if (!this.alive) return;
    this.alive = false;
    playTone('hit');
    yandex.stopGameplay();
    this.cameras.main.shake(220, 0.02);
    this.trailEmitter.stop();
    this.tweens.add({
      targets: this.lantern,
      alpha: 0.2,
      scale: 0.6,
      duration: 280,
    });
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
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '48px',
        color: '#F7F3E8',
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
        fontFamily: 'Outfit, sans-serif',
        fontSize: '24px',
        color: '#071018',
      })
      .setOrigin(0.5)
      .setDepth(62);

    const skip = this.add
      .text(width / 2, height * 0.62, tf('again'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#9BB0C1',
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
    this.lantern.setAlpha(1).setScale(1.1);
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.kind === 'void' && Math.abs(e.go.y - this.lantern.y) < 220) {
        e.go.destroy();
        this.entities.splice(i, 1);
      }
    }
    this.trailEmitter.start();
    this.cameras.main.flash(200, 244, 162, 97);
    playTone('start');
    yandex.startGameplay();
  }

  private goResult(): void {
    this.input.off('pointerdown', this.pointerDownHandler);
    this.scene.start('Result', {
      score: Math.floor(this.scores.score),
      height: Math.floor(this.distance),
      combo: this.scores.combo,
      modeId: this.mode.id,
    });
  }
}
