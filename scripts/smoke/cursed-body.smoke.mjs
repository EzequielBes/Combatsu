// Corpo Amaldiçoado no jogo vivo (CRP-01 a CRP-15), no mundo modular em HD com
// `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0`. Cada cenário abre a sua própria página e lê do motor o
// efeito dos pontos do Corpo (a vida e o estado do inimigo, a duração do golpe), não só o `build.corpo` do snapshot.
import { makeKit } from './fight-kit.mjs';

export const BASE = 'hd=1&area=modular&enemyGuard=0';

/**
 * Encosta no inimigo, aperta `key` e passa quadros até ele perder vida; devolve o dano levado, o estado dele logo
 * depois do acerto e o snapshot desse quadro.
 */
export async function strikeOnce(kit, ctx, key, label) {
  let s = await kit.approach();
  const before = new Map(s.enemies.map((e) => [e.id, e.hp]));
  await kit.down(key);
  let hit = null;
  for (let f = 0; f < 60 && hit === null; f++) {
    s = await kit.frame();
    if (f === 1) await kit.up(key);
    hit = s.enemies.find((e) => e.hp < (before.get(e.id) ?? e.hp)) ?? null;
  }
  await kit.up(key);
  ctx.assert(hit !== null, `${label}: o golpe deveria acertar: ${JSON.stringify(s.enemies.map((e) => [e.x, e.hp]))}`);
  return { damage: before.get(hit.id) - hit.hp, id: hit.id, s };
}

/** Estado do inimigo `id` ao longo de `frames` quadros: devolve se ele chegou a `ragdollStun`. */
async function fellWithin(kit, id, frames) {
  for (let f = 0; f < frames; f++) {
    const s = await kit.frame();
    if (s.enemies.find((e) => e.id === id)?.state === 'ragdollStun') return true;
  }
  return false;
}

/** CRP-03.5: com Peso 2 o forte (`K`, chute frontal) derruba o comum; com Peso 1 ele só cambaleia. */
async function weightKnockdown(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&axes=corpo.peso:2`);
  const heavy = await strikeOnce(kit, ctx, 'KeyK', 'Peso 2');
  ctx.assert(await fellWithin(kit, heavy.id, 6), `CRP-03.5: com Peso 2 o forte deveria derrubar o comum`);
  await kit.boot(`${BASE}&axes=corpo.peso:1`);
  const light = await strikeOnce(kit, ctx, 'KeyK', 'Peso 1');
  ctx.assert(!(await fellWithin(kit, light.id, 6)), `CRP-03.5: com Peso 1 o forte não deveria derrubar o comum`);
}

/** Jab (6) com Força 5 (+50 %): `round(6 × 1,5)` = 9; com Impacto 3, `round(6 × 1,5 × 1,3)` = 12 (CRP-02). */
const JAB_FORCA_5 = 9;
const JAB_FORCA_5_IMPACTO_3 = 12;

/** CRP-02: o Impacto 3 soma 3 pontos de força à Força 5 e multiplica o dano do `jab` por 1,3 sobre a Força. */
async function impactDamage(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&mods=forca:5`);
  const plain = await strikeOnce(kit, ctx, 'KeyJ', 'Força 5');
  ctx.assert(plain.damage === JAB_FORCA_5, `MOD-05: o jab com Força 5 deveria tirar ${JAB_FORCA_5}: ${plain.damage}`);
  const s = await kit.boot(`${BASE}&axes=corpo.impacto:3&mods=forca:5`);
  ctx.assert(s.power.points === 8, `CRP-02.3: Força 5 + Impacto 3 = 8 pontos: ${JSON.stringify(s.power)}`);
  const built = await strikeOnce(kit, ctx, 'KeyJ', 'Impacto 3');
  ctx.assert(
    built.damage === JAB_FORCA_5_IMPACTO_3,
    `CRP-02.2: o jab com Impacto 3 deveria tirar ${JAB_FORCA_5_IMPACTO_3}: ${built.damage}`,
  );
}

/** CRP-01: o Corpo começa no Nv 1, sobe com os pontos e volta ao Nv 1 na run nova (`R`). */
async function levelResets(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(BASE);
  ctx.assert(s.build.corpo.level === 1, `CRP-01: o Corpo começa no Nv 1: ${JSON.stringify(s.build.corpo)}`);
  s = await kit.boot(`${BASE}&axes=corpo.peso:2`);
  ctx.assert(s.build.corpo.level === 3, `CRP-01: Peso 2 dá o Nv 3: ${JSON.stringify(s.build.corpo)}`);
  // Sem o `axes=` na URL, a run nova do `R` não recebe os pontos de novo: o que sobrar viria da run anterior.
  await ctx.page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('axes');
    window.history.replaceState(null, '', url);
  });
  await kit.tap('KeyR');
  s = await kit.snap(50);
  if (s.run.state === 'title') s = await kit.tap('KeyJ');
  ctx.assert(
    s.build.corpo.level === 1 && s.build.corpo.axes.peso === 0,
    `CRP-01: o R volta o Corpo ao Nv 1: ${JSON.stringify(s.build.corpo)}`,
  );
}

