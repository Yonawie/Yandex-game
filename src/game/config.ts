import Phaser from 'phaser';
import { BootScene } from '@/game/scenes/BootScene';
import { PreloadScene } from '@/game/scenes/PreloadScene';
import { MenuScene } from '@/game/scenes/MenuScene';
import { GameScene } from '@/game/scenes/GameScene';
import { ResultScene } from '@/game/scenes/ResultScene';
import { COLORS } from '@/data/balance';

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: COLORS.bgTop,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, ResultScene],
    audio: {
      disableWebAudio: false,
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    input: {
      activePointers: 3,
    },
  };
}
