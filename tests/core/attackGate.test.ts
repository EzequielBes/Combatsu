import { describe, expect, it } from 'vitest';
import { AttackGate } from '../../src/core/attackGate';
import { ATTACK_GATE } from '../../src/data/tuning';

const gate = (): AttackGate => new AttackGate(ATTACK_GATE);

describe('ATTACK_GATE: tuning da spec', () => {
  it('2 vagas e 350 ms entre windups (LIM-01, LIM-02)', () => {
    expect(ATTACK_GATE).toEqual({ maxActive: 2, minWindupGapMs: 350 });
  });
});

describe('AttackGate: vagas e fila FIFO (LIM-01, LIM-04)', () => {
  it('as duas primeiras requisições ganham vaga; a 3ª não', () => {
    const g = gate();
    expect(g.request(1)).toBe(true);
    expect(g.request(2)).toBe(true);
    expect(g.request(3)).toBe(false);
    expect(g.activeCount()).toBe(2);
    expect(g.isGranted(3)).toBe(false);
  });

  it('a vaga liberada vai para o mais antigo da fila (FIFO)', () => {
    const g = gate();
    g.request(1);
    g.request(2);
    g.request(3);
    g.request(4);
    g.request(5);
    expect(g.queueOrder()).toEqual([3, 4, 5]);
    g.release(1);
    expect(g.isGranted(3)).toBe(true);
    expect(g.isGranted(4)).toBe(false);
    expect(g.queueOrder()).toEqual([4, 5]);
    g.release(2);
    expect(g.isGranted(4)).toBe(true);
    expect(g.queueOrder()).toEqual([5]);
    expect(g.activeCount()).toBe(2);
  });

  it('request repetido não duplica a entrada na fila nem a vaga', () => {
    const g = gate();
    g.request(1);
    g.request(1);
    g.request(2);
    g.request(3);
    g.request(3);
    g.request(3);
    expect(g.activeCount()).toBe(2);
    expect(g.queueOrder()).toEqual([3]);
    expect(g.request(1)).toBe(true);
  });

  it('request repetido de quem espera não muda a posição na fila', () => {
    const g = gate();
    [1, 2, 3, 4].forEach((id) => g.request(id));
    g.request(3);
    expect(g.queueOrder()).toEqual([3, 4]);
  });

  it('com tuning não padrão (1 vaga) só um ganha vaga', () => {
    const g = new AttackGate({ maxActive: 1, minWindupGapMs: 100 });
    expect(g.request(1)).toBe(true);
    expect(g.request(2)).toBe(false);
    g.release(1);
    expect(g.isGranted(2)).toBe(true);
  });
});

describe('AttackGate: release (LIM-06)', () => {
  it('liberar quem tem vaga abre a vaga no mesmo instante', () => {
    const g = gate();
    g.request(1);
    g.request(2);
    g.release(1);
    expect(g.isGranted(1)).toBe(false);
    expect(g.activeCount()).toBe(2 - 1);
    expect(g.request(3)).toBe(true);
  });

  it('liberar quem está na fila só o tira da fila', () => {
    const g = gate();
    [1, 2, 3, 4].forEach((id) => g.request(id));
    g.release(3);
    expect(g.queueOrder()).toEqual([4]);
    expect(g.activeCount()).toBe(2);
  });

  it('release é idempotente e ignora ids desconhecidos', () => {
    const g = gate();
    g.request(1);
    g.release(1);
    g.release(1);
    g.release(99);
    expect(g.activeCount()).toBe(0);
    expect(g.queueOrder()).toEqual([]);
  });

  it('um release repetido não devolve vaga a mais: o terceiro continua sem vaga com duas ocupadas', () => {
    const g = gate();
    g.request(1);
    g.request(2);
    g.release(1);
    g.release(1);
    g.request(3);
    expect(g.request(4)).toBe(false);
    expect(g.activeCount()).toBe(2);
  });
});

describe('AttackGate: intervalo entre windups (LIM-02)', () => {
  it('permitido antes de qualquer windup', () => {
    expect(gate().windupAllowed()).toBe(true);
  });

  it('349 ms depois do windup: não permitido; 350 ms: permitido', () => {
    const g = gate();
    g.noteWindup(1);
    expect(g.windupAllowed()).toBe(false);
    g.update(349);
    expect(g.windupAllowed()).toBe(false);
    g.update(1);
    expect(g.windupAllowed()).toBe(true);
  });

  it('um novo windup reinicia a contagem', () => {
    const g = gate();
    g.noteWindup(1);
    g.update(400);
    g.noteWindup(2);
    g.update(349);
    expect(g.windupAllowed()).toBe(false);
    g.update(1);
    expect(g.windupAllowed()).toBe(true);
  });

  it('usa minWindupGapMs do tuning (100 ms)', () => {
    const g = new AttackGate({ maxActive: 2, minWindupGapMs: 100 });
    g.noteWindup(1);
    g.update(99);
    expect(g.windupAllowed()).toBe(false);
    g.update(1);
    expect(g.windupAllowed()).toBe(true);
  });
});

describe('AttackGate: reset (EDG-03)', () => {
  it('limpa vagas, fila e o intervalo', () => {
    const g = gate();
    [1, 2, 3].forEach((id) => g.request(id));
    g.noteWindup(1);
    g.reset();
    expect(g.activeCount()).toBe(0);
    expect(g.queueOrder()).toEqual([]);
    expect(g.isGranted(1)).toBe(false);
    expect(g.windupAllowed()).toBe(true);
    expect(g.request(3)).toBe(true);
  });
});
