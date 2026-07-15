import Phaser from 'phaser';
import { getLang, tf } from '@/i18n';
import { playTone } from '@/game/audio/sfx';
import {
  claimChallengeReward,
  claimMorningFlame,
  collectIdle,
  getSnapshot,
  readLetter,
  type RetentionSnapshot,
} from '@/retention/service';
import { WEEKLY_SHARDS_NEEDED } from '@/content/retention';
import { getSave } from '@/data/save';

/**
 * Step 2–5 UI hub opened from Menu.
 * Depths 70+ so it sits above tips/menu.
 */
export class RetentionOverlay {
  private root: Phaser.GameObjects.Container;
  private body!: Phaser.GameObjects.Text;
  private snap!: RetentionSnapshot;
  private onChanged: () => void;

  constructor(scene: Phaser.Scene, onChanged: () => void) {
    this.onChanged = onChanged;
    const { width, height } = scene.scale;
    this.root = scene.add.container(0, 0).setDepth(70).setVisible(false);

    const dim = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
      .setInteractive();
    const panel = scene.add.image(width / 2, height / 2, 'ui-panel').setDisplaySize(width * 0.9, height * 0.78);

    const title = scene.add
      .text(width / 2, height * 0.16, tf('retention'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '36px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);

    this.body = scene.add
      .text(width / 2, height * 0.28, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '18px',
        color: '#F7F3E8',
        align: 'center',
        wordWrap: { width: width * 0.78 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    const btnY = [0.58, 0.66, 0.74, 0.82];
    const actions: { label: () => string; fn: () => Promise<void> }[] = [
      {
        label: () => (this.snap.morningAvailable ? tf('morningClaim') : tf('morningDone')),
        fn: async () => {
          const r = await claimMorningFlame();
          if (r) playTone('start');
          else playTone('ui');
          this.refresh();
          this.onChanged();
        },
      },
      {
        label: () =>
          this.snap.challengeDone && !this.snap.challengeClaimed
            ? tf('challengeClaim')
            : this.snap.challengeClaimed
              ? tf('claimed')
              : tf('challengeTitle'),
        fn: async () => {
          const r = await claimChallengeReward();
          if (r) {
            playTone('combo', 6);
            if (r.weeklyDone) playTone('start');
          } else playTone('ui');
          this.refresh();
          this.onChanged();
        },
      },
      {
        label: () => (this.snap.idleSparks > 0 ? tf('idleClaim') : tf('idleEmpty')),
        fn: async () => {
          const coins = await collectIdle();
          if (coins > 0) playTone('collect', 3);
          else playTone('ui');
          this.refresh();
          this.onChanged();
        },
      },
      {
        label: () => tf('lettersTitle'),
        fn: async () => {
          const letter = this.snap.unreadLetters[0];
          if (letter) {
            await readLetter(letter.id);
            playTone('portal');
          } else playTone('ui');
          this.refresh();
          this.onChanged();
        },
      },
    ];

    const buttons: Phaser.GameObjects.GameObject[] = [dim, panel, title, this.body];
    actions.forEach((action, i) => {
      const y = height * btnY[i];
      const bg = scene.add
        .image(width / 2, y, 'ui-btn')
        .setDisplaySize(320, 52)
        .setInteractive({ useHandCursor: true });
      const label = scene.add
        .text(width / 2, y, action.label(), {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '20px',
          color: '#071018',
        })
        .setOrigin(0.5);
      bg.on('pointerup', () => void action.fn());
      bg.setData('label', label);
      bg.setData('relabel', action.label);
      buttons.push(bg, label);
    });

    const close = scene.add
      .text(width / 2, height * 0.9, tf('close'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hide());
    buttons.push(close);

    this.root.add(buttons);
    this.refreshLabels = () => {
      this.root.each((obj: Phaser.GameObjects.GameObject) => {
        const go = obj as Phaser.GameObjects.Image;
        if (go.getData('relabel') && go.getData('label')) {
          (go.getData('label') as Phaser.GameObjects.Text).setText(
            (go.getData('relabel') as () => string)(),
          );
        }
      });
    };
  }

  private refreshLabels: () => void = () => undefined;

  show(): void {
    this.refresh();
    this.root.setVisible(true);
  }

  hide(): void {
    this.root.setVisible(false);
  }

  refresh(): void {
    this.snap = getSnapshot();
    const lang = getLang();
    const chName = lang === 'ru' ? this.snap.challenge.nameRu : this.snap.challenge.nameEn;
    const letter = this.snap.unreadLetters[0];
    const letterLine = letter
      ? `${tf('letterNew')}: ${lang === 'ru' ? letter.titleRu : letter.titleEn}\n${lang === 'ru' ? letter.bodyRu : letter.bodyEn}`
      : `${tf('lettersTitle')}: ${getSave().readLetters.length}/${getSave().unlockedLetters.length}`;

    this.body.setText(
      [
        `${tf('morningTitle')} · ${tf('streak')} ${this.snap.streak}`,
        this.snap.morningAvailable
          ? `${tf('morningClaim')}: +${this.snap.morningReward} ${tf('coins').toLowerCase()}`
          : tf('morningDone'),
        '',
        `${tf('challengeTitle')}`,
        `${chName}`,
        `${Math.min(this.snap.challengeProgress, this.snap.challenge.target)}/${this.snap.challenge.target}`,
        `${tf('shards')}: ${this.snap.weekShards}/${WEEKLY_SHARDS_NEEDED}`,
        '',
        `${tf('idleTitle')}: ${this.snap.idleSparks} → +${this.snap.idleCoins}`,
        '',
        `${tf('echoTitle')}: ${tf('echoTarget')} ${this.snap.echoTarget || '—'}`,
        this.snap.boostRunsLeft > 0 ? tf('boostActive') : '',
        '',
        letterLine,
      ]
        .filter(Boolean)
        .join('\n'),
    );
    this.refreshLabels();
  }
}
