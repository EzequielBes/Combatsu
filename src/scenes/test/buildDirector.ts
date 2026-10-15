import { buildPoints, dominantBuild, Perks, type BuildPoints } from '../../core/build';
import { PERK, PERKS, type Build, type PerkId } from '../../data/perks';
import type { BuildSnapshot } from '../../game/axisSnapshot';
import type { DefenseKind } from '../../game/player/types';
import type { TestScene } from '../TestScene';
import { AxisDirector } from './axisDirector';
import { debugParam } from './params';

/** Passivas da run e a build deduzida das compras (BLD-01..08): liga cada passiva ao ponto do combate que ela muda. */
export class BuildDirector {
  readonly perks = new Perks();
  /** Pontos de eixo do Vermelho e do Corpo: compra, debug, painel de ramo e Despertar (VRM-02, CRP-01). */
  readonly axes: AxisDirector;
  /** Passo sombrio: armado pela esquiva perfeita, gasto no próximo golpe que abre a hitbox (acerte ou não). */
  private shadowArmed = false;

  constructor(readonly s: TestScene) {
    this.axes = new AxisDirector(s);
  }

  /** Run nova: nenhuma passiva sobrevive. `?debug&perks=a,b` começa a run com as passivas listadas. */
  reset(): void {
    this.perks.reset();
    this.shadowArmed = false;
    for (const id of (debugParam('perks') ?? '').split(',')) if (id in PERKS) this.perks.add(id as PerkId);
  }

  /** `?debug&axes=` e `ramo=` (VRM-10, VRM-18, CRP-14), depois do `tech=` que equipa o Vermelho. */
  applyDebugAxes(): void {
    this.axes.applyDebug();
  }

  get points(): BuildPoints {
    return buildPoints(this.s.modifiers, this.s.loadout, this.perks, this.s.arsenal.arsenal);
  }

  get build(): Build | null {
    return dominantBuild(this.points);
  }

  /**
   * BLD-06: o golpe que está abrindo a hitbox gasta o Passo sombrio armado; devolve se ele estava armado. `peek`
   * (snapshot de debug) lê sem gastar. O multiplicador sai da folha de atributos (`StatsDirector.strikeMods`).
   */
  consumeShadow(peek = false): boolean {
    const shadow = this.shadowArmed;
    if (!peek) this.shadowArmed = false;
    return shadow;
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

  /** Campo `build` do snapshot de debug, com o Vermelho e o Corpo (VRM-10, CRP-14). */
  snapshot(): BuildSnapshot {
    return {
      build: this.build,
      points: this.points,
      perks: this.perks.list,
      shadowArmed: this.shadowArmed,
      ...this.axes.snapshot(),
    };
  }
}
