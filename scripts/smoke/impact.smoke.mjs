// Impacto amaldiçoado no jogo vivo (TRL-04, TRL-05, TRL-10, IMP-16, IMP-12, RCT-01, RCT-06, POS-07) com
// `?debug&seed=1&maxAlive=1&shove=0&enemyGuard=0&noshop=1`. Lê `fx.trails`, `fx.lastImpact`, `fx.degraded`, `enemies[].slide`,
// `player.x` e `events` do snapshot vivo. Os valores esperados vêm da spec: rastro leve 4 px e forte 8 px (TRL-04/05), nível do
// impacto light/heavy/decisive (IMP-01..04), quadro de impacto só no decisivo e só com WebGL (IMP-12, IMP-16), deslizamento do
// inimigo que fica de pé após um forte (RCT-01) e passo de 10 px no startup de um forte de chão no ar vazio (POS-07).
// O fade do rastro (140/220 ms) não entra: os tweens do Phaser contam o relógio real e `step` não os adianta (a escala de tempo
// de jogo vale ao vivo, `TestScene` ajusta `tweens.timeScale`), então só largura, nível e `ageMs` são conferidos.
// Cada cenário recarrega a página para ter um inimigo novo e sem postura acumulada.
import { makeKit } from './fight-kit.mjs';

const QUERY = 'enemyGuard=0&noshop=1';
const FRAME_MS = 1000 / 60;

