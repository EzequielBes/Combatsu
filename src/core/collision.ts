/** Categorias de colisão do Matter (bits). */
export const Category = {
  NONE: 0,
  TERRAIN: 0x0001,
  PLAYER: 0x0002,
  ENEMY: 0x0004,
  PROP: 0x0008,
  HITBOX: 0x0010,
  RAGDOLL: 0x0020,
  /** Só o chefe (BAT-13): ao contrário do inimigo comum, o corpo dele empurra o player. */
  BOSS: 0x0040,
  /** Projétil e onda de choque do chefe (BAT-03/04/06): sensor que acerta o player e some na parede. */
  PROJECTILE: 0x0080,
  ALL: 0xffff,
} as const;

export interface CollisionFilter {
  category: number;
  mask: number;
  group: number;
}

const C = Category;
const filter = (category: number, mask: number, group = 0): CollisionFilter => ({ category, mask, group });

/**
 * Um filtro por papel/estado. Objetos em repouso, segurados ou quebrando nunca
 * colidem fisicamente com player/inimigo — requisito central do spec.
 * Hitboxes e objetos em uso são sensores: "colidir" aqui só gera evento, não empurra.
 */
export const Filters = {
  terrain: filter(C.TERRAIN, C.ALL),
  // BAT-13: o player também colide fisicamente com o chefe (categoria própria), diferente do inimigo comum.
  // BAT-04/06: o player também detecta o projétil/onda do chefe (sensor, sem resposta física).
  player: filter(C.PLAYER, C.TERRAIN | C.HITBOX | C.BOSS | C.PROJECTILE),
  enemy: filter(C.ENEMY, C.TERRAIN | C.HITBOX),
  boss: filter(C.BOSS, C.TERRAIN | C.HITBOX | C.PLAYER),
  // Chefe no ar (salto): só hitboxes o alcançam. Trocar o filtro (reavaliado a cada passo) em vez de virar sensor,
  // porque o par criado enquanto o corpo é sensor continua sensor depois, e o chefe afundava no chão ao pousar.
  bossAirborne: filter(C.BOSS, C.HITBOX),
  hidden: filter(C.NONE, C.NONE),
  hitbox: filter(C.HITBOX, C.PLAYER | C.ENEMY | C.RAGDOLL | C.BOSS),
  // BAT-06: some ao tocar parede (terreno) ou o player; nunca colide com inimigo, objeto ou outro projétil.
  projectile: filter(C.PROJECTILE, C.TERRAIN | C.PLAYER),
  propRest: filter(C.PROP, C.TERRAIN | C.PROP),
  propHeld: filter(C.PROP, C.NONE),
  propSwing: filter(C.HITBOX, C.PLAYER | C.ENEMY | C.RAGDOLL),
  propThrown: filter(C.HITBOX, C.TERRAIN | C.PLAYER | C.ENEMY | C.RAGDOLL),
  propBreaking: filter(C.PROP, C.NONE),
} satisfies Record<string, CollisionFilter>;

/** Partes de um ragdoll: grupo negativo compartilhado = não colidem entre si. */
export function ragdollFilter(group: number): CollisionFilter {
  if (group >= 0) throw new Error('Ragdoll precisa de grupo negativo');
  return filter(C.RAGDOLL, C.TERRAIN | C.HITBOX, group);
}

/** Mesma regra do Matter.Detector.canCollide. */
export function collides(a: CollisionFilter, b: CollisionFilter): boolean {
  if (a.group === b.group && a.group !== 0) return a.group > 0;
  return (a.mask & b.category) !== 0 && (b.mask & a.category) !== 0;
}
