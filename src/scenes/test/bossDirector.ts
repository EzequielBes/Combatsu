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
  summonCount,
} from '../../core/bossAffix';
import { bossSpecFor, type BossSpec } from '../../core/bossTier';
import type { Hit, Vec2 } from '../../core/hit';
import { isBossRound } from '../../core/waves';
import type { Boss } from '../../game/Boss';
import type { Enemy } from '../../game/Enemy';
import { AdaptWheel } from '../../game/boss/AdaptWheel';
import { AffixOutline } from '../../game/boss/AffixOutline';
import { BeamAttack } from '../../game/boss/BeamAttack';
import { BossAffixFx } from '../../game/boss/BossAffixFx';
import { BossReadout } from '../../game/boss/BossReadout';
import { LavaField } from '../../game/boss/LavaField';
import { ThreadRain } from '../../game/boss/ThreadRain';
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
  /** Contorno de 1 px na cor do afixo do chefe em cena; `null` sem Ígneo nem Invocador (BRD-03). */
  private outline: AffixOutline | null = null;
  /** Roda do Adaptativo sobre a cabeça do chefe em cena; `null` sem o afixo (ADP-06). */
  private wheel: { view: AdaptWheel; boss: Boss } | null = null;
  /** Invocados vivos do chefe em cena (INV-01..05); a morte de cada um o tira daqui. */
  private summoned = new Set<Enemy>();
  /** Invocados criados na run, para a aparência por índice (não consome o `variantRng`, INV-05). */
  private summonIndex = 0;

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

  /**
   * Chefe recém-criado com a especificação `spec`: os eventos de vista dele (rastro, aviso, abertura e fechamento) vão
   * para um `BossAffixFx`, com a Chuva de Fios presa aos limites do nível e o dano de projétil do tier (CYC-09/10) e,
   * só com Ígneo, a lava com o dano de lava do tier (IGN-01..04); só com Sangue, o feixe com o dano de feixe do tier
   * (SNG-02/03); com Ígneo ou Invocador, o contorno (BRD-03); com Invocador, a invocação na troca de fase (INV-01);
   * com Adaptativo, a roda (ADP-06).
   */
  attach(boss: Boss, spec: BossSpec): void {
    this.fx?.destroy();
    this.outline?.destroy();
    this.wheel?.view.destroy();
    this.outline = AffixOutline.create(this.s, boss.fxSprite, spec.affixes);
    this.wheel = spec.affixes.includes('adaptativo') ? { view: new AdaptWheel(this.s), boss } : null;
    const onConnect = (hit: Hit, point: Vec2): void => this.s.combat.onConnect(hit, point, hit.strength);
    const threads = new ThreadRain(this.s, boss.id, spec.damage.projectile, this.s.level.widthPx, onConnect);
    const lava = spec.affixes.includes('igneo') ? new LavaField(this.s, boss.id, spec.damage.lava) : null;
    const beam = spec.affixes.includes('sangue') ? new BeamAttack(this.s, boss.id, spec.damage.beam, onConnect) : null;
    this.fx = new BossAffixFx(threads, lava, beam);
    boss.fxSink = this.fx.route;
    boss.onPhaseChanged = spec.affixes.includes('invocador') ? () => this.summon(this.s.run.round) : undefined;
  }

  /**
   * Troca de fase do Invocador (INV-01/02): 3 comuns (2 na r5), sem passar de 4 vivos, cada um num ponto `E` da
   * escolha da onda; guardados até morrerem ou o chefe cair.
   */
  private summon(round: number): void {
    const count = summonCount(round, this.summoned.size);
    for (let i = 0; i < count; i++) {
      const point = this.s.spawner.pickEnemySpawnPoint();
      const enemy = this.s.spawner.spawnSummoned(point, round, this.summonIndex++, (dead) =>
        this.summoned.delete(dead),
      );
      this.summoned.add(enemy);
    }
  }

  /** Cada invocado vivo some na hora com a fumaça amaldiçoada e sai da lista da cena (INV-04). */
  private dismissSummoned(): void {
    for (const e of this.summoned) {
      if (!e.removed) {
        const at = e.hurtRect();
        this.s.fx.curseSmoke(at.x, at.y);
        this.s.snapshot.debugEvents.push(`summonDismissed:${e.id}`);
      }
      e.destroyNow();
      this.s.attackGate.release(e.id);
    }
    this.s.enemies = this.s.enemies.filter((e) => !this.summoned.has(e));
    this.summoned.clear();
  }

  /** Ids dos invocados vivos, para o snapshot de debug (INV-01..05). */
  summonedIds(): number[] {
    return [...this.summoned].map((e) => e.id);
  }

  /**
   * Por quadro, depois do `boss.update`: a lava bate no player que pisa nela (IGN-03..05), o contorno o segue e a roda
   * mostra as fontes adaptadas sobre a cabeça dele (ADP-06).
   */
  update(dtMs: number): void {
    this.fx?.update(dtMs, this.s.player);
    this.outline?.update(dtMs);
    if (this.wheel) {
      const { view, boss } = this.wheel;
      const r = boss.hurtRect();
      view.update(dtMs, boss.adapted, r.x, r.y - r.height / 2, !boss.removed && !boss.isDead());
    }
  }

  /**
   * Chefe derrotado: fios, marcas, lava, feixe, contorno e roda somem na hora (a IA dele não manda mais o fechamento), e os
   * invocados vivos com eles (INV-04).
   */
  onBossDied(): void {
    this.dismissSummoned();
    this.fx?.clear();
    this.outline?.destroy();
    this.outline = null;
    this.dropWheel();
  }

  private dropWheel(): void {
    this.wheel?.view.destroy();
    this.wheel = null;
  }

  /**
   * Vista do chefe atual para o snapshot de debug: eventos recebidos por tipo, o estado da Chuva de Fios, a lava, o
   * feixe, o contorno e a roda; vazio e `null` sem chefe ligado.
   */
  fxView(): {
    fx: ReturnType<BossAffixFx['debug']>;
    threads: ReturnType<BossAffixFx['threadsView']>;
    lava: ReturnType<BossAffixFx['lavaView']>;
    beam: ReturnType<BossAffixFx['beamView']>;
    outline: ReturnType<AffixOutline['view']>;
    wheel: ReturnType<AdaptWheel['view']> | null;
  } {
    return {
      fx: this.fx?.debug() ?? {},
      threads: this.fx?.threadsView() ?? null,
      lava: this.fx?.lavaView() ?? null,
      beam: this.fx?.beamView() ?? null,
      outline: this.outline?.view() ?? null,
      wheel: this.wheel?.view.view() ?? null,
    };
  }

  /** Faixas de lava vivas, com ou sem chefe em cena (snapshot de debug; edge cases da lava). */
  lavaStrips(): number {
    return this.fx?.lavaView()?.strips.length ?? 0;
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
    this.dismissSummoned();
    this.summonIndex = 0;
    this.fx?.destroy();
    this.fx = null;
    this.outline?.destroy();
    this.outline = null;
    this.dropWheel();
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
