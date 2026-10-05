import { pts } from './points';
import type Phaser from 'phaser';
import { parseSheet } from '../core/pixelGrid';
import type { Strength, Vec2 } from '../core/hit';
import { impactSpikes, type ImpactTier } from '../core/impactTier';
import { Rng } from '../core/rng';
import { trailStyle } from '../core/strikePath';
import { IMPACT_FEEL, SLIDE_FEEL } from '../data/feel';
import { HD_ON } from './art/hd/flag';
import { PALETTE, PALETTE_KEYS } from './art/palette';
import { drawHeavyImpact, drawLightImpact, type ImpactShape } from './cursedImpact';
import { registerSheet } from './art/render';
import { TEX } from './textures';

/**
 * Cores da energia amaldiçoada (TRL-06): azul-profundo `d`, azul `c` e ciano `C` do corpo da energia, roxo `u` e
 * `U` das fagulhas. Preto e vermelho são do Kokusen e não entram aqui.
 */
export const CURSED_FX_KEYS = ['d', 'c', 'C', 'u', 'U'] as const;
type CursedKey = (typeof CURSED_FX_KEYS)[number];

/** Acima de personagens (0..2) e objetos, como a faísca: o efeito aparece por cima de quem ele toca. */
const FX_DEPTH = 3;
/** Passo da grade de arte em px de mundo (AD-009): 2 px no corpo antigo, 1 px com o corpo HD (`?hd=1`). */
const GRID = HD_ON ? 1 : 2;
/** Intervalo (ms de jogo) entre as fagulhas da chama do golpe forte. */
const FLAME_EVERY_MS = 40;
const FLAME_LIFE_MS = 260;
/** Escala inicial da fagulha da chama (o pedacinho tem 4 px de lado). */
const FLAME_SCALE = 0.7;
/** Quantos pontos amostram a espinha do rastro: mais pontos, curva mais lisa. */
const TRAIL_SAMPLES = 10;
/** Quanto a espinha do rastro entorta para cima, em fração do comprimento: dá o arco do golpe de anime. */
const TRAIL_BULGE = 0.14;

/** Teto de objetos vivos (EDG-03): com `live` já no teto, estilhaços e resíduos novos são pulados. */
export function canSpawnParticle(live: number): boolean {
  return live < IMPACT_FEEL.fxCap;
}

const snap = (v: number): number => Math.round(v / GRID) * GRID;

/** Perfil da largura ao longo do rastro: 0 nas pontas, 1 perto do meio, um pouco inclinado para o lado do impacto. */
const profile = (t: number): number => Math.sin(Math.PI * Math.pow(t, 0.85));

/**
 * Polígono do rastro (TRL-03): uma lente curva entre o primeiro e o último ponto do caminho, afinada nas duas
 * pontas e mais grossa no meio. `widthPx` é a espessura máxima. Todos os vértices caem na grade de 2 px (AD-009).
 */
export function trailPolygon(path: readonly Vec2[], widthPx: number, bulge = TRAIL_BULGE): Vec2[] {
  if (path.length < 2) return [];
  const spine: Vec2[] = [];
  if (path.length === 2) {
    const a = path[0]!;
    const b = path[1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // Normal que aponta para cima (y negativo na tela).
    let nx = dy / len;
    let ny = -dx / len;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const cx = (a.x + b.x) / 2 + nx * len * bulge * 2;
    const cy = (a.y + b.y) / 2 + ny * len * bulge * 2;
    for (let i = 0; i <= TRAIL_SAMPLES; i++) {
      const t = i / TRAIL_SAMPLES;
      const u = 1 - t;
      spine.push({ x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y });
    }
  } else {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!;
      const b = path[i + 1]!;
      const steps = Math.max(2, Math.round(TRAIL_SAMPLES / (path.length - 1)));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        spine.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    spine.push(path[path.length - 1]!);
  }
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i < spine.length; i++) {
    const prev = spine[Math.max(0, i - 1)]!;
    const next = spine[Math.min(spine.length - 1, i + 1)]!;
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tl = Math.hypot(tx, ty) || 1;
    const half = (widthPx / 2) * profile(i / (spine.length - 1));
    const p = spine[i]!;
    left.push({ x: snap(p.x - (ty / tl) * half), y: snap(p.y + (tx / tl) * half) });
    right.push({ x: snap(p.x + (ty / tl) * half), y: snap(p.y - (tx / tl) * half) });
  }
  const poly = [...left, ...right.reverse()];
  return poly.filter((p, i) => i === 0 || p.x !== poly[i - 1]!.x || p.y !== poly[i - 1]!.y);
}

