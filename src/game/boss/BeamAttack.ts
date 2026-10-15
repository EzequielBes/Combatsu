import type Phaser from 'phaser';
import { beamThickness } from '../../core/bossAttacks';
import type { Hit } from '../../core/hit';
import { BOSS_AFFIX } from '../../data/bossAffixes';
import { PALETTE } from '../art/palette';
import { AttackHitbox, type OnConnect } from '../hitbox';

/** Momento do feixe: nada em cena, linha de aviso engrossando (preparo) ou feixe aberto (SNG-02/03). */
export type BeamPhase = 'idle' | 'warn' | 'active';

/**
 * Leitura do feixe para o snapshot de debug: momento, lado, trecho em X e altura da linha, espessura atual, tempo de
 * aviso decorrido, dano e acertos aceitos desde que o chefe nasceu.
 */
export interface BeamView {
  phase: BeamPhase;
  dir: 1 | -1;
  fromX: number;
  toX: number;
  y: number;
  thickness: number;
  warnElapsedMs: number;
  damage: number;
  hits: number;
}

/** Empurrão do feixe, para longe do chefe: o mesmo da investida, já que o golpe também é `heavy`. */
const HIT_FORCE = 6;
/** Miolo claro do feixe aberto (px); o halo escuro ocupa a altura inteira da hitbox. */
const CORE_H = 4;
/** Transparência do halo do feixe aberto, para o cenário aparecer por baixo. */
const HALO_ALPHA = 0.55;
/** Acima dos personagens (0..2) e abaixo dos efeitos de impacto (3): o feixe passa na frente de quem ele acerta. */
const DEPTH = 2.5;
/** Linha de aviso `r` (vermelho escuro) e miolo do feixe `R` (vermelho vivo), sempre da `PALETTE` (BRD-07). */
const WARN_COLOR = PALETTE.r;
const CORE_COLOR = PALETTE.R;

/**
 * Vista e golpe do feixe do Sangue Convergente (SNG-02, SNG-03, BRD-07). No aviso, uma linha `r` na altura do peito
 * do chefe, dele até a borda da `worldView` no lado avisado, que engrossa de 1 a 6 px em 800 ms (`beamThickness`).
 * Na abertura a linha vira o feixe `R` com um `AttackHitbox` próprio (dono = chefe, `high`, dano do tier, um acerto
 * por abertura) no trecho em que estava; o fechamento (o `strikeOff` da IA, 250 ms depois) apaga tudo. Uma
 * interrupção no preparo apaga a linha sem abrir (BAI-05). Abaixar passa por baixo (DEF-11); a guarda segura com o
 * chip de chefe de hoje.
 */
export class BeamAttack {
  private readonly hitbox: AttackHitbox;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private phase: BeamPhase = 'idle';
  private dir: 1 | -1 = 1;
  private fromX = 0;
  private toX = 0;
  private y = 0;
  private elapsed = 0;
  private hits = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ownerId: number,
    /** Dano do feixe: `spec.damage.beam` do chefe (já com o tier e o Portador). */
    private readonly damage: number,
    /** Golpe aceito pelo jogador (faísca + hitstop), injetado pela cena. */
    onConnect?: OnConnect,
    private readonly t: { warnMs: number; height: number } = BOSS_AFFIX.beam,
  ) {
    const counted: OnConnect = (hit, point, target) => {
      this.hits++;
      onConnect?.(hit, point, target);
    };
    this.hitbox = new AttackHitbox(scene, ownerId, 'enemy', counted);
    this.gfx = scene.add.graphics().setDepth(DEPTH);
  }

  /** Aviso (SNG-02): linha fina no peito do chefe, do X dele até a borda da tela no lado `dir`. */
  telegraph(dir: 1 | -1, anchor: { x: number; chestY: number }): void {
    this.clear();
    this.dir = dir;
    this.fromX = anchor.x;
    this.y = anchor.chestY;
    this.elapsed = 0;
    this.phase = 'warn';
    this.reachEdge();
    this.draw();
  }

  /** Fim do preparo (SNG-03): a linha vira o feixe com a hitbox no trecho dela; sem aviso antes, nada abre. */
  strikeOn(): void {
    if (this.phase !== 'warn') return;
    this.phase = 'active';
    this.reachEdge();
    const width = Math.max(1, Math.abs(this.toX - this.fromX));
    const shape = { offsetX: 0, offsetY: 0, width, height: this.t.height };
    const hit: Hit = {
      ownerId: this.ownerId,
      damage: this.damage,
      strength: 'heavy',
      force: HIT_FORCE,
      direction: { x: this.dir, y: 0 },
      height: 'high',
    };
    this.hitbox.open(shape, hit, (this.fromX + this.toX) / 2, this.y, 1);
    this.draw();
  }

  /** Por quadro: a linha de aviso engrossa com o tempo e acompanha a borda da tela. */
  update(dtMs: number): void {
    if (this.phase !== 'warn') return;
    this.elapsed += dtMs;
    this.reachEdge();
    this.draw();
  }

  /** Fechamento, interrupção ou chefe fora de cena: fecha a hitbox e apaga linha e feixe. */
  clear(): void {
    this.hitbox.close();
    this.phase = 'idle';
    this.gfx.clear();
  }

  /** Remove a vista de vez (chefe novo ou run nova). */
  destroy(): void {
    this.clear();
    this.gfx.destroy();
  }

  view(): BeamView {
    return {
      phase: this.phase,
      dir: this.dir,
      fromX: this.fromX,
      toX: this.toX,
      y: this.y,
      thickness: this.thickness(),
      warnElapsedMs: this.elapsed,
      damage: this.damage,
      hits: this.hits,
    };
  }

  /** Espessura desenhada: a do aviso pelo tempo decorrido; aberto, a altura inteira da hitbox. */
  private thickness(): number {
    if (this.phase === 'active') return this.t.height;
    return this.phase === 'warn' ? beamThickness(this.elapsed, this.t.warnMs) : 0;
  }

  /** O fim da linha é a borda da `worldView` no lado do feixe (no aberto, a hitbox fica no trecho da abertura). */
  private reachEdge(): void {
    const view = this.scene.cameras.main.worldView;
    this.toX = this.dir > 0 ? view.right : view.left;
  }

  private draw(): void {
    const g = this.gfx.clear();
    const left = Math.round(Math.min(this.fromX, this.toX));
    const width = Math.round(Math.abs(this.toX - this.fromX));
    const h = this.thickness();
    const top = Math.round(this.y - h / 2);
    if (this.phase === 'warn') {
      g.fillStyle(WARN_COLOR, 1).fillRect(left, top, width, h);
      return;
    }
    if (this.phase !== 'active') return;
    g.fillStyle(WARN_COLOR, HALO_ALPHA).fillRect(left, top, width, h);
    g.fillStyle(CORE_COLOR, 1).fillRect(left, Math.round(this.y - CORE_H / 2), width, CORE_H);
  }
}
