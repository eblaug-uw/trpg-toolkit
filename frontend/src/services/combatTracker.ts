import type { Combatant } from "./combatant";

export interface InitiativeEntry<T extends Combatant> {
  entity: T;
  name: string;
  total: number;
  dex: number;
}

export function rollInitiative<T extends Combatant>(participants: T[]): InitiativeEntry<T>[] {
  return participants
    .map((p) => ({
      entity: p,
      name: p.name,
      total: Math.floor(Math.random() * 20) + 1 + Math.floor((p.dexterity - 10) / 2),
      dex: p.dexterity,
    }))
    .sort((a, b) => b.total - a.total || b.dex - a.dex);
}

export class CombatTracker<T extends Combatant> {
  queue: InitiativeEntry<T>[];
  round = 1;

  constructor(participants: T[]) {
    this.queue = rollInitiative(participants);
  }

  get activeEntity(): InitiativeEntry<T> {
    return this.queue[0];
  }

  nextTurn(): InitiativeEntry<T> {
    const finished = this.queue.shift();
    this.queue.push(finished);

    if (this.queue[0].total >= finished.total) {
      this.round++;
    }

    return this.activeEntity;
  }
}
