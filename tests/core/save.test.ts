/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import {
  MIGRATIONS,
  SAVE_KEY,
  SAVE_VERSION,
  parseSave,
  serializeSave,
  validateRecord,
  type Migration,
  type RunRecord,
} from '../../src/core/save';
import source from '../../src/core/save.ts?raw';

const record = (over: Partial<RunRecord> = {}): RunRecord => ({
  round: 4,
  kills: 23,
  build: {
    techniques: [
      { id: 'azul', level: 2 },
      { id: 'vermelho', level: 1 },
    ],
    perks: ['p1', 'p2'],
    relic: { id: 'manoplas', level: 1 },
    weapon: { id: 'bastao', level: 3 },
    vows: ['v1'],
  },
  ...over,
});

/** Save cru de uma versão qualquer, com um recorde mexido por `patch` (pode quebrar o formato de propósito). */
const raw = (patch: (r: Record<string, unknown>) => void = () => {}, version: unknown = SAVE_VERSION): string => {
  const r = JSON.parse(JSON.stringify(record())) as Record<string, unknown>;
  patch(r);
  return JSON.stringify({ version, record: r });
};
const build = (r: Record<string, unknown>) => r.build as Record<string, unknown>;

describe('formato do save (SAVE-02)', () => {
  it('chave combatsu.save, versão 1 e nenhuma migração ainda', () => {
    expect(SAVE_KEY).toBe('combatsu.save');
    expect(SAVE_VERSION).toBe(1);
    expect(Object.keys(MIGRATIONS)).toEqual([]);
  });

  it('serializa como { version: 1, record }', () => {
    expect(JSON.parse(serializeSave(record()))).toEqual({ version: 1, record: record() });
    expect(JSON.parse(serializeSave(null))).toEqual({ version: 1, record: null });
  });

  it('ida e volta: serializeSave → parseSave devolve o mesmo recorde', () => {
    expect(parseSave(serializeSave(record()))).toEqual({ kind: 'ok', save: { version: 1, record: record() } });
    expect(parseSave(serializeSave(null))).toEqual({ kind: 'ok', save: { version: 1, record: null } });
  });

  it('relíquia e arma nulas passam', () => {
    const r = record({ build: { ...record().build, relic: null, weapon: null } });
    expect(parseSave(serializeSave(r))).toEqual({ kind: 'ok', save: { version: 1, record: r } });
  });
});

describe('save ausente ou quebrado (SAVE-05)', () => {
  it('null e string vazia → empty', () => {
    expect(parseSave(null)).toEqual({ kind: 'empty' });
    expect(parseSave('')).toEqual({ kind: 'empty' });
  });

  it('JSON inválido, não objeto ou sem record → invalid', () => {
    for (const s of ['{', 'nada', '42', 'null', '[]', '"x"', '{"version":1}']) {
      expect(parseSave(s), s).toEqual({ kind: 'invalid' });
    }
  });

  it('version ausente, não inteira ou de outro tipo → invalid', () => {
    expect(parseSave(JSON.stringify({ record: null }))).toEqual({ kind: 'invalid' });
    expect(parseSave(raw(undefined, 1.5))).toEqual({ kind: 'invalid' });
    expect(parseSave(raw(undefined, '1'))).toEqual({ kind: 'invalid' });
    expect(parseSave(raw(undefined, null))).toEqual({ kind: 'invalid' });
  });

  it('versão abaixo da primeira não tem passo → invalid', () => {
    expect(parseSave(raw(undefined, 0))).toEqual({ kind: 'invalid' });
  });
});

describe('validação do recorde, nos dois lados de cada limiar (SAVE-06)', () => {
  it('round: 0 recusa, 1 aceita', () => {
    expect(parseSave(raw((r) => (r.round = 0)))).toEqual({ kind: 'invalid' });
    const ok = parseSave(raw((r) => (r.round = 1)));
    expect(ok.kind === 'ok' && ok.save.record?.round).toBe(1);
  });

  it('kills: -1 recusa, 0 aceita', () => {
    expect(parseSave(raw((r) => (r.kills = -1)))).toEqual({ kind: 'invalid' });
    const ok = parseSave(raw((r) => (r.kills = 0)));
    expect(ok.kind === 'ok' && ok.save.record?.kills).toBe(0);
  });

  it('level da técnica: 0 recusa, 1 aceita', () => {
    const at = (level: number) => raw((r) => ((build(r).techniques as { level: number }[])[0].level = level));
    expect(parseSave(at(0))).toEqual({ kind: 'invalid' });
    const ok = parseSave(at(1));
    expect(ok.kind === 'ok' && ok.save.record?.build.techniques[0].level).toBe(1);
  });

  it('level da relíquia e da arma: 0 recusa, 1 aceita', () => {
    for (const key of ['relic', 'weapon']) {
      const at = (level: number) => raw((r) => (build(r)[key] = { id: 'x', level }));
      expect(parseSave(at(0)), key).toEqual({ kind: 'invalid' });
      expect(parseSave(at(1)).kind, key).toBe('ok');
    }
  });

  it('números não inteiros (1.5) recusam', () => {
    expect(validateRecord({ ...record(), round: 1.5 })).toBeNull();
    expect(validateRecord({ ...record(), kills: 1.5 })).toBeNull();
    expect(
      validateRecord(record({ build: { ...record().build, techniques: [{ id: 'azul', level: 1.5 }] } })),
    ).toBeNull();
    expect(validateRecord(record({ build: { ...record().build, relic: { id: 'x', level: 1.5 } } }))).toBeNull();
  });

  it('tipos errados recusam', () => {
    const bad: ((r: Record<string, unknown>) => void)[] = [
      (r) => (r.round = '4'),
      (r) => (r.kills = null),
      (r) => delete r.build,
      (r) => (r.build = []),
      (r) => (build(r).techniques = 'azul'),
      (r) => (build(r).techniques = [{ id: 7, level: 1 }]),
      (r) => (build(r).techniques = [{ level: 1 }]),
      (r) => (build(r).techniques = ['azul']),
      (r) => (build(r).perks = [1]),
      (r) => delete build(r).perks,
      (r) => (build(r).vows = 'v1'),
      (r) => (build(r).vows = [null]),
      (r) => (build(r).relic = 'manoplas'),
      (r) => delete build(r).relic,
      (r) => (build(r).weapon = { id: 'bastao' }),
      (r) => delete build(r).weapon,
    ];
    bad.forEach((patch, i) => expect(parseSave(raw(patch)), `caso ${i}`).toEqual({ kind: 'invalid' }));
    expect(validateRecord(null)).toBeNull();
    expect(validateRecord('x')).toBeNull();
    expect(validateRecord([])).toBeNull();
  });

  it('id desconhecido continua válido', () => {
    const r = record({
      build: {
        techniques: [{ id: 'tecnica-que-sumiu', level: 1 }],
        perks: ['passiva-renomeada'],
        relic: { id: 'reliquia-velha', level: 1 },
        weapon: { id: 'arma-velha', level: 2 },
        vows: ['voto-antigo'],
      },
    });
    expect(validateRecord(r)).toEqual(r);
    expect(parseSave(serializeSave(r))).toEqual({ kind: 'ok', save: { version: 1, record: r } });
  });

  it('devolve uma cópia limpa, sem campos a mais', () => {
    const dirty = { ...record(), extra: 1, build: { ...record().build, lixo: true } };
    expect(validateRecord(dirty)).toEqual(record());
  });
});

