import { buildPoints, dominantBuild, Perks, strikeMultiplier, type BuildPoints } from '../../core/build';
import type { MoveDef } from '../../data/moves';
import { PERK, PERKS, type Build, type PerkId } from '../../data/perks';
import type { DefenseKind } from '../../game/player/types';
import type { TestScene } from '../TestScene';
import { debugParam } from './params';

/** Passivas da run e a build deduzida das compras (BLD-01..08): liga cada passiva ao ponto do combate que ela muda. */
export class BuildDirector {
  readonly perks = new Perks();
  /** Passo sombrio: armado pela esquiva perfeita, gasto no próximo golpe que abre a hitbox (acerte ou não). */
  private shadowArmed = false;

  constructor(readonly s: TestScene) {}

  /** Run nova: nenhuma passiva sobrevive. `?debug&perks=a,b` começa a run com as passivas listadas. */
  reset(): void {
    this.perks.reset();
    this.shadowArmed = false;
    for (const id of (debugParam('perks') ?? '').split(',')) if (id in PERKS) this.perks.add(id as PerkId);
  }

  get points(): BuildPoints {
    return buildPoints(this.s.modifiers, this.s.loadout, this.perks);
  }

  get build(): Build | null {
    return dominantBuild(this.points);
  }

  /** BLD-06: multiplicador de dano do golpe que está abrindo a hitbox. */
  strikeMul(move: MoveDef): number {
    const shadow = this.shadowArmed;
    this.shadowArmed = false;
    return strikeMultiplier(this.perks, { heavy: move.strength === 'heavy', counter: !!move.counter, shadow });
  }

  onDefense(kind: DefenseKind): void {
    if ((kind === 'parry' || kind === 'deflect') && this.perks.has('refluxo')) this.s.energy.gain(PERK.parryEnergy);
    if (kind === 'perfectDodge' && this.perks.has('passoSombrio')) this.shadowArmed = true;
  }

  /** Golpe corpo a corpo do jogador que acertou (junto do ganho normal de energia, CE-06). */
  onMeleeHit(): void {
    if (this.perks.has('condutor')) this.s.energy.gain(PERK.meleeEnergy);
  }

  onFinisher(): void {
    if (this.perks.has('executor')) this.s.player.heal(PERK.finisherHeal);
  }

  /** Campo `build` do snapshot de debug. */
  snapshot(): { build: Build | null; points: BuildPoints; perks: PerkId[]; shadowArmed: boolean } {
    return { build: this.build, points: this.points, perks: this.perks.list, shadowArmed: this.shadowArmed };
  }
}
