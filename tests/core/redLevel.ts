import type { Loadout } from '../../src/core/loadout';

/**
 * Equipa o Vermelho em `slot` no nível `level` pelos eixos: `level − 1` pontos de Potência, o que o `?axes=` do debug
 * faz no jogo (VRM-10). O `equip` grava o Vermelho sempre no Nv 1 (o nível dele é o dos eixos, VRM-02).
 */
export function equipRed(loadout: Loadout, slot: 0 | 1, level: number): boolean {
  if (!loadout.equip(slot, 'vermelho')) return false;
  for (let i = 1; i < level; i++) loadout.axes.add('vermelho', 'potencia');
  return true;
}
