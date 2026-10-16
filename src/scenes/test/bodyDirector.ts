import { axisAt } from '../../core/axisRule';
import { bodyStrike, CadenceCounter, FuryCounter, marteloTargets, type BodyPoints } from '../../core/cursedBody';
import type { Hit, Vec2 } from '../../core/hit';
import type { StrikeMods } from '../../core/statSheet';
import type { MoveDef } from '../../data/moves';
import { TECH_RULE } from '../../data/techRule';
import { AWAKENING_NAMES, BODY_AWAKENINGS, BODY_AXES, BODY_BRANCHES } from '../../data/techAxes';
import type { Hittable } from '../../game/bodyTags';
import { Enemy } from '../../game/Enemy';
import { FuryAura, furyAuraCenter } from '../../game/FuryAura';
import type { TestScene } from '../TestScene';
import { boxOf, FistWaves } from './fistWaves';

/**
 * O Corpo Amaldiçoado no combate (CRP-03 a CRP-13): lê os pontos do `loadout.axes` e muda o golpe do player pelo
 * `StatsDirector.strikeMods`. Campo `body` do `BuildDirector`, zerado no `reset` da run nova.
 */
export class BodyDirector {
  /** CRP-07: acúmulos da Fúria (um por golpe do moveset que acerta). */
  readonly fury = new FuryCounter();
  /** CRP-08: golpes seguidos que acertam (o ramo Cadência lê). */
  readonly cadence = new CadenceCounter();
  /** Vida e vida máxima do player no último quadro de jogo, para achar a perda de HP; `null` antes do 1º quadro. */
  private lastHp: { hp: number; max: number } | null = null;
  /** CRP-07.11: aura laranja da Fúria, criada com o 1º acúmulo e largada quando eles zeram (ou no `R`). */
  private aura: FuryAura | null = null;
  /** O golpe em curso já acertou alguém (o fim do `active` sem acerto zera a Cadência, CRP-08.3). */
  private swingConnected = false;
  /** CRP-10: as ondas do punho (ramo Onda do Punho). */
  readonly waves: FistWaves;
  /** Último golpe que soltou onda: uma onda por golpe, mesmo com 2 alvos. */
  private waveSwing: number | null = null;

  constructor(readonly s: TestScene) {
    this.waves = new FistWaves(s);
  }

  /** Pontos do Corpo por eixo, lidos na hora (o `loadout.reset` da run nova os zera). */
  private get points(): BodyPoints {
    return this.s.loadout.axes.axesOf('corpo');
  }

  /**
   * CRP-03: o Peso multiplica a força do golpe; com Peso 2 ou mais o golpe forte leva `knockdown` e com Peso 3, a
   * parede que atordoa (`wallStun`). Também preenche o alcance e o ritmo que o `strikes.ts` lê (CRP-04, CRP-05, CRP-15).
   * As marcas só entram quando ligadas, para não apagar o `knockdown` próprio do golpe.
   */
  strikeMods(move: MoveDef, base: StrikeMods): StrikeMods {
    const b = bodyStrike(this.points, move);
    const marks = { ...base.marks };
    if (b.knockdown) marks.knockdown = true;
    if (b.wallStun) marks.wallStun = true;
    // CRP-07: a Fúria soma a fração dos acúmulos ao dano do golpe; CRP-08: o 4º da Cadência dá +50 %.
    let damage = base.damage * (1 + this.fury.bonus(this.points.furia));
    if (this.cadenceDecisive()) {
      damage *= BODY_BRANCHES.cadencia.damageMul;
      marks.decisive = true;
      // CRP-09: com o Martelo Negro o alvo do decisivo leva a fração da vida máxima (o chefe fica no teto de 1 %).
      if (this.awakened) marks.maxHpBonus = TECH_RULE.maxHpPct.enemy;
    }
    return { ...base, damage, force: base.force * b.forceMul, reachPx: b.reachPx, recoveryMul: b.recoveryMul, marks };
  }

  /** O próximo golpe que acertar fecha a Cadência (o 4º, o 8º...) e o ramo é a Cadência (CRP-08.2). */
  private cadenceDecisive(): boolean {
    return this.s.loadout.axes.branch('corpo') === 'cadencia' && this.cadence.nextIsDecisive();
  }

