import { describe, expect, it, vi } from 'vitest';
import { deferContact, newEntityId, routeContact, routeContacts, tagBody, tagOf, type BodyTag } from '../../src/game/bodyTags';

const character = (id: number): BodyTag => ({ kind: 'character', target: { id, team: 'enemy', receiveHit: vi.fn(() => true) } });

describe('routeContact', () => {
  it('avisa o corpo ativo com a tag do outro corpo, nas duas ordens', () => {
    const onTouch = vi.fn();
    const active = {};
    const enemy = {};
    const enemyTag = character(7);
    tagBody(active, { kind: 'active', onTouch });
    tagBody(enemy, enemyTag);

    routeContact(active, enemy);
    routeContact(enemy, active);

    expect(onTouch).toHaveBeenCalledTimes(2);
    expect(onTouch).toHaveBeenCalledWith(enemyTag);
  });

  it('ignora contato com corpo sem tag', () => {
    const onTouch = vi.fn();
    const active = {};
    tagBody(active, { kind: 'active', onTouch });
    routeContact(active, {});
    expect(onTouch).not.toHaveBeenCalled();
  });

  it('acha a tag pelo corpo pai quando o contato vem de uma parte', () => {
    const parent = {};
    const part = { parent };
    const tag: BodyTag = { kind: 'terrain' };
    tagBody(parent, tag);
    expect(tagOf(part)).toBe(tag);
  });
});

describe('routeContacts', () => {
  /** Um corpo ativo que registra o que fez numa lista comum, para conferir a ordem das chamadas. */
  const activeBody = (log: string[], name: string, defer?: () => void): object => {
    const body = {};
    tagBody(body, {
      kind: 'active',
      onTouch: () => {
        log.push(`touch:${name}`);
        if (defer) deferContact(defer);
      },
    });
    return body;
  };

  it('roda as funções adiadas depois do último toque, uma vez cada, na ordem do registro (TGT-04)', () => {
    const log: string[] = [];
    const enemy = {};
    tagBody(enemy, character(1));
    const pairs = ['a', 'b', 'c'].map((n) => ({
      bodyA: activeBody(log, n, () => log.push(`deferred:${n}`)),
      bodyB: enemy,
    }));

    routeContacts(pairs);

    expect(log).toEqual(['touch:a', 'touch:b', 'touch:c', 'deferred:a', 'deferred:b', 'deferred:c']);
  });

  it('esvazia a fila: o evento seguinte não repete as funções do anterior', () => {
    const deferred = vi.fn();
    const enemy = {};
    tagBody(enemy, character(1));
    routeContacts([{ bodyA: activeBody([], 'a', deferred), bodyB: enemy }]);
    expect(deferred).toHaveBeenCalledTimes(1);

    routeContacts([]);

    expect(deferred).toHaveBeenCalledTimes(1);
  });

  it('roda também a função adiada registrada durante a fila, no mesmo routeContacts', () => {
    const log: string[] = [];
    const enemy = {};
    tagBody(enemy, character(1));
    const outer = (): void => {
      log.push('outer');
      deferContact(() => log.push('inner'));
    };

    routeContacts([{ bodyA: activeBody(log, 'a', outer), bodyB: enemy }]);

    expect(log).toEqual(['touch:a', 'outer', 'inner']);
  });
});

describe('newEntityId', () => {
  it('gera ids únicos e maiores que zero', () => {
    const a = newEntityId();
    const b = newEntityId();
    expect(a).toBeGreaterThan(0);
    expect(b).not.toBe(a);
  });
});
