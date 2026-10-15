import { parseModsParam } from '../../core/modsParam';
import { powerLook, powerPoints, type PowerLook } from '../../core/power';
import { acceptsPlayerInput } from '../../core/run';
import { PROP_TRAITS, statSheet, traitsOf, type StatSheet, type StrikeMods } from '../../core/statSheet';
import { MOVES, type MoveDef } from '../../data/moves';
import type { GameSnapshot } from '../../game/debugApi';
import type { InputSnapshot } from '../../game/input';
import type { PropDamage } from '../../game/Prop';
import type { Player } from '../../game/Player';
import type { TestScene } from '../TestScene';
import { debugParam, NEUTRAL_INPUT } from './params';
import { PowerAuraDirector } from './powerAuraDirector';

/**
 * Dono dos números do combate (POW-01): monta a folha de atributos a partir de passivas, arsenal e votos e é o único
 * que grava os multiplicadores do `Loadout`, o dano sofrido e a vida máxima do player. Também filtra o input do quadro.
 */
export class StatsDirector {
  /** Força do corpo de agora (POW-07, POW-08), recalculada a cada quadro. */
  power: PowerLook = powerLook(0);
  /** Brasas e chama na mão parada (POW-10), recriada com cada player. */
  readonly aura: PowerAuraDirector;
  /**
   * Dano do objeto na mão ou arremessado (POW-11): a `forca` da loja e a build do golpe forte. Lê `PROP_TRAITS`
   * (`shadow: false`) e não chama `consumeShadow`, então o Passo sombrio armado sobra para o próximo golpe.
   */
  readonly propDamage: PropDamage = {
    damage: (base) => Math.round(this.s.modifiers.meleeDamage(base) * this.sheet().meleeMul(PROP_TRAITS)),
  };

  constructor(readonly s: TestScene) {
    this.aura = new PowerAuraDirector(s);
  }

  /** A folha de agora, com os abates da rodada atual (Fúria) e a vida máxima comprada na loja. */
  sheet(): StatSheet {
    return statSheet({
      perks: this.s.build.perks,
      arsenal: this.s.arsenal.arsenal,
      vows: this.s.vows.effects,
      baseMaxHp: this.s.modifiers.maxHp,
    });
  }

  /**
   * Repassa a folha aos números que o combate lê (ARS-06, VOW-10, VOW-12, VOW-13, VOW-15..17). Grava o mesmo valor
   * quando nada mudou; a vida máxima só é tocada quando muda (o `setMax` recorta a vida no teto).
   */
  sync(): void {
    const sheet = this.sheet();
    const { loadout, player } = this.s;
    loadout.damageMul = sheet.relicTechMul;
    loadout.vowDamageMul = sheet.vowTechMul;
    loadout.costMul = sheet.costMul;
    player.damageTakenMul = sheet.damageTakenMul;
    if (player.maxHp !== sheet.maxHp) player.setMaxHp(sheet.maxHp);
  }

  /** A cada quadro, antes de tudo: a Fúria muda com os abates, então a folha é refeita todo quadro. */
  update(deltaMs: number): void {
    this.sync();
    this.power = powerLook(this.points());
    this.aura.update(deltaMs, this.power);
  }

  /**
   * Run nova: chamado depois de modificadores, build, arsenal e votos já zerados, para a folha sair da run nova.
   * POW-13.2: `?debug&mods=` sobe cada modificador da loja nível a nível pelo `apply`, e o laço para no primeiro
   * `false` (o teto): `forca:999999999999` não trava a página. `vida:N` sobe a vida máxima no `sync` sem curar.
   */
  reset(): void {
    for (const [id, levels] of parseModsParam(debugParam('mods'))) {
      for (let i = 0; i < levels && this.s.modifiers.apply(id); i++);
    }
    this.sync();
    this.power = powerLook(this.points());
  }

  /** POW-07.1: nível de Força, nível das Manoplas (só a relíquia equipada) e o Punho Pesado. */
  private points(): number {
    const relic = this.s.arsenal.arsenal.relic;
    return powerPoints({
      forca: this.s.modifiers.level('forca'),
      manoplas: relic?.id === 'manoplas' ? relic.level : 0,
      punhoPesado: this.s.build.perks.has('punhoPesado'),
    });
  }

  /** Liga o gancho do golpe do player (recriado a cada `create`) e recria a aura dele (edge case do `R`). */
  bindPlayer(p: Player): void {
    p.strikeMods = (move) => this.strikeMods(move);
    this.aura.bind(p);
  }

  /**
   * Multiplicadores do golpe corpo a corpo que abre a hitbox (BLD-06, ARS-05, VOW-10..12) e a força do empurrão
   * (POW-08.5). Gasta o Passo sombrio armado; `peek` (snapshot de debug) lê sem gastar.
   */
  strikeMods(move: MoveDef, peek = false): StrikeMods {
    const shadow = this.s.build.consumeShadow(peek);
    return { damage: this.sheet().meleeMul(traitsOf(move, shadow)), force: this.power.forceMul };
  }

  /** Input do quadro: neutro fora de `roundActive`/`intermission`/`traverse` (RUN-08) e durante a transição de área (TRV-10). */
  inputFor(raw: InputSnapshot): InputSnapshot {
    if (!acceptsPlayerInput(this.s.run.state) || this.s.area.transitioning) return NEUTRAL_INPUT;
    // VOW-11: com Sem guarda a guarda e o parry nunca sobem (e a guarda segurada cai no quadro seguinte).
    return this.sheet().guardOff ? { ...raw, guardHeld: false, guardPressed: false } : raw;
  }

  /** Campos do snapshot de debug que nascem aqui; cada passo da feature acrescenta o seu. */
  snapshotFields(): Pick<GameSnapshot, 'damageNumbers' | 'power' | 'stats'> {
    const { points, tier, impactScale, hitstopBonusMs, tone } = this.power;
    const power = {
      points,
      tier,
      impactScale,
      hitstopBonusMs: { ...hitstopBonusMs },
      tone: { ...tone },
      aura: this.aura.view,
    };
    const sheet = this.sheet();
    // POW-13: o forte sem Passo sombrio (o mesmo `traitsOf` do golpe) e as técnicas, relíquia × voto, como no `Loadout`.
    const stats = {
      meleeMul: sheet.meleeMul(traitsOf(MOVES.cotovelada, false)),
      techDamageMul: sheet.relicTechMul * sheet.vowTechMul,
      costMul: sheet.costMul,
    };
    return { damageNumbers: this.s.ui.damageNumbers.snapshot(), power, stats };
  }
}
