import { recruitForgePartner } from "#app/forge/runtime";
import { globalScene } from "#app/global-scene";
import { BattlePhase } from "#phases/battle-phase";

export class NewBattlePhase extends BattlePhase {
  public readonly phaseName = "NewBattlePhase";
  async start() {
    super.start();

    globalScene.phaseManager.removeAllPhasesOfType("NewBattlePhase");

    await recruitForgePartner();
    globalScene.newBattle();

    this.end();
  }
}
