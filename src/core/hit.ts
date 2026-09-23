export type Strength = 'light' | 'heavy';

/** Lado de quem ataca ou é atacado. */
export type Team = 'player' | 'enemy';

export interface Vec2 {
  x: number;
  y: number;
}

/** Um golpe, agnóstico da origem (soco, objeto, e no futuro técnica). */
export interface Hit {
  ownerId: number;
  damage: number;
  strength: Strength;
  direction: Vec2;
  /** Impulso em px por step do Matter (1/60 s). */
  force: number;
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: -1 } : { x: v.x / len, y: v.y / len };
}

/**
 * Regra de time (AI-05): só se acerta quem é do outro time. Golpe de inimigo nunca atinge inimigo, e a máscara
 * da hitbox (que inclui ENEMY) sozinha não impede isso.
 */
export function canDamage(attacker: Team, target: Team): boolean {
  return attacker !== target;
}

/**
 * Um gate por ataque: ignora o dono e deixa cada alvo ser acertado uma vez só,
 * mesmo que o sensor encoste em várias partes dele (ex.: ragdoll).
 */
export function makeHitGate(ownerId: number): (targetId: number) => boolean {
  const alreadyHit = new Set<number>();
  return (targetId) => {
    if (targetId === ownerId || alreadyHit.has(targetId)) return false;
    alreadyHit.add(targetId);
    return true;
  };
}
