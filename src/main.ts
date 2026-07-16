import './styles/main.css';
import Phaser from 'phaser';
import { createGameConfig } from '@/game/config';
import { yandex } from '@/sdk/yandex';
import { stopMusic, startMusic, isMuted, unlockAudio } from '@/game/audio/sfx';
import { getSave } from '@/data/save';
import { applyRunToRetention, getSnapshot, syncRetentionClock } from '@/retention/service';

const parent = 'game-root';
const root = document.getElementById(parent);
if (!root) {
  throw new Error('#game-root missing');
}

document.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

document.addEventListener(
  'pointerdown',
  () => {
    unlockAudio();
  },
  { once: true },
);

const game = new Phaser.Game(createGameConfig(parent));

if (new URLSearchParams(location.search).has('qa')) {
  (window as unknown as { __stayLitQA: unknown }).__stayLitQA = {
    game,
    getSave,
    getSnapshot,
    applyRunToRetention,
    syncRetentionClock,
    yandexStatus: () => yandex.getQaStatus(),
  };
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    yandex.stopGameplay();
    stopMusic();
    game.scene.getScenes(true).forEach((s) => {
      if (s.scene.key === 'Game' && s.scene.isActive()) s.scene.pause();
    });
    return;
  }

  // Always resume a paused run — mute must not leave Game stuck.
  let resumedGame = false;
  game.scene.getScenes(true).forEach((s) => {
    if (s.scene.key === 'Game' && s.scene.isPaused()) {
      s.scene.resume();
      resumedGame = true;
    }
  });
  if (resumedGame) yandex.startGameplay();
  if (!isMuted()) startMusic();
});
