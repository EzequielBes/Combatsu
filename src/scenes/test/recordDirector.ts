import type Phaser from 'phaser';
import { RecordBook } from '../../core/recordBook';
import { DamageLedger } from '../../core/runSummary';
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
