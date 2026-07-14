import Phaser from 'phaser';
import { COLORS } from '@/data/balance';
import { getSave, patchSave, addCoins } from '@/data/save';
import { tf } from '@/i18n';
import { playTone } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';

interface ResultData {
  score: number;
  height: number;
  combo: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    yandex.stopGameplay();
    const { width, height } = this.scale;
    const score = data?.score ?? 0;
    const runHeight = data?.height ?? 0;
    const save = getSave();
    const isRecord = score > save.bestScore;

    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bgTop);
    const glow = this.add.circle(width / 2, height * 0.28, 120, COLORS.amber, 0.12);
    this.tweens.add({
      targets: glow,
      scale: 1.15,
      alpha: 0.2,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height * 0.18, tf('gameOver'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '58px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);

    if (isRecord) {
      this.add
        .text(width / 2, height * 0.26, tf('newRecord'), {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '26px',
          color: '#F4A261',
        })
        .setOrigin(0.5);
      playTone('combo', 8);
    } else {
      playTone('hit');
    }

    this.add
      .text(width / 2, height * 0.36, `${tf('score')}: ${score}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '36px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.42, `${tf('height')}: ${runHeight}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '24px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5);

    const earned = Math.max(3, Math.floor(score / 12) + Math.floor(runHeight / 40));
    void this.persist(score, runHeight, earned);

    this.add
      .text(width / 2, height * 0.5, `+${earned} ${tf('coins')}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '24px',
        color: '#8ECAE6',
      })
      .setOrigin(0.5);

    this.makeButton(width / 2, height * 0.64, tf('again'), () => {
      playTone('start');
      this.scene.start('Game');
    });

    this.makeGhostButton(width / 2, height * 0.76, tf('menu'), () => {
      playTone('ui');
      this.scene.start('Menu');
    });

    void yandex.submitScore(score);
  }

  private async persist(score: number, runHeight: number, earned: number): Promise<void> {
    const save = getSave();
    await patchSave({
      bestScore: Math.max(save.bestScore, score),
      bestHeight: Math.max(save.bestHeight, runHeight),
    });
    await addCoins(earned);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.image(x, y, 'ui-btn').setDisplaySize(300, 70).setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '28px',
        color: '#071018',
      })
      .setOrigin(0.5);
    bg.on('pointerup', onClick);
  }

  private makeGhostButton(x: number, y: number, label: string, onClick: () => void): void {
    const t = this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerup', onClick);
  }
}
