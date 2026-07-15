import Phaser from 'phaser';
import { SKINS } from '@/data/balance';
import { drawLantern } from '@/game/assets/generate';
import { placeNightScenery, addBg } from '@/game/assets/scenery';
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

    addBg(this);
    placeNightScenery(this, { skipBg: true });

    const brand = this.add
      .text(width / 2, height * 0.14, tf('brand'), {
        fontFamily: 'Fraunces, Georgia, serif',
        fontSize: '72px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setDepth(10);
    brand.setShadow(0, 6, '#FFB347', 16, true, true);

    this.add
      .text(width / 2, height * 0.205, tf('tagline'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#D6E8F2',
        align: 'center',
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.lantern = drawLantern(this, width / 2, height * 0.34, SKINS[this.skinIndex], 'amber', 1.85);
    this.tweens.add({
      targets: this.lantern,
      y: this.lantern.y - 14,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(width / 2, height * 0.48, `${tf('best')}: ${save.bestScore}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#FFB347',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(width / 2, height * 0.51, `${tf('coins')}: ${save.coins}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '17px',
        color: '#A8E4F5',
      })
      .setOrigin(0.5);

    this.retentionHint = this.add
      .text(width / 2, height * 0.545, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '15px',
        color: '#FFF8EC',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.retentionHint.on('pointerup', () => {
      playTone('ui');
      this.retentionOverlay?.show();
    });
    this.refreshRetentionHint();

    this.modeText = this.add
      .text(width / 2, height * 0.59, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '17px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);
    this.makeChip(width * 0.28, height * 0.59, '‹', () => this.cycleMode(-1));
    this.makeChip(width * 0.72, height * 0.59, '›', () => this.cycleMode(1));
    this.refreshModeLabel();

    this.makeButton(width / 2, height * 0.68, tf('play'), () => {
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

    this.skinName = this.add
      .text(width / 2, height * 0.78, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '18px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);
    this.skinHint = this.add
      .text(width / 2, height * 0.81, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '15px',
        color: '#9BB0C1',
      })
      .setOrigin(0.5);

    this.makeChip(width * 0.28, height * 0.78, '‹', () => void this.cycleSkin(-1));
    this.makeChip(width * 0.72, height * 0.78, '›', () => void this.cycleSkin(1));
    this.refreshSkinLabel();

    const hubBg = this.add
      .image(width / 2, height * 0.865, 'ui-btn')
      .setDisplaySize(240, 48)
      .setTint(0x2a9d8f)
      .setInteractive({ useHandCursor: true });
    const hub = this.add
      .text(width / 2, height * 0.865, tf('retention'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#071018',
      })
      .setOrigin(0.5)
      .setDepth(3);
    const openHub = () => {
      unlockAudio();
      playTone('ui');
      this.retentionOverlay?.show();
    };
    hubBg.on('pointerup', openHub);
    hub.setInteractive({ useHandCursor: true }).on('pointerup', openHub);

    const soundLabel = save.sound ? tf('soundOn') : tf('soundOff');
    const soundBtn = this.add
      .text(width / 2, height * 0.92, soundLabel, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
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

    try {
      this.retentionOverlay = new RetentionOverlay(this, () => {
        this.coinsText.setText(`${tf('coins')}: ${getSave().coins}`);
        this.refreshRetentionHint();
        this.refreshSkinLabel();
      });
    } catch (e) {
      console.warn('Retention overlay failed', e);
    }

    if (!save.seenTip) {
      this.showTips();
    } else {
      // auto-open return hub if morning gift waiting
      void syncRetentionClock().then(() => {
        const snap = getSnapshot();
        this.refreshRetentionHint();
        if (snap.morningAvailable || snap.idleSparks > 0 || snap.unreadLetters.length > 0) {
          this.time.delayedCall(450, () => this.retentionOverlay?.show());
        }
      });
    }

  }

  private refreshRetentionHint(): void {
    if (!this.retentionHint) return;
    const snap = getSnapshot();
    const bits: string[] = [`${tf('streak')} ${snap.streak}`];
    if (snap.morningAvailable) bits.push(tf('morningClaim'));
    if (snap.idleSparks > 0) bits.push(`+${snap.idleCoins}`);
    if (snap.unreadLetters.length) bits.push(`${tf('letterNew')} ${snap.unreadLetters.length}`);
    bits.push(`${tf('shards')} ${snap.weekShards}/${WEEKLY_SHARDS_NEEDED}`);
    this.retentionHint.setText(bits.join(' · '));
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
        this.scale.height * 0.34,
        skin,
        'amber',
        1.85,
      );
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
    this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '30px',
        color: '#071018',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(2);
    bg.on('pointerover', () => bg.setTint(0xffd6a5));
    bg.on('pointerout', () => bg.clearTint());
    bg.on('pointerup', onClick);
  }

  private makeChip(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 44, 44, 0x1b2838, 0.92)
      .setStrokeStyle(2, 0xa8e4f5, 0.35)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '26px',
        color: '#F7F3E8',
      })
      .setOrigin(0.5);
    bg.on('pointerup', onClick);
  }

  private showTips(): void {
    this.tipsOpen = true;
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(50);
    const panel = this.add
      .image(width / 2, height / 2, 'ui-panel')
      .setDisplaySize(width * 0.84, 400)
      .setDepth(51);
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
    const okBg = this.add
      .image(width / 2, height / 2 + 130, 'ui-btn')
      .setDisplaySize(220, 56)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });
    const ok = this.add
      .text(width / 2, height / 2 + 130, tf('gotIt'), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '26px',
        color: '#071018',
      })
      .setOrigin(0.5)
      .setDepth(53);

    const closeTips = async () => {
      if (!this.tipsOpen) return;
      this.tipsOpen = false;
      unlockAudio();
      overlay.destroy();
      panel.destroy();
      tip.destroy();
      okBg.destroy();
      ok.destroy();
      await patchSave({ seenTip: true });
      const snap = getSnapshot();
      if (snap.morningAvailable || snap.idleSparks > 0 || snap.unreadLetters.length > 0) {
        this.retentionOverlay?.show();
      }
    };
    okBg.on('pointerup', () => void closeTips());
    overlay.setInteractive().on('pointerup', () => void closeTips());
  }
}
