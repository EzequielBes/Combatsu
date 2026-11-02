import { describe, expect, it } from 'vitest';
import { PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import { CHOICE_PANEL_COLORS, ChoicePanel } from '../../src/game/ChoicePanel';
import type { ChoicePage } from '../../src/game/axisSnapshot';

/** Objeto de jogo falso: guarda o que o painel escreve (visível, texto, cor da borda) e deixa o resto encadear. */
interface Fake {
  visible: boolean;
  text: string;
  strokeColor: number;
  [method: string]: unknown;
}

const makeFake = (): Fake => {
  const state: Fake = { visible: true, text: '', strokeColor: -1 };
  const self: Fake = new Proxy(state, {
    get: (target, prop: string) => {
      if (prop in target) return target[prop];
      if (prop === 'setVisible') return (v: boolean) => ((target.visible = v), self);
      if (prop === 'setText') return (t: string) => ((target.text = t), self);
      if (prop === 'setStrokeStyle') return (_w: number, color: number) => ((target.strokeColor = color), self);
      return () => self; // setOrigin, setDepth, setScrollFactor, setWordWrapWidth...
    },
  });
  return self;
};

const scene = { add: { rectangle: makeFake, text: makeFake } } as never;
const layer = { add: () => {} } as never;

const redPage: ChoicePage = { item: 'vermelho', options: ['Ricochete', 'Contido'] };
const bodyPage: ChoicePage = { item: 'corpo', options: ['Cadência', 'Onda do Punho'] };

describe('cores do painel de ramo (ART-01)', () => {
  it('só chaves da PALETTE', () => {
    for (const key of Object.values(CHOICE_PANEL_COLORS)) expect(PALETTE_KEYS.has(key)).toBe(true);
  });
});

describe('ChoicePanel: a vista do ramo (CRD-08, CRD-09)', () => {
  it('nasce fechado, com page nulo no debug', () => {
    const panel = new ChoicePanel(scene, layer);
    expect(panel.open).toBe(false);
    expect(panel.debug()).toEqual({ open: false, page: null });
  });

  it('show abre com as duas opções e a A realçada', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(redPage);
    expect(panel.open).toBe(true);
    expect(panel.selected).toBe(0);
    expect(panel.debug()).toEqual({ open: true, page: { item: 'vermelho', options: ['Ricochete', 'Contido'] } });
  });

  it('select move o realce entre A e B e volta', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(bodyPage);
    const strokes = (): number[] =>
      (panel as unknown as { cards: { border: Fake }[] }).cards.map((c) => c.border.strokeColor);
    expect(strokes()).toEqual([PALETTE[CHOICE_PANEL_COLORS.borderSelected], PALETTE[CHOICE_PANEL_COLORS.border]]);
    panel.select(1);
    expect(panel.selected).toBe(1);
    expect(strokes()).toEqual([PALETTE[CHOICE_PANEL_COLORS.border], PALETTE[CHOICE_PANEL_COLORS.borderSelected]]);
    panel.select(0);
    expect(strokes()).toEqual([PALETTE[CHOICE_PANEL_COLORS.borderSelected], PALETTE[CHOICE_PANEL_COLORS.border]]);
  });

  it('as cartas mostram o nome do ramo e o Despertar que ele abre', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(redPage);
    const cards = (panel as unknown as { cards: { name: Fake; awakening: Fake }[] }).cards;
    expect(cards.map((c) => c.name.text)).toEqual(['Ricochete', 'Contido']);
    expect(cards.map((c) => c.awakening.text)).toEqual(['Despertar: Fliperama', 'Despertar: Vermelho Máximo']);
    panel.show(bodyPage);
    expect(cards.map((c) => c.awakening.text)).toEqual(['Despertar: Martelo Negro', 'Despertar: Punho que Rasga']);
  });

  it('show de outra página volta o realce à opção A', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(redPage);
    panel.select(1);
    panel.show(bodyPage);
    expect(panel.selected).toBe(0);
    expect(panel.debug().page?.item).toBe('corpo');
  });

  it('hide fecha o painel e esconde todos os objetos', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(redPage);
    panel.hide();
    expect(panel.open).toBe(false);
    expect(panel.debug()).toEqual({ open: false, page: null });
    const all = panel as unknown as { bg: Fake; cards: { border: Fake; name: Fake }[] };
    expect(all.bg.visible).toBe(false);
    expect(all.cards.every((c) => !c.border.visible && !c.name.visible)).toBe(true);
  });
});

describe('ChoicePanel: páginas do Baú do Véu e do baú do chefe (VEU-02, DNV-02, DDB-01)', () => {
  const veilPage: ChoicePage = {
    item: 'veu',
    options: ['Santuário Malevolente', 'Jackpot'],
    lines: ['Cortes nos alvos perto a cada acerto', 'Tambores: energia livre no jackpot'],
  };
  const bossPage: ChoicePage = {
    item: 'bauChefe',
    options: ['Domínio Nv 2', 'Divergente Nv 3'],
    lines: ['Mais tempo e mais alvos', 'A técnica sobe um nível'],
  };
  const texts = (panel: ChoicePanel) => {
    const p = panel as unknown as { title: Fake; subtitle: Fake; cards: { name: Fake; awakening: Fake }[] };
    return {
      title: p.title.text,
      subtitle: p.subtitle.text,
      names: p.cards.map((c) => c.name.text),
      lines: p.cards.map((c) => c.awakening.text),
    };
  };

  it('página veu: título do baú e as 2 opções com título e linha de efeito', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(veilPage);
    expect(texts(panel)).toEqual({
      title: 'Baú do Véu',
      subtitle: 'Escolha a Expansão de Domínio',
      names: ['Santuário Malevolente', 'Jackpot'],
      lines: ['Cortes nos alvos perto a cada acerto', 'Tambores: energia livre no jackpot'],
    });
  });

  it('página bauChefe: título do baú do chefe e as 2 opções com título e linha', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(bossPage);
    expect(texts(panel)).toEqual({
      title: 'Baú do Chefe',
      subtitle: 'Escolha a recompensa do chefe',
      names: ['Domínio Nv 2', 'Divergente Nv 3'],
      lines: ['Mais tempo e mais alvos', 'A técnica sobe um nível'],
    });
  });

  it.each([
    ['veu', veilPage],
    ['bauChefe', bossPage],
  ] as const)('%s: select e debug().page.item', (item, page) => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(page);
    expect(panel.selected).toBe(0);
    panel.select(1);
    expect(panel.selected).toBe(1);
    expect(panel.debug()).toEqual({ open: true, page: { item, options: page.options, lines: page.lines } });
  });

  it('as páginas de ramo da F30 ficam iguais depois de uma página de baú', () => {
    const panel = new ChoicePanel(scene, layer);
    panel.show(veilPage);
    panel.show(redPage);
    expect(texts(panel)).toEqual({
      title: 'Ramo do Vermelho',
      subtitle: 'Escolha o ramo (uma vez por run)',
      names: ['Ricochete', 'Contido'],
      lines: ['Despertar: Fliperama', 'Despertar: Vermelho Máximo'],
    });
    expect(panel.debug()).toEqual({ open: true, page: { item: 'vermelho', options: ['Ricochete', 'Contido'] } });
    panel.show(bodyPage);
    expect(texts(panel).title).toBe('Ramo do Corpo Amaldiçoado');
  });
});