/** Boneco de treino do laboratório (parado, x 392) usado para medir o alcance do `jab` a uma distância exata. */
const DUMMY_X = 392;

/**
 * Leva o player do laboratório para a direita do boneco de x 392, de frente para ele, a `dist` px (passos de um quadro
 * no fim, ~0,3 px), dá um `jab` e devolve se o boneco perdeu vida e a distância real do aperto.
 */
async function jabAt(ctx, query, dist) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`hd=1&fxlab&${query}`);
  await kit.down('KeyD');
  for (let i = 0; i < 400 && s.player.x < DUMMY_X + dist + 40; i++) s = await kit.frame();
  await kit.up('KeyD');
  await kit.snap(300);
  await kit.tap('KeyA', 16);
  s = await kit.snap(300);
  for (let i = 0; i < 200 && s.player.x - DUMMY_X > dist; i++) {
    await kit.tap('KeyA', 16);
    s = await kit.snap(100);
  }
  const at = s.player.x - DUMMY_X;
  ctx.assert(s.player.facing === -1 && Math.abs(at - dist) < 1, `o player deveria parar a ${dist} px: ${at}`);
  const hp0 = s.fxlab.dummies.find((d) => d.x === DUMMY_X).hp;
  await kit.tap('KeyJ', 16);
  let hit = false;
  for (let f = 0; f < 20 && !hit; f++) hit = (await kit.frame()).fxlab.dummies.find((d) => d.x === DUMMY_X).hp < hp0;
  return hit;
}

/**
 * Distâncias (centro a centro) em volta da borda de hoje do `jab` no boneco: a caixa (22 + 26/2) mais meia largura do
 * boneco (11) mais o passo à frente (4) dão ~50 px; a 49 acerta e a 52 erra.
 */
const JAB_HITS_AT = 49;
const JAB_MISSES_AT = 52;
/** CRP-05: o Alcance 3 alarga a caixa 14 px para a frente. */
const REACH_3_PX = 14;

/**
 * CRP-05 (laboratório, porque o boneco fica parado e o comum anda): sem o eixo o `jab` acerta a 49 px e erra a 52; com
 * `alcance:3` a mesma borda anda 14 px, acertando a 63 e errando a 66.
 */
async function reachWidens(ctx) {
  const plainHit = await jabAt(ctx, '', JAB_HITS_AT);
  const plainMiss = await jabAt(ctx, '', JAB_MISSES_AT);
  const farHit = await jabAt(ctx, 'axes=corpo.alcance:3', JAB_HITS_AT + REACH_3_PX);
  const farMiss = await jabAt(ctx, 'axes=corpo.alcance:3', JAB_MISSES_AT + REACH_3_PX);
  const view = JSON.stringify({ plainHit, plainMiss, farHit, farMiss });
  ctx.assert(plainHit && !plainMiss, `CRP-05: sem o eixo o jab acerta a 49 e erra a 52: ${view}`);
  ctx.assert(farHit && !farMiss, `CRP-05: com Alcance 3 o jab acerta 14 px além (63) e erra a 66: ${view}`);
}

