import Phaser from 'phaser';
import { SKINS } from '@/data/balance';
import { drawLantern } from '@/game/assets/generate';
import { placeMenuAtmosphere } from '@/game/assets/scenery';
import { getSave, patchSave, addCoins, unlockSkin } from '@/data/save';
import { tf, getLang } from '@/i18n';
import { playTone, setMuted, isMuted, unlockAudio, startMusic } from '@/game/audio/sfx';
import { yandex } from '@/sdk/yandex';
import { listModes, isModeUnlocked } from '@/content/modes';
import { getActiveModeId, setActiveMode } from '@/content/runtimeConfig';
import { RetentionOverlay } from '@/game/ui/RetentionOverlay';
import { syncRetentionClock, getSnapshot, markIdleLeave } from '@/retention/service';
import { WEEKLY_SHARDS_NEEDED } from '@/content/retention';

export class MenuScene extends Phaser.Scene {
  private skinIndex = 0;
  private modeIndex = 0;
  private lantern!: Phaser.GameObjects.Container;
  private coinsText!: Phaser.GameObjects.Text;
  private skinName!: Phaser.GameObjects.Text;
  private skinHint!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private retentionHint!: Phaser.GameObjects.Text;
  private retentionOverlay: RetentionOverlay | null = null;
  private tipsOpen = false;

  constructor() {
    super('Menu');
  }

  private uiBlocked(): boolean {
    return this.tipsOpen || Boolean(this.retentionOverlay?.isOpen());
  }

