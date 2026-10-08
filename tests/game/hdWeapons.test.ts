import { describe, expect, it } from 'vitest';
import { weaponDef } from '../../src/core/arsenal';
import { parseSheet } from '../../src/core/pixelGrid';
import { TOOL_DEFS } from '../../src/data/props';
import { HD_WEAPONS, HD_WEAPON_SUFFIX } from '../../src/game/art/hd/weapons';
import { PALETTE_KEYS } from '../../src/game/art/palette';

const size = (texture: string) => {
  const sheet = parseSheet(texture, HD_WEAPONS[texture].frames, PALETTE_KEYS);
  return { w: sheet.width, h: sheet.height };
};

describe('armas na densidade HD', () => {
  it('toda folha passa pelo parser (só cores da paleta, linhas da mesma largura) com os quadros comum e raro', () => {
    for (const [texture, weapon] of Object.entries(HD_WEAPONS)) {
      const sheet = parseSheet(texture, weapon.frames, PALETTE_KEYS);
      expect(sheet.frames.map((f) => f.key).sort(), texture).toEqual(['common', 'rare']);
      expect(weapon.frames.rare.join(''), texture).not.toContain('k');
    }
  });

  it('cada ferramenta tem a sua folha HD, e cada arma vinculada tem arte própria', () => {
    for (const def of Object.values(TOOL_DEFS)) expect(HD_WEAPONS).toHaveProperty(def.texture + HD_WEAPON_SUFFIX);
    expect(HD_WEAPONS).toHaveProperty(weaponDef('bastao', 1).texture);
    expect(HD_WEAPONS).toHaveProperty(weaponDef('lamina', 1).texture);
  });

  it('o tamanho acompanha o corpo de ~60 texels: faca < lâmina < bastão, e o porrete é o mais largo', () => {
    const knife = size(`cursed-knife${HD_WEAPON_SUFFIX}`);
    const club = size(`cursed-club${HD_WEAPON_SUFFIX}`);
    const blade = size('bound-blade');
    const staff = size('bound-staff');
    expect(knife.h).toBeGreaterThanOrEqual(20);
    expect(blade.h).toBeGreaterThan(knife.h + 10);
    expect(staff.h).toBeGreaterThan(blade.h);
    expect(staff.h).toBeLessThanOrEqual(48);
    expect(club.w).toBeGreaterThan(Math.max(knife.w, blade.w, staff.w));
  });

  it('a mão segura dentro da metade de baixo da arma', () => {
    for (const [texture, weapon] of Object.entries(HD_WEAPONS)) {
      expect(weapon.grip, texture).toBeGreaterThan(0);
      expect(weapon.grip, texture).toBeLessThan(size(texture).h / 2);
    }
  });
});
