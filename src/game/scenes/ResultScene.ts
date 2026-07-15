import Phaser from 'phaser';
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
import { placeMenuAtmosphere } from '@/game/assets/scenery';

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

    placeMenuAtmosphere(this);

    const title = this.add
      .text(width / 2, height * 0.14, tf('gameOver'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '56px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(20);
    title.setShadow(0, 4, '#FF6B4A', 12, true, true);

    if (isRecord) {
      this.add
        .text(width / 2, height * 0.21, tf('newRecord'), {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '22px',
          color: '#FFB347',
        })
        .setOrigin(0.5)
        .setDepth(20);
      playTone('combo', 8);
    } else {
      playTone('hit');
    }

    this.add
      .text(width / 2, height * 0.3, `${tf('score')}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(width / 2, height * 0.36, `${score}`, {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '64px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(width / 2, height * 0.44, `${tf('height')}  ${runHeight}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#D6E8F2',
      })
      .setOrigin(0.5)
      .setDepth(20);

    const earned = Math.max(3, Math.floor(score / 12) + Math.floor(runHeight / 40));
    const info = this.add
      .text(width / 2, height * 0.52, `+${earned} ${tf('coins')}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '18px',
        color: '#A8E4F5',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(20);

    void this.persist(score, runHeight, earned, stats, info);

    this.makePlayButton(width / 2, height * 0.72, tf('again'), () => {
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

  private makePlayButton(x: number, y: number, label: string, onClick: () => void): void {
    const w = 280;
    const h = 68;
    const g = this.add.graphics().setDepth(20);
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0xc45c3e, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2 + 5, w, h, 18);
      g.fillStyle(hover ? 0xffc56a : 0xffb347, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);
      g.fillStyle(0xffffff, 0.22);
      g.fillRoundedRect(x - w / 2 + 14, y - h / 2 + 8, w - 28, 18, 10);
    };
    draw(false);
    const hit = this.add
      .rectangle(x, y, w, h, 0x000000, 0.001)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '28px',
        color: '#0C1C2E',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(22);
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', onClick);
  }

  private makeGhostButton(x: number, y: number, label: string, onClick: () => void): void {
    const t = this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    t.on('pointerup', onClick);
  }
}
