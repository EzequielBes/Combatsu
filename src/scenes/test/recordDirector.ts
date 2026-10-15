import type Phaser from 'phaser';
import type { Hit } from '../../core/hit';
import { RecordBook } from '../../core/recordBook';
import type { RunCommand } from '../../core/run';
import { DamageLedger, summaryLines, type DamageSource } from '../../core/runSummary';
import { serializeSave, type LeveledId, type RunRecord } from '../../core/save';
import type { TechId } from '../../data/techniques';
import { RecordMarker } from '../../game/RecordMarker';
import type { RecordSnapshot } from '../../game/recordSnapshot';
import { RunSummaryPanel } from '../../game/RunSummaryPanel';
import { SaveStorage } from '../../game/saveStorage';
import type { TestScene } from '../TestScene';
import { debugIntParam, debugParam } from './params';
import { loadRecord, type RecordLoad } from './recordLoad';

/**
 * Diretor do recorde: carrega o save, guarda o livro do recorde e o registro de dano da run, e é dono do marcador
 * `Recorde: rN` e do painel de fim de run. Mora no `RunDirector` (a cena está no teto de linhas).
 */
export class RecordDirector {
  private readonly storage = new SaveStorage();
  private loaded: RecordLoad | null = null;
  private book = new RecordBook(null);
  readonly ledger = new DamageLedger();
  private marker!: RecordMarker;
  private panel!: RunSummaryPanel;

  constructor(readonly s: TestScene) {}

  /**
   * Cria o marcador e o painel, escondidos, na camada de UI. O `scene.restart()` da tecla R reaproveita a cena e este
   * diretor, mas destrói os objetos antigos: as vistas nascem de novo a cada `create`. O save é lido só na primeira
   * montagem; depois o recorde em memória vale (com o armazenamento em `'memory'` reler perderia o recorde da aba).
   */
  mountUi(layer: Phaser.GameObjects.Layer): void {
    if (!this.loaded) {
      this.loaded = loadRecord(
        { record: debugIntParam('record', 1), nosave: debugParam('nosave') === '1' },
        this.storage,
      );
      this.book = new RecordBook(this.loaded.best);
    }
    this.marker = new RecordMarker(this.s, layer);
    this.panel = new RunSummaryPanel(this.s, layer);
  }

  /**
   * Comandos da `Run`: run nova zera o registro e esconde o painel; começo de rodada mostra o marcador (RMK-01/03/07,
   * RST-05: depois de uma morte já com o recorde dela); a morte grava o recorde e abre o painel.
   */
  onCommand(cmd: RunCommand): void {
    if (cmd.type === 'startRun') {
      this.ledger.reset();
      this.book.startRun();
      this.panel.hide();
    } else if (cmd.type === 'roundStart') this.marker.set(this.book.marker(cmd.round, this.s.run.state));
    else if (cmd.type === 'gameOver') this.onDeath(cmd.round, cmd.kills);
  }

  /** Texto do banner de começo de rodada (RMK-05/06): `Rodada N · Novo recorde!` uma vez por run, senão `Rodada N`. */
  roundBanner(round: number): string {
    return this.book.roundBanner(round);
  }

  /**
   * Golpe do jogador já aceito pelo alvo (DMG-01, DMG-03, DMG-04): com `moveName` é golpe do moveset ou finalizador,
   * sem é objeto (na mão, arremessado, arma vinculada ou ferramenta).
   */
  onPlayerHit(hit: Hit): void {
    this.addDamage(hit.moveName !== undefined ? 'golpe' : 'objeto', hit.damage);
  }

  /** Golpe de técnica já aceito pelo alvo (DMG-02, DMG-04): soma na técnica de origem; o Kokusen vem como `divergente`. */
  onTechHit(source: TechId, damage: number): void {
    this.addDamage(source, damage);
  }

  /** Soma dano aceito numa fonte; no laboratório de efeitos (só bonecos) nada conta (DMG-05). */
  addDamage(source: DamageSource, damage: number): void {
    if (this.s.fxLab) return;
    this.ledger.add(source, damage);
  }

  /**
   * A morte (REC-01..04, REC-09, END-01..12): monta o `RunRecord` com a build daquele instante, deixa o livro decidir
   * se virou recorde e grava uma vez se ele pedir (nunca com `nosave`/`record=` de debug nem sobre um save mais novo).
   * Uma escrita que lança põe a porta em `'memory'` e o recorde em memória fica (SAVE-07). Depois esconde o texto
   * central e o marcador e mostra o painel.
   */
  private onDeath(round: number, kills: number): void {
    const record: RunRecord = { round, kills, build: this.buildAtDeath() };
    const firstRound = this.s.runDirector.firstRoundForDebug();
    const { newRecord, write } = this.book.death(record, { canRecord: firstRound === undefined || firstRound <= 1 });
    const loaded = this.loaded;
    if (write && loaded && loaded.storage !== 'off' && !loaded.locked)
      this.storage.write(serializeSave(this.book.best));
    this.s.hud.setCenter(null);
    this.marker.hide();
    const lines = summaryLines({
      round,
      kills,
      fragments: this.s.wallet.fragments,
      build: record.build,
      damage: this.ledger.rows(),
      newRecord,
      bestRound: this.book.best?.round ?? null,
    });
    this.panel.show(lines);
  }

  /** A build resumida (REC-04): técnicas equipadas com nível, passivas, relíquia e arma com nível, votos. */
  private buildAtDeath(): RunRecord['build'] {
    const arsenal = this.s.arsenal.snapshot();
    const leveled = (id: string | null, level: number): LeveledId | null => (id ? { id, level } : null);
    return {
      techniques: this.s.loadout.slotsView.flatMap((slot) => (slot ? [{ id: slot.id, level: slot.level }] : [])),
      perks: [...this.s.build.perks.list],
      relic: leveled(arsenal.relic, arsenal.relicLevel),
      weapon: leveled(arsenal.weapon, arsenal.weaponLevel),
      vows: [...this.s.vows.snapshot().taken],
    };
  }

  /** `record` do snapshot de debug (REC-10, RMK-09, END-15), lido das vistas vivas. */
  snapshot(): RecordSnapshot {
    const loaded = this.loaded;
    const storage = loaded?.storage === 'off' ? 'off' : this.storage.kind;
    return {
      best: this.book.best,
      storage,
      locked: loaded?.locked ?? false,
      passed: this.book.passed,
      lastDeathRecord: this.book.lastDeathNewRecord,
      marker: this.marker.debug(),
      panel: this.panel.debug(),
      damage: this.ledger.totals(),
    };
  }
}