/** Folha de pedacinhos 2x2 texels, um por cor do efeito. */
const BIT_FRAMES: Record<CursedKey, readonly string[]> = {
  d: ['dd', 'dd'],
  c: ['cc', 'cc'],
  C: ['CC', 'CC'],
  u: ['uu', 'uu'],
  U: ['UU', 'UU'],
};

interface TrailEntry {
  gfx: Phaser.GameObjects.Graphics;
  tween: Phaser.Tweens.Tween | null;
  tier: 'light' | 'heavy';
  widthPx: number;
  fadeMs: number;
}

/**
 * Efeitos da energia amaldiçoada do golpe corpo a corpo do jogador: rastro, chamas do startup forte, estilhaços,
 * anel, espinhos, rachadura e resíduo do deslize. Tudo anda no tempo de jogo (tweens e timers da cena), então o
 * hitstop segura o rastro aceso (TRL-09). Cores só da paleta (TRL-06) e geometria na grade de 2 px (AD-009).
 * No máximo `fxCap` objetos de partícula vivos (EDG-03) e `destroyAll` limpa tudo (EDG-04).
 */
export class CursedFx {
  private readonly trailList: TrailEntry[] = [];
  private readonly live = new Set<Phaser.GameObjects.GameObject>();
  private flameTimer: Phaser.Time.TimerEvent | null = null;
  private flameAt: Vec2 = { x: 0, y: 0 };
  private flameSeed = 1;

  constructor(private readonly scene: Phaser.Scene) {
    registerSheet(scene, TEX.cursedBit, parseSheet('cursed-bit', BIT_FRAMES, PALETTE_KEYS));
  }

  /** Rastros vivos, para o snapshot de debug (TRL-10): nível, largura e idade em ms de jogo. */
  get trails(): { tier: 'light' | 'heavy'; widthPx: number; ageMs: number }[] {
    return this.trailList.map((t) => ({
      tier: t.tier,
      widthPx: t.widthPx,
      ageMs: Math.round((t.tween?.progress ?? 0) * t.fadeMs),
    }));
  }

  /** Objetos de efeito vivos desta classe (inclui rastros, anéis e rachaduras). */
  get liveCount(): number {
    return this.live.size;
  }

  /** `true` enquanto a chama do startup forte está emitindo. */
  get flaming(): boolean {
    return this.flameTimer !== null;
  }

