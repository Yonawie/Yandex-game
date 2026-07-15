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
 * Retention hub — Zone hit targets (reliable on mobile) + compact copy
 * so body text never covers buttons.
 */
export class RetentionOverlay {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Text;
  private feedback: Phaser.GameObjects.Text;
  private snap: RetentionSnapshot;
  private onChanged: () => void;
  private actionLabels: { text: Phaser.GameObjects.Text; relabel: () => string }[] = [];
  private actionBgs: { bg: Phaser.GameObjects.Image; tint: () => number }[] = [];

  constructor(scene: Phaser.Scene, onChanged: () => void) {
    this.scene = scene;
    this.onChanged = onChanged;
    this.snap = getSnapshot();
    const { width, height } = scene.scale;
    this.root = scene.add.container(0, 0).setDepth(70).setVisible(false);

    const dim = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
      .setInteractive();
    dim.on('pointerup', () => undefined);

    const panel = scene.add
      .image(width / 2, height / 2, 'ui-panel')
      .setDisplaySize(width * 0.9, height * 0.82);

    const title = scene.add
      .text(width / 2, height * 0.12, tf('retention'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '34px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);

    this.body = scene.add
      .text(width / 2, height * 0.175, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '17px',
        color: '#F7F3E8',
        align: 'center',
        wordWrap: { width: width * 0.78 },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    this.feedback = scene.add
      .text(width / 2, height * 0.4, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '18px',
        color: '#F4A261',
        align: 'center',
        wordWrap: { width: width * 0.78 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const btnY = [0.48, 0.58, 0.68, 0.78];
    const btnW = Math.min(360, width * 0.78);
    const btnH = 60;

    const actions: {
      label: () => string;
      tint: () => number;
      fn: () => Promise<string>;
    }[] = [
      {
        label: () => (this.snap.morningAvailable ? tf('morningClaim') : tf('morningDone')),
        tint: () => (this.snap.morningAvailable ? 0xf4a261 : 0x9bb0c1),
        fn: async () => {
          const r = await claimMorningFlame();
          playTone(r ? 'start' : 'ui');
          this.refresh();
          this.onChanged();
          return r ? `+${r.coins}` : tf('morningDone');
        },
      },
      {
        label: () => {
          const p = `${Math.min(this.snap.challengeProgress, this.snap.challenge.target)}/${this.snap.challenge.target}`;
          if (this.snap.challengeDone && !this.snap.challengeClaimed) return tf('challengeClaim');
          if (this.snap.challengeClaimed) return `${tf('claimed')} · ${p}`;
          return `${tf('challengeTitle')} · ${p}`;
        },
        tint: () =>
          this.snap.challengeDone && !this.snap.challengeClaimed
            ? 0x2a9d8f
            : this.snap.challengeClaimed
              ? 0x9bb0c1
              : 0xe9c46a,
        fn: async () => {
          if (this.snap.challengeDone && !this.snap.challengeClaimed) {
            const r = await claimChallengeReward();
            if (r) {
              playTone('combo', 6);
              if (r.weeklyDone) playTone('start');
              this.refresh();
              this.onChanged();
              return `${tf('claimed')} +${r.coins}`;
            }
          }
          playTone('ui');
          const lang = getLang();
          const name = lang === 'ru' ? this.snap.challenge.nameRu : this.snap.challenge.nameEn;
          const p = `${Math.min(this.snap.challengeProgress, this.snap.challenge.target)}/${this.snap.challenge.target}`;
          if (this.snap.challengeClaimed) return tf('claimed');
          // explain why it "doesn't claim" yet
          return `${name}\n${p}`;
        },
      },
      {
        label: () =>
          this.snap.idleSparks > 0
            ? `${tf('idleClaim')} +${this.snap.idleCoins}`
            : tf('idleEmpty'),
        tint: () => (this.snap.idleSparks > 0 ? 0x8ecae6 : 0x9bb0c1),
        fn: async () => {
          const coins = await collectIdle();
          playTone(coins > 0 ? 'collect' : 'ui', 3);
          this.refresh();
          this.onChanged();
          return coins > 0 ? `+${coins}` : tf('idleEmpty');
        },
      },
      {
        label: () => {
          const n = this.snap.unreadLetters.length;
          return n > 0 ? `${tf('lettersTitle')} · ${tf('letterNew')} ${n}` : tf('lettersTitle');
        },
        tint: () => (this.snap.unreadLetters.length > 0 ? 0xf4a261 : 0x9bb0c1),
        fn: async () => {
          const letter = this.snap.unreadLetters[0];
          if (letter) {
            await readLetter(letter.id);
            playTone('portal');
            this.refresh();
            this.onChanged();
            const lang = getLang();
            return lang === 'ru' ? letter.bodyRu : letter.bodyEn;
          }
          playTone('ui');
          return `${tf('lettersTitle')}: ${getSave().readLetters.length}/${getSave().unlockedLetters.length}`;
        },
      },
    ];

    const children: Phaser.GameObjects.GameObject[] = [dim, panel, title, this.body, this.feedback];

    actions.forEach((action, i) => {
      const y = height * btnY[i];
      const bg = scene.add.image(width / 2, y, 'ui-btn').setDisplaySize(btnW, btnH);
      const label = scene.add
        .text(width / 2, y, action.label(), {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '19px',
          color: '#071018',
        })
        .setOrigin(0.5);
      // Zone is the only interactive surface — full button size, reliable on mobile
      const zone = scene.add.zone(width / 2, y, btnW, btnH).setInteractive({
        useHandCursor: true,
      });

      zone.on('pointerdown', () => bg.setAlpha(0.85));
      zone.on('pointerout', () => bg.setAlpha(1));
      zone.on('pointerup', () => {
        bg.setAlpha(1);
        void (async () => {
          const msg = await action.fn();
          this.showFeedback(msg);
          this.paintButtonTints();
        })();
      });

      this.actionLabels.push({ text: label, relabel: action.label });
      this.actionBgs.push({ bg, tint: action.tint });
      children.push(bg, label, zone);
    });

    const closeW = 220;
    const closeH = 52;
    const closeBg = scene.add
      .image(width / 2, height * 0.9, 'ui-btn')
      .setDisplaySize(closeW, closeH)
      .setTint(0xcbd5e1);
    const close = scene.add
      .text(width / 2, height * 0.9, tf('close'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '22px',
        color: '#071018',
      })
      .setOrigin(0.5);
    const closeZone = scene.add.zone(width / 2, height * 0.9, closeW, closeH).setInteractive({
      useHandCursor: true,
    });
    closeZone.on('pointerup', () => this.hide());
    children.push(closeBg, close, closeZone);

    this.root.add(children);
    this.refresh();
  }

  private paintButtonTints(): void {
    for (const row of this.actionBgs) {
      row.bg.setTint(row.tint());
    }
  }

  private showFeedback(msg: string): void {
    this.feedback.setText(msg);
    this.scene.tweens.killTweensOf(this.feedback);
    this.feedback.setAlpha(1);
    this.scene.tweens.add({
      targets: this.feedback,
      alpha: 0,
      delay: 1800,
      duration: 400,
    });
  }

  isOpen(): boolean {
    return this.root.visible;
  }

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

    this.body.setText(
      [
        `${tf('morningTitle')} · ${tf('streak')} ${this.snap.streak}`,
        `${tf('challengeTitle')}: ${chName}`,
        `${tf('shards')}: ${this.snap.weekShards}/${WEEKLY_SHARDS_NEEDED}`,
        this.snap.echoTarget > 0 ? `${tf('echoTarget')}: ${this.snap.echoTarget}` : '',
        this.snap.boostRunsLeft > 0 ? tf('boostActive') : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );

    for (const row of this.actionLabels) {
      row.text.setText(row.relabel());
    }
    this.paintButtonTints();
  }
}
