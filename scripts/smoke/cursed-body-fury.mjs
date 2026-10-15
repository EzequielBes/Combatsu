// Fluxo e Fúria do Corpo no jogo vivo (CRP-06, CRP-07), cenários do `cursed-body.smoke.mjs`. Não é um cenário próprio
// (o runner só roda `*.smoke.mjs`): existe para o smoke caber no teto de 400 linhas.
import { makeKit } from './fight-kit.mjs';
import { castRed } from './red-branches.mjs';
import { BASE, DUMMY_X, strikeOnce, walkToDummy } from './cursed-body-kit.mjs';

/** Regeneração de energia num quadro (8 por segundo, `CE.regen`), a folga da medida do ganho no quadro do acerto. */
const REGEN_PER_FRAME = 8 / 60;

/**
 * Gasta energia com o Vermelho solto de costas para o inimigo (a barra nasce no teto) e mede o ganho de energia no
 * quadro em que o `jab` acerta, como o MOV-15 do `fight-integration`.
 */
async function meleeGain(ctx, axes) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&tech=vermelho&axes=${axes}`);
  await kit.approach();
  let s = await kit.waitQuiet();
  await kit.tap(s.player.facing === 1 ? 'KeyA' : 'KeyD', 16);
  ({ s } = await castRed(kit, ctx, await kit.snap(0)));
  for (let i = 0; i < 60 && s.tech.cast !== null; i++) s = await kit.frame();
  s = await kit.approach();
  ctx.assert(s.ce.cur <= s.ce.max - 10, `pré-condição: energia longe do teto: ${s.ce.cur}/${s.ce.max}`);
  const hp0 = new Map(s.enemies.map((e) => [e.id, e.hp]));
  await kit.down('KeyJ');
  let prev = await kit.frame();
  await kit.up('KeyJ');
  for (let i = 0; i < 30; i++) {
    const cur = await kit.frame();
    if (cur.enemies.some((e) => e.hp < (hp0.get(e.id) ?? e.hp))) return cur.ce.cur - prev.ce.cur;
    prev = cur;
  }
  throw new Error(`o jab deveria acertar (${axes || 'sem eixo'})`);
}

/** CRP-06: o acerto corpo a corpo rende 3 de energia sem o Fluxo e 6 com Fluxo 3. */
async function flowEnergy(ctx) {
  const plain = await meleeGain(ctx, '');
  const flow = await meleeGain(ctx, 'corpo.fluxo:3');
  const view = JSON.stringify({ plain, flow });
  ctx.assert(plain >= 3 && plain <= 3 + REGEN_PER_FRAME + 0.01, `CE-06: +3 por acerto sem o Fluxo: ${view}`);
  ctx.assert(flow >= 6 && flow <= 6 + REGEN_PER_FRAME + 0.01, `CRP-06: +6 por acerto com Fluxo 3: ${view}`);
}

/**
 * `jab` (6) com a Fúria 3 (5 % por acúmulo, teto 35 %): o 1º tira `round(6 × 1)` = 6 e o 8º, com 7 acúmulos,
 * `round(6 × 1,35)` = 8 (CRP-07).
 */
const FIRST_JAB = 6;
const JAB_AT_FURY_CAP = 8;

/**
 * CRP-07 (laboratório, porque o boneco não revida e um golpe levado zeraria a Fúria): 7 `jab`s seguidos no boneco dão
 * 7 acúmulos e o bônus 0,35 no `build.corpo.fury`, e o 8º `jab` tira mais que o 1º; o 8º acúmulo não passa do teto.
 */
async function furyStacks(ctx) {
  const kit = makeKit(ctx);
  let s = await walkToDummy(kit, ctx, 'axes=corpo.furia:3', 40);
  const live0 = s.fx.live;
  const auras = [s.build.corpo.aura];
  const dmgs = [];
  let fury7 = null;
  for (let k = 0; k < 8; k++) {
    const hp0 = s.fxlab.dummies.find((d) => d.x === DUMMY_X).hp;
    await kit.tap('KeyJ', 16);
    for (let f = 0; f < 20 && s.fxlab.dummies.find((d) => d.x === DUMMY_X).hp === hp0; f++) s = await kit.frame();
    dmgs.push(hp0 - s.fxlab.dummies.find((d) => d.x === DUMMY_X).hp);
    // Espera o golpe e a janela do encadeamento fecharem: o `J` seguinte é outro `jab`, não o `direto`.
    // Golpe (260 ms), hitstop e janela (260 ms) com folga.
    s = await kit.snap(900);
    auras.push(s.build.corpo.aura);
    if (k === 6) fury7 = s.build.corpo.fury;
  }
  const view = JSON.stringify({ dmgs, fury7, fury8: s.build.corpo.fury });
  ctx.assert(fury7.stacks === 7 && Math.abs(fury7.bonus - 0.35) < 1e-9, `CRP-07: 7 acúmulos dão 0,35: ${view}`);
  ctx.assert(dmgs[0] === FIRST_JAB && dmgs[7] === JAB_AT_FURY_CAP, `CRP-07: o dano sobe com a Fúria: ${view}`);
  ctx.assert(Math.abs(s.build.corpo.fury.bonus - 0.35) < 1e-9, `CRP-07: o bônus para no teto de 35 %: ${view}`);
  // CRP-07.11: a aura nasce apagada e o raio cresce a cada acúmulo.
  const grows = auras.slice(1).every((r, k) => r > auras[k]);
  ctx.assert(auras[0] === 0 && grows, `CRP-07.11: aura apagada sem acúmulo e crescendo com eles: ${auras}`);
  // O `R` destrói a aura com a cena: nenhuma aura nem objeto de efeito sobra na cena nova.
  await kit.tap('KeyR');
  s = await kit.snap(50);
  if (s.run.state === 'title') s = await kit.tap('KeyJ');
  s = await kit.snap(100);
  ctx.assert(
    s.build.corpo.aura === 0 && s.fx.live === live0,
    `o R não deixa aura órfã: ${JSON.stringify({ aura: s.build.corpo.aura, live: s.fx.live, live0 })}`,
  );
}

const blocks = (s) => s.events.filter((e) => e === 'block' || e === 'parry').length;

/**
 * CRP-07 e o edge case do golpe defendido: com a guarda erguida o golpe do comum não tira HP e a Fúria fica; o golpe
 * levado depois tira HP e zera a Fúria.
 */
async function furyResets(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&axes=corpo.furia:3`);
  await strikeOnce(kit, ctx, 'KeyJ', 'Fúria');
  let s = await kit.snap(0);
  const stacks = s.build.corpo.fury.stacks;
  ctx.assert(stacks >= 1, `CRP-07: o jab que acerta soma um acúmulo: ${JSON.stringify(s.build.corpo)}`);
  await kit.down('KeyU');
  const hp0 = s.player.hp;
  const b0 = blocks(s);
  for (let i = 0; i < 400 && blocks(s) === b0; i++) s = await kit.frame();
  s = await kit.snap(50);
  await kit.up('KeyU');
  ctx.assert(blocks(s) > b0 && s.player.hp === hp0, `o golpe do comum deveria bater na guarda: ${s.player.hp}/${hp0}`);
  ctx.assert(s.build.corpo.fury.stacks === stacks, `edge case: defendido sem perder HP a Fúria fica: ${stacks}`);
  for (let i = 0; i < 600 && s.player.hp === hp0; i++) s = await kit.frame();
  // O golpe levado congela o jogo (hitstop); o Corpo confere a vida no 1º quadro de jogo depois dele.
  s = await kit.snap(200);
  ctx.assert(s.player.hp < hp0, `o comum deveria acertar o player: ${s.player.hp}`);
  ctx.assert(
    s.build.corpo.fury.stacks === 0 && s.build.corpo.aura === 0,
    `CRP-07: perder HP zera a Fúria e apaga a aura: ${JSON.stringify(s.build.corpo)}`,
  );
}