/** Quadros do `move:jab` até `player.move` voltar a `null`, num `jab` que acerta o comum; devolve os ms. */
async function jabDurationMs(ctx, query) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&${query}`);
  await kit.approach();
  await kit.waitQuiet();
  let s = await kit.approach();
  const seen = s.events.length;
  await kit.down('KeyJ');
  s = await kit.frame();
  await kit.up('KeyJ');
  ctx.assert(s.events.slice(seen).includes('move:jab'), `o jab deveria começar: ${s.events.slice(seen)}`);
  const hp0 = new Map(s.enemies.map((e) => [e.id, e.hp]));
  let frames = 0;
  let hit = false;
  for (; frames < 60 && s.player.move !== null; frames++) {
    s = await kit.frame();
    hit ||= s.enemies.some((e) => e.hp < (hp0.get(e.id) ?? e.hp));
  }
  ctx.assert(hit && s.player.move === null, `o jab deveria acertar e acabar: ${JSON.stringify({ hit, frames })}`);
  return (frames * 1000) / 60;
}

/** `recoveryMs` do `jab` (`data/moves.ts`) e o que o Ritmo 3 tira dele: `120 − round(0,78 × 120)` = 26 ms (CRP-04). */
const JAB_RECOVERY_MS = 120;
const RHYTHM_3_CUT_MS = JAB_RECOVERY_MS - Math.round(0.78 * JAB_RECOVERY_MS);

/** CRP-04 (L-043): com Ritmo 3 o `jab` que acerta acaba 26 ms antes, medido no jogo, com 1 quadro de folga. */
async function rhythmShortens(ctx) {
  const plain = await jabDurationMs(ctx, 'axes=');
  const quick = await jabDurationMs(ctx, 'axes=corpo.ritmo:3');
  ctx.assert(
    Math.abs(plain - quick - RHYTHM_3_CUT_MS) <= 1000 / 60,
    `CRP-04: o jab com Ritmo 3 deveria durar ${RHYTHM_3_CUT_MS} ms a menos: ${plain.toFixed(1)} contra ${quick.toFixed(1)}`,
  );
}

/**
 * VRM-16 (`modules=beco`): com Peso 3 o forte derruba o comum que vem da boca da direita e o joga contra a parede do
 * fim do beco, que o atordoa (`wallStun:<id>`).
 */
async function weightWallStun(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&modules=beco&axes=corpo.peso:3`);
  const heavy = await strikeOnce(kit, ctx, 'KeyK', 'Peso 3');
  let s = heavy.s;
  const seen = s.events.length;
  for (let f = 0; f < 120 && !s.events.includes(`wallStun:${heavy.id}`); f++) s = await kit.frame();
  ctx.assert(
    s.events.includes(`wallStun:${heavy.id}`),
    `VRM-16: o comum derrubado pelo Peso 3 deveria bater na parede: ${JSON.stringify({ ev: s.events.slice(seen - 3), en: s.enemies })}`,
  );
}

/**
 * Dá um `jab` no ar (sem alvo) e devolve a largura e o comprimento do rastro em `fx.trails` e as pós-imagens do golpe.
 */
async function jabTrail(ctx, query) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&${query}`);
  const seen = s.events.length;
  await kit.down('KeyJ');
  s = await kit.frame();
  await kit.up('KeyJ');
  let widthPx = 0;
  let lengthPx = 0;
  for (let f = 0; f < 30; f++) {
    s = await kit.frame();
    for (const t of s.fx.trails) widthPx = Math.max(widthPx, t.widthPx);
    for (const t of s.fx.trails) lengthPx = Math.max(lengthPx, t.lengthPx);
  }
  ctx.assert(s.events.slice(seen).includes('move:jab'), `o jab deveria sair: ${s.events.slice(seen)}`);
  return { widthPx, lengthPx, echoes: s.events.slice(seen).filter((e) => e === 'bodyEcho:jab').length };
}

/**
 * CRP-05: com Alcance 3 o rastro do `jab` em `fx.trails` fica 14 px mais longo, com a mesma largura; CRP-04: com Ritmo 3 a `recovery` deixa uma
 * pós-imagem por golpe (o evento sai só quando a cópia nasce) e sem o eixo nenhuma.
 */
async function trailAndEcho(ctx) {
  const plain = await jabTrail(ctx, 'axes=');
  const far = await jabTrail(ctx, 'axes=corpo.alcance:3');
  const quick = await jabTrail(ctx, 'axes=corpo.ritmo:3');
  const view = JSON.stringify({ plain, far, quick });
  // SPEC_DEVIATION: a T45 somava os 14 px ao `extraPx` (a largura do rastro); aqui o rastro fica 14 px mais longo.
  // Reason: o CRP-05 pede o rastro alongado ("lengthen"); somado à largura, o rastro do leve virou um borrão em cima do
  // braço (prancha `.fable-out/t45-alcance.png`).
  ctx.assert(
    plain.lengthPx > 0 && Math.abs(far.lengthPx - plain.lengthPx - REACH_3_PX) < 0.01 && far.widthPx === plain.widthPx,
    `CRP-05: rastro 14 px mais longo e da mesma largura: ${view}`,
  );
  ctx.assert(plain.echoes === 0 && quick.echoes === 1, `CRP-04: uma pós-imagem na recovery com Ritmo 3: ${view}`);
}

export default async function (ctx) {
  await levelResets(ctx);
  await weightKnockdown(ctx);
  await impactDamage(ctx);
  await reachWidens(ctx);
  await rhythmShortens(ctx);
  await weightWallStun(ctx);
  await trailAndEcho(ctx);
}
