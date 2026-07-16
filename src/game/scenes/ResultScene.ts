import Phaser from 'phaser';
import { SKINS } from '@/data/balance';
import { getSave, patchSave, addCoins } from '@/data/save';
import {
  applyRunToRetention,
  getSnapshot,
  challengeProgressText,
  type RunStats,
} from '@/retention/service';
import { getLang, tf } from '@/i18n';
import { playTone } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';
import { placeMenuAtmosphere } from '@/game/assets/scenery';
import { drawLantern, hueForSkin } from '@/game/assets/generate';
import { makeAmberButton } from '@/visual/uiPress';
import { Depth } from '@/visual/depths';

interface ResultData {
  score: number;
  height: number;
  combo: number;
  stats?: RunStats;
}

export class ResultScene extends Phaser.Scene {
  private lbOpen = false;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    yandex.stopGameplay();
    const { width, height } = this.scale;
    const score = data?.score ?? 0;
    const runHeight = data?.height ?? 0;
    const save = getSave();
    const prevBest = save.bestScore;
    const isRecord = score > prevBest;
    const stats: RunStats = data.stats ?? {
      score,
      height: runHeight,
      maxCombo: data.combo ?? 0,
      matchedCollects: 0,
      voidsPassed: 0,
    };

    placeMenuAtmosphere(this);
    this.placeExtinguishedLantern(width / 2, height * 0.26, isRecord);

