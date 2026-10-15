import type { Vec2 } from './hit';

/** VRM-16: a normal do contato conta como parede a partir deste `|x|` (abaixo dele, é chão ou teto). */
export const WALL_NORMAL_MIN_X = 0.7;

/** O que um contato do ragdoll com o terreno faz: atordoa (parede) ou nada (chão, teto ou não armado). */
export type WallContact = 'stun' | 'none';

/**
 * VRM-16: o comum derrubado por um golpe com `wallStun` (Vermelho Máximo, Peso 3) fica armado enquanto está no chão.
 * Um contato dele com o terreno de normal horizontal (`|n.x| ≥ 0,7`) é a parede e atordoa; o de normal vertical (chão
 * ou teto) não atordoa. Desarmado, nada acontece. Sem Phaser: o `scenes/test/wallStun.ts` liga isto aos contatos do
 * Matter.
 */
// SPEC_DEVIATION: o design pedia que a normal vertical (o pouso) desarmasse.
// Reason: o empurrão da detonação leva o ragdoll rente ao chão, e as partes dele tocam o chão desde o 1º quadro
// (medido em `modules=beco`: 83 contatos de chão armados antes do 1º contato com a parede); desarmar ali impediria
// toda parede. O alvo desarma ao se levantar (`EnemyDefense.getUp`) ou no 1º atordoamento.
export function wallStunFrom(normal: Vec2, armed: boolean): WallContact {
  if (!armed) return 'none';
  return Math.abs(normal.x) >= WALL_NORMAL_MIN_X - 1e-9 ? 'stun' : 'none';
}
