import { describe, expect, it } from 'vitest';
import {
  affixName,
  announceText,
  bossBarLabel,
  bossTuningFor,
  cyclesFor,
  glyphKeys,
  outlineKeyAt,
  packBarLabel,
  summonCount,
  summonSpots,
  type BossLineup,
} from '../../src/core/bossAffix';
import { bossSpecFor } from '../../src/core/bossTier';
import { Run } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { BOSS, RUN, SHOP, WAVE } from '../../src/data/tuning';

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

  describe('quebra do rótulo da barra (BRD-01)', () => {
    /** Largura de fonte monoespaçada: 7 px por caractere. */
    const mono = (text: string): number => text.length * 7;

    it('cabe na largura: uma linha só, igual ao rótulo', () => {
      expect(packBarLabel('Oni do Portão · Ígneo', mono, 400)).toEqual(['Oni do Portão · Ígneo']);
    });

    it('passa da largura: quebra entre as partes, sem o separador na ponta e sem partir um nome', () => {
      const label = 'Tecelã de Maldições · Sangue Convergente · Adaptativa · Portadora de Dedo';
      expect(packBarLabel(label, mono, 400)).toEqual([
        'Tecelã de Maldições · Sangue Convergente · Adaptativa',
        'Portadora de Dedo',
      ]);
      expect(packBarLabel(label, mono, 210)).toEqual([
        'Tecelã de Maldições',
        'Sangue Convergente',
        'Adaptativa · Portadora de Dedo',
      ]);
    });

    it('uma parte mais larga que o limite fica inteira na sua linha', () => {
      expect(packBarLabel('Tecelã de Maldições · Ígnea', mono, 70)).toEqual(['Tecelã de Maldições', 'Ígnea']);
    });
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

describe('Ciclos por arquétipo (CYC-01..04) e o feixe do Sangue (SNG-01)', () => {
  it('fase 1 é charge, leap nos dois arquétipos (CYC-02)', () => {
    expect(cyclesFor('oni', [])[1]).toEqual(['charge', 'leap']);
    expect(cyclesFor('tecela', [])[1]).toEqual(['charge', 'leap']);
  });

  it('Oni: fase 2 doubleCharge, volley, leap; fase 3 volley, charge, tripleLeap, doubleCharge (CYC-03)', () => {
    const c = cyclesFor('oni', []);
    expect(c[2]).toEqual(['doubleCharge', 'volley', 'leap']);
    expect(c[3]).toEqual(['volley', 'charge', 'tripleLeap', 'doubleCharge']);
  });

  it('Tecelã: fase 2 charge, volley, threadRain; fase 3 threadRain, volley, charge, tripleLeap (CYC-04)', () => {
    const c = cyclesFor('tecela', []);
    expect(c[2]).toEqual(['charge', 'volley', 'threadRain']);
    expect(c[3]).toEqual(['threadRain', 'volley', 'charge', 'tripleLeap']);
  });

  it('com Sangue, beam na 2ª posição de cada fase, nos dois arquétipos (SNG-01)', () => {
    expect(cyclesFor('oni', ['sangue'])).toEqual({
      1: ['charge', 'beam', 'leap'],
      2: ['doubleCharge', 'beam', 'volley', 'leap'],
      3: ['volley', 'beam', 'charge', 'tripleLeap', 'doubleCharge'],
    });
    expect(cyclesFor('tecela', ['adaptativo', 'sangue'])).toEqual({
      1: ['charge', 'beam', 'leap'],
      2: ['charge', 'beam', 'volley', 'threadRain'],
      3: ['threadRain', 'beam', 'volley', 'charge', 'tripleLeap'],
    });
  });

  it('afixos sem ataque não mexem no ciclo e a tabela da tuning não muda', () => {
    expect(cyclesFor('oni', ['igneo', 'invocador', 'adaptativo'])).toEqual(cyclesFor('oni', []));
    cyclesFor('oni', ['sangue']);
    expect(BOSS.archetypes.oni.cycles[1]).toEqual(['charge', 'leap']);
  });
});

describe('Tuning derivada da escalação (AFX-01)', () => {
  it('a IA leva os ciclos do arquétipo e dos afixos e os números do BOSS; o cérebro é o BOSS', () => {
    const spec = bossSpecFor(10, { archetype: 'tecela', affixes: ['sangue'], finger: false });
    const { ai, brain } = bossTuningFor(spec);
    expect(ai.cycles).toEqual(cyclesFor('tecela', ['sangue']));
    expect(ai.phases).toEqual(BOSS.phases);
    expect(ai.charge).toEqual(BOSS.charge);
    expect(ai.leap).toEqual(BOSS.leap);
    expect(ai.volley).toEqual(BOSS.volley);
    expect(ai.doubleCharge).toEqual(BOSS.doubleCharge);
    expect(ai.tripleLeap).toEqual(BOSS.tripleLeap);
    expect(ai.threadRain).toEqual(BOSS.threadRain);
    expect(brain).toBe(BOSS);
  });

  it('Oni sem afixo: ciclos do Oni, não os de base do BOSS', () => {
    const { ai } = bossTuningFor({ archetype: 'oni', affixes: [] });
    expect(ai.cycles).toEqual(cyclesFor('oni', []));
    expect(ai.cycles[2]).not.toEqual(BOSS.cycles[2]);
  });
});

describe('Invocados por troca de fase com o teto de vivos (INV-01, INV-02)', () => {
  const alive = [0, 1, 2, 3, 4];

  it('r5: 2 invocados, cortados pelo teto de 4 vivos', () => {
    expect(alive.map((n) => summonCount(5, n))).toEqual([2, 2, 2, 1, 0]);
  });

  it('r10: 3 invocados, cortados pelo teto de 4 vivos', () => {
    expect(alive.map((n) => summonCount(10, n))).toEqual([3, 3, 2, 1, 0]);
  });

  it('vivos acima do teto não dão contagem negativa', () => {
    expect(summonCount(15, 6)).toBe(0);
  });
});

describe('Invocados nascem ao lado do chefe (INV-01)', () => {
  const base = { bossX: 500, halfW: 20, towardPlayer: 1 as const, minX: 0, maxX: 1000 };

  it('alterna os lados a partir das costas do chefe, a 28 px da borda do corpo e mais 28 a cada um', () => {
    expect(summonSpots({ ...base, count: 3 })).toEqual([452, 548, 424]);
    expect(summonSpots({ ...base, towardPlayer: -1, count: 2 })).toEqual([548, 452]);
  });

  it('encostado na parede, o lado sem espaço fica de fora e o outro recebe os invocados que cabem', () => {
    expect(summonSpots({ ...base, bossX: 40, minX: 16, count: 3 })).toEqual([88, 116, 144]);
  });

  it('sem espaço dos dois lados, devolve menos que o pedido', () => {
    expect(summonSpots({ ...base, minX: 460, maxX: 560, count: 3 })).toEqual([548]);
  });
});
