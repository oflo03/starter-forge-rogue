import { forgeGrowth } from "#app/forge/runtime";
import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
export class ForgeGrowthPhase extends Phase {
  public readonly phaseName = "ForgeGrowthPhase";
  constructor(
    private readonly index: number,
    private readonly previousLevel: number,
  ) {
    super();
  }
  async start() {
    await forgeGrowth(globalScene.getPlayerParty()[this.index], this.previousLevel);
    this.end();
  }
}
