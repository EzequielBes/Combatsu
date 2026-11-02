import { cutLine } from '../../core/cut';
import { multipliersFor } from '../../core/difficulty';
import type { Hit } from '../../core/hit';
import type { JackpotEffect } from '../../core/domainEffects';
import { JackpotState, guaranteed, shownChance } from '../../core/jackpot';
import { impactTier } from '../../core/impactTier';
import {
  SanctuaryTriggers,
  sanctuaryCutDamage,
  sanctuaryTargets,
  worldCutHits,
  type SanctuaryTarget,
} from '../../core/sanctuary';
import { DOMAIN_HIT, SANCTUARY } from '../../data/domains';
import { TECH_GEOMETRY } from '../../data/techniques';
import { DIFFICULTY } from '../../data/tuning';
import type { Boss } from '../../game/Boss';
import type { Enemy } from '../../game/Enemy';
import { techMarks } from '../../game/tech/shared';
import { CutFx } from '../../game/techFx/CutFx';
import type { DomainFxView } from '../../game/DomainFx';
import type { JackpotSnapshot } from '../../game/domainSnapshot';
import type { TestScene } from '../TestScene';
import type { DomainDirector } from './domainDirector';
import { lookOf } from './impactFx';

/** Alvo de um poder do Domínio: o comum ou o chefe vivo, com o centro do corpo. */
interface PowerTarget extends SanctuaryTarget {
  body: Enemy | Boss;
}

/**
 * O que cada Domínio faz enquanto está ativo (campo `powers` do `DomainDirector`). Santuário Malevolente (SAN-02 a
 * SAN-04): cada golpe do moveset que acerta e cada conjuração que acerta soltam um gatilho, até 4 por segundo de jogo;
 * cada gatilho corta os alvos mais perto. Os ganchos só anotam o gatilho (vêm de dentro do passo do Matter); o dano sai
 * no `update`, um gatilho por quadro. Jackpot (JAC-01 a JAC-05): o relógio do `ActiveDomain` é o giro e, depois da
 * parada, o efeito; o Riichi conta os golpes do giro.
 */
export class DomainPowers {
  readonly triggers = new SanctuaryTriggers();
  /** Tambores, piedade e efeito do Jackpot; as falhas seguidas valem pela run inteira. */
  readonly jackpot = new JackpotState();
  /** Gatilhos aceitos cujos cortes ainda não saíram. */
  private pendingCuts = 0;
  /** Conta os cortes para alternar o ângulo da linha entre os do Desmantelar. */
  private cutSeq = 0;

  constructor(
    private readonly s: TestScene,
    private readonly d: DomainDirector,
  ) {}

  /** Efeito do Jackpot em curso; `null` no giro e fora do Jackpot. */
  get jackpotEffect(): JackpotEffect {
    if (this.d.state.active?.id !== 'jackpot') return null;
    const { phase } = this.jackpot;
    return phase === 'jackpot' || phase === 'miss' ? phase : null;
  }

  private spinning(): boolean {
    return this.d.state.active?.id === 'jackpot' && this.jackpot.phase === 'spin';
  }

  private sanctuaryActive(): boolean {
    return this.d.state.active?.id === 'santuario';
  }

  /** Domínio ligado: a janela de gatilhos começa vazia; o Jackpot começa a girar (JAC-01). */
  onActivate(): void {
    this.triggers.reset();
    this.pendingCuts = 0;
    if (this.d.state.active?.id === 'jackpot') this.jackpot.startSpin();
  }

  /** Golpe do moveset que acertou (uma vez por golpe): gatilho do Santuário (SAN-02) e Riichi no giro (JAC-02). */
  onStrike(): void {
    this.trigger();
    if (this.spinning()) this.jackpot.onStrike();
  }

  /** Conjuração que acertou (uma vez por conjuração, sem chip, SAN-02). */
  onCastTrigger(): void {
    this.trigger();
  }

  /** SAN-02: com o Santuário ativo, solta um gatilho se a janela de 1000 ms tem vaga; o acerto que o soltou não muda. */
  private trigger(): void {
    if (this.sanctuaryActive() && this.triggers.tryRelease(this.s.clockMs)) this.pendingCuts++;
  }

