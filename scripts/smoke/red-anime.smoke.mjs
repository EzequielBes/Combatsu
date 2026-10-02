// Vermelho do anime (RDA-04..09, 11, 13, 15, EDG-01), com `?debug&tech=vermelho&enemyGuard=0`:
// - cenário A (inimigo à frente): âncora do orbe na ponta dos dedos do frame atual, halo/Glow carmim, arcos `T`,
//   repulsão de 4 de dano na soltura, voo a 760 px/s e flash de tela `t` por ~80 ms na detonação;
// - cenário B (inimigo atrás): a repulsão não muda o HP de quem está às costas do player;
// - cenário C (solta no ar, EDG-02): a repulsão tira os mesmos 4 de HP e o player não recua os 12 px do chão.
import { makeKit } from './fight-kit.mjs';

/** PALETTE.t (carmim), a cor do halo, do Glow e do flash de tela (RDA-05/06/13). */
const CRIMSON = 0xd1103a;
/** Ponta dos dedos por frame, em px a partir do pé do sprite com `facing = 1` (`fingertipOffsetPx`, RDA-04). */
const FINGERTIP = {
  'vermelho-sign': { x: 18, y: -24 },
  'vermelho-charge': { x: 24, y: -28 },
  'vermelho-release': { x: 30, y: -24 },
};
/** O sprite fica no pé: o snapshot dá o centro do corpo (SIZE.player.h = 36). */
const FEET_OFFSET = 18;
const FRAME_MS = 1000 / 60;
const SPEED = 760; // RDA-11

