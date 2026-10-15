/// <reference types="vite/client" />
import redSource from '../../src/game/tech/red.ts?raw';
import flightSource from '../../src/game/tech/redFlight.ts?raw';
import { describe, expect, it } from 'vitest';

/** Linhas que contam no `max-lines` do oxlint: sem as em branco e sem os comentários. */
const effectiveLines = (src: string): number =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('//');
    }).length;

describe('T24: o voo do orbe do Vermelho mora em redFlight.ts (VRM-12, preparo)', () => {
  it('red.ts fica com a carga, a soltura e o nascimento, abaixo de 130 linhas efetivas', () => {
    expect(effectiveLines(redSource)).toBeLessThan(130);
    for (const name of ['onTouch', 'finishDetonation', 'detonationTargets', 'redDetonate']) {
      expect(redSource, name).not.toContain(name);
    }
    expect(redSource).toContain('this.flight.launch(');
  });

  it('o voo tem o toque e a detonação e só lê o stat copiado na soltura', () => {
    for (const name of ['private onTouch(', 'private finishDetonation(', "this.ctx.emit('redDetonate')"]) {
      expect(flightSource, name).toContain(name);
    }
    // Um ponto comprado no meio do voo não muda o orbe que já está no ar: nada de reler o loadout aqui.
    expect(flightSource).not.toContain('loadout');
    expect(flightSource).toContain('orb.stats.damage.hit');
    expect(flightSource).toContain('orb.red.force');
  });
});
