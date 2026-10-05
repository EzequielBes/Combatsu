import { followCenter, scrollFor, type FollowConfig } from '../../core/cameraFollow';
import { type CastState } from '../../core/cast';
import { type Vec2 } from '../../core/hit';
import { CameraKick, ZoomPulse } from '../../core/cameraKick';
import { UI_SCALE, zoom } from '../../game/art/hd/screen';
import { CAST_FX, TECHNIQUES } from '../../data/techniques';
import type { TestScene } from '../TestScene';

/** Zoom da câmera do mundo (RES-01): 960x540 de tela mostram 640x360 px de mundo. */
export const WORLD_ZOOM = zoom(1.5);

/** Folga (px de tela) em que o player anda sem a câmera andar junto. */
export const FOLLOW_DEADZONE = { w: 40, h: 24 };

/** Fração do caminho até o player que a câmera anda num quadro de 60 Hz. */
export const FOLLOW_LERP = 0.15;

/** Finalizador (FIN-04): zoom da câmera no golpe, tempo até chegar (ms; 80 para fechar em 100 ms reais com o frame de atraso do efeito) e depois de quanto tempo real volta ao normal. */
export const FINISHER_ZOOM = zoom(1.7);

export const FINISHER_ZOOM_IN_MS = 80;

export const FINISHER_ZOOM_HOLD_MS = 450;

export const FINISHER_ZOOM_OUT_MS = 250;

/** Câmera do mundo: seguidor próprio (CAM-07), tranco, pulso de zoom e zoom de conjuração/finalizador. */
export class CameraRig {
  constructor(readonly s: TestScene) {}

  /** Último estado de conjuração visto (CAST-15/19): dispara o zoom da câmera só na troca de estado. */
  lastCastState: CastState | null = null;

  /** Centro da câmera do mundo em ponto flutuante (CAM-07): o estado do seguidor, nunca arredondado. */
  camCenter: Vec2 = { x: 0, y: 0 };

  /** Tranco da câmera no golpe forte (CAM-01) e pulso de zoom no decisivo (CAM-02), os dois em tempo real. */
  cameraKick = new CameraKick();

  zoomPulse = new ZoomPulse();

  /** Tempo real (ms) que falta do pulso de zoom; 0 = sem pulso em curso. */
  zoomPulseMs = 0;

  /** Tempo real (ms) até o zoom do finalizador voltar ao normal; 0 = sem finalizador em curso. */
  finisherZoomMs = 0;

  /** Zona morta, lerp, vista (com o zoom atual) e limites do mundo para o seguidor da câmera. */
  followConfig(): FollowConfig {
    const cam = this.s.cameras.main;
    return {
      deadzone: FOLLOW_DEADZONE,
      lerp: FOLLOW_LERP,
      view: { w: cam.width / cam.zoom, h: cam.height / cam.zoom },
      bounds: { x: 0, y: 0, w: this.s.level.widthPx, h: this.s.level.heightPx },
    };
  }

  /** CAM-07: leva o centro da câmera atrás da posição de desenho do player e aplica o scroll na grade de pixel de tela. */
  followCamera(dtMs: number): void {
    const cam = this.s.cameras.main;
    // CAM-02: o pulso de zoom anda em tempo real, antes do cálculo do scroll (que depende do zoom atual).
    if (this.zoomPulseMs > 0) {
      this.zoomPulseMs = Math.max(0, this.zoomPulseMs - dtMs);
      cam.setZoom(this.zoomPulseMs > 0 ? this.zoomPulse.update(dtMs) : WORLD_ZOOM);
    }
    this.camCenter = followCenter(this.camCenter, this.s.player.renderPos, this.followConfig(), dtMs);
    const scroll = scrollFor(this.camCenter, { w: cam.width, h: cam.height }, cam.zoom);
    // CAM-01: o tranco desloca só o scroll desenhado; o centro de seguir (`camCenter`) segue limpo.
    const kick = this.cameraKick.update(dtMs);
    cam.setScroll(scroll.x + kick.x, scroll.y + kick.y);
  }

  /**
   * Zoom da câmera principal na conjuração (CAST-15/19): dispara só na troca de estado, nunca a cada frame — a
   * carga anima até 1,6 ao longo do `chargeMs` da técnica, e a soltura (ou um cancelamento em `sign`/`charge`,
   * CAST-07) devolve o zoom base em 250 ms.
   */
  updateCastZoom(): void {
    const state = this.s.techCaster.cast?.state ?? null;
    if (state === this.lastCastState) return;
    const cam = this.s.cameras.main;
    if (state === 'charge' && this.s.techCaster.cast) {
      cam.zoomTo(zoom(CAST_FX.zoomCharge), Math.max(1, TECHNIQUES[this.s.techCaster.cast.id].chargeMs), 'Linear', true);
    } else if (state === 'release') {
      cam.zoomTo(zoom(CAST_FX.zoomBase), CAST_FX.zoomBackMs, 'Linear', true);
    } else if (state === null && (this.lastCastState === 'sign' || this.lastCastState === 'charge')) {
      cam.zoomTo(zoom(CAST_FX.zoomBase), CAST_FX.zoomBackMs, 'Linear', true);
    }
    this.lastCastState = state;
  }

  /** Ponto do mundo na tela da câmera principal (FOC-01), já com zoom e tranco. */
  worldToScreen(p: Vec2): Vec2 {
    const view = this.s.cameras.main.worldView;
    const z = this.s.cameras.main.zoom;
    return { x: ((p.x - view.x) * z) / UI_SCALE, y: ((p.y - view.y) * z) / UI_SCALE };
  }
}
