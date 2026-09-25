import type { Rect } from './level';
import type { PickupTuning } from '../data/tuning';

export type PickupKind = 'fragment' | 'heal';
export type PickupStepResult = 'none' | 'collected' | 'expired';

/** Estado de um pickup no chão (fragmento ou gota de cura); `x`/`y` são o centro da caixa. */
export interface PickupState {
  id: number;
  kind: PickupKind;
  value: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ageMs: number;
  magnet: boolean;
  /** Velocidade atual do ímã, em px/s (cresce até `magnetSpeedMax`); sem sentido fora do ímã. */
  speed: number;
  /** Já quicou uma vez ao pousar (ECO-07): a segunda vez para em vez de quicar de novo. */
  bounced: boolean;
  resting: boolean;
}

/** Retângulo do player que interessa ao pickup: posição, tamanho e se pode interagir com ele agora. */
export interface PickupPlayer {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  /** Falso com vida cheia: a gota não coleta nem liga o ímã enquanto isso (HEAL-04, HEAL-09). */
  canHeal: boolean;
}

export interface PickupContext {
  solids: readonly Rect[];
  player: PickupPlayer;
  t: PickupTuning;
}

/** Cria um pickup recém-nascido, na posição do drop e com a velocidade do estouro (ECO-06). */
export function createPickup(
  id: number,
  kind: PickupKind,
  value: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
): PickupState {
  return { id, kind, value, x, y, vx, vy, ageMs: 0, magnet: false, speed: 0, bounced: false, resting: false };
}

/** Tempo de vida do pickup (ECO-09, HEAL-05). */
export function lifetimeMs(kind: PickupKind, t: PickupTuning): number {
  return kind === 'heal' ? t.healLifeMs : t.fragmentLifeMs;
}

/** Visibilidade do pickup (ECO-21): sempre visível, pisca a cada `blinkEveryMs` nos últimos `blinkLastMs`. */
export function visible(p: Pick<PickupState, 'kind' | 'ageMs'>, t: PickupTuning): boolean {
  const remaining = lifetimeMs(p.kind, t) - p.ageMs;
  if (remaining > t.blinkLastMs) return true;
  return Math.floor(p.ageMs / t.blinkEveryMs) % 2 === 0;
}

function overlapsRect(ax: number, ay: number, aw: number, ah: number, b: Rect): boolean {
  return ax < b.x + b.width && ax + aw > b.x && ay < b.y + b.height && ay + ah > b.y;
}

/** Só coleta e só liga o ímã com o player vivo e, para a gota, com vida faltando (ECO-11, HEAL-04, HEAL-09). */
function canInteract(p: PickupState, ctx: PickupContext): boolean {
  if (!ctx.player.alive) return false;
  if (p.kind === 'heal' && !ctx.player.canHeal) return false;
  return true;
}

function overlapsPlayer(p: PickupState, t: PickupTuning, player: PickupPlayer): boolean {
  const half = t.size / 2;
  return overlapsRect(p.x - half, p.y - half, t.size, t.size, { x: player.x, y: player.y, width: player.w, height: player.h });
}

/** Empurra o pickup para fora do sólido em X, se estiver sobreposto, e reflete a velocidade (ECO-07, ECO-24). */
function resolveX(p: PickupState, t: PickupTuning, solids: readonly Rect[]): void {
  const half = t.size / 2;
  for (const s of solids) {
    const left = p.x - half;
    const right = p.x + half;
    const top = p.y - half;
    const bottom = p.y + half;
    if (right <= s.x || left >= s.x + s.width || bottom <= s.y || top >= s.y + s.height) continue;
    const pushLeft = s.x - right;
    const pushRight = s.x + s.width - left;
    p.x += Math.abs(pushLeft) < Math.abs(pushRight) ? pushLeft : pushRight;
    p.vx = -p.vx * t.wallBounce;
  }
}

/** Pousa no topo do sólido abaixo (quica uma vez) ou para no teto de um sólido acima (ECO-07, ECO-24). */
function resolveY(p: PickupState, t: PickupTuning, solids: readonly Rect[]): void {
  const half = t.size / 2;
  for (const s of solids) {
    const left = p.x - half;
    const right = p.x + half;
    const top = p.y - half;
    const bottom = p.y + half;
    if (right <= s.x || left >= s.x + s.width || bottom <= s.y || top >= s.y + s.height) continue;
    if (p.vy >= 0) {
      p.y = s.y - half;
      if (!p.bounced) {
        p.vy = -p.vy * t.bounce;
        p.bounced = true;
      } else {
        p.vy = 0;
        p.vx = 0;
        p.resting = true;
      }
    } else {
      p.y = s.y + s.height + half;
      p.vy = 0;
    }
  }
}

/**
 * Avança um pickup em `dtMs`, na ordem idade → ímã → movimento → coleta (ECO-06..11, ECO-18, ECO-21, ECO-24/25,
 * HEAL-04/05/09). Sem ímã, cai com gravidade e para no chão; com ímã (idade >= `magnetDelayMs` e a
 * <= `magnetRange` px do player vivo — e, para a gota, com vida faltando), atravessa o terreno até o player.
 */
export function stepPickup(p: PickupState, dtMs: number, ctx: PickupContext): PickupStepResult {
  const t = ctx.t;
  p.ageMs += dtMs;
  if (p.ageMs >= lifetimeMs(p.kind, t)) return 'expired';

  const dt = dtMs / 1000;
  const interactable = canInteract(p, ctx);

  if (!p.magnet && interactable && p.ageMs >= t.magnetDelayMs) {
    const cx = ctx.player.x + ctx.player.w / 2;
    const cy = ctx.player.y + ctx.player.h / 2;
    if (Math.hypot(p.x - cx, p.y - cy) <= t.magnetRange) {
      p.magnet = true;
      p.speed = t.magnetSpeed0;
    }
  }

  if (p.magnet) {
    if (interactable) {
      const cx = ctx.player.x + ctx.player.w / 2;
      const cy = ctx.player.y + ctx.player.h / 2;
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      p.x += (dx / dist) * p.speed * dt;
      p.y += (dy / dist) * p.speed * dt;
      p.speed = Math.min(p.speed + t.magnetAccel * dt, t.magnetSpeedMax);
    }
  } else if (!p.resting) {
    p.vy += t.gravity * dt;
    p.x += p.vx * dt;
    resolveX(p, t, ctx.solids);
    p.y += p.vy * dt;
    resolveY(p, t, ctx.solids);
  }

  if (interactable && overlapsPlayer(p, t, ctx.player)) return 'collected';
  return 'none';
}
