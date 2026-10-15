import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import { RUN_TEXT_STYLE } from '../../src/game/Hud';
import { RECORD_COLORS, RecordMarker } from '../../src/game/RecordMarker';
import { SUMMARY_LINE_MAX, type SummaryLine } from '../../src/core/runSummary';
import { UI_SIZE } from '../../src/game/art/hd/screen';
import { PANEL_CENTER, PANEL_CHAR_W, PANEL_LINE_H, RunSummaryPanel, panelBounds } from '../../src/game/RunSummaryPanel';

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

/** 19 linhas (a build cheia do design) com a pior largura que `listLines` deixa passar: 100 + a vírgula. */
const fullLines = (): SummaryLine[] =>
  Array.from({ length: 19 }, (_, i) => ({ text: `${i}`.padEnd(SUMMARY_LINE_MAX + 1, 'x'), highlight: i === 17 }));

describe('panelBounds (END-01, END-14)', () => {
  it('19 linhas de 101 caracteres cabem em 960x540, centradas em (480, 270)', () => {
    const b = panelBounds(fullLines().map((l) => l.text));
    expect(PANEL_CENTER).toEqual({ x: 480, y: 270 });
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(UI_SIZE.w);
    expect(b.y + b.h).toBeLessThanOrEqual(UI_SIZE.h);
    expect(b.x + b.w / 2).toBe(480);
    expect(b.y + b.h / 2).toBe(270);
    expect(b.h).toBeGreaterThanOrEqual(19 * PANEL_LINE_H);
    expect(b.w).toBeGreaterThanOrEqual((SUMMARY_LINE_MAX + 1) * PANEL_CHAR_W);
  });

  it('a caixa cresce com a linha mais longa e com o número de linhas', () => {
    const small = panelBounds(['abc']);
    const wide = panelBounds(['abcdef']);
    const tall = panelBounds(['abc', 'abc']);
    expect(wide.w - small.w).toBe(3 * PANEL_CHAR_W);
    expect(tall.h - small.h).toBe(PANEL_LINE_H);
  });
});

describe('RunSummaryPanel (END-01, END-14)', () => {
  it('nasce escondido, fundo k a 0,85 na camada de UI', () => {
    const { panel, bg, added } = makePanel();
    expect([bg.color, bg.alpha]).toEqual([PALETTE[RECORD_COLORS.bg], 0.85]);
    expect(added).toEqual([bg]);
    expect(panel.debug().visible).toBe(false);
  });

  it('show: uma linha por Text, 16 px entre elas, centradas em x = 480; fundo do tamanho dos bounds', () => {
    const { panel, texts, styles, bg, added } = makePanel();
    const lines = fullLines();
    panel.show(lines);
    const d = panel.debug();
    expect(d.visible).toBe(true);
    expect(d.lines).toEqual(lines.map((l) => l.text));
    expect(d.bounds).toEqual(panelBounds(d.lines));
    expect([bg.x, bg.y, bg.w, bg.h]).toEqual([d.bounds.x, d.bounds.y, d.bounds.w, d.bounds.h]);
    expect(texts).toHaveLength(19);
    expect(added).toHaveLength(20);
    for (const t of texts) {
      expect(t.x).toBe(480);
      expect(t.origin).toEqual([0.5, 0]);
    }
    for (const st of styles) expect(st).toBe(RUN_TEXT_STYLE);
    for (let i = 1; i < texts.length; i++) expect(texts[i].y - texts[i - 1].y).toBe(16);
  });

  it('L-043: a linha highlight chega ao setColor com a cor de A; as outras com a de w', () => {
    const { panel, texts } = makePanel();
    panel.show(fullLines());
    texts.forEach((t, i) => expect(t.colors.at(-1)).toBe(i === 17 ? hex('A') : hex('w')));
  });

  it('show menor reaproveita os Text e esconde as sobras; hide esconde tudo', () => {
    const { panel, texts, bg } = makePanel();
    panel.show(fullLines());
    panel.show([{ text: 'Rodada alcançada: 2' }, { text: 'J / Enter para tentar de novo' }]);
    expect(texts).toHaveLength(19);
    expect(panel.debug().lines).toEqual(['Rodada alcançada: 2', 'J / Enter para tentar de novo']);
    expect(texts[0].colors.at(-1)).toBe(hex('w'));
    panel.hide();
    expect(bg.visible).toBe(false);
    expect(texts.every((t) => !t.visible)).toBe(true);
    expect(panel.debug()).toMatchObject({ visible: false, lines: [] });
  });
});
