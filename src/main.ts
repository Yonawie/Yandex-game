import './styles/main.css';
import Phaser from 'phaser';
import { createGameConfig } from '@/game/config';

const parent = 'game-root';
const root = document.getElementById(parent);
if (!root) {
  throw new Error('#game-root missing');
}

// Prevent mobile pull-to-refresh / gestures stealing input
document.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

new Phaser.Game(createGameConfig(parent));
