import Phaser from 'phaser';
import { COLORS, SKINS } from '@/data/balance';
import { drawLantern } from '@/game/assets/generate';
import { getSave, patchSave, addCoins, unlockSkin } from '@/data/save';
import { tf, getLang } from '@/i18n';
import { playTone, setMuted, isMuted } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';

export class MenuScene extends Phaser.Scene {
  private stars!: Phaser.GameObjects.Group;
  private skinIndex = 0;
  private lantern!: Phaser.GameObjects.Container;
  private coinsText!: Phaser.GameObjects.Text;
  private skinName!: Phaser.GameObjects.Text;
  private skinHint!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    yandex.stopGameplay();
    const { width, height } = this.scale;
    const save = getSave();
    this.skinIndex = Math.max(
      0,
      SKINS.findIndex((s) => s.id === save.skinId),
    );

    this.add.image(width / 2, height / 2, 'bg-grad').setDisplaySize(width, height);
    this.stars = this.add.group();
    for (let i = 0; i < 48; i++) {
      const s = this.add
        .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'star')
        .setAlpha(Phaser.Math.FloatBetween(0.15, 0.7))
        .setScale(Phaser.Math.FloatBetween(0.5, 1.4));
      this.stars.add(s);
    }

    // soft aurora
    const aurora = this.add.circle(width * 0.3, height * 0.25, 180, COLORS.teal, 0.08);
    this.tweens.add({
      targets: aurora,
      x: width * 0.7,
      alpha: 0.14,
      duration: 5000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const brand = this.add
      .text(width / 2, height * 0.16, tf('brand'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '72px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);
    brand.setShadow(0, 8, '#F4A261', 18, true, true);

    this.add
      .text(width / 2, height * 0.23, tf('tagline'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#9BB0C1',
        align: 'center',
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5);

    this.lantern = drawLantern(this, width / 2, height * 0.42, SKINS[this.skinIndex], 'amber', 1.55);
    this.tweens.add({
      targets: this.lantern,
      y: this.lantern.y - 14,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(width / 2, height * 0.58, `${tf('best')}: ${save.bestScore}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '24px',
        color: '#F4A261',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(width / 2, height * 0.62, `${tf('coins')}: ${save.coins}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#8ECAE6',
      })
      .setOrigin(0.5);

    this.makeButton(width / 2, height * 0.72, tf('play'), () => {
      playTone('start');
      this.scene.start('Game');
    });

    this.skinName = this.add
      .text(width / 2, height * 0.81, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);
    this.skinHint = this.add
      .text(width / 2, height * 0.845, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5);

    this.makeChip(width * 0.28, height * 0.81, '‹', () => this.cycleSkin(-1));
    this.makeChip(width * 0.72, height * 0.81, '›', () => this.cycleSkin(1));
    this.refreshSkinLabel();

    const soundLabel = save.sound ? tf('soundOn') : tf('soundOff');
    const soundBtn = this.add
      .text(width / 2, height * 0.92, soundLabel, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '18px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    soundBtn.on('pointerup', async () => {
      const next = isMuted();
      setMuted(!next);
      await patchSave({ sound: next });
      soundBtn.setText(next ? tf('soundOn') : tf('soundOff'));
      playTone('ui');
    });

    if (!save.seenTip) {
      this.showTips();
    }

    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      this.stars.getChildren().forEach((obj) => {
        const s = obj as Phaser.GameObjects.Image;
        s.y += 0.15 + s.scaleX * 0.1;
        if (s.y > height) s.y = -4;
      });
    });
  }

  private async cycleSkin(dir: number): Promise<void> {
    playTone('ui');
    this.skinIndex = (this.skinIndex + dir + SKINS.length) % SKINS.length;
    const skin = SKINS[this.skinIndex];
    const save = getSave();
    const owned = save.unlockedSkins.includes(skin.id);

    if (!owned && save.coins >= skin.price) {
      await addCoins(-skin.price);
      await unlockSkin(skin.id);
    }

    const now = getSave();
    if (now.unlockedSkins.includes(skin.id)) {
      await patchSave({ skinId: skin.id });
      this.lantern.destroy();
      this.lantern = drawLantern(this, this.scale.width / 2, this.scale.height * 0.42, skin, 'amber', 1.55);
      this.tweens.add({
        targets: this.lantern,
        y: this.lantern.y - 14,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.coinsText.setText(`${tf('coins')}: ${getSave().coins}`);
    this.refreshSkinLabel();
  }

  private refreshSkinLabel(): void {
    const skin = SKINS[this.skinIndex];
    const lang = getLang();
    const save = getSave();
    const owned = save.unlockedSkins.includes(skin.id);
    this.skinName.setText(lang === 'ru' ? skin.nameRu : skin.nameEn);
    this.skinHint.setText(
      owned ? tf('skin') : `${tf('locked')} · ${skin.price} ${tf('coins').toLowerCase()}`,
    );
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.image(x, y, 'ui-btn').setDisplaySize(280, 72).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '30px',
        color: '#071018',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setTint(0xffd6a5));
    bg.on('pointerout', () => bg.clearTint());
    bg.on('pointerup', onClick);
    text.setDepth(2);
  }

  private makeChip(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.circle(x, y, 24, 0x1b2838, 0.9).setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '28px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);
    bg.on('pointerup', onClick);
  }

  private showTips(): void {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(50);
    const panel = this.add
      .image(width / 2, height / 2, 'ui-panel')
      .setDisplaySize(width * 0.84, 360)
      .setDepth(51);
    const tip = this.add
      .text(
        width / 2,
        height / 2 - 40,
        `${tf('tipTap')}\n\n${tf('tipColor')}\n\n${tf('tipPortal')}`,
        {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '22px',
          color: '#F7F3E8',
          align: 'center',
          wordWrap: { width: width * 0.7 },
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)
      .setDepth(52);
    const ok = this.add
      .text(width / 2, height / 2 + 120, tf('play'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '26px',
        color: '#F4A261',
      })
      .setOrigin(0.5)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });
    ok.on('pointerup', async () => {
      overlay.destroy();
      panel.destroy();
      tip.destroy();
      ok.destroy();
      await patchSave({ seenTip: true });
    });
  }
}