export default async function (ctx) {
  const { assert, snap, frame, down, up, count, boot, nearest, approach, waitFor } = makeKit(ctx);

  /** Aperta as teclas por um frame (`JustDown` precisa de um passo) e solta; devolve o snapshot. */
  const press = async (...keys) => {
    for (const k of keys) await down(k);
    const s = await frame();
    for (const k of keys.slice().reverse()) await up(k);
    return s;
  };

  /**
   * Passa frames até `fx.lastImpact` mudar de `null` para um valor, guardando a largura mais larga e o nível de todo rastro
   * visto no caminho. Devolve `{ s, trails }` com o snapshot do contato.
   */
  const untilImpact = async (label, maxFrames = 90) => {
    const seen = [];
    let s = await snap(0);
    for (let i = 0; i < maxFrames && s.fx.lastImpact === null; i++) {
      s = await frame();
      seen.push(...s.fx.trails);
    }
    assert(s.fx.lastImpact !== null, `${label}: nenhum impacto em ${maxFrames} frames (${JSON.stringify(s.events.slice(-4))})`);
    seen.push(...s.fx.trails);
    return { s, trails: seen };
  };

  // --- POS-07, TRL-05, TRL-10: forte de chão sem inimigo à frente --------------------------------------------------------------
  {
    let s = await boot(QUERY);
    s = await snap(60);
    assert(nearest(s).x - s.player.x > 300, `o inimigo deveria estar longe: ${nearest(s).x - s.player.x} px`);
    assert(s.fx.trails.length === 0, `sem golpe não há rastro: ${JSON.stringify(s.fx.trails)}`);
    const x0 = s.player.x;
    await down('KeyK');
    const trails = [];
    let startupEnd = null;
    for (let i = 0; i < 40 && startupEnd === null; i++) {
      s = await frame();
      if (i === 1) await up('KeyK');
      trails.push(...s.fx.trails);
      // O rastro nasce ao abrir a hitbox: é o fim do startup.
      if (s.fx.trails.length > 0) startupEnd = s.player.x;
    }
    assert(startupEnd !== null, 'o golpe forte deveria gerar um rastro');
    // O rastro nasce no quadro em que o startup acaba; o último pedaço do passo entra nesse mesmo quadro ou no seguinte.
    s = await frame();
    const dx = s.player.x - x0;
    assert(Math.abs(dx - 10) <= 0.25, `POS-07: o passo do forte deveria ser 10 px (±0,25), foi ${dx.toFixed(2)}`);
    assert(s.player.move !== null, 'o golpe forte deveria estar em curso');
    assert(trails.length >= 1 && trails.every((t) => t.tier === 'heavy' && t.widthPx === 8), `TRL-05/10: o rastro do forte deveria ser heavy de 8 px: ${JSON.stringify(trails)}`);
    assert(trails.every((t) => typeof t.ageMs === 'number' && t.ageMs >= 0 && t.ageMs <= 220), `TRL-10/05: ageMs fora de 0..220: ${JSON.stringify(trails)}`);
  }

  // --- POS-08: jab de chão sem inimigo à frente ---------------------------------------------------------------------------------
  {
    let s = await boot(QUERY);
    s = await snap(60);
    assert(nearest(s).x - s.player.x > 300, `o inimigo deveria estar longe: ${nearest(s).x - s.player.x} px`);
    const x0 = s.player.x;
    s = await press('KeyJ');
    for (let i = 0; i < 30 && s.fx.trails.length === 0; i++) s = await frame();
    assert(s.fx.trails.length > 0, 'o jab deveria gerar um rastro');
    s = await frame();
    const dx = s.player.x - x0;
    assert(Math.abs(dx - 4) <= 0.25, `POS-08: o passo do jab deveria ser 4 px (±0,25), foi ${dx.toFixed(2)}`);
  }

  // --- TRL-04, IMP-02/04 (nível light), IMP-16: jab ----------------------------------------------------------------------------
  {
    await boot(QUERY);
    await approach(36);
    await press('KeyJ');
    const { s, trails } = await untilImpact('jab');
    assert(trails.length >= 1 && trails.every((t) => t.tier === 'light' && t.widthPx === 4), `TRL-04: o rastro do jab deveria ser light de 4 px: ${JSON.stringify(trails)}`);
    assert(s.fx.lastImpact.tier === 'light', `IMP-16: o jab deveria dar impacto light: ${JSON.stringify(s.fx.lastImpact)}`);
    assert(s.fx.lastImpact.impactFrame === false, `IMP-16: sem quadro de impacto no leve: ${JSON.stringify(s.fx.lastImpact)}`);
    assert(count(s, 'impact:light') === 1, `o jab deveria emitir impact:light: ${JSON.stringify(s.events)}`);
    assert(nearest(s).slide === null, `RCT-01: o leve não desliza o inimigo: ${JSON.stringify(nearest(s).slide)}`);
  }

  // --- IMP-04 (heavy), RCT-01, RCT-06, TRL-05: forte que não derruba ----------------------------------------------------------
  {
    await boot(QUERY);
    const s0 = await approach(36);
    const id = nearest(s0).id;
    await press('KeyK');
    const { s, trails } = await untilImpact('forte');
    assert(trails.length >= 1 && trails.every((t) => t.tier === 'heavy' && t.widthPx === 8), `TRL-05: o rastro do forte deveria ser heavy de 8 px: ${JSON.stringify(trails)}`);
    assert(s.fx.lastImpact.tier === 'heavy', `IMP-04: o forte sem derrubada deveria dar impacto heavy: ${JSON.stringify(s.fx.lastImpact)}`);
    assert(s.fx.lastImpact.impactFrame === false, `IMP-16: sem quadro de impacto no heavy: ${JSON.stringify(s.fx.lastImpact)}`);
    assert(count(s, 'impact:heavy') === 1, `o forte deveria emitir impact:heavy: ${JSON.stringify(s.events)}`);
    // RCT-06/RCT-01: logo depois do contato o inimigo (de pé) tem `slide` com o que falta, até 24 px.
    let e = s.enemies.find((x) => x.id === id);
    assert(e.state !== 'deadRagdoll' && e.state !== 'knockedDown', `o inimigo deveria ficar de pé: ${e.state}`);
    let sl = s;
    for (let i = 0; i < 3 && e.slide === null; i++) {
      sl = await frame();
      e = sl.enemies.find((x) => x.id === id);
    }
    assert(e.slide !== null && e.slide.remainingPx > 0 && e.slide.remainingPx <= 24, `RCT-01/06: o inimigo deveria deslizar até 24 px: ${JSON.stringify(e.slide)}`);
    const x0 = e.x;
    // O hitstop e a câmera lenta não contam: espera o slide acabar (180 ms de jogo = 11 frames fora do hitstop; folga de 60 frames).
    sl = await waitFor((st) => st.enemies.find((x) => x.id === id).slide === null, 60, 'o slide deveria acabar');
    e = sl.enemies.find((x) => x.id === id);
    assert(e.slide === null, `RCT-06: depois de 180 ms o slide deveria ser null: ${JSON.stringify(e.slide)}`);
    assert(Math.abs(e.x - x0) > 5 && Math.sign(e.x - x0) === sl.player.facing, `RCT-01: o inimigo deveria ter se afastado do jogador: ${x0} -> ${e.x}`);
  }

  // --- IMP-02, IMP-12, IMP-16: golpe com derrubada é decisivo ------------------------------------------------------------------
  {
    await boot(QUERY);
    await approach(36);
    await press('KeyS', 'KeyK');
    const { s } = await untilImpact('rasteira');
    assert(s.fx.lastImpact.tier === 'decisive', `IMP-02: a rasteira (derruba) deveria dar impacto decisive: ${JSON.stringify(s.fx.lastImpact)}`);
    assert(count(s, 'impact:decisive') === 1, `a rasteira deveria emitir impact:decisive: ${JSON.stringify(s.events)}`);
    // IMP-12/IMP-16: o quadro de impacto só entra com WebGL (`fx.degraded` é a leitura do tipo do renderer).
    assert(
      s.fx.lastImpact.impactFrame === !s.fx.degraded,
      `IMP-12/16: impactFrame deveria ser ${!s.fx.degraded} (degraded=${s.fx.degraded}): ${JSON.stringify(s.fx.lastImpact)}`,
    );
  }
}
