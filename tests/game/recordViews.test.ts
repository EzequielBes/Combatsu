import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import { RUN_TEXT_STYLE } from '../../src/game/Hud';
import { RECORD_COLORS, RecordMarker } from '../../src/game/RecordMarker';

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
