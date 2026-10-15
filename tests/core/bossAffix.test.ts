import { describe, expect, it } from 'vitest';
import {
  affixName,
  announceText,
  bossBarLabel,
  glyphKeys,
  outlineKeyAt,
  type BossLineup,
} from '../../src/core/bossAffix';
import { bossSpecFor } from '../../src/core/bossTier';
import { Run } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { RUN, SHOP, WAVE } from '../../src/data/tuning';

/** Salt do stream da escalação dos chefes (BLN-01). */
const BOSS_AFFIX_SALT = 0x9b05688c;

/** Salts dos 10 streams que já existiam em `run.ts` antes deste. */
const OTHER_SALTS = [
  0x9e3779b9,
  SHOP.rngSalt,
  0x2545f491,
  0x6a09e667,
  0x3c6ef372,
  0x510e527f,
  0x1f83d9ab,
  0x5be0cd19,
  0x13198a2e,
  0x3243f6a8,
];

const startedWith = (seed: number): Run => {
  const run = new Run(RUN, WAVE);
  run.startPressed();
  run.update(0, () => seed);
  return run;
};

describe('Run: stream da escalação dos chefes com seed própria (BLN-01)', () => {
  it('bossAffixRng é null antes do primeiro start', () => {
    expect(new Run(RUN, WAVE).bossAffixRng).toBeNull();
  });

  it('depois do start com seed s, a sequência é a de new Rng(s ^ 0x9b05688c)', () => {
    const run = startedWith(7);
    const expected = new Rng(7 ^ BOSS_AFFIX_SALT);
    for (let i = 0; i < 20; i++) expect(run.bossAffixRng!.next()).toBe(expected.next());
  });

  it('uma nova run cria outro objeto Rng, com a seed nova', () => {
    const run = startedWith(1);
    const first = run.bossAffixRng;
    first!.next(); // consome um sorteio na run anterior

    run.playerDied();
    run.update(0, () => 1); // gameOver
    run.startPressed();
    run.update(RUN.gameOverLockMs, () => 2); // nova run, seed 2

    expect(run.bossAffixRng).not.toBe(first);
    expect(run.bossAffixRng!.next()).toBe(new Rng(2 ^ BOSS_AFFIX_SALT).next());
  });

  it('o salt é diferente dos 10 streams que já existem', () => {
    expect(new Set(OTHER_SALTS).size).toBe(OTHER_SALTS.length);
    expect(OTHER_SALTS).not.toContain(BOSS_AFFIX_SALT);
  });

  it('não começa igual a nenhum dos outros streams da mesma run', () => {
    const run = startedWith(7);
    const others = [
      run.lootRng,
      run.shopRng,
      run.guardRng,
      run.variantRng,
      run.spawnRng,
      run.elixirRng,
      run.stageRng,
      run.slotRng,
      run.vowRng,
      run.kokusenRng,
    ].map((rng) => rng!.next());
    expect(others).not.toContain(run.bossAffixRng!.next());
  });
});

const lineup = (archetype: BossLineup['archetype'], affixes: BossLineup['affixes'], finger = false): BossLineup => ({
  archetype,
  affixes,
  finger,
});

describe('Rótulos do chefe: barra e aviso da loja (BRD-01, BRD-04)', () => {
  it('affixName concorda com o arquétipo: masculino no Oni, feminino na Tecelã', () => {
    expect(affixName('adaptativo', 'oni')).toBe('Adaptativo');
    expect(affixName('adaptativo', 'tecela')).toBe('Adaptativa');
    expect(affixName('igneo', 'tecela')).toBe('Ígnea');
    expect(affixName('sangue', 'tecela')).toBe('Sangue Convergente');
  });

  it('barra da Tecelã: nome inteiro, afixo e Portadora de Dedo', () => {
    const spec = bossSpecFor(10, lineup('tecela', ['adaptativo'], true));
    expect(bossBarLabel(spec)).toBe('Tecelã de Maldições · Adaptativa · Portadora de Dedo');
  });

  it('barra do Oni: forma masculina, afixos na ordem da escalação e Portador de Dedo', () => {
    const spec = bossSpecFor(15, lineup('oni', ['invocador', 'igneo'], true));
    expect(bossBarLabel(spec)).toBe('Oni do Portão · Invocador · Ígneo · Portador de Dedo');
  });

  it('sem afixo e sem Portador, a barra mostra só o nome', () => {
    expect(bossBarLabel(bossSpecFor(5, lineup('oni', [])))).toBe('Oni do Portão');
  });

  it('o aviso usa o nome curto, os afixos e o Portador(a)', () => {
    expect(announceText(lineup('oni', ['igneo']))).toBe('Próximo: Oni · Ígneo');
    expect(announceText(lineup('tecela', ['sangue', 'adaptativo'], true))).toBe(
      'Próximo: Tecelã · Sangue Convergente · Adaptativa · Portadora de Dedo',
    );
    expect(announceText(lineup('oni', [], true))).toBe('Próximo: Oni · Portador de Dedo');
  });
});

describe('Glifos ao lado da barra (BRD-02)', () => {
  it('um glifo por afixo, na ordem da escalação, mais o R do Portador', () => {
    expect(glyphKeys({ affixes: ['sangue', 'igneo'], finger: false })).toEqual(['r', 'a']);
    expect(glyphKeys({ affixes: ['adaptativo', 'invocador'], finger: true })).toEqual(['A', 'u', 'R']);
    expect(glyphKeys({ affixes: [], finger: false })).toEqual([]);
  });
});

describe('Contorno do sprite (BRD-03)', () => {
  it('nenhum afixo de contorno: null em qualquer instante', () => {
    expect(outlineKeyAt([], 0)).toBeNull();
    expect(outlineKeyAt(['sangue', 'adaptativo'], 600)).toBeNull();
  });

  it('um afixo de contorno: a cor dele o tempo todo', () => {
    for (const ms of [0, 599, 600, 1200]) {
      expect(outlineKeyAt(['igneo', 'sangue'], ms)).toBe('a');
      expect(outlineKeyAt(['invocador'], ms)).toBe('u');
    }
  });

  it('Ígneo e Invocador: alterna na ordem da escalação a cada 600 ms', () => {
    const both = ['igneo', 'invocador'] as const;
    expect(outlineKeyAt(both, 0)).toBe('a');
    expect(outlineKeyAt(both, 599)).toBe('a');
    expect(outlineKeyAt(both, 600)).toBe('u');
    expect(outlineKeyAt(both, 1199)).toBe('u');
    expect(outlineKeyAt(both, 1200)).toBe('a');
    expect(outlineKeyAt(['invocador', 'sangue', 'igneo'], 599)).toBe('u');
    expect(outlineKeyAt(['invocador', 'sangue', 'igneo'], 600)).toBe('a');
  });
});
