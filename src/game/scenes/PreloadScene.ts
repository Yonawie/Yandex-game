import Phaser from 'phaser';
import { generateTextures } from '@/game/assets/generate';
import { promoteAtlasFrames } from '@/game/assets/atlas';
import { yandex } from '@/sdk/yandex';
import { setLang, tf } from '@/i18n';
import { hydrateSave, setRemoteWriter, loadLocalSave } from '@/data/save';
import { setMuted } from '@/game/audio/sfx';
import { COLORS } from '@/data/balance';
import { loadRemoteBalancePatch } from '@/content/runtimeConfig';
import { syncRetentionClock } from '@/retention/service';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    promise
      .then((value) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

export class PreloadScene extends Phaser.Scene {
  private bootStarted = false;
  private bar!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Preload');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bgTop);
    const barBg = this.add.rectangle(width / 2, height * 0.55, 280, 10, 0x1b2838).setOrigin(0.5);
    this.bar = this.add.rectangle(barBg.x - 140, barBg.y, 4, 10, COLORS.amber).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      if (this.bar) this.bar.width = 4 + 276 * value;
    });

    // One atlas for entities + UI props (TexturePacker-style)
    this.load.atlas('world', 'atlases/world.png', 'atlases/world.json');
    // Hero sky — WebP
    this.load.image('bg-sky', 'backgrounds/bg-sky.webp');
  }

  create(): void {
    const { width, height } = this.scale;

    if (this.textures.exists('bg-sky')) {
      this.add.image(width / 2, height / 2, 'bg-sky').setDisplaySize(width, height).setAlpha(0.85);
    }

    promoteAtlasFrames(this, 'world');

    const title = this.add
      .text(width / 2, height * 0.42, tf('brand'), {
        fontFamily: 'Literata, Georgia, serif',
        fontSize: '58px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5);
    title.setShadow(0, 4, '#FFB347', 14, true, true);

    this.add
      .text(width / 2, height * 0.62, tf('loading'), {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '22px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5);

    if (!this.bootStarted) {
      this.bootStarted = true;
      void this.boot(title);
    }
  }

  private async boot(title: Phaser.GameObjects.Text): Promise<void> {
    try {
      await withTimeout(yandex.init(), 2500, undefined);
      setLang(yandex.getLang());
      title.setText(tf('brand'));

      setRemoteWriter((data) => yandex.writeCloud(data));
      const remote = await withTimeout(yandex.loadCloud(), 2000, null);
      const save = await hydrateSave(remote);
      setMuted(!save.sound);

      loadRemoteBalancePatch();
      await withTimeout(syncRetentionClock().then(() => undefined), 1500, undefined);
      generateTextures(this);
    } catch (e) {
      console.warn('Preload soft-fail, continuing', e);
      try {
        loadLocalSave();
        generateTextures(this);
      } catch (err) {
        console.warn('Texture gen failed', err);
      }
    }

    yandex.markReady();
    this.scene.start('Menu');
  }
}
