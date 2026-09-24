import { describe, expect, it, vi } from 'vitest';
import { newEntityId, routeContact, tagBody, tagOf, type BodyTag } from '../../src/game/bodyTags';

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

describe('newEntityId', () => {
  it('gera ids únicos e maiores que zero', () => {
    const a = newEntityId();
    const b = newEntityId();
    expect(a).toBeGreaterThan(0);
    expect(b).not.toBe(a);
  });
});
