import { DomainState, domainBarView, type DomainBarView } from '../../core/domain';
import {
  ActiveDomain,
  activationDenial,
  activationTargets,
  type ActivationTarget,
  type DomainEnd,
} from '../../core/domainActivation';
import { domainStatMods, type DomainStatMods } from '../../core/domainEffects';
import { impactTier } from '../../core/impactTier';
import { parseChargeParam, parseDomainParam, parseMissesParam } from '../../core/domainParam';
import type { Hit, HitBand } from '../../core/hit';
import { drawVeil } from '../../core/veilChest';
import { DOMAIN_CHARGE, DOMAIN_HIT, DOMAINS, type DomainId } from '../../data/domains';
import { FINISHER_MOVE } from '../../data/moves';
import { RUN } from '../../data/tuning';
import type { Boss } from '../../game/Boss';
import type { Enemy } from '../../game/Enemy';
import type { ChoicePage } from '../../game/axisSnapshot';
import type { ChoiceItem } from '../../game/ChoicePanel';
import type { DomainSnapshot } from '../../game/domainSnapshot';
import type { DefenseKind } from '../../game/player/types';
import { acceptsPlayerInput } from '../../core/run';
import { FINISHER_HITSTOP_MS } from './combat';
import { lookOf } from './impactFx';
import type { TestScene } from '../TestScene';
import { debugParam } from './params';
import { DomainPowers } from './domainPowers';

/** Alvo do acerto da ativação: o comum ou o chefe vivo, com o centro do corpo. */
interface DomainTarget extends ActivationTarget {
  body: Enemy | Boss;
}

/** Rodada cujo fim marca o Baú do Véu para quem não tem Domínio (VEU-01). */
const VEIL_ROUND = 3;

/**
 * Liga o `DomainState` (a barra e a posse da Expansão de Domínio, DOM-01 a DOM-05) ao debug e ao snapshot. Campo
 * `domain` do `BuildDirector`; o estado zera no `reset` da run nova.
 */
export class DomainDirector {
  readonly state = new DomainState();
  /** O que o Domínio ativo faz: os cortes do Santuário (SAN-02 a SAN-04). */
  readonly powers: DomainPowers;
  /** Último golpe do moveset que carregou: vários alvos do mesmo golpe carregam uma vez (DOM-02.3). */
  private lastSwingId: number | null = null;
  /** Relógio de jogo do último acerto de objeto que carregou: um por quadro. */
  private lastPropAtMs: number | null = null;
  /** Banda do último acerto de técnica que chegou pelo `onTechHit` (o `onCastHit` vem logo depois dele). */
  private lastTechBand: HitBand | undefined;
  /** Conjurações que já carregaram (uma vez por `castId`, DOM-02). */
  private readonly chargedCasts = new Set<number>();
  /** Id do `ImpactFrame` de cada ativação, negativo para não colidir com o `swingId` dos golpes (IMP-14). */
  private activationSeq = 0;

  constructor(readonly s: TestScene) {
    this.powers = new DomainPowers(s, this);
  }

  private event(name: string): void {
    this.s.snapshot.debugEvents.push(name);
  }

  /**
   * Um quadro de jogo (fora do hitstop e da loja), antes das técnicas: a tecla `P`/`N`, o relógio do Domínio e o
   * esvaziamento. Fora de `roundActive`/`intermission`/`traverse` e no laboratório nada anda (o input já chega neutro
   * nesses estados e na transição de área, `StatsDirector.inputFor`).
   */
  update(dtMs: number, pressed: boolean): void {
    if (this.s.fxLab) return;
    // DOM-10: morrer com o Domínio ativo encerra na hora; vem antes do portão, porque o `gameOver` não passa dele.
    if (this.s.player.dead) this.end('death');
    if (!acceptsPlayerInput(this.s.run.state)) return;
    if (pressed) this.tryActivate();
    // DOM-10: o tempo do Domínio cai com o tempo de jogo; no hitstop a cena não chama este `update`. No fim do relógio, a
    // parada dos tambores do Jackpot troca o relógio pelo do efeito em vez de acabar (JAC-03).
    if (this.state.active?.update(dtMs) && !this.powers.onPhaseEnd()) this.end('timer');
    this.state.tick(dtMs, this.s.run.state === 'roundActive');
    this.powers.update(dtMs);
  }

  /**
   * A tecla (DOM-06, DOM-07): a recusa empurra um `domainDenied:<motivo>` e não mexe na carga; aceita, termina o golpe
   * em curso, zera a carga, liga o Domínio no nível possuído e empurra `domain:<id>`.
   */
  private tryActivate(): void {
    const denial = activationDenial(this.state, this.busy());
    if (denial) {
      this.event(`domainDenied:${denial}`);
      return;
    }
    const owned = this.state.owned!;
    if (this.s.player.moveName !== null) this.s.player.cancelMelee();
    this.state.setCharge(0);
    this.state.active = new ActiveDomain(owned.id, owned.level);
    this.event(`domain:${owned.id}`);
    this.powers.onActivate();
    this.strikeActivation(owned.id);
    this.s.stats.sync();
  }