  /** Um quadro de jogo com o Domínio: solta um gatilho pendente do Santuário e anda o efeito do Jackpot. */
  update(dtMs: number): void {
    this.jackpotTick(dtMs);
    if (this.pendingCuts === 0) return;
    this.pendingCuts--;
    if (this.sanctuaryActive()) this.cutNow();
  }

  /**
   * Fim do relógio do Domínio ativo: no Jackpot em giro é a parada dos tambores (JAC-03), e o Domínio segue com o
   * efeito; devolve `true` nesse caso e `false` quando o Domínio acaba. A parada sorteia no `domainRng` (a piedade não
   * sorteia), empurra `jackpot:hit` ou `jackpot:miss`, no jackpot zera as recargas que corriam (JAC-04), troca o relógio
   * pelo do efeito e refaz a folha.
   */
  onPhaseEnd(): boolean {
    const active = this.d.state.active;
    if (!active || !this.spinning()) return false;
    const rng = this.s.run.domainRng!;
    const result = this.jackpot.stop(active.level, () => rng.next());
    this.s.snapshot.debugEvents.push(result === 'jackpot' ? 'jackpot:hit' : 'jackpot:miss');
    if (result === 'jackpot') {
      this.s.loadout.clearCooldown(0);
      this.s.loadout.clearCooldown(1);
    }
    active.restart(this.jackpot.effectMs);
    this.s.stats.sync();
    return true;
  }

  /**
   * Efeito do Jackpot (JAC-04, JAC-05): no jackpot a energia fica no máximo em todo quadro; a cura é 1 HP por tique
   * (a cada 200 ms no jackpot, 400 ms na falha), recortada no máximo pelo `heal`.
   */
  private jackpotTick(dtMs: number): void {
    const effect = this.jackpotEffect;
    if (!effect) return;
    if (this.d.statMods().energyLock) this.s.energy.gain(this.s.energy.max);
    for (let n = this.jackpot.tickEffect(dtMs); n > 0; n--) this.s.player.heal(1);
  }

  /**
   * SAN-03, SAN-04: um corte `micro` em cada um dos alvos mais perto (4 no Nv 1, 6 no Nv 2 e 3), com o dano da rodada,
   * pelo `effects.onTechConnect` (sem maestria, então o corte nunca volta como gatilho), com a linha do `CutFx`
   * cruzando o alvo, o alvo partido e o evento `domainCut:<id>`.
   */
  private cutNow(): void {
    const active = this.d.state.active!;
    const pr = this.s.player.hurtRect();
    const max = SANCTUARY.targets[active.level - 1];
    const damage = sanctuaryCutDamage(multipliersFor(this.s.run.round, DIFFICULTY).hp);
    const fx = new CutFx(this.s, this.s.realtimeFx, this.s.fxRegistry);
    const geometry = TECH_GEOMETRY.corte;
    const { midPx } = cutLine(geometry);
    for (const t of sanctuaryTargets({ x: pr.x, y: pr.y }, this.targets(), max)) {
      const hit: Hit = {
        ownerId: this.s.player.id,
        damage,
        strength: 'light',
        force: 0,
        direction: { x: 0, y: -1 },
        band: 'micro',
        ...techMarks('light', 'corte'),
      };
      if (!t.body.receiveHit(hit)) continue;
      const point = { x: t.center.x, y: t.center.y };
      this.s.effects.onTechConnect(hit, point, t.body, 'golpe');
      const angle = geometry.anglesDeg[this.cutSeq++ % geometry.anglesDeg.length];
      // O `cut` centra a linha em `x + facing × midPx`: virado para a direita, a linha cruza o alvo.
      fx.cut(point.x - midPx, point.y, 1, angle, geometry);
      fx.split(point.x, point.y);
      this.s.snapshot.debugEvents.push(`domainCut:${t.body.id}`);
    }
  }

