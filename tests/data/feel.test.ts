import { describe, expect, it } from 'vitest';
import { CAMERA_FEEL, FOCUS_FEEL, IMPACT_FEEL, SLIDE_FEEL, STEP_FEEL, TRAIL_FEEL } from '../../src/data/feel';

describe('T1: números do feel batem com a spec', () => {
  it('rastro (TRL-04/05): leve 4 px/140 ms, forte 8 px/220 ms', () => {
    expect(TRAIL_FEEL.light).toEqual({ widthPx: 4, fadeMs: 140 });
    expect(TRAIL_FEEL.heavy).toEqual({ widthPx: 8, fadeMs: 220 });
  });

  it('estilhaços, anel, espinhos, rachadura e teto (IMP-07/08/09/15, EDG-03)', () => {
    expect(IMPACT_FEEL.shardCount).toBe(6);
    expect(IMPACT_FEEL.shardConeDeg).toBe(35);
    expect(IMPACT_FEEL.shardLifeMs).toBe(180);
    expect(IMPACT_FEEL.ringFromPx).toBe(6);
    expect(IMPACT_FEEL.ringToPx).toBe(28);
    expect(IMPACT_FEEL.ringMs).toBe(160);
    expect(IMPACT_FEEL.spikeCount).toBe(6);
    expect(IMPACT_FEEL.spikeMinPx).toBe(18);
    expect(IMPACT_FEEL.spikeMaxPx).toBe(30);
    expect(IMPACT_FEEL.crackMs).toBe(1200);
    expect(IMPACT_FEEL.fxCap).toBe(40);
  });

  it('passo à frente (POS-07/08): leve 4 px, forte 10 px', () => {
    expect(STEP_FEEL).toEqual({ lightPx: 4, heavyPx: 10 });
  });

  it('deslizamento e resíduo (RCT-01/02/03)', () => {
    expect(SLIDE_FEEL.heavy).toEqual({ px: 24, ms: 180 });
    expect(SLIDE_FEEL.decisive).toEqual({ px: 48, ms: 240 });
    expect(SLIDE_FEEL.residueEveryMs).toBe(40);
    expect(SLIDE_FEEL.residueFadeMs).toBe(300);
  });

  it('câmera (CAM-01/02/03/07/08)', () => {
    expect(CAMERA_FEEL.kickPx).toBe(4);
    expect(CAMERA_FEEL.kickMs).toBe(120);
    expect(CAMERA_FEEL.zoomBase).toBe(1.5);
    expect(CAMERA_FEEL.zoomPeak).toBe(1.6);
    expect(CAMERA_FEEL.zoomInMs).toBe(60);
    expect(CAMERA_FEEL.zoomHoldMs).toBe(200);
    expect(CAMERA_FEEL.zoomOutMs).toBe(120);
    expect(CAMERA_FEEL.slowScale).toBe(0.4);
    expect(CAMERA_FEEL.slowMs).toBe(350);
  });

  it('linhas de foco (FOC-01/02)', () => {
    expect(FOCUS_FEEL).toEqual({ lines: 24, ms: 180, clearRadiusPx: 120 });
  });
});
