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

type ActionBtn = {
  g: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  x: number;
  y: number;
  w: number;
  h: number;
  relabel: () => string;
  color: () => number;
};

/**
 * Retention hub — solid panel + graphics CTAs (no stretched oval blobs).
 */
export class RetentionOverlay {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Text;
  private feedback: Phaser.GameObjects.Text;
  private snap: RetentionSnapshot;
  private onChanged: () => void;
  private actions: ActionBtn[] = [];

  constructor(scene: Phaser.Scene, onChanged: () => void) {
    this.scene = scene;
    this.onChanged = onChanged;
    this.snap = getSnapshot();
    const { width, height } = scene.scale;
    this.root = scene.add.container(0, 0).setDepth(70).setVisible(false);

    const dim = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x020810, 0.78)
      .setInteractive();
    dim.on('pointerup', () => undefined);

    const pw = width * 0.88;
    const ph = height * 0.78;
    const px = width / 2;
    const py = height / 2;
    const panel = scene.add.graphics();
    panel.fillStyle(0x0a1a28, 0.96);
    panel.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 22);
    panel.lineStyle(2, 0xffb347, 0.45);
    panel.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 22);
    panel.fillStyle(0xffffff, 0.04);
    panel.fillRoundedRect(px - pw / 2 + 10, py - ph / 2 + 10, pw - 20, 48, 14);

    const title = scene.add
      .text(width / 2, height * 0.14, tf('retention'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '34px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5);
    title.setShadow(0, 2, '#FFB347', 8, true, true);

    this.body = scene.add
      .text(width / 2, height * 0.2, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        color: '#C9DDE8',
        align: 'center',
        wordWrap: { width: width * 0.74 },
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0);

    this.feedback = scene.add
      .text(width / 2, height * 0.4, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '17px',
        color: '#FFB347',
        align: 'center',
        wordWrap: { width: width * 0.74 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const btnY = [0.48, 0.575, 0.67, 0.765];
    const btnW = Math.min(340, width * 0.74);
    const btnH = 54;

    const actionDefs: {
      label: () => string;
      color: () => number;
      fn: () => Promise<string>;
    }[] = [
      {
        label: () => (this.snap.morningAvailable ? tf('morningClaim') : tf('morningDone')),
        color: () => (this.snap.morningAvailable ? 0xffb347 : 0x6b8194),
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
        color: () =>
          this.snap.challengeDone && !this.snap.challengeClaimed
            ? 0x3db8a0
            : this.snap.challengeClaimed
              ? 0x6b8194
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
          return `${name}\n${p}`;
        },
      },
      {
        label: () =>
          this.snap.idleSparks > 0
            ? `${tf('idleClaim')} +${this.snap.idleCoins}`
            : tf('idleEmpty'),
        color: () => (this.snap.idleSparks > 0 ? 0x7ec8e8 : 0x6b8194),
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
        color: () => (this.snap.unreadLetters.length > 0 ? 0xffb347 : 0x6b8194),
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

    actionDefs.forEach((action, i) => {
      const x = width / 2;
      const y = height * btnY[i];
      const g = scene.add.graphics();
      const label = scene.add
        .text(x, y, action.label(), {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '18px',
          color: '#0C1C2E',
          fontStyle: '600',
        })
        .setOrigin(0.5);
      const zone = scene.add.zone(x, y, btnW, btnH).setInteractive({ useHandCursor: true });
      const btn: ActionBtn = {
        g,
        label,
        zone,
        x,
        y,
        w: btnW,
        h: btnH,
        relabel: action.label,
        color: action.color,
      };
      this.drawBtn(btn, false);
      zone.on('pointerdown', () => this.drawBtn(btn, true));
      zone.on('pointerout', () => this.drawBtn(btn, false));
      zone.on('pointerup', () => {
        this.drawBtn(btn, false);
        void (async () => {
          const msg = await action.fn();
          this.showFeedback(msg);
          this.paintButtons();
        })();
      });
      this.actions.push(btn);
      children.push(g, label, zone);
    });

    const closeW = 200;
    const closeH = 48;
    const closeY = height * 0.9;
    const closeG = scene.add.graphics();
    closeG.fillStyle(0x1a3044, 1);
    closeG.fillRoundedRect(width / 2 - closeW / 2, closeY - closeH / 2, closeW, closeH, 14);
    closeG.lineStyle(1.5, 0xa8e4f5, 0.35);
    closeG.strokeRoundedRect(width / 2 - closeW / 2, closeY - closeH / 2, closeW, closeH, 14);
    const close = scene.add
      .text(width / 2, closeY, tf('close'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#E8F0F5',
      })
      .setOrigin(0.5);
    const closeZone = scene.add.zone(width / 2, closeY, closeW, closeH).setInteractive({
      useHandCursor: true,
    });
    closeZone.on('pointerup', () => this.hide());
    children.push(closeG, close, closeZone);

    this.root.add(children);
    this.refresh();
  }

  private drawBtn(btn: ActionBtn, pressed: boolean): void {
    const { g, x, y, w, h } = btn;
    const color = btn.color();
    g.clear();
    g.fillStyle(0x082030, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, 16);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2 + (pressed ? 2 : 0), w, h, 16);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(x - w / 2 + 12, y - h / 2 + (pressed ? 8 : 6), w - 24, 14, 8);
  }

  private paintButtons(): void {
    for (const btn of this.actions) {
      btn.label.setText(btn.relabel());
      this.drawBtn(btn, false);
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

    this.paintButtons();
  }
}
