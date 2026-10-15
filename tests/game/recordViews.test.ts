import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import { RUN_TEXT_STYLE } from '../../src/game/Hud';
import { RECORD_COLORS, RecordMarker } from '../../src/game/RecordMarker';
import { SUMMARY_LINE_MAX, type SummaryLine } from '../../src/core/runSummary';
import { UI_SIZE } from '../../src/game/art/hd/screen';
import {
  PANEL_CENTER,
  PANEL_CHAR_W,
  PANEL_GAP_H,
  PANEL_INDENT,
  PANEL_LINE_H,
  PANEL_PAD,
  RunSummaryPanel,
  lineTops,
  panelBounds,
} from '../../src/game/RunSummaryPanel';

const hex = (key: string): string => `#${PALETTE[key].toString(16).padStart(6, '0')}`;

/** `Text` falso: guarda o que o adaptador repassa ao motor (L-043). */
function fakeText(x: number, y: number, style: { color: string }) {
  const t = {
    x,
    y,
    text: '',
    visible: true,
    origin: [0.5, 0.5],
    style: { ...style },
    colors: [] as string[],
    setText(s: string) {
      t.text = s;
      return t;
    },
    setColor(c: string) {
      t.colors.push(c);
      t.style.color = c;
      return t;
    },
    setVisible(v: boolean) {
      t.visible = v;
      return t;
    },
    setOrigin(ox: number, oy: number) {
      t.origin = [ox, oy];
      return t;
    },
    setPosition(px: number, py: number) {
      t.x = px;
      t.y = py;
      return t;
    },
    setScrollFactor: () => t,
    setDepth: () => t,
  };
  return t;
}

function makeMarker() {
  const made: ReturnType<typeof fakeText>[] = [];
  const styles: unknown[] = [];
  const added: unknown[] = [];
  const scene = {
    add: {
      text: (x: number, y: number, _s: string, style: { color: string }) => {
        styles.push(style);
        const t = fakeText(x, y, style);
        made.push(t);
        return t;
      },
    },
  } as unknown as Phaser.Scene;
  const layer = { add: (o: unknown) => added.push(o) } as unknown as Phaser.GameObjects.Layer;
  const marker = new RecordMarker(scene, layer);
  return { marker, text: made[0], styles, added };
}

describe('cores do recorde (RMK-08, END-14)', () => {
  it('só chaves da PALETTE', () => {
    for (const key of Object.values(RECORD_COLORS)) expect(PALETTE_KEYS.has(key)).toBe(true);
  });
});

describe('RecordMarker (RMK-02, RMK-07)', () => {
  it('nasce escondido em (948, 44), origem (1, 0), no estilo do HUD e na camada de UI', () => {
    const { text, styles, added } = makeMarker();
    expect([text.x, text.y]).toEqual([948, 44]);
    expect(text.origin).toEqual([1, 0]);
    expect(styles[0]).toBe(RUN_TEXT_STYLE);
    expect(added).toEqual([text]);
    expect(text.visible).toBe(false);
  });

  it('L-043: o destaque chega ao setColor com a cor de A; sem destaque, a de w', () => {
    const { marker, text } = makeMarker();
    marker.set({ visible: true, text: 'Recorde: r5', highlight: true });
    expect(text.colors.at(-1)).toBe(hex('A'));
    expect(marker.debug()).toEqual({ visible: true, text: 'Recorde: r5', highlight: true });
    marker.set({ visible: true, text: 'Recorde: r3', highlight: false });
    expect(text.colors.at(-1)).toBe(hex('w'));
    expect(marker.debug()).toEqual({ visible: true, text: 'Recorde: r3', highlight: false });
  });

  it('repassa visible e texto; hide esconde', () => {
    const { marker, text } = makeMarker();
    marker.set({ visible: false, text: '', highlight: false });
    expect([text.visible, text.text]).toEqual([false, '']);
    marker.set({ visible: true, text: 'Recorde: r2', highlight: false });
    expect([text.visible, text.text]).toEqual([true, 'Recorde: r2']);
    marker.hide();
    expect(marker.debug().visible).toBe(false);
  });
});

/** Retângulo falso: guarda posição, tamanho, cor e alfa repassados ao motor. */
function fakeRect(color: number, alpha: number) {
  const r = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    color,
    alpha,
    visible: true,
    setOrigin: () => r,
    setScrollFactor: () => r,
    setDepth: () => r,
    setPosition(x: number, y: number) {
      r.x = x;
      r.y = y;
      return r;
    },
    setSize(w: number, h: number) {
      r.w = w;
      r.h = h;
      return r;
    },
    setVisible(v: boolean) {
      r.visible = v;
      return r;
    },
  };
  return r;
}

function makePanel() {
  const texts: ReturnType<typeof fakeText>[] = [];
  const styles: unknown[] = [];
  const rects: ReturnType<typeof fakeRect>[] = [];
  const added: unknown[] = [];
  const scene = {
    add: {
      text: (x: number, y: number, _s: string, style: { color: string }) => {
        styles.push(style);
        const t = fakeText(x, y, style);
        texts.push(t);
        return t;
      },
      rectangle: (_x: number, _y: number, _w: number, _h: number, color: number, alpha: number) => {
        const r = fakeRect(color, alpha);
        rects.push(r);
        return r;
      },
    },
  } as unknown as Phaser.Scene;
  const layer = { add: (o: unknown) => added.push(o) } as unknown as Phaser.GameObjects.Layer;
  return { panel: new RunSummaryPanel(scene, layer), texts, styles, bg: rects[0], added };
}

/** Linhas que abrem bloco na build cheia: números, build, dano, recorde e instrução (END-16). */
const GAPS = new Set([1, 4, 11, 18, 19]);
/** Linhas recuadas: continuação de passivas e votos, e as 7 fontes de dano. */
const INDENTS = new Set([6, 9, 12, 13, 14, 15, 16, 17]);

