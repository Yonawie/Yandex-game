import Phaser from 'phaser';
import { COLORS } from '@/data/balance';
import { getSave, patchSave, addCoins } from '@/data/save';
import {
  applyRunToRetention,
  claimChallengeReward,
  getSnapshot,
  challengeProgressText,
  type RunStats,
} from '@/retention/service';
import { getLang, tf } from '@/i18n';
import { playTone } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';

interface ResultData {
  score: number;
  height: number;
  combo: number;
  stats?: RunStats;
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
    const stats: RunStats = data.stats ?? {
      score,
      height: runHeight,
      maxCombo: data.combo ?? 0,
      matchedCollects: 0,
      voidsPassed: 0,
    };

    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bgTop);
    const glow = this.add.circle(width / 2, height * 0.22, 120, COLORS.amber, 0.12);
    this.tweens.add({
      targets: glow,
      scale: 1.15,
      alpha: 0.2,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height * 0.12, tf('gameOver'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '52px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5);

    if (isRecord) {
      this.add
        .text(width / 2, height * 0.19, tf('newRecord'), {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '24px',
          color: '#FFB347',
        })
        .setOrigin(0.5);
      playTone('combo', 8);
    } else {
      playTone('hit');
    }

    this.add
      .text(width / 2, height * 0.27, `${tf('score')}: ${score}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '34px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.33, `${tf('height')}: ${runHeight}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#D6E8F2',
      })
      .setOrigin(0.5);

    const earned = Math.max(3, Math.floor(score / 12) + Math.floor(runHeight / 40));
    const info = this.add
      .text(width / 2, height * 0.4, `+${earned} ${tf('coins')}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#A8E4F5',
        align: 'center',
      })
      .setOrigin(0.5);

    void this.persist(score, runHeight, earned, stats, info);

    this.makeButton(width / 2, height * 0.72, tf('again'), () => {
      playTone('start');
      this.scene.start('Game');
    });

    this.makeGhostButton(width / 2, height * 0.84, tf('menu'), () => {
      playTone('ui');
      this.scene.start('Menu');
    });

    void yandex.submitScore(score);
  }

  private async persist(
    score: number,
    runHeight: number,
    earned: number,
    stats: RunStats,
    info: Phaser.GameObjects.Text,
  ): Promise<void> {
    const save = getSave();
    await patchSave({
      bestScore: Math.max(save.bestScore, score),
      bestHeight: Math.max(save.bestHeight, runHeight),
    });
    await addCoins(earned);

    const ret = await applyRunToRetention(stats);
    const snap = getSnapshot();
    const lines = [`+${earned} ${tf('coins')}`];
    if (ret.boostUsed) lines.push(tf('boostActive'));
    if (ret.echoBeaten) lines.push(`${tf('echoBeat')} +20`);
    if (ret.bonusCoins && !ret.echoBeaten && !ret.boostUsed) lines.push(`+${ret.bonusCoins}`);
    lines.push(challengeProgressText(snap, getLang()));
    if (snap.echoTarget > 0) lines.push(`${tf('echoTarget')}: ${snap.echoTarget}`);

    if (ret.challengeJustCompleted) {
      lines.push(tf('challengeDone'));
      const claim = await claimChallengeReward();
      if (claim) {
        lines.push(`${tf('claimed')} +${claim.coins}`);
        if (claim.weeklyDone) lines.push(tf('weeklyReward'));
      }
    }

    info.setText(lines.join('\n'));
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
