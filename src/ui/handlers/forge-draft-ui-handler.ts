// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { ModifierTier } from "#enums/modifier-tier";
import type { MoveId } from "#enums/move-id";
import { TextStyle } from "#enums/text-style";
import { TmModifierType } from "#modifiers/modifier-type";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import type Phaser from "phaser";

export interface ForgeDraftOption {
  name: string;
  description: string;
  value: any;
  moveId?: MoveId;
  previewTexture?: string;
}

export interface ForgeDraftConfig {
  title: string;
  options: ForgeDraftOption[];
  tier: ModifierTier;
  onChoose: (index: number) => void;
  onParty?: () => void;
}

/** Three immediately readable augment cards, separate from item rewards and their animations. */
export class ForgeDraftUiHandler extends UiHandler {
  private root: Phaser.GameObjects.Container;
  private borders: Phaser.GameObjects.Rectangle[] = [];
  private partyText: Phaser.GameObjects.Text | undefined;
  private config: ForgeDraftConfig | undefined;
  private accepted = false;

  setup(): void {
    this.root = globalScene.add.container(0, -globalScene.scaledCanvas.height).setVisible(false);
    this.getUi().add(this.root);
  }

  show(args: any[]): boolean {
    const config = args[0] as ForgeDraftConfig;
    if (this.config !== config) {
      this.cursor = 0;
    }
    super.show(args);
    this.config = config;
    this.accepted = false;
    this.root.removeAll(true).setVisible(true);
    this.getUi().moveTo(this.root, this.getUi().length - 1);
    this.borders = [];
    this.partyText = undefined;
    const { width, height } = globalScene.scaledCanvas;
    this.root.add(globalScene.add.rectangle(0, 0, width, height, 0x101827).setOrigin(0));
    this.root.add(addTextObject(9, 7, config.title.replaceAll("\n", " · "), TextStyle.PARTY, { fontSize: "48px" }));
    const gap = 6;
    const count = config.options.length;
    const cardWidth = Math.floor((width - 16 - gap * (count - 1)) / count);
    const cardHeight = height - 51;
    const color =
      config.tier === ModifierTier.ULTRA ? 0xd5b16b : config.tier === ModifierTier.GREAT ? 0x7ba2c9 : 0x98a3b4;
    config.options.forEach((option, index) => {
      const x = 8 + index * (cardWidth + gap);
      const card = globalScene.add.container(x, 27);
      const border = globalScene.add
        .rectangle(0, 0, cardWidth, cardHeight, 0x202c40)
        .setOrigin(0)
        .setStrokeStyle(1, color);
      card.add(border);
      this.borders.push(border);
      card.add(globalScene.add.rectangle(1, 1, cardWidth - 2, 3, color).setOrigin(0));
      let nameY = 17;
      if (option.previewTexture) {
        card.add(globalScene.add.image(cardWidth / 2, 32, option.previewTexture));
        nameY = 60;
      } else if (option.moveId !== undefined) {
        const item = new TmModifierType(option.moveId);
        card.add(globalScene.add.image(cardWidth / 2, 22, "items", item.iconImage));
        nameY = 40;
      }
      const name = addTextObject(cardWidth / 2, nameY, option.name, TextStyle.PARTY, {
        fontSize: "44px",
        align: "center",
        wordWrap: { width: (cardWidth - 12) * 6, useAdvancedWrap: true },
      })
        .setOrigin(0.5, 0)
        .setColor("#f4e4bf");
      card.add(name);
      const descriptionY = nameY + name.displayHeight + 9;
      const description = addTextObject(8, descriptionY, option.description, TextStyle.BATTLE_INFO, {
        fontSize: "36px",
        wordWrap: { width: (cardWidth - 16) * 6, useAdvancedWrap: true },
      }).setColor("#e4eaf1");
      for (const size of [34, 32, 30, 28]) {
        if (description.displayHeight <= cardHeight - descriptionY - 8) {
          break;
        }
        description.setFontSize(size);
      }
      card.add(description);
      border
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.setCursor(index))
        .on("pointerdown", () => {
          this.setCursor(index);
          this.choose();
        });
      this.root.add(card);
    });
    if (config.onParty) {
      this.partyText = addTextObject(width - 10, height - 16, "파티 확인", TextStyle.PARTY, {
        fontSize: "40px",
      }).setOrigin(1, 0);
      this.partyText
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.setCursor(config.options.length))
        .on("pointerdown", () => {
          this.setCursor(config.options.length);
          this.choose();
        });
      this.root.add(this.partyText);
    }
    this.setCursor(this.cursor);
    return true;
  }

  override setCursor(cursor: number): boolean {
    const changed = super.setCursor(cursor);
    this.borders.forEach((border, index) =>
      border.setStrokeStyle(index === cursor ? 2 : 1, index === cursor ? 0xf4d68b : 0x52647d),
    );
    this.partyText?.setColor(cursor === this.config?.options.length ? "#f4d68b" : "#bdc8d8");
    return changed;
  }

  private choose(): void {
    if (!this.active || this.accepted || !this.config) {
      return;
    }
    this.getUi().playSelect();
    if (this.cursor === this.config.options.length) {
      this.root.setVisible(false);
      this.config.onParty?.();
    } else {
      this.accepted = true;
      this.config.onChoose(this.cursor);
    }
  }

  processInput(button: Button): boolean {
    if (!this.active || !this.config || this.accepted) {
      return false;
    }
    const count = this.config.options.length;
    if (button === Button.ACTION || button === Button.SUBMIT) {
      this.choose();
    } else if (button === Button.LEFT || button === Button.RIGHT) {
      const direction = button === Button.LEFT ? -1 : 1;
      this.setCursor((Math.min(this.cursor, count - 1) + direction + count) % count);
    } else if ((button === Button.DOWN || button === Button.UP || button === Button.CANCEL) && this.config.onParty) {
      this.setCursor(this.cursor === count ? 0 : count);
    } else if (button === Button.STATS && this.config.onParty) {
      this.setCursor(count);
      this.choose();
    } else {
      return false;
    }
    return true;
  }

  override clear(): void {
    super.clear();
    this.root.setVisible(false);
    this.setMouseCursorStyle("default");
  }
}
