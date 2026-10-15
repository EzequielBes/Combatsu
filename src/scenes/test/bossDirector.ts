import {
  announceText,
  bossBarLabel,
  BossLineups,
  glyphKeys,
  parseBossAffixes,
  parseBossArch,
  parseFinger,
  type BossLineup,
  type LineupOverrides,
} from '../../core/bossAffix';
import { bossSpecFor, type BossSpec } from '../../core/bossTier';
import { isBossRound } from '../../core/waves';
import type { Boss } from '../../game/Boss';
import { BossAffixFx } from '../../game/boss/BossAffixFx';
import { BossReadout } from '../../game/boss/BossReadout';
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
  /** Glifos e aviso da loja, criados no primeiro uso (a `uiLayer` nasce depois do `RunDirector`). */
  private readout: BossReadout | null = null;
  /** Vista dos ataques novos e dos afixos do chefe em cena (um por chefe, AFX-01). */
  private fx: BossAffixFx | null = null;

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

  /** Chefe recém-criado: os eventos de vista dele (rastro, aviso, abertura e fechamento) vão para um `BossAffixFx`. */
  attach(boss: Boss): void {
    this.fx = new BossAffixFx();
    boss.fxSink = this.fx.route;
  }

  /** Eventos de vista recebidos do chefe atual por tipo (snapshot de debug); vazio sem chefe ligado. */
  fxCounts(): ReturnType<BossAffixFx['debug']> {
    return this.fx?.debug() ?? {};
  }

  /** Barra do chefe com o rótulo da escalação (BRD-01) e um glifo por afixo à direita dela (BRD-02). */
  showBar(spec: BossSpec): void {
    this.s.hud.showBossBar(bossBarLabel(spec));
    this.ui().showGlyphs(glyphKeys(spec));
  }

  /** Esconde a barra e os glifos juntos (chefe derrotado ou run nova). */
  hideBar(): void {
    this.s.hud.hideBossBar();
    this.readout?.hideGlyphs();
  }

  /** Chaves da `PALETTE` dos glifos visíveis ao lado da barra, na ordem (snapshot de debug). */
  glyphs(): string[] {
    return this.readout?.visibleGlyphs() ?? [];
  }

  /**
   * Loja aberta ao fim da rodada `round` (BRD-04/05/06): se a próxima é de chefe, avisa "Próximo: ..." com a
   * escalação dela. Pedir aqui primeiro guarda o sorteio no `BossLineups`, então a rodada seguinte nasce com o
   * mesmo chefe anunciado; fora disso, nenhum aviso.
   */
  onShopOpen(round: number): void {
    if (isBossRound(round + 1)) this.ui().showAnnounce(announceText(this.lineupFor(round + 1)));
    else this.hideAnnounce();
  }

  /** Esconde o aviso da loja (rodada nova ou run nova). */
  hideAnnounce(): void {
    this.readout?.hideAnnounce();
  }

  /** Texto do aviso da loja enquanto visível, ou `null` (snapshot de debug, BRD-08). */
  announce(): string | null {
    return this.readout?.announced() ?? null;
  }

  /** Run nova: esquece as escalações (o cache também zeraria sozinho com o stream novo) e a última pedida. */
  reset(): void {
    this.lineups = new BossLineups();
    this.last = null;
    this.fx = null;
  }

  private ui(): BossReadout {
    this.readout ??= new BossReadout(this.s, this.s.uiLayer);
    return this.readout;
  }

  /** Última escalação pedida (BLN-11), ou `null` antes do primeiro chefe da run. */
  snapshot(): GameSnapshot['bossLineup'] {
    if (!this.last) return null;
    const { round, lineup } = this.last;
    return { round, archetype: lineup.archetype, affixes: [...lineup.affixes], finger: lineup.finger };
  }
}
