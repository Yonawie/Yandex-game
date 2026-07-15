import Phaser from "phaser";
import { initI18n } from "../../i18n";
import { initYandex, loadingReady } from "../../sdk/yandex";

/** Boot: SDK init, i18n, then Main. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    initI18n();
    void initYandex().finally(() => {
      this.scene.start("Main");
      this.time.delayedCall(120, () => loadingReady());
    });
  }
}