  create(): void {
    yandex.stopGameplay();
    unlockAudio();
    startMusic();
    void syncRetentionClock().then(() => this.refreshRetentionHint());
    const { width, height } = this.scale;
    const save = getSave();
    const modes = listModes();
    this.skinIndex = Math.max(0, SKINS.findIndex((s) => s.id === save.skinId));
    this.modeIndex = Math.max(0, modes.findIndex((m) => m.id === getActiveModeId()));

    placeMenuAtmosphere(this);

    // ——— Hero column ———
    const brand = this.add
      .text(width / 2, height * 0.12, tf('brand'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '70px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(20);
    brand.setShadow(0, 4, '#FFB347', 14, true, true);

    this.add
      .text(width / 2, height * 0.175, tf('tagline'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '18px',
        color: '#C9DDE8',
        align: 'center',
        wordWrap: { width: width * 0.78 },
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.lantern = drawLantern(this, width / 2, height * 0.32, SKINS[this.skinIndex], 'amber', 2.05);
    this.lantern.setDepth(20);
    this.tweens.add({
      targets: this.lantern,
      y: this.lantern.y - 12,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // compact stats under lantern
    this.add
      .text(width / 2, height * 0.46, `${tf('best')}  ${save.bestScore}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#FFB347',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.coinsText = this.add
      .text(width / 2, height * 0.49, `${tf('coins')}  ${save.coins}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        color: '#A8E4F5',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.retentionHint = this.add
      .text(width / 2, height * 0.525, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        color: '#E8F0F5',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    this.retentionHint.on('pointerup', () => {
      playTone('ui');
      this.retentionOverlay?.show();
    });
    this.refreshRetentionHint();

    // mode
    this.modeText = this.add
      .text(width / 2, height * 0.575, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.makeChip(width * 0.26, height * 0.575, '‹', () => this.cycleMode(-1));
    this.makeChip(width * 0.74, height * 0.575, '›', () => this.cycleMode(1));
    this.refreshModeLabel();

    this.makePlayButton(width / 2, height * 0.67, tf('play'), () => {
      if (this.uiBlocked()) return;
      const mode = modes[this.modeIndex];
      if (!isModeUnlocked(mode.id, getSave().bestHeight)) {
        playTone('hit');
        return;
      }
      setActiveMode(mode.id);
      playTone('start');
      void markIdleLeave();
      this.scene.start('Game');
    });

    // skin
    this.skinName = this.add
      .text(width / 2, height * 0.77, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '17px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.skinHint = this.add
      .text(width / 2, height * 0.8, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.makeChip(width * 0.26, height * 0.77, '‹', () => void this.cycleSkin(-1));
    this.makeChip(width * 0.74, height * 0.77, '›', () => void this.cycleSkin(1));
    this.refreshSkinLabel();

    // retention hub — ghost text, not a huge chip over the art
    const hub = this.add
      .text(width / 2, height * 0.875, tf('retention'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '18px',
        color: '#FFB347',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    hub.on('pointerup', () => {
      unlockAudio();
      playTone('ui');
      this.retentionOverlay?.show();
    });

    const soundLabel = save.sound ? tf('soundOn') : tf('soundOff');
    const soundBtn = this.add
      .text(width / 2, height * 0.93, soundLabel, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '15px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    soundBtn.on('pointerup', async () => {
      const next = isMuted();
      setMuted(!next);
      await patchSave({ sound: next });
      soundBtn.setText(next ? tf('soundOn') : tf('soundOff'));
      playTone('ui');
    });

    try {
      this.retentionOverlay = new RetentionOverlay(this, () => {
        this.coinsText.setText(`${tf('coins')}  ${getSave().coins}`);
        this.refreshRetentionHint();
        this.refreshSkinLabel();
      });
    } catch (e) {
      console.warn('Retention overlay failed', e);
    }

    if (!save.seenTip) {
      this.showTips();
    } else {
      void syncRetentionClock().then(() => {
        this.refreshRetentionHint();
      });
    }
  }

  private refreshRetentionHint(): void {
    if (!this.retentionHint) return;
    const snap = getSnapshot();
    const bits: string[] = [`${tf('streak')} ${snap.streak}`];
    if (snap.morningAvailable) bits.push(tf('morningClaim'));
    if (snap.idleSparks > 0) bits.push(`+${snap.idleSparks}`);
    if (snap.unreadLetters.length) bits.push(`${tf('letterNew')}`);
    bits.push(`${snap.weekShards}/${WEEKLY_SHARDS_NEEDED}`);
    this.retentionHint.setText(bits.join('  ·  '));
  }

  private cycleMode(dir: number): void {
    playTone('ui');
    const modes = listModes();
    this.modeIndex = (this.modeIndex + dir + modes.length) % modes.length;
    const mode = modes[this.modeIndex];
    if (isModeUnlocked(mode.id, getSave().bestHeight)) setActiveMode(mode.id);
    this.refreshModeLabel();
  }

  private refreshModeLabel(): void {
    const mode = listModes()[this.modeIndex];
    const lang = getLang();
    const name = lang === 'ru' ? mode.nameRu : mode.nameEn;
    const unlocked = isModeUnlocked(mode.id, getSave().bestHeight);
    this.modeText.setText(
      unlocked
        ? `${tf('mode')}: ${name}`
        : `${tf('mode')}: ${name} · ${tf('modeLocked')} ${mode.unlockHeight}`,
    );
    this.modeText.setColor(unlocked ? '#FFF8EC' : '#B7C9D6');
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
      this.lantern = drawLantern(
        this,
        this.scale.width / 2,
        this.scale.height * 0.32,
        skin,
        'amber',
        2.05,
      );
      this.lantern.setDepth(20);
      this.tweens.add({
        targets: this.lantern,
        y: this.lantern.y - 12,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.coinsText.setText(`${tf('coins')}  ${getSave().coins}`);
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
        fontSize: '30px',
        color: '#0C1C2E',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(22);
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', onClick);
  }

  private makeChip(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 42, 42, 0x123048, 0.85)
      .setStrokeStyle(1.5, 0xa8e4f5, 0.35)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '24px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(21);
    bg.on('pointerup', onClick);
  }

  private showTips(): void {
    this.tipsOpen = true;
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(50);
    // Soft amber depth under tip panel — no soft oval glow bake
    const tipPanel = this.add.graphics().setDepth(51);
    const pw = width * 0.84;
    const ph = 400;
    tipPanel.fillStyle(0x0a1a28, 0.96);
    tipPanel.fillRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 22);
    tipPanel.lineStyle(2, 0xffb347, 0.45);
    tipPanel.strokeRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 22);
    const tip = this.add
      .text(
        width / 2,
        height / 2 - 50,
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
    const okX = width / 2;
    const okY = height / 2 + 130;
    const okW = 220;
    const okH = 56;
    const okG = this.add.graphics().setDepth(52);
    okG.fillStyle(0xc45c3e, 1);
    okG.fillRoundedRect(okX - okW / 2, okY - okH / 2 + 4, okW, okH, 16);
    okG.fillStyle(0xffb347, 1);
    okG.fillRoundedRect(okX - okW / 2, okY - okH / 2, okW, okH, 16);
    const okHit = this.add
      .rectangle(okX, okY, okW, okH, 0x000000, 0.001)
      .setDepth(53)
      .setInteractive({ useHandCursor: true });
    const ok = this.add
      .text(okX, okY, tf('gotIt'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '26px',
        color: '#0C1C2E',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(54);

    const closeTips = async () => {
      if (!this.tipsOpen) return;
      this.tipsOpen = false;
      unlockAudio();
      overlay.destroy();
      tipPanel.destroy();
      tip.destroy();
      okG.destroy();
      okHit.destroy();
      ok.destroy();
      await patchSave({ seenTip: true });
      const snap = getSnapshot();
      if (snap.morningAvailable || snap.idleSparks > 0 || snap.unreadLetters.length > 0) {
        this.retentionOverlay?.show();
      }
    };
    okHit.on('pointerup', () => void closeTips());
    overlay.setInteractive().on('pointerup', () => void closeTips());
  }
}
