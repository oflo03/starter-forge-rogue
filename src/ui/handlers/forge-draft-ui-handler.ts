// SPDX-License-Identifier: AGPL-3.0-only

import { AUGMENT_TIER_NAMES } from "#app/forge/augments";
import { DraftInputGate } from "#app/forge/draft-input";
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
  rerollsRemaining?: number[];
  onReroll?: (index: number) => boolean;
}

/** Three immediately readable augment cards, separate from item rewards and their animations. */
export class ForgeDraftUiHandler extends UiHandler {
  private root: Phaser.GameObjects.Container;
  private borders: Phaser.GameObjects.Rectangle[] = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private animations: Phaser.Tweens.Tween[] = [];
  private partyText: Phaser.GameObjects.Text | undefined;
  private rerollButtons: { background: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private config: ForgeDraftConfig | undefined;
  private accepted = false;
  private readonly inputGate = new DraftInputGate();
  private readonly releaseButton = (event: { button: Button }) => this.inputGate.release(event.button);
  private readonly releasePointer = () => this.inputGate.releasePointer();

  setup(): void {
    this.root = globalScene.add.container(0, -globalScene.scaledCanvas.height).setVisible(false);
    this.getUi().add(this.root);
    globalScene.game.events.on("input_up", this.releaseButton);
    globalScene.input.on("pointerup", this.releasePointer);
  }

  show(args: any[]): boolean {
    this.stopAnimations();
    const config = args[0] as ForgeDraftConfig;
    const rerolledIndex = args[1] as number | undefined;
    if (this.config !== config) {
      this.cursor = 0;
    }
    super.show(args);
    this.config = config;
    this.accepted = false;
    if (rerolledIndex === undefined) {
      this.inputGate.open(
        performance.now(),
        [Button.ACTION, Button.SUBMIT].filter(button => globalScene.inputController?.isButtonPressed?.(button)),
        globalScene.input.activePointer?.isDown ?? false,
      );
    }
    this.root.removeAll(true).setVisible(true);
    this.getUi().moveTo(this.root, this.getUi().length - 1);
    this.borders = [];
    this.cards = [];
    this.partyText = undefined;
    this.rerollButtons = [];
    const { width, height } = globalScene.scaledCanvas;
    this.root.add(globalScene.add.rectangle(0, 0, width, height, 0x101827).setOrigin(0));
    const title = addTextObject(9, 7, config.title.replaceAll("\n", " · "), TextStyle.PARTY, { fontSize: "48px" });
    this.root.add(title);
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (!reducedMotion && rerolledIndex === undefined) {
      title.setAlpha(0);
      this.animate({ targets: title, alpha: 1, duration: 180 });
    }
    const gap = 6;
    const count = config.options.length;
    const cardWidth = Math.floor((width - 16 - gap * (count - 1)) / count);
    const cardHeight = height - 51;
    const choiceHeight = cardHeight - (config.onReroll ? 26 : 0);
    const color =
      config.tier === ModifierTier.ULTRA ? 0x88e7f3 : config.tier === ModifierTier.GREAT ? 0xe2b75b : 0xaeb8c9;
    if (config.onReroll) {
      this.root.add(
        addTextObject(width - 9, 10, AUGMENT_TIER_NAMES[config.tier], TextStyle.PARTY, { fontSize: "34px" })
          .setOrigin(1, 0)
          .setColor(`#${color.toString(16).padStart(6, "0")}`),
      );
    }
    config.options.forEach((option, index) => {
      const x = 8 + index * (cardWidth + gap);
      const card = globalScene.add.container(x, 27);
      this.cards.push(card);
      const border = globalScene.add
        .rectangle(0, 0, cardWidth, choiceHeight, 0x202c40)
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
        if (description.displayHeight <= cardHeight - descriptionY - (config.onReroll ? 29 : 8)) {
          break;
        }
        description.setFontSize(size);
      }
      card.add(description);
      if (config.onReroll) {
        const left = config.rerollsRemaining?.[index] ?? 0;
        const background = globalScene.add
          .rectangle(7, cardHeight - 22, cardWidth - 14, 16, 0x152031)
          .setOrigin(0)
          .setStrokeStyle(1, left ? color : 0x465365);
        const label = addTextObject(cardWidth / 2, cardHeight - 20, `새로고침 ${left}`, TextStyle.PARTY, {
          fontSize: "32px",
        })
          .setOrigin(0.5, 0)
          .setColor(left ? "#dce5ee" : "#718093");
        card.add([background, label]);
        if (left > 0) {
          background
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => this.setCursor(count + index))
            .on("pointerdown", () => {
              this.setCursor(count + index);
              this.reroll(index);
            });
        }
        this.rerollButtons.push({ background, label });
      }
      border
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.setCursor(index))
        .on("pointerdown", () => {
          this.setCursor(index);
          this.choose();
        });
      this.root.add(card);
      if (!reducedMotion && rerolledIndex === index) {
        card.setAlpha(0.65);
        this.animate({ targets: card, alpha: 1, duration: 120 });
      } else if (!reducedMotion && rerolledIndex === undefined) {
        card
          .setPosition(x + cardWidth * 0.02, 51)
          .setScale(0.96)
          .setAlpha(0);
        this.animate({
          targets: card,
          x,
          y: 27,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          delay: index * 40,
          duration: 220,
          ease: "Back.easeOut",
        });
        const glint = globalScene.add
          .rectangle(2, 2, cardWidth - 4, 2, 0xffe9ae)
          .setOrigin(0)
          .setAlpha(0);
        card.add(glint);
        this.animate({ targets: glint, alpha: 0.9, delay: 180 + index * 40, duration: 110, yoyo: true });
      }
    });
    if (config.onParty) {
      this.partyText = addTextObject(width - 10, height - 16, "파티 확인", TextStyle.PARTY, {
        fontSize: "40px",
      }).setOrigin(1, 0);
      this.partyText
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.setCursor(config.options.length * (config.onReroll ? 2 : 1)))
        .on("pointerdown", () => {
          this.setCursor(config.options.length * (config.onReroll ? 2 : 1));
          this.choose();
        });
      this.root.add(this.partyText);
    }
    this.setCursor(this.cursor);
    return true;
  }

  override setCursor(cursor: number): boolean {
    const changed = super.setCursor(cursor);
    const count = this.config?.options.length ?? 0;
    const focus = cursor < count ? cursor : -1;
    this.borders.forEach((border, index) =>
      border
        .setStrokeStyle(index === focus ? 2 : 1, index === focus ? 0xf4d68b : 0x52647d)
        .setFillStyle(index === focus ? 0x2c3850 : 0x202c40),
    );
    this.rerollButtons.forEach((button, index) => {
      const focused = cursor === count + index;
      const left = this.config?.rerollsRemaining?.[index] ?? 0;
      button.background
        .setFillStyle(focused && left ? 0xeaf2ff : 0x152031)
        .setStrokeStyle(focused ? 2 : 1, focused && left ? 0xffffff : 0x52647d);
      button.label
        .setText(`${focused ? "▶ " : ""}새로고침 ${left}`)
        .setColor(focused && left ? "#101827" : left ? "#dce5ee" : "#718093");
    });
    this.partyText?.setColor(cursor === count * (this.config?.onReroll ? 2 : 1) ? "#f4d68b" : "#bdc8d8");
    return changed;
  }

  private choose(): boolean {
    if (
      this.config?.onReroll
      && this.cursor >= this.config.options.length
      && this.cursor < this.config.options.length * 2
    ) {
      return this.reroll(this.cursor - this.config.options.length);
    }
    if (!this.active || this.accepted || !this.config || !this.inputGate.confirm(performance.now())) {
      return false;
    }
    this.getUi().playSelect();
    if (this.cursor === this.config.options.length * (this.config.onReroll ? 2 : 1)) {
      this.root.setVisible(false);
      this.config.onParty?.();
    } else {
      this.accepted = true;
      const config = this.config;
      const index = this.cursor;
      if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true) {
        config.onChoose(index);
      } else {
        this.cards.forEach((card, i) => {
          if (i !== index) {
            this.animate({ targets: card, alpha: 0.3, y: 32, duration: 180 });
          }
        });
        this.borders[index].setStrokeStyle(3, 0xffe9ae).setFillStyle(0x34435c);
        this.animate({
          targets: this.cards[index],
          y: 23,
          duration: 210,
          ease: "Sine.easeOut",
          onComplete: () => config.onChoose(index),
        });
      }
    }
    return true;
  }

  processInput(button: Button): boolean {
    if (!this.active || !this.config || this.accepted) {
      return false;
    }
    const count = this.config.options.length;
    const party = count * (this.config.onReroll ? 2 : 1);
    if (button === Button.ACTION || button === Button.SUBMIT) {
      return this.choose();
    }
    if (!this.inputGate.isReady(performance.now())) {
      return false;
    }
    if (button === Button.LEFT || button === Button.RIGHT) {
      const direction = button === Button.LEFT ? -1 : 1;
      const row = this.config.onReroll && this.cursor >= count && this.cursor < count * 2 ? count : 0;
      this.setCursor(row + (((this.cursor % count) + direction + count) % count));
    } else if ((button === Button.DOWN || button === Button.UP) && this.config.onReroll) {
      if (this.cursor === party && this.config.onParty) {
        this.setCursor(button === Button.UP ? count : 0);
      } else if (this.cursor < count) {
        this.setCursor(button === Button.DOWN || !this.config.onParty ? this.cursor + count : party);
      } else {
        this.setCursor(button === Button.UP || !this.config.onParty ? this.cursor - count : party);
      }
    } else if ((button === Button.DOWN || button === Button.UP || button === Button.CANCEL) && this.config.onParty) {
      this.setCursor(this.cursor === party ? 0 : party);
    } else if (button === Button.STATS && this.config.onParty) {
      this.setCursor(party);
      this.choose();
    } else {
      return false;
    }
    return true;
  }

  override clear(): void {
    this.stopAnimations();
    super.clear();
    this.root.setVisible(false);
    this.setMouseCursorStyle("default");
  }

  override destroy(): void {
    this.stopAnimations();
    globalScene.game.events.off("input_up", this.releaseButton);
    globalScene.input.off("pointerup", this.releasePointer);
  }

  private animate(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
    this.animations.push(globalScene.tweens.add(config));
  }

  private reroll(index: number): boolean {
    if (
      !this.active
      || this.accepted
      || !this.config?.onReroll
      || !this.config.rerollsRemaining?.[index]
      || !this.inputGate.confirm(performance.now())
    ) {
      return false;
    }
    if (!this.config.onReroll(index)) {
      return false;
    }
    this.getUi().playSelect();
    this.show([this.config, index]);
    return true;
  }

  private stopAnimations(): void {
    for (const tween of this.animations) {
      tween.stop();
    }
    this.animations = [];
  }
}
