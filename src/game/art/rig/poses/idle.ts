/*
 * Pose de calibração: o `idle-0` desenhado à mão, reproduzido pelo boneco. Serve de portão de qualidade do corpo
 * (silhueta com IoU >= 0,85 e pernas separadas, ver tests/game/rig.test.ts) antes de usar o boneco nos golpes.
 * O braço do idle desenhado mede 5,5 do ombro à mão (contra 13 no soco), então aqui o braço é encurtado por
 * perspectiva (`armScale`) e cai junto ao corpo, com a mão na altura do cinto.
 */
import { buildPose } from './build';

export const POSE_IDLE = buildPose({
  hip: { x: 10, y: 24 },
  spine: 180,
  armScale: 0.42,
  armNear: { to: { x: 10.6, y: 22.8 }, bend: -1 },
  armFar: { to: { x: 10.2, y: 22 }, bend: -1 },
  legNear: { ankle: { x: 13, y: 28.2 }, foot: 90 },
  legFar: { ankle: { x: 8, y: 28.2 }, foot: 90 },
});