  /**
   * Rastro do golpe (TRL-03..06): lente de energia entre o ponto de golpe do `-wind` e o do `-hit`, em coordenadas
   * de mundo. Sombra `d`, corpo `c`, núcleo `C` e fagulhas `u`/`U` caindo na lateral; apaga em `fadeMs` de jogo.
   */
  trail(path: readonly Vec2[], strength: Strength): void {
    const { widthPx, fadeMs } = trailStyle(strength);
    const body = trailPolygon(path, widthPx);
    if (body.length < 3) return;
    const gfx = this.add(this.scene.add.graphics().setDepth(FX_DEPTH));
    const fill = (poly: Vec2[], color: CursedKey, alpha: number): void => {
      if (poly.length < 3) return;
      gfx.fillStyle(PALETTE[color]!, alpha).fillPoints(pts(poly), true);
    };
    fill(trailPolygon(path, widthPx * 1.6, TRAIL_BULGE * 1.1), 'd', 0.65);
    fill(body, 'c', 0.95);
    fill(trailPolygon(path, widthPx * 0.5), 'C', 1);
    // Fagulhas roxas soltas ao longo do caminho, determinísticas pela geometria (AD-006).
    const a = path[0]!;
    const b = path[path.length - 1]!;
    const sparks = strength === 'heavy' ? 5 : 3;
    const rng = new Rng(Math.floor(a.x * 7 + a.y * 13 + b.x * 3 + b.y));
    for (let i = 0; i < sparks; i++) {
      const t = 0.25 + (0.6 * i) / Math.max(sparks - 1, 1);
      const side = (rng.next() - 0.5) * (widthPx * 2 + 6);
      const sx = snap(a.x + (b.x - a.x) * t);
      const sy = snap(a.y + (b.y - a.y) * t - widthPx - 2 + side);
      gfx.fillStyle(PALETTE[i % 2 === 0 ? 'U' : 'u']!, 1).fillRect(sx, sy, GRID, GRID);
    }
    const entry: TrailEntry = { gfx, tween: null, tier: strength === 'heavy' ? 'heavy' : 'light', widthPx, fadeMs };
    entry.tween = this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: fadeMs,
      ease: 'Quad.easeIn',
      onComplete: () => gfx.destroy(),
    });
    gfx.once('destroy', () => {
      const i = this.trailList.indexOf(entry);
      if (i >= 0) this.trailList.splice(i, 1);
    });
    this.trailList.push(entry);
  }

  /** Começa a chama do startup forte no ponto de golpe (TRL-07): fagulhas `c`, `C` e `U` subindo. */
  flameStart(at: Vec2): void {
    this.flameStop();
    this.flameAt = { x: at.x, y: at.y };
    this.emitFlame();
    this.flameTimer = this.scene.time.addEvent({ delay: FLAME_EVERY_MS, loop: true, callback: () => this.emitFlame() });
  }

  /** Acompanha o ponto de golpe enquanto o corpo anda e o frame muda. */
  flameMove(at: Vec2): void {
    this.flameAt = { x: at.x, y: at.y };
  }

  /** Para de emitir na hora (TRL-08, EDG-02); as fagulhas já soltas terminam de apagar sozinhas. */
  flameStop(): void {
    this.flameTimer?.remove(false);
    this.flameTimer = null;
  }

  /**
   * Impacto em camadas (IMP-07..09). `light`: lampejo pequeno e 6 agulhas num cone de ±35° em volta de `dir`.
   * `heavy` e `decisive`: lampejo em estrela, onda de choque fina de 6 a 28 px, riscos em raio (os de
   * `impactSpikes(seed, 6)`) e um jato na direção do golpe. `seed` fixa o desenho (AD-006).
   */
  impact(tier: ImpactTier, at: Vec2, dir: Vec2, seed: number): void {
    if (tier === 'light') {
      this.shards(at, dir, seed);
      return;
    }
    this.ringAndSpikes(at, dir, seed, tier === 'decisive');
  }

  /** Rachadura no chão do pouso da derrubada (IMP-15): linhas finas que somem em `crackMs`. */
  crack(at: Vec2): void {
    const gfx = this.add(this.scene.add.graphics().setDepth(FX_DEPTH - 0.5));
    const rng = new Rng(Math.floor(at.x * 5 + at.y * 11));
    const rays = 6;
    for (let i = 0; i < rays; i++) {
      // Só o semicírculo de cima do chão: a rachadura espalha de lado, achatada.
      const ang = Math.PI + (Math.PI * (i + 0.5)) / rays + (rng.next() - 0.5) * 0.3;
      const len = 14 + rng.next() * 18;
      const mid = len * 0.5;
      const jx = (rng.next() - 0.5) * 8;
      const points = [
        { x: snap(at.x), y: snap(at.y) },
        { x: snap(at.x + Math.cos(ang) * mid + jx), y: snap(at.y + Math.sin(ang) * mid * 0.35) },
        { x: snap(at.x + Math.cos(ang) * len), y: snap(at.y + Math.sin(ang) * len * 0.3) },
      ];
      gfx.lineStyle(GRID, PALETTE.d!, 1).strokePoints(pts(points), false);
      gfx.lineStyle(1, PALETTE[i % 2 === 0 ? 'c' : 'u']!, 1).strokePoints(pts(points), false);
    }
    gfx.fillStyle(PALETTE.C!, 1).fillRect(snap(at.x) - 1, snap(at.y) - 1, GRID, GRID);
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: IMPACT_FEEL.crackMs,
      ease: 'Quad.easeIn',
      onComplete: () => gfx.destroy(),
    });
  }

  /** Resíduo `c` nos pés do inimigo que desliza (RCT-03); pulado com o teto cheio (EDG-03). */
  residue(at: Vec2): void {
    if (!canSpawnParticle(this.live.size)) return;
    const img = this.bit('c', at.x, at.y);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      y: at.y - 4,
      duration: SLIDE_FEEL.residueFadeMs,
      onComplete: () => img.destroy(),
    });
  }

  /** Destrói todo efeito vivo (EDG-04): rastros, anéis, rachaduras, partículas e a chama. */
  destroyAll(): void {
    this.flameStop();
    for (const o of [...this.live]) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.live.clear();
    this.trailList.length = 0;
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.live.add(o);
    o.once('destroy', () => this.live.delete(o));
    return o;
  }

  private bit(key: CursedKey, x: number, y: number): Phaser.GameObjects.Image {
    return this.add(this.scene.add.image(snap(x), snap(y), TEX.cursedBit, key).setDepth(FX_DEPTH));
  }

  private emitFlame(): void {
    const rng = new Rng(this.flameSeed++);
    const pick = rng.next();
    const key: CursedKey = pick < 0.5 ? 'c' : pick < 0.8 ? 'C' : 'U';
    const x = this.flameAt.x + (rng.next() - 0.5) * 8;
    const y = this.flameAt.y + (rng.next() - 0.5) * 6;
    // Fagulha pequena em losango (o pedacinho girado 45°): quadrado cheio lia como defeito em cima do corpo.
    const img = this.bit(key, x, y).setAngle(45).setScale(FLAME_SCALE);
    this.scene.tweens.add({
      targets: img,
      x: snap(x + (rng.next() - 0.5) * 10),
      y: snap(y - 12 - rng.next() * 12),
      alpha: 0,
      scale: FLAME_SCALE * 0.4,
      duration: FLAME_LIFE_MS,
      ease: 'Quad.easeOut',
      onComplete: () => img.destroy(),
    });
  }

  private shapeAt(at: Vec2, dir: Vec2): ImpactShape {
    return { cx: snap(at.x), cy: snap(at.y), dirAngle: Math.atan2(dir.y, dir.x), snap, grid: GRID };
  }

  /** Toca um desenho de impacto de `p = 0` a 1 em `ms` de jogo (parado em 0 durante o hitstop) e o destrói no fim. */
  private play(ms: number, draw: (gfx: Phaser.GameObjects.Graphics, p: number) => void): void {
    const gfx = this.add(this.scene.add.graphics().setDepth(FX_DEPTH + 0.1));
    draw(gfx, 0);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      onUpdate: (t) => {
        if (gfx.active) draw(gfx, t.getValue() ?? 1);
      },
      onComplete: () => gfx.destroy(),
    });
  }

  private shards(at: Vec2, dir: Vec2, seed: number): void {
    if (!canSpawnParticle(this.live.size)) return;
    const rng = new Rng(seed);
    const shape = this.shapeAt(at, dir);
    const cone = (IMPACT_FEEL.shardConeDeg * Math.PI) / 180;
    const list = Array.from({ length: IMPACT_FEEL.shardCount }, () => ({
      angle: shape.dirAngle + (rng.next() * 2 - 1) * cone,
      dist: 26 + rng.next() * 30,
    }));
    this.play(IMPACT_FEEL.shardLifeMs, (gfx, p) => drawLightImpact(gfx, shape, list, p));
  }

  private ringAndSpikes(at: Vec2, dir: Vec2, seed: number, decisive: boolean): void {
    const spikes = impactSpikes(seed, IMPACT_FEEL.spikeCount);
    const shape = this.shapeAt(at, dir);
    this.play(IMPACT_FEEL.ringMs, (gfx, p) => drawHeavyImpact(gfx, shape, spikes, decisive, p));
  }
}
