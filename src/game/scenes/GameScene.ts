import Phaser from 'phaser';
import {
  BALANCE,
  COLORS,
  HUE_HEX,
  SKINS,
  STORY_BEATS,
  type HueId,
} from '@/data/balance';
import { drawLantern, laneX } from '@/game/assets/generate';
import { getSave, patchSave } from '@/data/save';
import { tf, getLang } from '@/i18n';
import { playTone } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';

type EntityKind = 'firefly' | 'void' | 'portal' | 'shard';

interface FallingEntity {
  kind: EntityKind;
  lane: number;
  hue?: HueId;
  go: Phaser.GameObjects.Image;
}

export class GameScene extends Phaser.Scene {
  private playerLane = 1;
  private playerHue: HueId = 'amber';
  private lantern!: Phaser.GameObjects.Container;
  private scroll: number = BALANCE.baseScroll;
  private distance = 0;
  private score = 0;
  private combo = 0;
  private lastCollectAt = 0;
  private spawnAcc = 0;
  private spawnEvery: number = BALANCE.spawnIntervalStart;
  private entities: FallingEntity[] = [];
  private threads: Phaser.GameObjects.TileSprite[] = [];
  private stars!: Phaser.GameObjects.TileSprite;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private heightText!: Phaser.GameObjects.Text;
  private storyText!: Phaser.GameObjects.Text;
  private alive = true;
  private continued = false;
  private lastStoryAt = -999;
  private pointerDownHandler!: (pointer: Phaser.Input.Pointer) => void;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('Game');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = getSave();
    const skin = SKINS.find((s) => s.id === save.skinId) ?? SKINS[0];

    this.alive = true;
    this.continued = false;
    this.playerLane = 1;
    this.playerHue = 'amber';
    this.scroll = BALANCE.baseScroll;
    this.distance = 0;
    this.score = 0;
    this.combo = 0;
    this.spawnAcc = 0;
    this.spawnEvery = BALANCE.spawnIntervalStart;
    this.entities = [];
    this.lastStoryAt = -999;