  /**
   * O acerto decisivo da ativação (DOM-08, DOM-09): um `Hit` por comum vivo e pelo chefe vivo no raio, com a fração do
   * HP máximo e sem multiplicador; depois, uma vez por ativação (com ou sem alvo), o `ImpactFrame`, as linhas de foco, o
   * banner com o nome do Domínio e o hitstop do finalizador. Não passa pelo `impactFx.reactCamera`.
   */
  private strikeActivation(id: DomainId): void {
    const { player } = this.s;
    const def = DOMAINS[id];
    const pr = player.hurtRect();
    const center = { x: pr.x, y: pr.y };
    for (const { target, damage } of activationTargets(center, this.targets(), def)) {
      const at = target.body.hurtRect();
      const hit: Hit = {
        ownerId: player.id,
        damage,
        strength: 'heavy',
        force: def.activation.force,
        direction: { x: at.x >= center.x ? 1 : -1, y: DOMAIN_HIT.liftY },
        unblockable: true,
        tech: true,
        counter: true,
        knockdown: id === 'amplificacao',
      };
      if (!target.body.receiveHit(hit)) continue;
      const point = { x: at.x, y: at.y };
      this.s.ui.damageNumbers.show(target.body, target.body.lastDamageTaken ?? damage, 'strike', point);
      const tier = impactTier(hit, { brokePosture: false, forced: 'decisive' });
      this.s.cursedFx.impact(tier, point, hit.direction, Math.floor(this.s.clockMs), lookOf(this.s.stats.power));
    }
    this.s.impactFrame.trigger(-++this.activationSeq);
    this.s.focusLines.show(this.s.camera.worldToScreen(center));
    this.s.hud.banner(def.name, RUN.bannerMs);
    this.s.effects.hitstop.trigger(FINISHER_HITSTOP_MS);
    this.s.effects.freeze();
  }

  /** Comuns vivos e o chefe vivo, com o centro do `hurtRect` (DOM-08). */
  private targets(): DomainTarget[] {
    const live: (Enemy | Boss)[] = this.s.enemies.filter((e) => !e.removed && !e.isDead());
    const boss = this.s.boss;
    if (boss && boss.hp > 0) live.push(boss);
    return live.map((body) => {
      const r = body.hurtRect();
      return { id: body.id, center: { x: r.x, y: r.y }, maxHp: body.maxHp, isBoss: body === boss, body };
    });
  }

  /** Ocupado para a tecla: o mesmo de conjurar, mais conjuração ativa, Reversa canalizando e player morto (DOM-07). */
  private busy(): boolean {
    const { player } = this.s;
    return player.isBusyForCast() || this.s.techCaster.cast !== null || this.s.recovery.reverse.active || player.dead;
  }

  /** Fim do Domínio ativo: `domainEnd:<id>`. Só o fim pelo tempo roda o efeito de fim (DOM-10.10). */
  end(reason: DomainEnd): void {
    const active = this.state.active;
    if (!active) return;
    this.event(`domainEnd:${active.id}`);
    this.powers.onEnd(reason === 'timer');
    this.state.active = null;
    this.s.stats.sync();
  }

  /**
   * Rodada limpa (VEU-01, VEU-04): no fim da r3, sem Domínio, sorteia o par do Baú do Véu pelo `chestRng` e o deixa
   * pendente até a próxima konbini. O Domínio ativo segue (DOM-10).
   */
  onRoundCleared(round: number): void {
    const rng = this.s.run.chestRng;
    if (round !== VEIL_ROUND || this.state.owned !== null || !rng) return;
    this.state.markVeil(drawVeil(rng));
  }

  /**
   * Páginas do Domínio no painel de escolha da konbini (VEU-02): o Baú do Véu pendente, com o nome e a linha de efeito
   * de cada um dos dois Domínios sorteados.
   */
  choicePages(): ChoicePage[] {
    const pair = this.state.veilPending;
    if (!pair) return [];
    return [
      {
        item: 'veu',
        options: [DOMAINS[pair[0]].name, DOMAINS[pair[1]].name],
        lines: [DOMAINS[pair[0]].line, DOMAINS[pair[1]].line],
      },
    ];
  }

  /**
   * Confirmação de uma página do Domínio (VEU-03): o véu dá o Domínio escolhido no Nv 1 com a carga cheia, tira a
   * pendência e empurra `veil:<id>`. A página não tem recusa.
   */
  confirm(item: ChoiceItem, option: 0 | 1): void {
    if (item !== 'veu') return;
    const pair = this.state.takeVeil();
    if (!pair) return;
    const id = pair[option];
    this.state.own(id, 1, DOMAIN_CHARGE.veilStart);
    this.event(`veil:${id}`);
  }

  /** A konbini abriu (`shopOpen`, também com `noshop=1`): o Domínio ativo acaba sem efeito de fim (DOM-10). */
  onShopOpen(): void {
    this.end('shop');
  }

