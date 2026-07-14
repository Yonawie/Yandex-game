import Phaser from 'phaser';
import { generateTextures } from '@/game/assets/generate';
import { yandex } from '@/sdk/yandex';
import { setLang, tf } from '@/i18n';
import { hydrateSave, setRemoteWriter } from '@/data/save';
import { setMuted } from '@/game/audio/sfx';
import { COLORS } from '@/data/balance';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bgTop);
    const title = this.add
      .text(width / 2, height * 0.42, '…', {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '54px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);
    const barBg = this.add.rectangle(width / 2, height * 0.55, 280, 10, 0x1b2838).setOrigin(0.5);
    const bar = this.add.rectangle(barBg.x - 140, barBg.y, 4, 10, COLORS.amber).setOrigin(0, 0.5);

    void this.boot(title, bar);
  }

  private async boot(
    title: Phaser.GameObjects.Text,
    bar: Phaser.GameObjects.Rectangle,
  ): Promise<void> {
    const tween = this.tweens.add({
      targets: bar,
      width: 280,
      duration: 900,
      ease: 'Sine.easeInOut',
    });

    await yandex.init();
    setLang(yandex.getLang());
    title.setText(tf('brand'));

    this.add
      .text(this.scale.width / 2, this.scale.height * 0.62, tf('loading'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5);

    setRemoteWriter((data) => yandex.writeCloud(data));
    const remote = await yandex.loadCloud();
    const save = await hydrateSave(remote);
    setMuted(!save.sound);

    generateTextures(this);

    await new Promise<void>((resolve) => {
      if (tween.isPlaying()) {
        tween.once(Phaser.Tweens.Events.TWEEN_COMPLETE, () => resolve());
      } else {
        resolve();
      }
    });

    yandex.markReady();
    this.scene.start('Menu');
  }
}
