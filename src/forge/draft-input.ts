// SPDX-License-Identifier: AGPL-3.0-only
export const DRAFT_INPUT_DELAY = 350;

/** Wall-clock guard: game speed must not shorten the time to read a reward. */
export class DraftInputGate {
  private readyAt = 0;
  private held = new Set<number>();
  private pointerHeld = false;

  open(now: number, held: number[] = [], pointerHeld = false): void {
    this.readyAt = now + DRAFT_INPUT_DELAY;
    this.held = new Set(held);
    this.pointerHeld = pointerHeld;
  }

  release(button: number): void {
    this.held.delete(button);
  }

  releasePointer(): void {
    this.pointerHeld = false;
  }

  isReady(now: number): boolean {
    return now >= this.readyAt;
  }

  confirm(now: number): boolean {
    return this.isReady(now) && this.held.size === 0 && !this.pointerHeld;
  }
}