  /** O Despertar do ramo escolhido está ligado (Nv 5 com ramo, CRP-13). */
  private get awakened(): boolean {
    return this.s.loadout.axes.awakened('corpo');
  }

  /** CRP-06: energia a mais por golpe corpo a corpo que acerta (os pontos do Fluxo). */
  get flowBonus(): number {
    return axisAt(BODY_AXES.fluxo.energyBonus, this.points.fluxo);
  }

  /**
   * Golpe corpo a corpo do player que acertou (chamado pelo `BuildDirector.onMeleeHit`). CRP-07: o golpe do moveset
   * soma um acúmulo da Fúria e um da Cadência, uma vez por golpe (vários alvos do mesmo golpe contam um); o objeto na
   * mão não é golpe do moveset.
   */
  onMeleeHit(hit: Hit, point: Vec2, target?: Hittable): void {
    if (hit.moveName === undefined || hit.swingId === undefined) return;
    this.swingConnected = true;
    this.fury.onConnect(hit.swingId);
    this.cadence.onConnect(hit.swingId);
    // Observabilidade: o dano que o alvo levou de fato neste golpe do moveset (CRP-08.2 e CRP-09 leem daqui).
    if (target instanceof Enemy) {
      this.s.snapshot.debugEvents.push(`bodyHit:${hit.moveName}:${target.id}:${target.lastDamageTaken}`);
    }
    const branch = this.s.loadout.axes.branch('corpo');
    if (hit.decisive && this.awakened && branch === 'cadencia') {
      // CRP-13: o 1º decisivo da rodada com o Martelo Negro anuncia o Despertar.
      this.s.build.axes.announce('corpo', AWAKENING_NAMES.marteloNegro);
      this.hammer(point, target);
    }
    if (branch !== 'ondaDoPunho' || hit.strength !== 'heavy') return;
    if (this.waveSwing === hit.swingId) this.waves.skip(this.idOf(target));
    else {
      this.waveSwing = hit.swingId;
      this.throwWave(hit, point, target);
    }
  }

  /**
   * CRP-10: a onda sai do ponto do acerto com `round(0,4 × dano)` e anda 80 px, passando pelo alvo do golpe. CRP-11:
   * com o Punho que Rasga ela atravessa todos e anda 160 px, e com a Fúria no teto uma 2ª igual sai 100 ms depois;
   * CRP-13: a 1ª onda da rodada anuncia o Despertar.
   */
  private throwWave(hit: Hit, point: Vec2, target?: Hittable): void {
    const { damageFrac, rangePx } = BODY_BRANCHES.ondaDoPunho;
    const tear = BODY_AWAKENINGS.punhoQueRasga;
    const awake = this.awakened;
    const opts = awake ? { pierce: true, rangePx: tear.rangePx } : { pierce: false, rangePx };
    const damage = Math.round(damageFrac * hit.damage);
    const id = this.idOf(target);
    if (!this.waves.emit(point, damage, opts, id) || !awake) return;
    this.s.build.axes.announce('corpo', AWAKENING_NAMES.punhoQueRasga);
    if (this.fury.atCap(this.points.furia)) this.waves.emitLater(tear.secondWaveMs, point, damage, opts, id);
  }

  /** Id do alvo do golpe (comum ou chefe); -1 sem alvo com id. */
  private idOf(target?: Hittable): number {
    return target && 'id' in target ? Number(target.id) : -1;
  }

