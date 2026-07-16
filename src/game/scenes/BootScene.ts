import Phaser from "phaser";
import { hideBoot, setBootHint } from "../../bootUi";
import { applyCloudBlob, setSavePersistHook } from "../../data/save";
import { initI18n } from "../../i18n";
import {
  initYandex,
  loadingReady,
  logSdkStand,
  pullAndMergeCloud,
  scheduleCloudSave,
} from "../../sdk/yandex";
import { MaterialFactory } from "../visual/MaterialFactory";

/** Boot: atlas → SDK → cloud → i18n → Main. */
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
      logSdkStand();
      setSavePersistHook((save) => scheduleCloudSave(save));

      setBootHint("Облако…");
      const merged = await pullAndMergeCloud((blob) => {
        applyCloudBlob(blob);
      });
      if (merged) {
        // eslint-disable-next-line no-console
        console.info("[echo] cloud save merged");
      }

      hideBoot();
      this.scene.start("Main");
      this.time.delayedCall(120, () => loadingReady());
    })();
  }
}