    const title = this.add
      .text(width / 2, height * 0.1, tf('gameOver'), {
        fontFamily: 'Literata, Georgia, serif',
        fontSize: '48px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(20);
    title.setShadow(0, 4, '#FF6B4A', 12, true, true);

    if (isRecord) {
      const rec = this.add
        .text(width / 2, height * 0.155, tf('newRecord'), {
          fontFamily: 'Manrope, sans-serif',
          fontSize: '22px',
          color: '#FFB347',
        })
        .setOrigin(0.5)
        .setDepth(20)
        .setAlpha(0)
        .setScale(0.85);
      this.tweens.add({
        targets: rec,
        alpha: 1,
        scale: 1,
        duration: 420,
        ease: 'Back.easeOut',
      });
      this.cameras.main.flash(160, 80, 55, 40);
      playTone('combo', 8);
    } else {
      playTone('hit');
    }

    this.add
      .text(width / 2, height * 0.4, `${tf('score')}`, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '15px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(width / 2, height * 0.455, `${score}`, {
        fontFamily: 'Literata, Georgia, serif',
        fontSize: '58px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(20);

    const deltaLine = this.buildDeltaLine(score, prevBest, save.yesterdayBestScore);
    this.add
      .text(width / 2, height * 0.515, `${tf('height')}  ${runHeight}\n${deltaLine}`, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '17px',
        color: '#D6E8F2',
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5)
      .setDepth(20);

    const rankText = this.add
      .text(width / 2, height * 0.575, '', {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '16px',
        color: '#A8E4F5',
      })
      .setOrigin(0.5)
      .setDepth(20);

    const earned = Math.max(3, Math.floor(score / 12) + Math.floor(runHeight / 40));
    const info = this.add
      .text(width / 2, height * 0.63, `+${earned} ${tf('coins')}`, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '17px',
        color: '#A8E4F5',
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5)
      .setDepth(20);

    void this.persist(score, runHeight, earned, stats, info, rankText);

    this.makePlayButton(width / 2, height * 0.74, tf('again'), () => {
      playTone('start');
      this.scene.start('Game');
    });

    this.makeGhostButton(width / 2, height * 0.835, tf('leaderboard'), () => {
      playTone('ui');
      void this.openLeaderboard();
    });

    this.makeGhostButton(width / 2, height * 0.91, tf('menu'), () => {
      playTone('ui');
      this.scene.start('Menu');
    });

    void yandex.submitScore(score).then(() => this.refreshRank(rankText));
  }

  private buildDeltaLine(score: number, prevBest: number, echo: number): string {
    if (score > prevBest && prevBest > 0) {
      return `${tf('beatBestBy')} +${score - prevBest}`;
    }
    if (score <= prevBest && prevBest > 0) {
      return `${tf('shortOfBest')} ${prevBest - score}`;
    }
    if (echo > 0) {
      const gap = echo - score;
      return gap > 0 ? `${tf('echoGap')} ${gap}` : tf('echoBeat');
    }
    return '';
  }

  private placeExtinguishedLantern(x: number, y: number, isRecord: boolean): void {
    const save = getSave();
    const skin = SKINS.find((s) => s.id === save.skinId) ?? SKINS[0];
    const hue = hueForSkin(skin);
    const lantern = drawLantern(this, x, y, skin, hue, 0.95);
    lantern.setDepth(Depth.PLAYER);
    lantern.setAlpha(isRecord ? 0.55 : 0.35);
    const far = lantern.getData('farGlow') as Phaser.GameObjects.Image | undefined;
    const mid = lantern.getData('midGlow') as Phaser.GameObjects.Image | undefined;
    far?.setAlpha(isRecord ? 0.18 : 0.06);
    mid?.setAlpha(isRecord ? 0.22 : 0.08);
    if (!isRecord) {
      this.tweens.add({
        targets: lantern,
        alpha: { from: 0.22, to: 0.38 },
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.tweens.add({
        targets: [far, mid].filter(Boolean),
        alpha: { from: 0.1, to: 0.35 },
        duration: 700,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private async refreshRank(rankText: Phaser.GameObjects.Text): Promise<void> {
    const rank = await yandex.getPlayerRank();
    if (rank != null) {
      rankText.setText(`${tf('yourRank')} #${rank}`);
    }
  }

  private async openLeaderboard(): Promise<void> {
    if (this.lbOpen) return;
    this.lbOpen = true;
    const { width, height } = this.scale;
    const entries = await yandex.getTopEntries('score', 5);
    const save = getSave();

    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x020810, 0.78).setDepth(70).setInteractive();
    const panel = this.add.graphics().setDepth(71);
    const pw = width * 0.86;
    const ph = Math.min(420, height * 0.55);
    panel.fillStyle(0x0a1a28, 0.96);
    panel.fillRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 20);
    panel.lineStyle(2, 0xffb347, 0.4);
    panel.strokeRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 20);

    const title = this.add
      .text(width / 2, height / 2 - ph / 2 + 36, tf('leaderboard'), {
        fontFamily: 'Literata, Georgia, serif',
        fontSize: '28px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(72);

    const lines =
      entries.length > 0
        ? entries.map((e) => `#${e.rank}  ${e.name}  ·  ${e.score}`).join('\n')
        : `${tf('best')}: ${save.bestScore}`;

    const body = this.add
      .text(width / 2, height / 2 - 20, lines, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '18px',
        color: '#D6E8F2',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setDepth(72);

    const close = this.add
      .text(width / 2, height / 2 + ph / 2 - 36, tf('close'), {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '20px',
        color: '#A8E4F5',
      })
      .setOrigin(0.5)
      .setDepth(72)
      .setInteractive({ useHandCursor: true });

    const dispose = () => {
      this.lbOpen = false;
      dim.destroy();
      panel.destroy();
      title.destroy();
      body.destroy();
      close.destroy();
    };
    close.on('pointerup', dispose);
    dim.on('pointerup', dispose);
  }

  private async persist(
    score: number,
    runHeight: number,
    earned: number,
    stats: RunStats,
    info: Phaser.GameObjects.Text,
    rankText: Phaser.GameObjects.Text,
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

    // Leave challenge claim for the retention hub (narrative payoff).
    if (ret.challengeJustCompleted && !snap.challengeClaimed) {
      lines.push(tf('rewardWaiting'));
    }

    info.setText(lines.join('\n'));
    await this.refreshRank(rankText);
  }

  private makePlayButton(x: number, y: number, label: string, onClick: () => void): void {
    makeAmberButton(this, x, y, label, onClick, { depth: 20, fontSize: '28px' });
  }

  private makeGhostButton(x: number, y: number, label: string, onClick: () => void): void {
    const t = this.add
      .text(x, y, label, {
        fontFamily: 'Manrope, sans-serif',
        fontSize: '20px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    t.on('pointerup', onClick);
  }
}
