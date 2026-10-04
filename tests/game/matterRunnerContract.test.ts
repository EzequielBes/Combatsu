/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { STEP_BUFFER_MARGIN } from '../../src/core/stepLerp';
// Fonte do Phaser instalado, lida pelo Vite (sem depender dos tipos do Node).
import runnerSource from '../../node_modules/phaser/src/physics/matter-js/lib/core/Runner.js?raw';
import worldSource from '../../node_modules/phaser/src/physics/matter-js/World.js?raw';

/**
 * Contrato com o Phaser instalado (ITP-09): `stepAlpha` supõe que o Matter só dá um passo com
 * `_timeBufferMargin` passos acumulados e tira um passo do acumulador a cada passo dado. São detalhes internos da
 * biblioteca; se uma atualização os mudar, a interpolação passa a desenhar na fração errada e este teste avisa.
 */
describe('acumulador do Matter no Phaser instalado (ITP-09)', () => {
  it('STEP_BUFFER_MARGIN é igual ao _timeBufferMargin do Runner', () => {
    const match = runnerSource.match(/Runner\._timeBufferMargin\s*=\s*([\d.]+)\s*;/);
    expect(match, 'Runner._timeBufferMargin não encontrado no Phaser instalado').not.toBeNull();
    expect(Number(match![1])).toBe(STEP_BUFFER_MARGIN);
  });

  it('o World dá um passo enquanto o acumulador tem a margem e tira um passo dele a cada volta', () => {
    expect(worldSource).toMatch(
      /while\s*\(\s*engineDelta > 0 && runner\.timeBuffer >= engineDelta \* MatterRunner\._timeBufferMargin\s*\)/,
    );
    expect(worldSource).toMatch(/runner\.timeBuffer -= engineDelta;/);
  });
});
