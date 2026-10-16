import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Loadout } from '../../src/core/loadout';
import { AxisDirector } from '../../src/scenes/test/axisDirector';
import type { TestScene } from '../../src/scenes/TestScene';

/** Parâmetros de URL do debug neste teste (o `debugParam` de verdade lê o `window.location`). */
const params = new Map<string, string>();
vi.mock('../../src/scenes/test/params', () => ({ debugParam: (name: string) => params.get(name) ?? null }));

/** Cena falsa com o mínimo que o diretor usa: o `Loadout` de verdade, os eventos, o banner e a câmera lenta. */
function rig(equipRed = true) {
  const loadout = new Loadout();
  if (equipRed) loadout.equip(0, 'vermelho');
  const events: string[] = [];
  const banners: string[] = [];
  const slow: number[][] = [];
  const scene = {
    loadout,
    snapshot: { debugEvents: events },
    hud: { banner: (text: string) => banners.push(text) },
    effects: { slowMo: { trigger: (scale: number, ms: number) => slow.push([scale, ms]) } },
  } as unknown as TestScene;
  return { axes: new AxisDirector(scene), loadout, events, banners, slow };
}

beforeEach(() => params.clear());

describe('AxisDirector.applyDebug: axes= e ramo= (VRM-10, VRM-18, CRP-14)', () => {
  it('Potência 3 e Escala 2 levam o Vermelho ao Nv 6 com raio 144 e toque 45', () => {
    params.set('axes', 'vermelho.potencia:3,vermelho.escala:2');
    const r = rig();
    r.axes.applyDebug();
    const red = r.axes.snapshot().vermelho!;
    expect(red.level).toBe(6);
    expect(red.stats.radius).toBe(144);
    expect(red.stats.touch).toBe(45);
    expect(red.axes).toMatchObject({ potencia: 3, escala: 2, recarga: 0 });
  });

  it('o teto vale: Potência 4 fica em 3 e o 6º ponto do item some', () => {
    params.set('axes', 'vermelho.potencia:4,vermelho.escala:3');
    const r = rig();
    r.axes.applyDebug();
    expect(r.loadout.axes.points('vermelho', 'potencia')).toBe(3);
    expect(r.loadout.axes.points('vermelho', 'escala')).toBe(2);
    expect(r.axes.snapshot().vermelho!.level).toBe(6);
  });

  it('VRM-11: o ponto que leva ao Nv 2 emite branchPending:vermelho uma vez', () => {
    params.set('axes', 'vermelho.potencia:2');
    const r = rig();
    r.axes.applyDebug();
    expect(r.events).toEqual(['axis:vermelho.potencia', 'branchPending:vermelho', 'axis:vermelho.potencia']);
    expect(r.axes.choicePages()).toEqual([{ item: 'vermelho', options: ['Ricochete', 'Contido'] }]);
  });

  it('ramo=vermelho:a depois dos eixos grava o Ricochete e tira o item da fila', () => {
    params.set('axes', 'vermelho.potencia:1');
    params.set('ramo', 'vermelho:a');
    const r = rig();
    r.axes.applyDebug();
    expect(r.axes.snapshot().vermelho!.branch).toBe('ricochete');
    expect(r.axes.choicePages()).toEqual([]);
    expect(r.events).toContain('branch:vermelho:ricochete');
  });

  it('ramo no Nv 1 é recusado; com Nv 5 o ramo liga o Despertar', () => {
    params.set('ramo', 'vermelho:b');
    const low = rig();
    low.axes.applyDebug();
    expect(low.axes.snapshot().vermelho!.branch).toBeNull();
    params.set('axes', 'vermelho.potencia:2,vermelho.recarga:2');
    const high = rig();
    high.axes.applyDebug();
    expect(high.axes.snapshot().vermelho).toMatchObject({ level: 5, branch: 'contido', awakened: true });
    expect(high.events.slice(-2)).toEqual(['branch:vermelho:contido', 'awaken:vermelho']);
  });

  it('sem o Vermelho equipado: entradas do Vermelho ignoradas, snapshot null; o Corpo recebe ponto', () => {
    params.set('axes', 'vermelho.potencia:2,corpo.impacto:2');
    params.set('ramo', 'vermelho:a,corpo:b');
    const r = rig(false);
    r.axes.applyDebug();
    const snap = r.axes.snapshot();
    expect(snap.vermelho).toBeNull();
    expect(r.loadout.axes.total('vermelho')).toBe(0);
    expect(snap.corpo).toMatchObject({ level: 3, branch: 'ondaDoPunho', awakened: false, cadence: 0 });
    expect(snap.corpo.axes.impacto).toBe(2);
  });
});

describe('AxisDirector: painel, anúncio e rodada', () => {
  it('confirmBranch aplica a opção do painel', () => {
    const r = rig();
    r.axes.applyAxis('vermelho', 'escala');
    r.axes.confirmBranch('vermelho', 1);
    expect(r.loadout.axes.branch('vermelho')).toBe('contido');
  });

  it('announce mostra o banner e a câmera lenta só na 1ª vez da rodada', () => {
    params.set('axes', 'vermelho.potencia:3,vermelho.escala:1');
    params.set('ramo', 'vermelho:a');
    const r = rig();
    r.axes.applyDebug();
    r.axes.announce('vermelho', 'Fliperama');
    r.axes.announce('vermelho', 'Fliperama');
    expect(r.banners).toEqual(['Fliperama']);
    // VRM-17.12: o tempo vai a 0,4 por 350 ms (de tempo real), uma vez só na rodada.
    expect(r.slow).toEqual([[0.4, 350]]);
    r.axes.onRoundStart();
    r.axes.announce('vermelho', 'Fliperama');
    expect(r.banners).toHaveLength(2);
  });

  it('CRP-13: o Despertar do Corpo também abre a câmera lenta 0,4 por 350 ms, uma vez na rodada', () => {
    params.set('axes', 'corpo.fluxo:3,corpo.alcance:1');
    params.set('ramo', 'corpo:a');
    const r = rig(false);
    r.axes.applyDebug();
    r.axes.announce('corpo', 'Martelo Negro');
    r.axes.announce('corpo', 'Martelo Negro');
    expect(r.banners).toEqual(['Martelo Negro']);
    expect(r.slow).toEqual([[0.4, 350]]);
  });
});