  /**
   * CRP-09 (Martelo Negro): os comuns a até 48 px do ponto do decisivo, menos o alvo dele, levam um acerto de 4 % da
   * vida máxima com `knockdown`, sem `tech`, pelo caminho dos acertos de técnica (somam em `golpe` no registro). Evento
   * `martelo:<id>:<dano levado>`.
   */
  private hammer(point: Vec2, target?: Hittable): void {
    const alive = this.s.enemies.filter((e) => !e.isDead());
    const boxes = alive.map((e) => ({ id: e.id, box: boxOf(e) }));
    const exceptId = target instanceof Enemy ? target.id : -1;
    for (const id of marteloTargets(point, boxes, exceptId)) {
      const e = alive.find((x) => x.id === id)!;
      const r = e.hurtRect();
      const hit: Hit = {
        ownerId: this.s.player.id,
        damage: Math.round(TECH_RULE.maxHpPct.enemy * e.maxHp),
        strength: 'heavy',
        force: 6,
        direction: { x: r.x >= point.x ? 1 : -1, y: -0.6 },
        knockdown: true,
      };
      if (!e.receiveHit(hit)) continue;
      this.s.effects.onTechConnect(hit, { x: r.x, y: r.y }, e, 'golpe');
      this.s.snapshot.debugEvents.push(`martelo:${id}:${e.lastDamageTaken}`);
    }
  }

  /**
   * A cada quadro de jogo (fora do hitstop e da loja, pelo `TechDirector`). CRP-07, CRP-08.3: a perda de HP zera a
   * Fúria e a Cadência. A vida que a vida máxima menor recorta (o voto Corpo de vidro tomado na loja) não é perda.
   */
  update(dtMs: number): void {
    const { hp, maxHp } = this.s.player;
    const last = this.lastHp;
    this.lastHp = { hp, max: maxHp };
    if (last !== null && hp < Math.min(last.hp, maxHp)) {
      this.fury.onHpLoss();
      this.cadence.onHpLoss();
    }
    this.updateAura();
    this.waves.update(dtMs);
  }

  /**
   * CRP-07.11: com pontos na Fúria e acúmulos a aura acende e cresce com eles; sem acúmulo ela some e sai do
   * `FxRegistry`. A aura do `R` anterior já foi destruída no `SHUTDOWN` e nasce de novo aqui.
   */
  private updateAura(): void {
    const stacks = this.points.furia > 0 ? this.fury.stacks : 0;
    if (stacks === 0) {
      this.dropAura();
      return;
    }
    if (!this.aura || this.aura.destroyed) this.aura = new FuryAura(this.s, this.s.fxRegistry);
    const p = this.s.player;
    this.aura.update(furyAuraCenter(p.renderPos, p.facing, p.move.vx), stacks);
  }

  private dropAura(): void {
    if (!this.aura) return;
    this.aura.update(this.s.player.renderPos, 0);
    this.s.fxRegistry.scheduleDestroy(this.aura, 0);
    this.aura = null;
  }

  /** CRP-05: px do Alcance, que alargam a caixa do golpe e o rastro dele. */
  get reachPx(): number {
    return axisAt(BODY_AXES.alcance.reachPx, this.points.alcance);
  }

  /**
   * Fase do golpe do player (chamada pelo `ImpactFx.onStrikePhase`). CRP-04: com Ritmo 3 a `recovery` deixa uma
   * pós-imagem do player, uma por golpe, e o evento `bodyEcho:<golpe>` só quando a cópia nasce de fato.
   */
  onStrikePhase(name: string, phase: 'startup' | 'active' | 'recovery' | 'end'): void {
    if (phase === 'startup') this.swingConnected = false;
    if (phase !== 'recovery') return;
    // CRP-08.3: o fim do `active` sem acerto zera a Cadência.
    this.cadence.onActiveEnd(0, this.swingConnected);
    if (this.points.ritmo < BODY_AXES.ritmo.afterimageAt) return;
    if (this.s.player.fx.afterimage(this.s.player.view, true)) this.s.snapshot.debugEvents.push(`bodyEcho:${name}`);
  }

  /** Run nova: os pontos já voltaram a 0 pelo `loadout.reset`; os contadores do combate zeram aqui. */
  reset(): void {
    this.fury.reset();
    this.cadence.reset();
    this.lastHp = null;
    this.waveSwing = null;
    this.waves.reset();
    this.dropAura();
  }

  /** Fúria, Cadência e o raio desenhado da aura (0 apagada) para o `build.corpo` do snapshot (CRP-14). */
  snapshot(): { fury: { stacks: number; bonus: number }; cadence: number; aura: number } {
    const fury = { stacks: this.fury.stacks, bonus: this.fury.bonus(this.points.furia) };
    return { fury, cadence: this.cadence.count, aura: this.aura?.view ?? 0 };
  }
}
