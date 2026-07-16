import Phaser from "phaser";
import { hideBoot, setBootHint } from "../../bootUi";
import { initI18n } from "../../i18n";
import { initYandex, loadingReady } from "../../sdk/yandex";
import { MaterialFactory } from "../visual/MaterialFactory";

/** Boot: atlas → SDK → i18n → Main. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    initI18n();
    void (async () => {
      setBootHint("Атлас…");
      const atlasOk = await MaterialFactory.preferAtlas();
      if (atlasOk) {
        // eslint-disable-next-line no-console
        console.info("[echo] world atlas ready");
      } else {
        console.warn("[echo] atlas missing — procedural materials");
      }
      setBootHint("SDK…");
      await initYandex();
      hideBoot();
      this.scene.start("Main");
      this.time.delayedCall(120, () => loadingReady());
    })();
  }
}
