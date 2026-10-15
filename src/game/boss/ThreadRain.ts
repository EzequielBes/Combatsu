import type Phaser from 'phaser';
import { threadXs } from '../../core/bossAttacks';
import type { Hit } from '../../core/hit';
import { BOSS } from '../../data/tuning';
import { PALETTE } from '../art/palette';
import { AttackHitbox, type OnConnect } from '../hitbox';

/** Momento da chuva: nada em cena, marcas no chão (preparo) ou fios abertos (CYC-09/10). */
export type ThreadRainPhase = 'idle' | 'warn' | 'active';

/** Leitura da chuva para o snapshot de debug: posições, dano de cada fio e acertos aceitos desde que o chefe nasceu. */
export interface ThreadRainView {
  phase: ThreadRainPhase;
  xs: number[];
  damage: number;
  hits: number;
}

/** Altura da marca no chão durante o preparo (px). */
const MARK_H = 4;
/** Largura do miolo claro do fio (px); o halo escuro ocupa a largura inteira da hitbox. */
const CORE_W = 4;
/** Transparência do halo do fio e da marca, para o cenário aparecer por baixo. */
const HALO_ALPHA = 0.45;
/** Empurrão do fio: o mesmo do projétil da rajada (`Projectile`), já que o dano também é o dele. */
const HIT_FORCE = 4;
/** Acima dos personagens (0..2) e abaixo dos efeitos de impacto (3): o fio cai na frente de quem ele acerta. */
const DEPTH = 2.5;
/** Cor da marca e do halo (`u`) e do miolo do fio (`U`): roxo da Tecelã, sempre da `PALETTE` (BRD-07). */
const MARK_COLOR = PALETTE.u;
const CORE_COLOR = PALETTE.U;

/**
 * Vista da Chuva de Fios da Tecelã (CYC-09, CYC-10, BRD-07): no aviso, 5 marcas `u` no chão em
 * `threadXs(playerX, 0, larguraDoNível, offsets)`; na abertura cada marca vira um fio vertical `U` com um
 * `AttackHitbox` próprio (dono = chefe, dano de projétil do tier, um acerto por fio); o fechamento apaga tudo. Uma
 * interrupção no preparo apaga as marcas sem abrir nenhum fio (BAI-05). A guarda do jogador vale como na rajada: o
 * golpe não é imbloqueável e não tem altura, então abaixar ou pular não passa por baixo nem por cima do fio.
 */
export class ThreadRain {
  private readonly hitboxes: AttackHitbox[];
  private readonly gfx: Phaser.GameObjects.Graphics;
  private phase: ThreadRainPhase = 'idle';
  private xs: number[] = [];
  private groundY = 0;
  /** X do chefe no aviso: cada fio empurra para longe dele. */
  private ownerX = 0;
  private hits = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly ownerId: number,
    /** Dano de cada fio: o do projétil do tier do chefe (`spec.damage.projectile`, já com o Portador). */
    private readonly damage: number,
    /** Borda direita da arena (px); a esquerda é 0. */
    private readonly maxX: number,
    /** Golpe aceito pelo jogador (faísca + hitstop), injetado pela cena. */
    onConnect?: OnConnect,
    private readonly t: { offsets: readonly number[]; width: number; height: number } = BOSS.threadRain,
  ) {
    const counted: OnConnect = (hit, point, target) => {
      this.hits++;
      onConnect?.(hit, point, target);
    };
    this.hitboxes = t.offsets.map(() => new AttackHitbox(scene, ownerId, 'enemy', counted));
    this.gfx = scene.add.graphics().setDepth(DEPTH);
  }

  /** Aviso (CYC-09): marca o chão nos X dos fios a partir do X do jogador, presos aos limites da arena. */
  telegraph(playerX: number, anchor: { x: number; groundY: number }): void {
    this.clear();
    this.xs = threadXs(playerX, 0, this.maxX, this.t.offsets);
    this.groundY = anchor.groundY;
    this.ownerX = anchor.x;
    this.phase = 'warn';
    this.draw();
  }

  /** Fim do preparo (CYC-10): cada marca vira um fio com a sua hitbox; sem aviso antes, nada abre. */
  strikeOn(): void {
    if (this.phase !== 'warn') return;
    this.phase = 'active';
    const { width, height } = this.t;
    const shape = { offsetX: 0, offsetY: 0, width, height };
    this.xs.forEach((x, i) => {
      const hit: Hit = {
        ownerId: this.ownerId,
        damage: this.damage,
        strength: 'light',
        force: HIT_FORCE,
        direction: { x: x >= this.ownerX ? 1 : -1, y: 0 },
      };
      this.hitboxes[i].open(shape, hit, x, this.groundY - height / 2, 1);
    });
    this.draw();
  }

  /** Fechamento, interrupção ou chefe fora de cena: fecha os fios e apaga marcas e fios. */
  clear(): void {
    for (const box of this.hitboxes) box.close();
    this.phase = 'idle';
    this.xs = [];
    this.gfx.clear();
  }

  /** Remove a vista de vez (chefe novo ou run nova). */
  destroy(): void {
    this.clear();
    this.gfx.destroy();
  }

  view(): ThreadRainView {
    return { phase: this.phase, xs: [...this.xs], damage: this.damage, hits: this.hits };
  }

  private draw(): void {
    const g = this.gfx.clear();
    const { width, height } = this.t;
    for (const x of this.xs) {
      const left = Math.round(x - width / 2);
      if (this.phase === 'warn') {
        // A marca é o pé do fio que vai cair: base `u` na largura da hitbox e o miolo `U` no meio, para ler no chão escuro.
        g.fillStyle(MARK_COLOR, 1).fillRect(left, this.groundY - MARK_H, width, MARK_H);
        g.fillStyle(CORE_COLOR, 1).fillRect(Math.round(x - CORE_W / 2), this.groundY - MARK_H, CORE_W, MARK_H);
        continue;
      }
      const top = this.groundY - height;
      g.fillStyle(MARK_COLOR, HALO_ALPHA).fillRect(left, top, width, height);
      g.fillStyle(CORE_COLOR, 1).fillRect(Math.round(x - CORE_W / 2), top, CORE_W, height);
    }
  }
}