    this.add.image(width / 2, height / 2, 'bg-grad').setDisplaySize(width, height).setDepth(0);
    this.stars = this.add
      .tileSprite(width / 2, height / 2, width, height, 'star')
      .setAlpha(0.35)
      .setDepth(1);
    // denser starfield by repeating small tex via tinted copies
    for (let i = 0; i < 40; i++) {
      this.add
        .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'star')
        .setAlpha(Phaser.Math.FloatBetween(0.12, 0.55))
        .setScale(Phaser.Math.FloatBetween(0.4, 1.2))
        .setDepth(1)
        .setData('drift', Phaser.Math.FloatBetween(20, 60));
    }

    this.threads = [];
    for (let lane = 0; lane < BALANCE.lanes; lane++) {
      const x = laneX(width, lane, BALANCE.lanes, BALANCE.lanePadding);
      const thread = this.add
        .tileSprite(x, height / 2, 10, height + 40, 'thread')
        .setAlpha(0.55)
        .setDepth(5);
      this.threads.push(thread);
    }

    const py = height * BALANCE.playerYRatio;
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

    this.whisper(0);

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

    this.scroll = Math.min(BALANCE.maxScroll, this.scroll + BALANCE.scrollAccelPerSec * dt);
    this.distance += this.scroll * dt * 0.08;
    this.spawnEvery = Phaser.Math.Linear(
      BALANCE.spawnIntervalStart,
      BALANCE.spawnIntervalMin,
      Phaser.Math.Clamp((this.scroll - BALANCE.baseScroll) / (BALANCE.maxScroll - BALANCE.baseScroll), 0, 1),
    );

    this.stars.tilePositionY -= this.scroll * dt * 0.15;
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
      t.tilePositionY -= this.scroll * dt * 0.9;
    });

    this.spawnAcc += dt;
    while (this.spawnAcc >= this.spawnEvery) {
      this.spawnAcc -= this.spawnEvery;
      this.spawnEntity();
    }

    const playerY = height * BALANCE.playerYRatio;
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      e.go.y += this.scroll * dt;
      if (e.kind === 'portal') e.go.rotation += dt * 1.4;

      const near =
        e.lane === this.playerLane && Math.abs(e.go.y - playerY) < 42 && e.go.y > playerY - 70;
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

    this.scoreText.setText(`${tf('score')}: ${Math.floor(this.score)}`);
    this.heightText.setText(`${tf('height')}: ${Math.floor(this.distance)}`);
    this.comboText.setText(this.combo > 1 ? `${tf('combo')} ×${this.combo}` : '');

    const reached = STORY_BEATS.filter((b) => b.meters <= this.distance);
    const storyMeters = reached.length ? reached[reached.length - 1].meters : 0;
    if (storyMeters !== this.lastStoryAt && storyMeters > 0) {
      this.whisper(storyMeters);
    }

    // subtle breathing sway
    this.lantern.x = Phaser.Math.Linear(
      this.lantern.x,
      laneX(width, this.playerLane),
      1 - Math.pow(0.001, dt),
    );
  }

  private moveLane(dir: number): void {
    if (!this.alive) return;
    this.playerLane = Phaser.Math.Clamp(this.playerLane + dir, 0, BALANCE.lanes - 1);
    playTone('ui');
    this.tweens.add({
      targets: this.lantern,
      scaleX: 1.18,
      scaleY: 0.95,
      duration: 70,
      yoyo: true,
    });
  }

  private spawnEntity(): void {
    const { width } = this.scale;
    const lane = Phaser.Math.Between(0, BALANCE.lanes - 1);
    const roll = Math.random();
    let kind: EntityKind;
    if (roll < BALANCE.fireflyChance) kind = 'firefly';
    else if (roll < BALANCE.fireflyChance + BALANCE.obstacleChance) kind = 'void';
    else if (roll < BALANCE.fireflyChance + BALANCE.obstacleChance + BALANCE.portalChance)
      kind = 'portal';
    else kind = 'shard';

    const hues: HueId[] = ['amber', 'teal', 'coral'];
    const hue = hues[Phaser.Math.Between(0, hues.length - 1)];
    const x = laneX(width, lane);
    let key = 'void';
    if (kind === 'firefly') key = `orb-${hue}`;
    if (kind === 'portal') key = `portal-${hue}`;
    if (kind === 'shard') key = 'shard';

    const go = this.add.image(x, -40, key).setDepth(12);
    if (kind === 'firefly') go.setScale(0.9);
    if (kind === 'void') go.setScale(0.95);
    if (kind === 'portal') go.setScale(0.85).setAlpha(0.95);
    if (kind === 'shard') {
      go.setScale(1.1);
      this.tweens.add({ targets: go, angle: 360, duration: 1800, repeat: -1 });
    }

    this.entities.push({ kind, lane, hue, go });
  }

  private handleHit(e: FallingEntity): void {
    if (e.kind === 'void') {
      this.die();
      return;
    }
    if (e.kind === 'portal' && e.hue) {
      this.playerHue = e.hue;
      this.recolorLantern();
      playTone('portal');
      this.burst(e.go.x, e.go.y, HUE_HEX[e.hue]);
      this.cameras.main.flash(120, 40, 60, 70);
      return;
    }
    if (e.kind === 'shard') {
      this.registerCollect(BALANCE.shardScore, true);
      playTone('combo', this.combo);
      this.burst(e.go.x, e.go.y, COLORS.mint);
      return;
    }
    if (e.kind === 'firefly') {
      if (e.hue === this.playerHue) {
        this.registerCollect(BALANCE.fireflyScore, false);
        playTone('collect', this.combo);
        this.burst(e.go.x, e.go.y, HUE_HEX[e.hue]);
      } else {
        // wrong color — soft punish: break combo + small score loss feel
        this.combo = 0;
        playTone('hit');
        this.cameras.main.shake(100, BALANCE.softShake);
        this.score = Math.max(0, this.score - 5);
      }
    }
  }

  private registerCollect(base: number, forceCombo: boolean): void {
    const now = this.time.now;
    if (forceCombo || now - this.lastCollectAt <= BALANCE.comboWindowMs) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.lastCollectAt = now;
    const mult = 1 + Math.min(8, this.combo - 1) * 0.25;
    const gained = Math.round(base * mult + (this.combo >= 5 ? BALANCE.perfectBonus : 0));
    this.score += gained;
    if (this.combo === 5 || this.combo === 10) playTone('combo', this.combo);
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

  private whisper(meters: number): void {
    this.lastStoryAt = meters;
    const beat = STORY_BEATS.find((b) => b.meters === meters) ?? STORY_BEATS[0];
    const line = getLang() === 'ru' ? beat.ru : beat.en;
    this.storyText.setText(line);
    this.tweens.add({
      targets: this.storyText,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 1800,
      onYoyo: () => undefined,
    });
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

    if (!this.continued && BALANCE.continueOncePerRun) {
      this.showContinue();
      return;
    }

    if (deaths >= BALANCE.fullscreenEveryDeaths) {
      await yandex.showFullscreen();
      await patchSave({ deathsSinceFullscreen: 0 });
    }

    this.goResult(false);
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
      if (save.deathsSinceFullscreen >= BALANCE.fullscreenEveryDeaths) {
        await yandex.showFullscreen();
        await patchSave({ deathsSinceFullscreen: 0 });
      }
      this.goResult(false);
    });
  }

  private revive(): void {
    this.continued = true;
    this.alive = true;
    this.lantern.setAlpha(1).setScale(1.1);
    // clear nearby voids
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

  private goResult(fromContinue: boolean): void {
    void fromContinue;
    this.input.off('pointerdown', this.pointerDownHandler);
    this.scene.start('Result', {
      score: Math.floor(this.score),
      height: Math.floor(this.distance),
      combo: this.combo,
    });
  }
}