/** Rodada do chefe com o voto `corpoDeVidro` como 2ª oferta do painel na seed 1 (o `vows.smoke` usa a mesma rodada). */
const BOSS_ROUND = 'hd=1&area=modular&round=5&regen=0&bossArch=oni&bossAffix=none&finger=0&enemyGuard=0';

/** Golpe forte de teste (tecla 2, `combat.debugHit`) em todos, sem passar pelo golpe do player; devolve o snapshot. */
async function debugHeavy(kit, ctx) {
  await ctx.page.keyboard.press('Digit2', { delay: 20 });
  return kit.snap(80);
}

/**
 * Enfraquece o chefe com a tecla 2 (que não soma Fúria), anda até ele e o acerta com `jab`s até a Fúria ter um
 * acúmulo, e acaba a rodada com a tecla 2; devolve o snapshot do fim da rodada. O chefe fraco cai logo depois do
 * acúmulo, sem tempo de bater no player e zerar a Fúria.
 */
async function stackOnBoss(kit, ctx) {
  let s = await kit.snap(0);
  for (let i = 0; i < 40 && !s.boss; i++) s = await kit.snap(100);
  for (let i = 0; i < 400 && s.boss && s.boss.hp > 30; i++) s = await debugHeavy(kit, ctx);
  for (let tries = 0; tries < 20 && s.build.corpo.fury.stacks === 0; tries++) {
    const key = s.boss.x > s.player.x ? 'KeyD' : 'KeyA';
    await kit.down(key);
    for (let i = 0; i < 400 && Math.abs(s.boss.x - s.player.x) > 40; i++) s = await kit.frame();
    await kit.up(key);
    await kit.tap('KeyJ', 16);
    s = await kit.snap(300);
  }
  ctx.assert(s.build.corpo.fury.stacks > 0, `a Fúria deveria acumular no chefe: ${JSON.stringify(s.build.corpo)}`);
  for (let i = 0; i < 400 && s.run.state === 'roundActive'; i++) s = await debugHeavy(kit, ctx);
  return s;
}

