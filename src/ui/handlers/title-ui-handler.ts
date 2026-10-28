// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { OptionSelectUiHandler } from "#ui/option-select-ui-handler";
import { addTextObject } from "#ui/text";
import { fixedInt } from "#utils/common";

export class TitleUiHandler extends OptionSelectUiHandler {
  private titleContainer: Phaser.GameObjects.Container;
  private modeLabel: Phaser.GameObjects.Text;

  constructor() {
    super(UiMode.TITLE);
  }

  public override setup(): void {
    super.setup();
    const {
      ui,
      scaledCanvas: { width, height },
    } = globalScene;
    this.titleContainer = globalScene.add.container(0, -height).setName("title").setAlpha(0);
    ui.add(this.titleContainer);
    const logo = addTextObject(width / 2, 16, "STARTER FORGE", TextStyle.MESSAGE, { fontSize: "100px" }).setOrigin(
      0.5,
      0,
    );
    this.modeLabel = addTextObject(width - 2, 0, "60웨이브 · 파트너 3마리", TextStyle.MESSAGE, {
      fontSize: "54px",
    }).setOrigin(1, 0);
    const source = addTextObject(6, height - 10, "PokéRogue 기반 · 소스 코드", TextStyle.MESSAGE, { fontSize: "42px" })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => window.open("./source.zip", "_blank"));
    this.titleContainer.add([logo, this.modeLabel, source]);
  }

  public override show(args: any[]): boolean {
    if (!super.show(args)) {
      return false;
    }
    this.modeLabel.setY(globalScene.scaledCanvas.height - 13 - this.windowHeight);
    globalScene.tweens.add({
      targets: [this.titleContainer, this.getUi().getMessageHandler().bg],
      duration: fixedInt(325),
      alpha: (target: any) => (target === this.titleContainer ? 1 : 0),
      ease: "Sine.easeInOut",
    });
    return true;
  }

  public override clear(): void {
    super.clear();
    globalScene.tweens.add({
      targets: [this.titleContainer, this.getUi().getMessageHandler().bg],
      duration: fixedInt(325),
      alpha: (target: any) => (target === this.titleContainer ? 0 : 1),
      ease: "Sine.easeInOut",
    });
  }
}