/**
 * 20 linhas (título, 3 números, build com passivas e votos quebrados em 2, `Dano` com 7 fontes, recorde e instrução)
 * com a pior largura que `listLines` deixa passar: 100 + a vírgula, e 100 + o recuo nas continuações.
 */
const fullLines = (): SummaryLine[] =>
  Array.from({ length: 20 }, (_, i) => ({
    text: `${i}`.padEnd(INDENTS.has(i) ? SUMMARY_LINE_MAX : SUMMARY_LINE_MAX + 1, 'x'),
    highlight: i === 0 || i === 18,
    center: i === 0 || i === 19,
    indent: INDENTS.has(i),
    gap: GAPS.has(i),
  }));

describe('panelBounds (END-01, END-14)', () => {
  it('a build cheia (20 linhas de até 101 caracteres, 5 blocos) cabe em 960x540, centrada em (480, 270)', () => {
    const b = panelBounds(fullLines());
    expect(PANEL_CENTER).toEqual({ x: 480, y: 270 });
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(UI_SIZE.w);
    expect(b.y + b.h).toBeLessThanOrEqual(UI_SIZE.h);
    expect(b.x + b.w / 2).toBe(480);
    expect(b.y + b.h / 2).toBe(270);
    expect(b.h).toBe(20 * PANEL_LINE_H + 5 * PANEL_GAP_H + 2 * PANEL_PAD);
    expect(b.w).toBe(SUMMARY_LINE_MAX * PANEL_CHAR_W + PANEL_INDENT + 2 * PANEL_PAD);
  });

  it('a caixa cresce com a linha mais longa (com o recuo), com o número de linhas e com as folgas', () => {
    const small = panelBounds([{ text: 'abc' }]);
    const wide = panelBounds([{ text: 'abcdef' }]);
    const indented = panelBounds([{ text: 'abc', indent: true }]);
    const tall = panelBounds([{ text: 'abc' }, { text: 'abc' }]);
    const gapped = panelBounds([{ text: 'abc' }, { text: 'abc', gap: true }]);
    expect(wide.w - small.w).toBe(3 * PANEL_CHAR_W);
    expect(indented.w - small.w).toBe(PANEL_INDENT);
    expect(tall.h - small.h).toBe(PANEL_LINE_H);
    expect(gapped.h - tall.h).toBe(PANEL_GAP_H);
  });

  it('lineTops: 16 px por linha, meia linha a mais antes de cada gap; gap na primeira linha não conta', () => {
    expect(lineTops([{ text: 'a', gap: true }, { text: 'b' }, { text: 'c', gap: true }, { text: 'd' }])).toEqual([
      0, 16, 40, 56,
    ]);
  });
});

describe('RunSummaryPanel (END-01, END-14, END-16)', () => {
  it('nasce escondido, fundo k a 0,85 na camada de UI', () => {
    const { panel, bg, added } = makePanel();
    expect([bg.color, bg.alpha]).toEqual([PALETTE[RECORD_COLORS.bg], 0.85]);
    expect(added).toEqual([bg]);
    expect(panel.debug().visible).toBe(false);
  });

  it('show: uma linha por Text nos topos de lineTops; fundo do tamanho dos bounds', () => {
    const { panel, texts, styles, bg, added } = makePanel();
    const lines = fullLines();
    panel.show(lines);
    const d = panel.debug();
    expect(d.visible).toBe(true);
    expect(d.lines).toEqual(lines.map((l) => l.text));
    expect(d.bounds).toEqual(panelBounds(lines));
    expect([bg.x, bg.y, bg.w, bg.h]).toEqual([d.bounds.x, d.bounds.y, d.bounds.w, d.bounds.h]);
    expect(texts).toHaveLength(20);
    expect(added).toHaveLength(21);
    for (const st of styles) expect(st).toBe(RUN_TEXT_STYLE);
    const tops = lineTops(lines);
    texts.forEach((t, i) => expect(t.y).toBe(d.bounds.y + PANEL_PAD + tops[i]));
  });

  it('título e instrução centrados em x = 480; o resto à esquerda da caixa, recuado quando indent', () => {
    const { panel, texts } = makePanel();
    const lines = fullLines();
    panel.show(lines);
    const left = panel.debug().bounds.x + PANEL_PAD;
    texts.forEach((t, i) => {
      const line = lines[i];
      if (line.center) {
        expect([t.x, t.origin]).toEqual([480, [0.5, 0]]);
        return;
      }
      expect([t.x, t.origin]).toEqual([line.indent ? left + PANEL_INDENT : left, [0, 0]]);
    });
  });

  it('L-043: as linhas highlight chegam ao setColor com a cor de A; as outras com a de w', () => {
    const { panel, texts } = makePanel();
    panel.show(fullLines());
    texts.forEach((t, i) => expect(t.colors.at(-1)).toBe(i === 0 || i === 18 ? hex('A') : hex('w')));
  });

  it('show menor reaproveita os Text e esconde as sobras; hide esconde tudo', () => {
    const { panel, texts, bg } = makePanel();
    panel.show(fullLines());
    panel.show([{ text: 'Rodada alcançada: 2' }, { text: 'J / Enter para tentar de novo' }]);
    expect(texts).toHaveLength(20);
    expect(panel.debug().lines).toEqual(['Rodada alcançada: 2', 'J / Enter para tentar de novo']);
    expect(texts[0].colors.at(-1)).toBe(hex('w'));
    panel.hide();
    expect(bg.visible).toBe(false);
    expect(texts.every((t) => !t.visible)).toBe(true);
    expect(panel.debug()).toMatchObject({ visible: false, lines: [] });
  });
});