describe('migração por passos (SAVE-03) e save mais novo (SAVE-04)', () => {
  // Passos sintéticos: o 1 multiplica os abates por 10 e o 2 soma 1. Na ordem certa, 2 vira 21; ao contrário, 30.
  const calls: number[] = [];
  const kills = (old: Record<string, unknown>) => (old.record as { kills: number }).kills;
  const withKills = (old: Record<string, unknown>, k: number) => ({
    ...old,
    record: { ...(old.record as object), kills: k },
  });
  const steps: Record<number, Migration> = {
    1: (old) => (calls.push(1), withKills(old, kills(old) * 10)),
    2: (old) => (calls.push(2), withKills(old, kills(old) + 1)),
  };
  const v = (version: number, k = 2) => raw((r) => (r.kills = k), version);

  it('da v1 com current = 3 aplica o passo 1 e depois o 2', () => {
    calls.length = 0;
    const res = parseSave(v(1), steps, 3);
    expect(calls).toEqual([1, 2]);
    expect(res.kind === 'ok' && res.save).toEqual({ version: 3, record: record({ kills: 21 }) });
  });

  it('cada passo recebe a versão de origem e o carregador acerta a versão depois', () => {
    const seen: unknown[] = [];
    const spy: Record<number, Migration> = { 1: (o) => (seen.push(o.version), o), 2: (o) => (seen.push(o.version), o) };
    expect(parseSave(v(1), spy, 3).kind).toBe('ok');
    expect(seen).toEqual([1, 2]);
  });

  it('da v2 aplica só o passo 2; na versão atual não aplica nenhum', () => {
    calls.length = 0;
    const from2 = parseSave(v(2), steps, 3);
    expect(calls).toEqual([2]);
    expect(from2.kind === 'ok' && from2.save.record?.kills).toBe(3);
    calls.length = 0;
    const from3 = parseSave(v(3), steps, 3);
    expect(calls).toEqual([]);
    expect(from3.kind === 'ok' && from3.save.record?.kills).toBe(2);
  });

  it('passo faltando no meio → invalid', () => {
    expect(parseSave(v(1), { 1: steps[1] }, 3)).toEqual({ kind: 'invalid' });
    expect(parseSave(v(1), { 2: steps[2] }, 3)).toEqual({ kind: 'invalid' });
  });

  it('passo que lança ou devolve lixo → invalid', () => {
    const throws: Migration = () => {
      throw new Error('quebrou');
    };
    expect(parseSave(v(1), { 1: throws }, 2)).toEqual({ kind: 'invalid' });
    expect(parseSave(v(1), { 1: () => null as unknown as Record<string, unknown> }, 2)).toEqual({ kind: 'invalid' });
  });

  it('recorde inválido depois da migração → invalid', () => {
    const breaks: Migration = (old) => withKills(old, -1);
    expect(parseSave(v(1), { 1: breaks }, 2)).toEqual({ kind: 'invalid' });
  });

  it('versão maior que a atual → newer, sem aplicar passo', () => {
    calls.length = 0;
    expect(parseSave(v(4), steps, 3)).toEqual({ kind: 'newer', version: 4 });
    expect(calls).toEqual([]);
    expect(parseSave(raw(undefined, 2))).toEqual({ kind: 'newer', version: 2 });
    expect(parseSave(JSON.stringify({ version: 9, record: 'formato que ainda não existe' }))).toEqual({
      kind: 'newer',
      version: 9,
    });
  });
});

describe('regra pura (SAVE-01)', () => {
  it('o código-fonte não cita o motor nem o localStorage', () => {
    expect(source.length).toBeGreaterThan(0);
    expect(source).not.toMatch(/phaser/i);
    expect(source).not.toContain('localStorage');
  });
});