  /** Comuns vivos e o chefe vivo, com o centro do `hurtRect` e o HP. */
  private targets(): PowerTarget[] {
    const live: (Enemy | Boss)[] = this.s.enemies.filter((e) => !e.removed && !e.isDead());
    const boss = this.s.boss;
    if (boss && !boss.isDead()) live.push(boss);
    return live.map((body) => {
      const r = body.hurtRect();
      return { id: body.id, center: { x: r.x, y: r.y }, hp: body.hp, maxHp: body.maxHp, isBoss: body === boss, body };
    });
  }

  /**
   * Fim do Domínio (chamado antes de o ativo sair): os gatilhos que não saíram se perdem. Só o Santuário Nv 3 que acaba
   * pelo tempo roda o Corte do Mundo (SAN-05, DOM-10.10).
   */
  onEnd(byTimer: boolean): void {
    this.pendingCuts = 0;
    const active = this.d.state.active;
    if (byTimer && active?.id === 'santuario' && active.level === 3) this.worldCut();
    // Morte no giro: para sem resultado e sem mexer nas falhas; no efeito, o efeito acaba (JAC-05.9).
    if (this.jackpot.phase === 'spin') this.jackpot.abort();
    else this.jackpot.endEffect();
  }

  /**
   * Corte do Mundo (SAN-05): um acerto decisivo por alvo de `worldCutHits` (o comum com 35% do HP ou menos leva o que
   * resta, o chefe `round(0,08 × maxHp)`), com o empurrão do `DOMAIN_HIT`, o número e o impacto decisivo; evento
   * `worldCut` uma vez.
   */
  private worldCut(): void {
    const pr = this.s.player.hurtRect();
    const center = { x: pr.x, y: pr.y };
    this.s.snapshot.debugEvents.push('worldCut');
    for (const { target, damage } of worldCutHits(center, this.targets())) {
      const hit: Hit = {
        ownerId: this.s.player.id,
        damage,
        strength: 'heavy',
        force: DOMAIN_HIT.force,
        direction: { x: target.center.x >= center.x ? 1 : -1, y: DOMAIN_HIT.liftY },
        unblockable: true,
        tech: true,
        counter: true,
      };
      if (!target.body.receiveHit(hit)) continue;
      const point = { x: target.center.x, y: target.center.y };
      this.s.ui.damageNumbers.show(target.body, target.body.lastDamageTaken ?? damage, 'strike', point);
      const tier = impactTier(hit, { brokePosture: false, forced: 'decisive' });
      this.s.cursedFx.impact(tier, point, hit.direction, Math.floor(this.s.clockMs), lookOf(this.s.stats.power));
    }
  }

  /** Run nova: as falhas seguidas e os jackpots ganhos voltam a 0 (JAC-03.5). */
  reset(): void {
    this.triggers.reset();
    this.pendingCuts = 0;
    this.cutSeq = 0;
    this.jackpot.reset();
  }

  /** O que o `DomainFx` mostra agora: a vinheta enquanto o Santuário está ativo (SAN-06). */
  fxView(): DomainFxView {
    return { vignette: this.sanctuaryActive() };
  }

  /** Gatilhos do Santuário soltos no último segundo de jogo e o Jackpot (DDB-01). */
  snapshot(): { triggersLastSecond: number; jackpot: JackpotSnapshot | null } {
    return { triggersLastSecond: this.triggers.countAt(this.s.clockMs), jackpot: this.jackpotSnapshot() };
  }

  /**
   * O Jackpot no snapshot, `null` quando o Domínio possuído não é ele: `chance` é a do giro (ou a que valeria agora),
   * 1 com a piedade armada (JAC-06.11).
   */
  private jackpotSnapshot(): JackpotSnapshot | null {
    const owned = this.d.state.owned;
    if (owned?.id !== 'jackpot') return null;
    const j = this.jackpot;
    const level = this.d.state.active?.level ?? owned.level;
    return {
      spinning: this.spinning(),
      chance: shownChance(j, level),
      guaranteed: guaranteed(j),
      misses: j.misses,
      jackpotsWon: j.jackpotsWon,
      effect: this.jackpotEffect,
      effectMs: this.jackpotEffect ? j.effectMs : 0,
    };
  }
}