  /**
   * O `R` reinicia a cena e o diretor sobrevive a ela (os campos da cena não reiniciam): o Domínio ativo da cena velha
   * acaba sem efeito de fim (DOM-10).
   */
  onSceneCreate(): void {
    this.end('reset');
  }

  /** Run nova: nada do Domínio da run anterior sobrevive (DOM-05); o ativo acaba sem efeito de fim (DOM-10). */
  reset(): void {
    this.end('reset');
    this.state.reset();
    this.powers.reset();
    this.lastSwingId = null;
    this.lastPropAtMs = null;
    this.lastTechBand = undefined;
    this.chargedCasts.clear();
  }

  /**
   * Golpe corpo a corpo do player que acertou (DOM-02): o do moveset carrega pela força (`light` +1, `heavy` +2) uma
   * vez por `swingId`; o objeto na mão, arremessado ou a arma vinculada (sem `moveName`) carrega +2 uma vez por quadro.
   * O finalizador carrega pelo `onFinisher`, não aqui. Com o Santuário ativo, o golpe do moveset solta um gatilho, uma
   * vez por `swingId` (SAN-02).
   */
  onMeleeHit(hit: Hit): void {
    if (hit.moveName === FINISHER_MOVE) return;
    if (hit.moveName === undefined) {
      if (this.lastPropAtMs === this.s.clockMs) return;
      this.lastPropAtMs = this.s.clockMs;
      this.state.addCharge('prop');
      return;
    }
    if (hit.swingId !== undefined) {
      if (hit.swingId === this.lastSwingId) return;
      this.lastSwingId = hit.swingId;
    }
    this.state.addCharge(hit.strength === 'heavy' ? 'heavy' : 'light');
    this.powers.onStrike();
  }

  /** Parry, Deflexão e esquiva perfeita carregam +5 (DOM-02). */
  onDefense(kind: DefenseKind): void {
    if (kind === 'parry' || kind === 'deflect' || kind === 'perfectDodge') this.state.addCharge('defense');
  }

  /** Finalizador do comum ou do chefe: +5 (DOM-02.3). */
  onFinisher(): void {
    this.state.addCharge('finisher');
  }

  /** Acerto de técnica (antes do `onCastHit` do mesmo acerto): só guarda a banda. */
  onTechHit(hit: Hit): void {
    this.lastTechBand = hit.band;
  }

  /**
   * O alvo aceitou um acerto da conjuração `castId` (DOM-02.4): carrega +1 uma vez por conjuração, no primeiro acerto
   * que não é chip; com o Domínio ativo, esse acerto solta o gatilho do Santuário (SAN-02) em vez de carregar. Acertos
   * sem conjuração (a Onda do Punho, o corte do Santuário) nunca chegam aqui.
   */
  onCastHit(castId: number): void {
    if (this.lastTechBand === 'chip' || this.chargedCasts.has(castId)) return;
    this.chargedCasts.add(castId);
    if (this.state.active) this.powers.onCastTrigger();
    else this.state.addCharge('techCast');
  }

  /** Kokusen: +15 (DOM-02). */
  onKokusen(): void {
    this.state.addCharge('kokusen');
  }

  /** Abate de inimigo comum: +1 (DOM-02). */
  onKill(): void {
    this.state.addCharge('kill');
  }

  /**
   * `?debug&domain=<id>[:<nível>]`, `charge=<n>` e `jackpotMisses=<n>` (DDB-02), lidos depois do `stats.reset()`: o
   * Domínio do parâmetro no nível dele com a carga pedida e as falhas seguidas do Jackpot. Entrada inválida é ignorada;
   * `charge=` sem `domain=` não faz nada.
   */
  applyDebug(): void {
    const owned = parseDomainParam(debugParam('domain'));
    if (owned) this.state.own(owned.id, owned.level);
    const charge = parseChargeParam(debugParam('charge'));
    if (charge !== null) this.state.setCharge(charge);
    const misses = parseMissesParam(debugParam('jackpotMisses'));
    if (misses !== null) this.powers.jackpot.misses = misses;
  }

  /** A vista da barra do Domínio (DHD-01 a DHD-03). */
  barView(): DomainBarView {
    return domainBarView(this.state);
  }

  /** O que o Domínio ativo muda na folha (JAC-04, JAC-05); o `StatsDirector` lê a cada quadro. */
  statMods(): DomainStatMods {
    return domainStatMods(this.state.active, this.powers.jackpotEffect);
  }

  /** Campo `domain` do snapshot de debug (DDB-01). */
  snapshot(): DomainSnapshot {
    const { owned, charge, active, ready, veilPending } = this.state;
    return {
      owned: owned ? { ...owned } : null,
      charge,
      ready,
      active: active ? { id: active.id, level: active.level, remainingMs: active.remainingMs } : null,
      ...this.powers.snapshot(),
      veilPending: veilPending !== null,
    };
  }
}
