import { cutLine } from '../../core/cut';
import { multipliersFor } from '../../core/difficulty';
import type { Hit } from '../../core/hit';
import { SanctuaryTriggers, sanctuaryCutDamage, sanctuaryTargets, type SanctuaryTarget } from '../../core/sanctuary';
import { SANCTUARY } from '../../data/domains';
import { TECH_GEOMETRY } from '../../data/techniques';
import { DIFFICULTY } from '../../data/tuning';
import type { Boss } from '../../game/Boss';
import type { Enemy } from '../../game/Enemy';
import { techMarks } from '../../game/tech/shared';
import { CutFx } from '../../game/techFx/CutFx';
import type { TestScene } from '../TestScene';
import type { DomainDirector } from './domainDirector';

/** Alvo de um poder do Domínio: o comum ou o chefe vivo, com o centro do corpo. */
interface PowerTarget extends SanctuaryTarget {
  body: Enemy | Boss;
}

/**
 * O que cada Domínio faz enquanto está ativo (campo `powers` do `DomainDirector`). Santuário Malevolente (SAN-02 a
 * SAN-04): cada golpe do moveset que acerta e cada conjuração que acerta soltam um gatilho, até 4 por segundo de jogo;
 * cada gatilho corta os alvos mais perto. Os ganchos só anotam o gatilho (vêm de dentro do passo do Matter); o dano sai
 * no `update`, um gatilho por quadro.
 */
export class DomainPowers {
  readonly triggers = new SanctuaryTriggers();
  /** Gatilhos aceitos cujos cortes ainda não saíram. */
  private pendingCuts = 0;
  /** Conta os cortes para alternar o ângulo da linha entre os do Desmantelar. */
  private cutSeq = 0;

  constructor(
    private readonly s: TestScene,
    private readonly d: DomainDirector,
  ) {}

  private sanctuaryActive(): boolean {
    return this.d.state.active?.id === 'santuario';
  }

  /** Domínio ligado: a janela de gatilhos começa vazia. */
  onActivate(): void {
    this.triggers.reset();
    this.pendingCuts = 0;
  }

  /** Golpe do moveset que acertou (uma vez por golpe, SAN-02). */
  onStrike(): void {
    this.trigger();
  }

  /** Conjuração que acertou (uma vez por conjuração, sem chip, SAN-02). */
  onCastTrigger(): void {
    this.trigger();
  }

  /** SAN-02: com o Santuário ativo, solta um gatilho se a janela de 1000 ms tem vaga; o acerto que o soltou não muda. */
  private trigger(): void {
    if (this.sanctuaryActive() && this.triggers.tryRelease(this.s.clockMs)) this.pendingCuts++;
  }

  /** Um quadro de jogo com o Domínio: solta um gatilho pendente do Santuário. */
  update(_dtMs: number): void {
    if (this.pendingCuts === 0) return;
    this.pendingCuts--;
    if (this.sanctuaryActive()) this.cutNow();
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

  /** Fim do Domínio: os gatilhos que não saíram se perdem. */
  onEnd(): void {
    this.pendingCuts = 0;
  }

  reset(): void {
    this.triggers.reset();
    this.pendingCuts = 0;
    this.cutSeq = 0;
  }

  /** Gatilhos do Santuário soltos no último segundo de jogo (DDB-01). */
  snapshot(): { triggersLastSecond: number } {
    return { triggersLastSecond: this.triggers.countAt(this.s.clockMs) };
  }
}