export default async function ({ page, baseUrl, assert }) {
  const kit = makeKit({ page, baseUrl, assert });
  const { snap, frame, tap, boot, approach } = kit;
  const has = (s, layer) => s.fx.layers.includes(layer);

  /**
   * Sobe a rodada com um inimigo comum à frente do player. Ele persegue durante os 600 ms da carga, então começa
   * mais longe (`chaseSpeed * 0.6 + 70` px): na soltura chega a ~70 px, dentro dos 80 da repulsão e fora dos 40
   * do ataque (que interromperia a conjuração).
   */
  const setupFront = async () => {
    let s = await boot('tech=vermelho&enemyGuard=0');
    for (let i = 0; i < 30 && s.enemies.length === 0; i++) s = await snap(300);
    assert(s.enemies.length > 0, `nenhum inimigo nasceu: ${JSON.stringify(s.enemies)}`);
    const gap = 70 + kit.nearest(s).chaseSpeed * 0.6;
    return approach(gap);
  };

  const startCast = async () => {
    const s = await tap('KeyL');
    assert(s.tech.cast && s.tech.cast.id === 'vermelho', `Vermelho deveria ter começado: ${JSON.stringify(s.tech.cast)}`);
    return s;
  };

  // --- A: carga, repulsão, voo e detonação ---------------------------------------------------------------------
  {
    let s = await setupFront();
    const front = kit.nearest(s);
    const hpBefore = front.hp;
    const frontId = front.id;
    s = await startCast();

    let anchored = 0;
    let glowSeen = false;
    let ringSeen = false;
    let degraded = s.fx.degraded;
    let repulse = null;
    let prev = s;
    for (let i = 0; i < 80 && repulse === null; i++) {
      prev = s;
      s = await frame();
      if (s.tech.cast && (s.tech.cast.state === 'sign' || s.tech.cast.state === 'charge') && s.fx.red.orb) {
        // RDA-04: a ponta esperada vem do frame atual do player; só mede quando ele está numa pose do Vermelho.
        const off = FINGERTIP[s.player.frame];
        if (off) {
          const tipX = s.player.x + off.x * s.player.facing;
          const tipY = s.player.y + FEET_OFFSET + off.y;
          const dist = Math.hypot(s.fx.red.orb.x - tipX, s.fx.red.orb.y - tipY);
          assert(dist <= 2, `RDA-04: orbe a ${dist.toFixed(2)} px da ponta dos dedos (${s.player.frame}): ${JSON.stringify({ orb: s.fx.red.orb, tipX, tipY })}`);
          anchored++;
        }
        assert(s.fx.red.glowColor === CRIMSON, `RDA-05: glowColor deveria ser PALETTE.t: ${JSON.stringify(s.fx.red)}`);
        if (s.tech.cast.state === 'charge') {
          degraded = s.fx.degraded;
          if (s.fx.red.glow.active) {
            glowSeen = true;
            assert(s.fx.red.glow.color === CRIMSON, `RDA-06: glow.color deveria ser PALETTE.t: ${JSON.stringify(s.fx.red.glow)}`);
          }
          // RDA-07 / EDG-01: arcos, halo e orbe aparecem também sem WebGL.
          assert(
            has(s, 'red.distortRing') && has(s, 'red.glowRing') && has(s, 'red.orb'),
            `RDA-07/EDG-01: camadas da carga incompletas: ${JSON.stringify(s.fx.layers)}`,
          );
          ringSeen = true;
        }
      }
      if (has(s, 'red.repulse')) repulse = s;
    }
    assert(anchored >= 10, `RDA-04: poucos frames medidos na âncora (${anchored})`);
    assert(ringSeen, 'RDA-07: a carga nunca mostrou red.distortRing');
    if (degraded) assert(!glowSeen, 'EDG-01: sem WebGL o Glow não deveria estar ativo');
    else assert(glowSeen, 'RDA-06: com WebGL o Glow t deveria estar ativo na carga');
    assert(repulse, `RDA-10: a soltura nunca mostrou red.repulse: ${JSON.stringify(s.tech.cast)}`);

    // RED-15: no chão o player recua ~12 px (controle do cenário C, que solta no ar).
    s = await snap(100);
    const groundRecoil = Math.abs(s.player.x - prev.player.x);
    assert(groundRecoil >= 8, `RED-15: no chão a soltura deveria recuar ~12 px: ${groundRecoil.toFixed(2)}`);

    // RDA-08: no frame da soltura o inimigo da frente perdeu exatamente 4 de HP e foi empurrado/cambaleou.
    const hit = repulse.enemies.find((e) => e.id === frontId);
    assert(hit, `inimigo da frente sumiu na soltura: ${JSON.stringify(repulse.enemies)}`);
    assert(hit.hp === hpBefore - 4, `RDA-08: repulsão deveria tirar 4 de HP: ${hpBefore} -> ${hit.hp}`);
    assert(hit.state !== 'idle' && hit.state !== 'patrol', `RDA-08: o alvo deveria reagir ao golpe: ${hit.state}`);

    // RDA-11: o orbe viaja a 760 px/s. O hitstop da repulsão congela o relógio de jogo por alguns frames, então
    // mede o avanço por frame só nos frames em que o orbe andou: cada passo tem que ser 760 / 60 px (±1).
    const perFrame = (SPEED * FRAME_MS) / 1000;
    const steps = [];
    let last = 0;
    let detonated = null;
    const detonateBefore = repulse.events.filter((e) => e === 'redDetonate').length;
    for (let i = 0; i < 120 && detonated === null; i++) {
      s = await frame();
      const orb = s.techObjects.find((o) => o.kind === 'red');
      if (orb && orb.traveled > last) {
        if (last > 0) steps.push(orb.traveled - last);
        last = orb.traveled;
      }
      if (s.events.filter((e) => e === 'redDetonate').length > detonateBefore) detonated = s;
    }
    assert(steps.length >= 8, `RDA-11: poucos frames de voo medidos (${steps.length})`);
    const bad = steps.filter((d) => Math.abs(d - perFrame) > 1);
    assert(bad.length === 0, `RDA-11: o orbe deveria andar ${perFrame.toFixed(2)} px por frame (760 px/s): ${JSON.stringify(steps.map((d) => +d.toFixed(2)))}`);

    // RDA-13 / RDA-15: flash de tela carmim por ~80 ms (5 frames, ±1) na detonação.
    assert(detonated, 'o orbe nunca detonou');
    assert(detonated.fx.red.screenFlashColor === CRIMSON, `RDA-13: screenFlashColor deveria ser PALETTE.t: ${JSON.stringify(detonated.fx.red)}`);
    let flashFrames = has(detonated, 'red.screenFlash') ? 1 : 0;
    assert(flashFrames === 1, `RDA-15: red.screenFlash deveria estar na camada da detonação: ${JSON.stringify(detonated.fx.layers)}`);
    for (let i = 0; i < 12; i++) {
      s = await frame();
      if (has(s, 'red.screenFlash')) flashFrames++;
    }
    const expectedFrames = 80 / FRAME_MS;
    assert(Math.abs(flashFrames - expectedFrames) <= 1, `RDA-15: red.screenFlash deveria durar ~${expectedFrames.toFixed(1)} frames: ${flashFrames}`);
  }

  // --- B: inimigo atrás do player não é repelido (RDA-09) ------------------------------------------------------
  {
    let s = await setupFront();
    const enemyId = kit.nearest(s).id;
    // Vira para o lado oposto com um toque de um frame: o inimigo (que vem pela frente) passa a ficar às costas.
    const turn = s.player.facing === 1 ? 'KeyA' : 'KeyD';
    await kit.down(turn);
    await snap(16);
    await kit.up(turn);
    s = await snap(20);
    const behind = s.enemies.find((e) => e.id === enemyId);
    assert(
      behind && (behind.x - s.player.x) * s.player.facing < 0,
      `inimigo deveria estar às costas do player: ${JSON.stringify({ p: s.player.x, f: s.player.facing, e: behind && behind.x })}`,
    );
    s = await startCast();
    let repulse = null;
    for (let i = 0; i < 80 && repulse === null; i++) {
      s = await frame();
      if (has(s, 'red.repulse')) repulse = s;
    }
    assert(repulse, 'RDA-10: a soltura nunca mostrou red.repulse (cenário B)');
    // RDA-10: sem acerto não há hitstop, então red.repulse fica ~120 ms (7-8 frames) em fx.layers, contando o da soltura.
    let repulseFrames = 1;
    for (let i = 0; i < 20; i++) {
      s = await frame();
      if (!has(s, 'red.repulse')) break;
      repulseFrames++;
    }
    assert(repulseFrames >= 7 && repulseFrames <= 8, `RDA-10: red.repulse deveria durar ~120 ms (7-8 frames): ${repulseFrames}`);
    const after = repulse.enemies.find((e) => e.id === enemyId);
    const stillBehind = after && (after.x - repulse.player.x) * repulse.player.facing < 0;
    assert(after && stillBehind, `inimigo deveria continuar às costas: ${JSON.stringify({ p: repulse.player.x, e: after && after.x })}`);
    assert(after.hp === behind.hp, `RDA-09: o HP de quem está atrás não deveria mudar pela repulsão: ${behind.hp} -> ${after.hp}`);
  }

  // --- C: solta no ar (EDG-02): a repulsão é igual e o recuo de 12 px do chão não acontece -----------------------
  {
    let s = await setupFront();
    const frontId = kit.nearest(s).id;
    const hpBefore = kit.nearest(s).hp;
    // Pula e conjura no mesmo instante: a soltura (~600 ms depois) cai ainda no ar (a conjuração segura a queda).
    await kit.down('KeyW');
    s = await snap(16);
    await kit.down('KeyL');
    s = await snap(50);
    await kit.up('KeyL');
    await kit.up('KeyW');
    assert(s.tech.cast && s.tech.cast.id === 'vermelho', `Vermelho deveria ter começado no ar: ${JSON.stringify(s.tech.cast)}`);
    let before = s;
    let release = null;
    for (let i = 0; i < 80 && release === null; i++) {
      before = s;
      s = await frame();
      if (has(s, 'red.repulse')) release = s;
    }
    assert(release, 'EDG-02: a soltura no ar nunca mostrou red.repulse');
    assert(release.player.y < 462 - 20, `EDG-02: a soltura deveria ser no ar: y=${release.player.y}`);
    const hit = release.enemies.find((e) => e.id === frontId);
    assert(hit && hit.hp === hpBefore - 4, `EDG-02: a repulsão no ar deveria tirar 4 de HP: ${hpBefore} -> ${hit && hit.hp}`);
    s = await snap(100);
    const airRecoil = Math.abs(s.player.x - before.player.x);
    assert(airRecoil < 2, `EDG-02/RED-15: no ar a soltura não deveria recuar o player (no chão recua 12 px): ${airRecoil.toFixed(2)}`);
  }
}
