import './styles/main.css';
import Phaser from 'phaser';
import { createGameConfig } from '@/game/config';
import { yandex } from '@/sdk/yandex';
import { stopMusic, startMusic, isMuted, unlockAudio } from '@/game/audio/sfx';

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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    yandex.stopGameplay();
    stopMusic();
    game.scene.getScenes(true).forEach((s) => {
      if (s.scene.key === 'Game' && s.scene.isActive()) s.scene.pause();
    });
  } else if (!isMuted()) {
    startMusic();
    game.scene.getScenes(true).forEach((s) => {
      if (s.scene.key === 'Game' && s.scene.isPaused()) {
        s.scene.resume();
        yandex.startGameplay();
      }
    });
  }
});
