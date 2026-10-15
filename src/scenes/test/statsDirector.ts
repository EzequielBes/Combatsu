import { acceptsPlayerInput } from '../../core/run';
import { statSheet, traitsOf, type StatSheet, type StrikeMods } from '../../core/statSheet';
import type { MoveDef } from '../../data/moves';
import type { GameSnapshot } from '../../game/debugApi';
import type { InputSnapshot } from '../../game/input';
import type { Player } from '../../game/Player';
import type { TestScene } from '../TestScene';
import { NEUTRAL_INPUT } from './params';

/**
 * Dono dos números do combate (POW-01): monta a folha de atributos a partir de passivas, arsenal e votos e é o único
 * que grava os multiplicadores do `Loadout`, o dano sofrido e a vida máxima do player. Também filtra o input do quadro.
 */
export class StatsDirector {
  constructor(readonly s: TestScene) {}

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
  update(_deltaMs: number): void {
    this.sync();
  }

  /** Run nova: chamado depois de build, arsenal e votos já zerados, para a folha sair da run nova. */
  reset(): void {
    this.sync();
  }

  /** Liga o gancho do golpe do player (recriado a cada `create`). */
  bindPlayer(p: Player): void {
    p.damageMul = (move) => this.strikeMods(move).damage;
  }

  /**
   * Multiplicadores do golpe corpo a corpo que abre a hitbox (BLD-06, ARS-05, VOW-10..12). Gasta o Passo sombrio
   * armado; `peek` (snapshot de debug) lê sem gastar. A força fica em 1 até o passo da força contínua.
   */
  strikeMods(move: MoveDef, peek = false): StrikeMods {
    const shadow = this.s.build.consumeShadow(peek);
    return { damage: this.sheet().meleeMul(traitsOf(move, shadow)), force: 1 };
  }

  /** Input do quadro: neutro fora de `roundActive`/`intermission`/`traverse` (RUN-08) e durante a transição de área (TRV-10). */
  inputFor(raw: InputSnapshot): InputSnapshot {
    if (!acceptsPlayerInput(this.s.run.state) || this.s.area.transitioning) return NEUTRAL_INPUT;
    // VOW-11: com Sem guarda a guarda e o parry nunca sobem (e a guarda segurada cai no quadro seguinte).
    return this.sheet().guardOff ? { ...raw, guardHeld: false, guardPressed: false } : raw;
  }

  /** Campos do snapshot de debug que nascem aqui; cada passo da feature acrescenta o seu. */
  snapshotFields(): Pick<GameSnapshot, 'damageNumbers'> {
    return { damageNumbers: this.s.ui.damageNumbers.snapshot() };
  }
}
