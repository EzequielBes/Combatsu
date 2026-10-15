import {
  BossLineups,
  parseBossAffixes,
  parseBossArch,
  parseFinger,
  type BossLineup,
  type LineupOverrides,
} from '../../core/bossAffix';
import { bossSpecFor, type BossSpec } from '../../core/bossTier';
import type { GameSnapshot } from '../../game/debugApi';
import { debugParam } from './params';
import type { TestScene } from '../TestScene';

/**
 * Dono da escalação do chefe na cena (BLN-01..03, BLN-08..11): pede ao `BossLineups` o chefe da rodada com o stream
 * `bossAffixRng` da run, aplica os overrides de debug e monta a especificação. Vive no `RunDirector` (o `TestScene`
 * está no teto de linhas); a área (fundo da arena) e o spawner (o chefe) pedem por aqui e veem o mesmo chefe.
 */
export class BossDirector {
  private lineups = new BossLineups();
  /** Última escalação pedida, para o snapshot (BLN-11). */
  private last: { round: number; lineup: BossLineup } | null = null;

  constructor(readonly s: TestScene) {}

  /** `?debug&bossArch=`, `bossAffix=` e `finger=` (BLN-09/10): valor inválido ou ausente vale o sorteio. */
  overrides(): LineupOverrides {
    return {
      archetype: parseBossArch(debugParam('bossArch')),
      affixes: parseBossAffixes(debugParam('bossAffix')),
      finger: parseFinger(debugParam('finger')),
    };
  }

  /** Escalação do chefe da rodada `round`, já com os overrides; pedir de novo a mesma rodada não consome o stream. */
  lineupFor(round: number): BossLineup {
    // O stream nasce no `startRun`, antes de qualquer `roundStart` ou `spawn` que pede o chefe.
    const lineup = this.lineups.lineupFor(this.s.run.bossAffixRng!, round, this.overrides());
    this.last = { round, lineup };
    return lineup;
  }

  /** Especificação do chefe da rodada `round` com a escalação dela (BLN-08, PDD-03..05). */
  specFor(round: number): BossSpec {
    return bossSpecFor(round, this.lineupFor(round));
  }

  /** Run nova: esquece as escalações (o cache também zeraria sozinho com o stream novo) e a última pedida. */
  reset(): void {
    this.lineups = new BossLineups();
    this.last = null;
  }

  /** Última escalação pedida (BLN-11), ou `null` antes do primeiro chefe da run. */
  snapshot(): GameSnapshot['bossLineup'] {
    if (!this.last) return null;
    const { round, lineup } = this.last;
    return { round, archetype: lineup.archetype, affixes: [...lineup.affixes], finger: lineup.finger };
  }
}
