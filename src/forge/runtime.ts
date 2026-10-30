// SPDX-License-Identifier: AGPL-3.0-only

import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { PLAYER_PARTY_MAX_SIZE } from "#app/constants";
import { forgeBodyForSeed } from "#app/forge/body";
import { globalScene } from "#app/global-scene";
import { speciesDataRegistry } from "#app/global-species-data-registry";
import { allMoves } from "#data/data-lists";
import { getLevelTotalExp } from "#data/exp";
import { CustomPokemonData } from "#data/pokemon-data";
import { AbilityId } from "#enums/ability-id";
import { Button } from "#enums/buttons";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveCategory } from "#enums/move-category";
import type { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { PartyUiMode } from "#enums/party-ui-mode";
import type { PokemonType, RegularPokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon } from "#field/pokemon";
import { PokemonMove } from "#moves/pokemon-move";
import type { Starter } from "#types/save-data";
import type { FormModalConfig, OptionSelectItem } from "#types/ui-types";
import type { ForgeDraftConfig, ForgeDraftOption } from "#ui/forge-draft-ui-handler";
import type { RenameFormUiHandler } from "#ui/rename-form-ui-handler";
import { getPokemonTypeLocaleKey } from "#utils/i18n";
import i18next from "i18next";
import { evolutionStats } from "../../forge/stats.ts";
import Maker from "../../forge/vendor/engine.js";
import { forgeAppearance, forgeTypeChoice } from "./appearance";
import { AUGMENT_REROLLS, type AugmentTier, rollAugmentTier } from "./augments";
import { DraftInputGate } from "./draft-input";
import { animateForgeEvolution } from "./evolution";
import { learnForgeMove } from "./learn-move";
import { FORGE_ABILITY_LEVELS, FORGE_MILESTONES, FORGE_MOVE_LEVELS } from "./progression";
import {
  abilityAugmentChoices,
  customAbilityChoices,
  customMoveChoices,
  environmentCreatorForAbility,
  starterAbility,
  starterMoves,
} from "./registry";

const types = Array.from({ length: 18 }, (_, i) => i as PokemonType);
const statKeys = ["hp", "atk", "def", "spa", "spd", "spe"];
const statNames = ["HP", "공격", "방어", "특공", "특방", "스피드"];
export const randomForgeSeed = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(16).padStart(8, "0")).join("");
const typeName = (type: PokemonType) => i18next.t(getPokemonTypeLocaleKey(type));
const growthTypes = (pokemon: PlayerPokemon) =>
  (pokemon.customPokemonData.forge
    ? pokemon.customPokemonData.types
    : pokemon.getTypes({ includeTeraType: false, bypassSummonData: true, ignoreThirdType: true })
  ).filter((type): type is PokemonType => type !== null && types.includes(type));
