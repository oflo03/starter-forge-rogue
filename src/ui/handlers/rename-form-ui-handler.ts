import { globalScene } from "#app/global-scene";
import type { PlayerPokemon } from "#field/pokemon";
import type { FormModalConfig, ModalConfig } from "#types/ui-types";
import type { InputFieldConfig } from "#ui/form-modal-ui-handler";
import { FormModalUiHandler } from "#ui/form-modal-ui-handler";
import i18next from "i18next";

export class RenameFormUiHandler extends FormModalUiHandler {
  private partnerPreview: Phaser.GameObjects.Image | undefined;

  override getHeight(config?: FormModalConfig): number {
    return super.getHeight(config) + (config?.previewTexture ? 76 : 0);
  }

  override updateContainer(config?: FormModalConfig): void {
    super.updateContainer(config);
    const offset = config?.previewTexture ? 76 : 0;
    this.inputContainers[0]?.setY(28 + offset);
    this.formLabels[0]?.setY(31 + offset);
    this.errorMessage.setY(47 + offset + this.getButtonTopMargin());
    this.partnerPreview?.destroy();
    this.partnerPreview = undefined;
    if (config?.previewTexture) {
      this.partnerPreview = globalScene.add
        .image(80, 94, config.previewTexture)
        .setOrigin(0.5, 1)
        .setCrop(0, 28, 96, 68);
      this.modalContainer.add(this.partnerPreview);
    }
  }

  getModalTitle(_config?: ModalConfig): string {
    return i18next.t("menu:renamePokemon");
  }

  getWidth(_config?: ModalConfig): number {
    return 160;
  }

  getMargin(config?: FormModalConfig): [number, number, number, number] {
    return [0, 0, config?.previewTexture ? 0 : 48, 0];
  }

  getButtonLabels(_config?: ModalConfig): string[] {
    return [i18next.t("menu:rename"), i18next.t("menu:cancel")];
  }

  getReadableErrorMessage(error: string): string {
    const colonIndex = error?.indexOf(":");
    if (colonIndex > 0) {
      error = error.slice(0, colonIndex);
    }

    return super.getReadableErrorMessage(error);
  }

  override getInputFieldConfigs(): InputFieldConfig[] {
    return [{ label: i18next.t("menu:nickname") }];
  }

  show(args: any[]): boolean {
    if (super.show(args)) {
      const config = args[0] as ModalConfig;
      // TODO: shouldn't this be `const playerPokemon: PlayerPokemon | undefined = args[1];` and `if (playerPokemon)`?
      if (args[1] && typeof (args[1] as PlayerPokemon).getNameToRender === "function") {
        this.inputs[0].text = (args[1] as PlayerPokemon).getNameToRender({ useIllusion: false });
      } else {
        this.inputs[0].text = args[1];
      }
      this.submitAction = () => {
        this.sanitizeInputs();
        const sanitizedName = btoa(unescape(encodeURIComponent(this.inputs[0].text)));
        config.buttonActions[0](sanitizedName);
        return true;
      };
      return true;
    }
    return false;
  }
}