/**
 * Edge case: o voto Corpo de vidro tomado no painel da konbini baixa a vida máxima (e recorta a vida) sem zerar a
 * Fúria, que segue igual ao voltar para a rua.
 */
async function glassBodyKeepsFury(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BOSS_ROUND}&axes=corpo.furia:3`);
  let s = await stackOnBoss(kit, ctx);
  const stacks = s.build.corpo.fury.stacks;
  ctx.assert(stacks > 0, `a Fúria deveria chegar à konbini com acúmulos: ${JSON.stringify(s.build.corpo)}`);
  // A Energia Reversa (F) cura sem mexer na Fúria: com a vida acima de 60 % o voto a recorta de fato.
  await kit.down('KeyF');
  for (let i = 0; i < 400 && s.player.hp < 80; i++) s = await kit.snap(50);
  await kit.up('KeyF');
  for (let i = 0; i < 200 && s.run.state !== 'traverse'; i++) s = await kit.snap(50);
  await kit.down('KeyD');
  for (let i = 0; i < 600 && s.run.state !== 'shop'; i++) s = await kit.snap(50);
  await kit.up('KeyD');
  for (let i = 0; i < 20 && s.vows.panelCards === 0; i++) s = await kit.snap(50);
  ctx.assert(
    s.vows.offers?.[1] === 'corpoDeVidro',
    `o painel deveria oferecer Corpo de vidro: ${JSON.stringify(s.vows)}`,
  );
  const hpBefore = s.player.hp;
  s = await kit.tap('Digit2');
  for (let i = 0; i < 5 && s.run.state === 'shop'; i++) s = await kit.tap('Enter');
  for (let i = 0; i < 30; i++) s = await kit.frame();
  const view = JSON.stringify({ stacks, hpBefore, hp: s.player.hp, max: s.player.maxHp, corpo: s.build.corpo });
  ctx.assert(
    s.vows.taken.includes('corpoDeVidro') && hpBefore > s.player.maxHp,
    `o voto deveria recortar a vida: ${view}`,
  );
  ctx.assert(s.run.state !== 'shop' && s.build.corpo.fury.stacks === stacks, `edge case: a Fúria fica: ${view}`);
}

export async function furyScenarios(ctx) {
  await flowEnergy(ctx);
  await furyStacks(ctx);
  await furyResets(ctx);
  await glassBodyKeepsFury(ctx);
}