const finalStats = (seed: string): number[] => {
  const stats = Maker.generateStats(seed).stats;
  return statKeys.map(key => stats[key]);
};
const originalSpecies = (type: PokemonType, seed: string) => {
  const pool = speciesDataRegistry
    .getAllSpecies()
    .filter(s => s.type1 === type && s.baseTotal <= 450 && !s.legendary && !s.mythical);
  const values = pool.length > 0 ? pool : speciesDataRegistry.getAllSpecies().filter(s => s.type1 === type);
  return (
    values[Maker.createRng(seed + ":appearance").int(0, values.length - 1)]
    ?? speciesDataRegistry.getSpecies(SpeciesId.EEVEE)
  );
};
function nickname(previewTexture?: string): Promise<string> {
  globalScene.ui.clearText();
  return new Promise(resolve => {
    const open = (errorMessage?: string) => {
      if (errorMessage && globalScene.ui.mode === UiMode.RENAME_POKEMON) {
        const config: FormModalConfig = {
          errorMessage,
          ...(previewTexture ? { previewTexture } : {}),
          buttonActions: [],
        };
        (globalScene.ui.getHandler() as RenameFormUiHandler).updateContainer(config);
        return;
      }
      return globalScene.ui.setModeWithoutClear(
        UiMode.RENAME_POKEMON,
        {
          errorMessage,
          ...(previewTexture ? { previewTexture } : {}),
          buttonActions: [
            (encoded: string) => {
              const name = decodeURIComponent(escape(atob(encoded))).trim();
              if (Array.from(name).length === 0 || Array.from(name).length > 12) {
                open("이름은 1~12글자로 입력해 주세요.");
                return;
              }
              globalScene.ui.setMode(UiMode.MESSAGE);
              resolve(btoa(unescape(encodeURIComponent(name))));
            },
            () => open("파트너의 이름을 지어 주세요."),
          ],
        },
        "",
      );
    };
    open();
  });
}
export function forgePartnerTypeChoices(seed: string, excluded: readonly PokemonType[] = []): PokemonType[] {
  const random = Maker.createRng(seed);
  const pool = types.filter(type => !excluded.includes(type));
  return Array.from({ length: 3 }, () => pool.splice(random.int(0, pool.length - 1), 1)[0]);
}
export async function meetForgePartner(
  index: number,
  level: number,
  rootSeed: string,
): Promise<{ starter: Starter; seed: string; type: PokemonType }> {
  const seed = rootSeed + ":partner:" + index;
  const random = Maker.createRng(seed);
  const candidates = forgePartnerTypeChoices(seed);
  const body = forgeBodyForSeed(seed);
  const previousMenuState = globalScene.disableMenu;
  const type: PokemonType = await chooseCards(
    `파트너 타입 · Lv.${level}`,
    candidates.map(type => ({
      name: typeName(type),
      description: "",
      value: type,
      previewTexture: forgeTypeChoice(type),
    })),
    seed,
  );
  globalScene.disableMenu = previousMenuState;
  const species = originalSpecies(type, seed);
  await globalScene.ui.setMode(UiMode.MESSAGE);

  const name = await nickname(forgeAppearance([type], false, 1, body));
  return {
    seed,
    type,
    starter: {
      speciesId: species.speciesId,
      shiny: false,
      variant: 0,
      formIndex: 0,
      abilityIndex: 0,
      passive: false,
      nature: Nature.HARDY,
      pokerus: false,
      nickname: name,
      ivs: statKeys.map(() => random.int(8, 20)),
      moveset: starterMoves(type) as any,
    },
  };
}
export function configureForgePartner(pokemon: PlayerPokemon, seed: string, type: PokemonType): void {
  pokemon.customPokemonData = new CustomPokemonData({
    ability: starterAbility(type),
    types: [type as RegularPokemonType, null],
    forge: {
      seed,
      baseStats: evolutionStats(finalStats(seed), 1),
      stage: 1,
      events: [],
      body: forgeBodyForSeed(seed),
      abilityReward: false,
      passiveReward: false,
    },
  });
  pokemon.moveset = starterMoves(type).map(id => new PokemonMove(id));
  pokemon.pauseEvolutions = true;
  pokemon.calculateStats();
  pokemon.hp = pokemon.getMaxHp();
}
export function forgeSeedText(): string {
  if (!globalScene.gameMode?.isForge || !globalScene.getPlayerParty().some(p => p.customPokemonData.forge)) {
    return "모험 시드는 모험 중 확인할 수 있습니다.";
  }
  const first = globalScene.getPlayerParty().find(p => p.customPokemonData.forge)!;
  return `맵: ${globalScene.seed}\n파트너: ${first.customPokemonData.forge!.seed.split(":")[0]}`;
}
async function chooseList(title: string, options: { name: string; description?: string; value: any }[]): Promise<any> {
  return new Promise(resolve => {
    const ui = globalScene.ui;
    const gate = new DraftInputGate();
    const release = (event: { button: number }) => gate.release(event.button);
    const releasePointer = () => gate.releasePointer();
    const rows: OptionSelectItem[] = options.map(option => ({
      label: option.name,
      onHover: () => ui.showText(option.description || title, 0),
      handler: () => {
        if (!gate.confirm(performance.now())) {
          return false;
        }
        globalScene.game.events.off("input_up", release);
        globalScene.input.off("pointerup", releasePointer);
        ui.setMode(UiMode.MESSAGE);
        resolve(option.value);
        return true;
      },
    }));
    ui.showText(
      title,
      0,
      () => {
        gate.open(
          performance.now(),
          [Button.SUBMIT, Button.ACTION].filter(button => globalScene.inputController?.isButtonPressed?.(button)),
          globalScene.input.activePointer?.isDown ?? false,
        );
        globalScene.game.events.on("input_up", release);
        globalScene.input.on("pointerup", releasePointer);
        ui.setModeWithoutClear(UiMode.OPTION_SELECT, {
          options: rows,
          blockCancelButton: true,
          maxOptions: 6,
          inputDelay: 1200,
        });
      },
      null,
      true,
    );
  });
}
function rewardTier(seed: string): AugmentTier {
  return rollAugmentTier(globalScene.seed + ":reward:" + seed);
}
async function chooseCards(
  title: string,
  options: ForgeDraftOption[],
  seed: string,
  regenerate?: (seed: string, excludedValues: any[]) => ForgeDraftOption[],
): Promise<any> {
  const ui = globalScene.ui;
  const previousMenuState = globalScene.disableMenu;
  globalScene.disableMenu = true;
  ui.clearText();
  try {
    return await new Promise(resolve => {
      const remaining = options.map(() => AUGMENT_REROLLS);
      const history = options.map(option => option.value);
      const key = (value: any) => value?.id ?? value;
      const show = () => ui.setMode(UiMode.FORGE_DRAFT, config);
      const config: ForgeDraftConfig = {
        title,
        options,
        tier: [ModifierTier.COMMON, ModifierTier.GREAT, ModifierTier.ULTRA][rewardTier(seed.split(":tier:")[0])],
        ...(regenerate
          ? {
              rerollsRemaining: remaining,
              onReroll: (index: number) => {
                if (remaining[index] <= 0) {
                  return false;
                }
                const rollSeed = `${seed}:reroll:${index}:${AUGMENT_REROLLS - remaining[index] + 1}`;
                const current = new Set(options.map(option => key(option.value)));
                const candidate =
                  regenerate(rollSeed, history).find(option => !current.has(key(option.value)))
                  ?? regenerate(
                    rollSeed,
                    options.map(option => option.value),
                  ).find(option => !current.has(key(option.value)));
                if (!candidate) {
                  return false;
                }
                options[index] = candidate;
                history.push(candidate.value);
                remaining[index]--;
                return true;
              },
            }
          : {}),
        onChoose: index => {
          ui.setMode(UiMode.MESSAGE).then(() => resolve(options[index].value));
        },
        ...(globalScene.getPlayerParty().length > 0
          ? {
              onParty: () => ui.setModeWithoutClear(UiMode.PARTY, PartyUiMode.CHECK, -1, show),
            }
          : {}),
      };
      show();
    });
  } finally {
    globalScene.disableMenu = previousMenuState;
  }
}
function moveDescription(id: MoveId): string {
  const move = allMoves[id];
  if (move.category === MoveCategory.STATUS) {
    return `${typeName(move.type)} · 변화 · PP ${move.pp}\n${move.effect}`;
  }
  const category = move.category === MoveCategory.PHYSICAL ? "물리" : "특수";
  const accuracy = move.accuracy < 0 ? "필중" : `${move.accuracy}%`;
  const priority = move.priority ? ` · 우선도 ${move.priority > 0 ? "+" : ""}${move.priority}` : "";
  return `${typeName(move.type)} · ${category} · 위력 ${move.power > 0 ? move.power : "—"} · 명중 ${accuracy} · PP ${move.pp}${priority}\n${move.effect}`;
}
function enhancedCategory(pokemon: PlayerPokemon, stats: number[]): MoveCategory | undefined {
  const nativeCategory = (id: AbilityId) =>
    [AbilityId.HUGE_POWER, AbilityId.MOXIE].includes(id)
      ? MoveCategory.PHYSICAL
      : id === AbilityId.SOUL_HEART
        ? MoveCategory.SPECIAL
        : undefined;
  const activeCategory = nativeCategory(pokemon.getAbility(true).id);
  if (activeCategory !== undefined) {
    return activeCategory;
  }
  const choice = [
    ...customAbilityChoices(growthTypes(pokemon), stats, "category"),
    ...[1, 2, 3, 4].flatMap(tier => customAbilityChoices(growthTypes(pokemon), stats, "category", tier)),
  ].find(o => o.id === pokemon.getAbility(true).id);
  if (choice?.name === "밸런스기어" || choice?.name.startsWith("빈틈없는박자")) {
    return pokemon.stats[1] <= pokemon.stats[3] ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
  }
  return (
    choice?.enhancedCategory ?? (pokemon.hasPassive() ? nativeCategory(pokemon.getPassiveAbility().id) : undefined)
  );
}
function equippedAbilities(pokemon: PlayerPokemon): AbilityId[] {
  return [pokemon.getAbility().id, ...(pokemon.hasPassive() ? [pokemon.getPassiveAbility().id] : [])];
}
export async function forgeGrowth(pokemon: PlayerPokemon, previousLevel: number): Promise<void> {
  const data = pokemon.customPokemonData.forge;
  if (!data) {
    return;
  }
  const priorMenuState = globalScene.disableMenu;
  globalScene.disableMenu = true;
  try {
    const stats = finalStats(data.seed);
    for (const level of FORGE_MILESTONES) {
      const missingAbility = level === 21 && !data.abilityReward;
      const missingPassive = level === 41 && (!data.passiveReward || pokemon.customPokemonData.passive === -1);
      const missingIvs = level === 46 && !data.ivReward;
      if (
        level <= previousLevel
        || level > pokemon.level
        || (data.events.includes(level) && !missingAbility && !missingPassive && !missingIvs)
      ) {
        continue;
      }
      const rewardBase = data.seed + ":reward:" + level;
      const rarity = rewardTier(rewardBase);
      const seed = rewardBase + ":tier:" + rarity;
      const name = pokemon.getNameToRender({ useIllusion: false });
      if (level === 36 && data.stage < 3) {
        const options = forgePartnerTypeChoices(seed, growthTypes(pokemon));
        const type: PokemonType = await chooseCards(
          `${name} · 추가 타입`,
          options.map(type => ({
            name: typeName(type),
            description: "",
            value: type,
            previewTexture: forgeTypeChoice(type),
          })),
          seed,
        );
        await animateForgeEvolution(pokemon, 3, evolutionStats(stats, 3), [
          pokemon.customPokemonData.types[0]!,
          type as RegularPokemonType,
        ]);
      } else if (level === 16 && data.stage < 2) {
        await animateForgeEvolution(pokemon, 2, evolutionStats(stats, 2));
      }
      if (FORGE_MOVE_LEVELS.includes(level)) {
        const makeOptions = (rollSeed: string, excluded: any[] = []) =>
          customMoveChoices(
            growthTypes(pokemon),
            stats,
            rollSeed,
            [...pokemon.getMoveset(true).map(m => m.moveId), ...excluded],
            enhancedCategory(pokemon, stats),
            level,
            rarity,
            { moves: pokemon.getMoveset(true).map(move => move.getMove().id), abilities: equippedAbilities(pokemon) },
          ).map(o => ({ name: o.name, description: moveDescription(o.id), value: o.id, moveId: o.id }));
        const id: MoveId = await chooseCards(`${name} · Lv.${level} · 기술`, makeOptions(seed), seed, makeOptions);
        await learnForgeMove(pokemon, id);
      } else if (FORGE_ABILITY_LEVELS.includes(level) && (level === 21 ? missingAbility : missingPassive)) {
        const passive = level === 41;
        const equipped = [pokemon.customPokemonData.ability, pokemon.customPokemonData.passive].filter(id => id >= 0);
        const makeOptions = (rollSeed: string, excluded: any[] = []) =>
          abilityAugmentChoices(
            growthTypes(pokemon),
            stats,
            rollSeed,
            rarity,
            [...equipped, ...excluded.map(value => value.id)],
            { moves: pokemon.getMoveset(true).map(move => move.getMove().id), abilities: equippedAbilities(pokemon) },
          ).map(o => {
            const creator = environmentCreatorForAbility(o.id);
            return {
              name: o.name,
              description: o.description + (creator === undefined ? "" : `\n연계 기술: ${allMoves[creator].name}`),
              value: o,
            };
          });
        const choice = await chooseCards(`${name} · 특성`, makeOptions(seed), seed, makeOptions);
        if (passive) {
          pokemon.customPokemonData.passive = choice.id;
          pokemon.passive = true;
          data.passiveReward = true;
        } else {
          pokemon.customPokemonData.ability = choice.id;
          data.abilityReward = true;
        }
        if (pokemon.isFusion()) {
          pokemon.fusionCustomPokemonData ??= new CustomPokemonData();
          if (passive) {
            pokemon.fusionCustomPokemonData.passive = choice.id;
          } else {
            pokemon.fusionCustomPokemonData.ability = choice.id;
          }
        }
        if (pokemon.isOnField() && pokemon.hp > 0) {
          applyAbAttrs("PostSummonAbAttr", { pokemon });
        }
        const creator = environmentCreatorForAbility(
          choice.id,
          pokemon.getMoveset(true).map(move => move.moveId),
        );
        if (creator !== undefined) {
          await learnForgeMove(pokemon, creator);
        }
      }
      if (level === 46 && !data.ivReward) {
        const dominant = stats[1] >= stats[3] ? 1 : 3;
        const selection = await chooseCards(
          `${name} · 개체값 조정`,
          [
            { name: "고른 성장", description: "모든 개체값 +5. 최대31.", value: "all" },
            { name: "주력의 완성", description: statNames[dominant] + " 개체값을31로 조정.", value: dominant },
            { name: "한 가지에 집중", description: "원하는 능력치 하나의 개체값을31로 조정.", value: "focus" },
          ],
          seed,
        );
        if (selection === "all") {
          pokemon.ivs = pokemon.ivs.map(n => Math.min(31, n + 5));
        } else {
          const stat =
            selection === "focus"
              ? await chooseList(
                  "V로 만들 능력치",
                  statNames.map((name, i) => ({ name, value: i })),
                )
              : selection;
          pokemon.ivs[stat] = 31;
        }
        data.ivReward = true;
      }
      if (!data.events.includes(level)) {
        data.events.push(level);
      }
      pokemon.calculateStats();
      await pokemon.updateInfo();
    }
  } finally {
    globalScene.disableMenu = priorMenuState;
  }
}
export async function recruitForgePartner(): Promise<void> {
  const wave = globalScene.currentBattle.waveIndex;
  if (!globalScene.gameMode.isForge || wave !== 10) {
    return;
  }
  const party = globalScene.getPlayerParty();
  const partners = party.filter(p => p.customPokemonData.forge);
  const index = 1;
  if (partners.some(p => p.customPokemonData.forge!.seed.endsWith(":partner:" + index))) {
    return;
  }
  const root = partners[0]?.customPokemonData.forge?.seed.split(":")[0] ?? globalScene.seed;
  const encounter = await meetForgePartner(index, 10, root);
  if (party.length >= PLAYER_PARTY_MAX_SIZE) {
    const releaseOptions = party
      .map((pokemon, index) => ({ pokemon, index }))
      .filter(({ pokemon }) => !pokemon.customPokemonData.forge);
    const index: number = await chooseList(
      "탐험대가 가득 찼습니다. 새 파트너를 위해 작별할 포켓몬을 고르세요.",
      releaseOptions.map(({ pokemon, index }) => ({
        name: pokemon.getNameToRender({ useIllusion: false }),
        description: "이 포켓몬과 소지 도구를 보내고 새 파트너를 맞이합니다.",
        value: index,
      })),
    );
    await globalScene.removePartyMemberModifiers(index);
    const released = party.splice(index, 1)[0];
    released.destroy();
  }
  const s = encounter.starter;
  const pokemon = globalScene.addPlayerPokemon(
    speciesDataRegistry.getSpecies(s.speciesId),
    10,
    s.abilityIndex,
    s.formIndex,
    undefined,
    false,
    0,
    s.ivs,
    s.nature,
  );
  pokemon.nickname = s.nickname!;
  pokemon.tryPopulateMoveset(s.moveset!, true);
  configureForgePartner(pokemon, encounter.seed, encounter.type);
  pokemon.exp = getLevelTotalExp(10, pokemon.species.growthRate);
  party.push(pokemon);
  await pokemon.loadAssets();
  await pokemon.updateInfo();
}
