/*
 * Efeitos HD das armas imbuídas (seção 5.4 do plano de builds): a arma fica guardada e muda os golpes que já
 * existem, então ela aparece só aqui, no rastro e no impacto do golpe, com a forma e a cor dela. Cada folha é
 * registrada a 1 px por texel pelo `art/index.ts`; ligar ao combate é da F36. Puro, sem `phaser`.
 */
import { BLADE_FX } from './blade';
import { BONE_FX } from './bone';
import { SPEAR_FX } from './spear';
import { STAFF_FX } from './staff';
import type { FxFrames, WeaponFxArt } from './types';

export type { FxFrames, WeaponFxArt, WeaponFxSheet } from './types';

/** As armas imbuídas, pela chave do arsenal (`lamina` e `bastao` já existem; a lança e o osso entram com a F36). */
export const WEAPON_FX = {
  lamina: BLADE_FX,
  bastao: STAFF_FX,
  lanca: SPEAR_FX,
  osso: BONE_FX,
} as const satisfies Record<string, WeaponFxArt>;

export type ImbuedWeapon = keyof typeof WEAPON_FX;
export type WeaponFxPart = 'trail' | 'impact' | 'charge';

/** Chave da textura de uma folha de efeito: `weapon-fx-lamina-trail`. */
export const weaponFxTex = (weapon: ImbuedWeapon, part: WeaponFxPart): string => `weapon-fx-${weapon}-${part}`;

/** Todas as folhas de efeito, com a chave de textura, na ordem de registro. */
export function weaponFxSheets(): { key: string; frames: FxFrames }[] {
  return (Object.entries(WEAPON_FX) as [ImbuedWeapon, WeaponFxArt][]).flatMap(([weapon, art]) =>
    (['trail', 'impact', 'charge'] as const).flatMap((part) => {
      const sheet = art[part];
      return sheet ? [{ key: weaponFxTex(weapon, part), frames: sheet.frames }] : [];
    }),
  );
}
