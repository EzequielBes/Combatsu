// Ramos e Despertares do Vermelho no jogo vivo (VRM-12 a VRM-17), cenários do `red-axes.smoke.mjs` a partir do 4º.
// Não é um cenário próprio (o runner só roda `*.smoke.mjs`): o `red-axes` os chama, e o arquivo existe para ele caber
// no teto de 400 linhas.
import { makeKit } from './fight-kit.mjs';

export const BASE = 'hd=1&area=modular&maxAlive=3&tech=vermelho';
/** Quadros até a soltura: sinal 165 + carga 225 ms com a Conjuração 2, com folga. */
const CAST_FRAMES = 60;

/**
 * Aperta `L` e passa quadros até o `techCast:vermelho`; devolve o snapshot da soltura e os quadros desde o aperto.
 * `hold`: a tecla fica segurada (o chamador a solta depois).
 */
export async function castRed(kit, ctx, s0, hold = false) {
  const seen = s0.events.length;
  await kit.down('KeyL');
  let s = await kit.frame();
  if (!hold) await kit.up('KeyL');
  let frames = 1;
  for (; frames < CAST_FRAMES && !s.events.slice(seen).includes('techCast:vermelho'); frames++) s = await kit.frame();
  ctx.assert(
    s.events.slice(seen).includes('techCast:vermelho'),
    `o Vermelho deveria soltar: ${JSON.stringify(s.tech)}`,
  );
  return { s, frames };
}

/** Leva o player do laboratório até `spotX` e o vira para a esquerda, para os bonecos (x 232, 312 e 392). */
export async function faceDummies(kit, ctx, query, spotX) {
  let s = await kit.boot(`hd=1&fxlab&tech=vermelho&${query}`);
  await kit.down('KeyD');
  for (let i = 0; i < 400 && s.player.x < spotX; i++) s = await kit.frame();
  await kit.up('KeyD');
  await kit.down('KeyA');
  await kit.frame();
  await kit.up('KeyA');
  s = await kit.snap(200);
  ctx.assert(s.player.facing === -1, `o player deveria olhar para os bonecos: ${JSON.stringify(s.player)}`);
  return s;
}

/**
 * Passa quadros desde a soltura até o orbe sumir (ou `maxFrames`); devolve o último snapshot, os eventos desde
 * `seen` e o orbe vivo a cada quadro (`null` quando sumiu).
 */
export async function followOrb(kit, s, seen, maxFrames = 240) {
  const orbs = [];
  for (let i = 0; i < maxFrames; i++) {
    s = await kit.frame();
    const orb = s.techObjects.find((o) => o.kind === 'red') ?? null;
    orbs.push({ orb, detonations: s.events.slice(seen).filter((e) => e === 'redDetonate').length });
    if (!orb) break;
  }
  return { s, events: s.events.slice(seen), orbs };
}

/** `redTouch:<n>:<alvo>:<dano>` e `redBlast:<n>:<alvo>:<dano>` como `{ kind, n, id, dmg }`. */
export function redHits(events) {
  return events
    .filter((e) => e.startsWith('redTouch:') || e.startsWith('redBlast:'))
    .map((e) => {
      const [kind, n, id, dmg] = e.split(':');
      return { kind, n: Number(n), id: Number(id), dmg: Number(dmg) };
    });
}

const countDetonations = (events) => events.filter((e) => e === 'redDetonate').length;

/**
 * VRM-12 (cenário 4): com o Ricochete e os bonecos em fila (laboratório: parados), o orbe detona no 1º boneco em vez
 * de atravessá-lo e rebate uma vez: 2 `redDetonate`, a 1ª com o dano cheio e a 2ª com 70 % do toque e da detonação.
 */
async function ricochet(ctx) {
  const kit = makeKit(ctx);
  let s = await faceDummies(kit, ctx, 'axes=vermelho.potencia:1&ramo=vermelho:a', 520);
  const { touch, detonation } = s.build.vermelho.stats;
  ctx.assert(s.build.vermelho.branch === 'ricochete', `VRM-18: ramo Ricochete: ${JSON.stringify(s.build.vermelho)}`);
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s));
  const run = await followOrb(kit, s, seen);
  const hits = redHits(run.events);
  const view = JSON.stringify({ hits, ev: run.events.filter((e) => e.startsWith('red')) });
  ctx.assert(countDetonations(run.events) === 2, `VRM-12: 2 detonações (1 rebote): ${view}`);
  const first = hits.filter((h) => h.n === 1);
  const second = hits.filter((h) => h.n === 2);
  ctx.assert(
    first.some((h) => h.kind === 'redTouch'),
    `VRM-12.2: o 1º boneco leva o toque e detona: ${view}`,
  );
  ctx.assert(second.length > 0, `VRM-12.3: a 2ª detonação acerta um boneco: ${view}`);
  const full = (h) => (h.kind === 'redTouch' ? touch : detonation);
  ctx.assert(
    first.every((h) => h.dmg === full(h)),
    `VRM-12.4: a 1ª com o dano cheio (${touch}/${detonation}): ${view}`,
  );
  ctx.assert(
    second.every((h) => h.dmg === Math.round(full(h) * 0.7)),
    `VRM-12.4: a 2ª com 70 % (${Math.round(touch * 0.7)}/${Math.round(detonation * 0.7)}): ${view}`,
  );
}

/**
 * VRM-12.5: com o Ricochete e um inimigo só, ninguém sobra a 200 px no rebote: o orbe volta pelo lado oposto ao que
 * voava e detona no fim dos 200 px.
 */
async function ricochetBack(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&maxAlive=1&enemyGuard=0&axes=vermelho.potencia:1&ramo=vermelho:a`);
  s = await kit.approach(90);
  const facing = s.player.facing;
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s));
  const run = await followOrb(kit, s, seen);
  const view = JSON.stringify(run.orbs.map((o) => [o.detonations, o.orb?.x, o.orb?.traveled]));
  ctx.assert(countDetonations(run.events) === 2, `VRM-12.5: 2 detonações, a 2ª no fim do rebote: ${view}`);
  const back = run.orbs.filter((o) => o.detonations === 1 && o.orb);
  ctx.assert(back.length > 1, `VRM-12.5: o orbe voa depois do rebote: ${view}`);
  const dx = back.at(-1).orb.x - back[0].orb.x;
  ctx.assert(Math.sign(dx) === -facing, `VRM-12.5: o rebote volta pelo lado oposto (facing ${facing}): ${view}`);
  const far = back.at(-1).orb.traveled;
  ctx.assert(far >= 180 && far <= 200, `VRM-12.5: o rebote voa até os 200 px e detona no fim: ${view}`);
}

/**
 * VRM-13: com o Fliperama (Ricochete no Nv 5), o orbe rebate 3 vezes em qualquer alvo (4 detonações) e o número da
 * 3ª já soma 4 % do HP máximo do alvo; as outras não. Três inimigos soltos: a 3ª detonação pode não pegar ninguém, e
 * só aí o cenário abre de novo (até 3 vezes); as 4 detonações valem em toda tentativa.
 */
async function pinball(ctx) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const kit = makeKit(ctx);
    let s = await kit.boot(`${BASE}&enemyGuard=0&axes=vermelho.potencia:2,vermelho.conjuracao:2&ramo=vermelho:a`);
    const red = s.build.vermelho;
    ctx.assert(red.awakened === true && red.level === 5, `VRM-17: Fliperama ligado no Nv 5: ${JSON.stringify(red)}`);
    for (let i = 0; i < 40 && s.enemies.length < 3; i++) s = await kit.snap(300);
    s = await kit.approach(90);
    const maxHp = new Map(s.enemies.map((e) => [e.id, e.maxHp]));
    const seen = s.events.length;
    ({ s } = await castRed(kit, ctx, s));
    const run = await followOrb(kit, s, seen);
    const hits = redHits(run.events);
    // Um inimigo que nasce no meio do voo também pode levar uma detonação.
    for (const e of run.s.enemies) if (!maxHp.has(e.id)) maxHp.set(e.id, e.maxHp);
    const view = JSON.stringify({ hits, maxHp: [...maxHp] });
    ctx.assert(countDetonations(run.events) === 4, `VRM-13: 3 rebotes (4 detonações): ${view}`);
    const base = (h) =>
      Math.round((h.kind === 'redTouch' ? red.stats.touch : red.stats.detonation) * (h.n > 1 ? 0.7 : 1));
    for (const h of hits) {
      const pct = h.n === 3 ? Math.round(maxHp.get(h.id) * 0.04) : 0;
      ctx.assert(h.dmg === base(h) + pct, `VRM-13: o número da detonação ${h.n} (4 % só na 3ª): ${view}`);
    }
    if (hits.some((h) => h.n === 3)) return;
  }
  ctx.assert(false, 'VRM-13: a 3ª detonação não pegou ninguém em 3 tentativas');
}

/** Raio da detonação sem Escala (96) e o do orbe segurado do Contido (× 1,4, VRM-14). */
const RADIUS = 96;
const HELD_RADIUS = RADIUS * 1.4;
const CONTIDO = `${BASE}&maxAlive=1&axes=vermelho.potencia:1&ramo=vermelho:b`;

/** Maior `fx.red.sphereR` (a esfera da detonação crescendo) nos próximos quadros. */
async function maxSphere(kit, s, frames = 40) {
  let max = s.fx.red.sphereR ?? 0;
  for (let i = 0; i < frames; i++) max = Math.max(max, (s = await kit.frame()).fx.red.sphereR ?? 0);
  return max;
}

/**
 * VRM-14 (cenário 5): com o Contido e `L` segurado desde antes da saída, o orbe voa, paira no fim dos 320 px e só
 * detona ao soltar, com o raio × 1,4 lido no `fx`; levar golpe (tecla 4 de debug) com ele pairando não o cancela.
 */
async function containedRelease(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(CONTIDO);
  ctx.assert(s.build.vermelho.branch === 'contido', `VRM-18: ramo Contido: ${JSON.stringify(s.build.vermelho)}`);
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s, true));
  let orb = null;
  for (let i = 0; i < 40 && !(orb?.traveled >= 320); i++)
    orb = (s = await kit.frame()).techObjects.find((o) => o.kind === 'red');
  ctx.assert(orb?.traveled === 320, `VRM-14: o orbe segurado chega aos 320 px: ${JSON.stringify(s.techObjects)}`);
  const hp = s.player.hp;
  await ctx.page.keyboard.press('Digit4');
  for (let i = 0; i < 10; i++) s = await kit.frame();
  const still = s.techObjects.find((o) => o.kind === 'red');
  ctx.assert(s.player.hp < hp, `o golpe de teste deveria ferir o player: ${hp} -> ${s.player.hp}`);
  ctx.assert(
    still?.x === orb.x && !s.events.slice(seen).includes('redDetonate'),
    `VRM-14, edge case: o orbe segue pairando parado depois do golpe: ${JSON.stringify({ orb, still })}`,
  );
  await kit.up('KeyL');
  s = await kit.frame();
  ctx.assert(
    s.events.slice(seen).includes('redDetonate'),
    `VRM-14: soltar a tecla detona: ${JSON.stringify(s.techObjects)}`,
  );
  const r = await maxSphere(kit, s);
  ctx.assert(Math.abs(r - HELD_RADIUS) < 0.5, `VRM-14: raio × 1,4 (${HELD_RADIUS}) na detonação segurada: ${r}`);
}

/** VRM-14: segurando sem soltar, o orbe detona aos 1,2 s da saída (72 quadros: o `step(16)` anda um passo fixo de 1000/60 ms), com o raio × 1,4. */
async function containedTimeout(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(CONTIDO);
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s, true));
  let frames = 0;
  for (; frames < 120 && !s.events.slice(seen).includes('redDetonate'); frames++) s = await kit.frame();
  await kit.up('KeyL');
  ctx.assert(
    Math.abs(frames - 72) <= 1,
    `VRM-14: detona aos 1,2 s segurando: ${frames} quadros (${Math.round((frames * 1000) / 60)} ms)`,
  );
  const r = await maxSphere(kit, s);
  ctx.assert(Math.abs(r - HELD_RADIUS) < 0.5, `VRM-14: raio × 1,4 (${HELD_RADIUS}) aos 1,2 s: ${r}`);
}

/** VRM-14.8: soltando antes da saída, o orbe do Contido voa e detona como o sem ramo, com o raio normal. */
async function containedEarly(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(CONTIDO);
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s));
  let frames = 0;
  for (; frames < 120 && !s.events.slice(seen).includes('redDetonate'); frames++) s = await kit.frame();
  ctx.assert(frames < 40, `VRM-14.8: solto antes da saída, detona no fim do voo (~420 ms): ${frames} quadros`);
  const r = await maxSphere(kit, s);
  ctx.assert(Math.abs(r - RADIUS) < 0.5, `VRM-14.8: raio normal (${RADIUS}) sem segurar: ${r}`);
}

/** Vermelho Máximo: Contido no Nv 5 (4 pontos). */
const MAXIMO = 'axes=vermelho.potencia:2,vermelho.conjuracao:2&ramo=vermelho:b';
/** 200 ms de tique do campo em quadros de 1000/60 ms. */
const TICK_FRAMES = 12;

/**
 * VRM-15 (cenário 6): com o Vermelho Máximo, a detonação deixa o campo: o boneco parado dentro dele (laboratório) leva
 * um `chip` de 3 (round(3 × 1 × 1)) a cada 200 ms, 6 vezes em 1200 ms, e o campo acaba.
 */
async function fieldChips(ctx) {
  const kit = makeKit(ctx);
  let s = await faceDummies(kit, ctx, MAXIMO, 520);
  const red = s.build.vermelho;
  ctx.assert(
    red.awakened === true && red.branch === 'contido',
    `VRM-17: Vermelho Máximo ligado: ${JSON.stringify(red)}`,
  );
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s));
  const ticks = [];
  let opened = null;
  let ended = null;
  for (let f = 0; f < 200 && ended === null; f++) {
    s = await kit.frame();
    const fresh = s.events.slice(seen);
    if (opened === null && fresh.includes('redField')) opened = f;
    if (fresh.includes('redFieldEnd')) ended = f;
    const chips = fresh.filter((e) => e.startsWith('redChip:')).length;
    while (ticks.length < chips) ticks.push({ f, ev: fresh.filter((e) => e.startsWith('redChip:'))[ticks.length] });
  }
  const near = s.fxlab.dummies.find((d) => d.x === 232);
  const mine = ticks.filter((t) => t.ev === `redChip:${near.id}:3`);
  const view = JSON.stringify({ opened, ended, ticks });
  ctx.assert(opened !== null && ended !== null, `VRM-15: o campo abre e fecha: ${view}`);
  ctx.assert(mine.length === 6, `VRM-15: 6 chips de 3 no boneco dentro do campo em 1200 ms: ${view}`);
  const gaps = mine.slice(1).map((t, i) => t.f - mine[i].f);
  ctx.assert(
    gaps.every((g) => Math.abs(g - TICK_FRAMES) <= 1),
    `VRM-15: um chip a cada 200 ms: ${JSON.stringify(gaps)}`,
  );
  ctx.assert(Math.abs(ended - mine[0].f - 5 * TICK_FRAMES) <= 1, `VRM-15: o último tique fecha os 1200 ms: ${view}`);
}

const distTo = (e, x) => Math.abs(e.x - x);
const pullLen = (p) => Math.hypot(p.x, p.y);

/**
 * VRM-15: o comum em pé que entra no campo é empurrado do centro para fora a 150 px/s (2,5 px por passo, lido no
 * `pull` do movimento do inimigo) e nenhum `pull` sobra depois do fim. O orbe segurado paira a 320 px e só detona
 * quando o inimigo que vem andando chega perto da borda, para ele entrar no campo em pé.
 */
async function fieldPush(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&enemyGuard=0&${MAXIMO}`);
  s = await kit.waitFor((x) => x.enemies.length > 0, 300, 'um inimigo deveria nascer');
  const near = (x) => Math.min(...x.enemies.map((e) => distTo(e, x.player.x)));
  const toward = s.enemies[0].x > s.player.x ? 'KeyD' : 'KeyA';
  await kit.down(toward);
  s = await kit.frame();
  await kit.up(toward);
  // O inimigo que vem andando (até 112 px/s) chega à borda do campo pouco depois da saída do orbe.
  s = await kit.waitFor((x) => near(x) <= 620, 600, 'o inimigo deveria vir andando');
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s, true));
  let orb = s.techObjects.find((o) => o.kind === 'red');
  let center = orb?.x;
  for (let i = 0; i < 90 && orb && Math.min(...s.enemies.map((e) => distTo(e, orb.x))) > HELD_RADIUS + 30; i++) {
    s = await kit.frame();
    orb = s.techObjects.find((o) => o.kind === 'red') ?? null;
    if (orb) center = orb.x;
  }
  await kit.up('KeyL');
  let pushed = 0;
  let ended = false;
  for (let i = 0; i < 200 && !ended; i++) {
    s = await kit.frame();
    ended = s.events.slice(seen).includes('redFieldEnd');
    for (const e of s.enemies) {
      if (ended || !['idle', 'hitstun', 'stagger'].includes(e.state)) continue;
      // Em pé e bem dentro do raio, o campo tem de empurrar; na borda, o empurrão (quando há) aponta para fora.
      const deep = distTo(e, center) < HELD_RADIUS - 12;
      if (!deep && !e.pull) continue;
      ctx.assert(
        e.pull && Math.abs(pullLen(e.pull) - 2.5) < 0.05 && Math.sign(e.pull.x) === Math.sign(e.x - center),
        `VRM-15: o comum em pé dentro do campo é empurrado para fora a 2,5 px/passo: ${JSON.stringify({ center, e })}`,
      );
      pushed++;
    }
  }
  ctx.assert(ended, `VRM-15: o campo deveria acabar: ${JSON.stringify(s.events.slice(seen))}`);
  ctx.assert(
    pushed > 0,
    `VRM-15: um comum em pé deveria entrar no campo (centro ${center}): ${JSON.stringify(s.enemies)}`,
  );
  ctx.assert(
    s.enemies.every((e) => e.pull === null),
    `VRM-15: nenhum pull sobra no fim: ${JSON.stringify(s.enemies)}`,
  );
}

/**
 * VRM-15, edge case: com um orbe Azul vivo, o campo não empurra (o puxão do Azul vale em todo comum) e o chip
 * continua. O Azul sai primeiro na frente dos inimigos; o Vermelho Máximo segurado detona perto do player logo depois.
 */
async function fieldWithBlue(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`hd=1&area=modular&maxAlive=3&enemyGuard=0&tech=vermelho,azul&${MAXIMO}`);
  for (let i = 0; i < 40 && s.enemies.length < 3; i++) s = await kit.snap(300);
  s = await kit.approach(90);
  const seen = s.events.length;
  await kit.down('KeyI');
  s = await kit.frame();
  await kit.up('KeyI');
  s = await kit.waitFor((x) => x.events.slice(seen).includes('techCast:azul'), 60, 'o Azul deveria soltar');
  s = await kit.waitFor((x) => x.tech.cast === null, 60, 'a conjuração do Azul deveria acabar');
  ({ s } = await castRed(kit, ctx, s, true));
  for (let i = 0; i < 3; i++) s = await kit.frame();
  await kit.up('KeyL');
  let overlap = 0;
  let pulled = 0;
  let chips = 0;
  for (let i = 0; i < 120; i++) {
    const before = s.events.length;
    s = await kit.frame();
    const blue = s.techObjects.find((o) => o.kind === 'blue');
    const field = s.events.slice(seen).includes('redField') && !s.events.slice(seen).includes('redFieldEnd');
    if (!blue || !field) continue;
    overlap++;
    chips += s.events.slice(before).filter((e) => e.startsWith('redChip:')).length;
    // Colado no centro do Azul a direção do puxão (calculada antes do passo do Matter) não diz nada: fica de fora.
    for (const e of s.enemies.filter((x) => x.pull && Math.hypot(x.x - blue.x, x.y - blue.y) > 16)) {
      const toward = (blue.x - e.x) * e.pull.x + (blue.y - e.y) * e.pull.y;
      ctx.assert(toward > 0, `VRM-15: com o Azul vivo o puxão é o dele: ${JSON.stringify({ blue, e })}`);
      pulled++;
    }
  }
  const view = JSON.stringify({ overlap, pulled, chips });
  ctx.assert(overlap > 0 && pulled > 0, `VRM-15: o Azul puxa enquanto o campo vive: ${view}`);
  ctx.assert(chips > 0, `VRM-15: o chip do campo continua com o Azul vivo: ${view}`);
}

/**
 * VRM-16 (cenário 6, `modules=beco`): o Vermelho Máximo com Escala 2 (raio 144 × 1,4) solto ao pairar joga o comum que
 * vem da boca da direita contra a parede do fim do beco: `wallStun:<id>` uma vez e o `ragdollStun` dura 600 ms (36
 * quadros) contados do toque, menos que os 1100 ms da derrubada comum.
 */
async function wallStun(ctx) {
  const kit = makeKit(ctx);
  const q = 'hd=1&area=modular&modules=beco&maxAlive=1&enemyGuard=0&tech=vermelho';
  let s = await kit.boot(`${q}&axes=vermelho.potencia:2,vermelho.escala:2&ramo=vermelho:b`);
  ctx.assert(s.build.vermelho.awakened === true, `VRM-17: Vermelho Máximo ligado: ${JSON.stringify(s.build.vermelho)}`);
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s, true));
  let orb = s.techObjects.find((o) => o.kind === 'red');
  for (let i = 0; i < 40 && orb && orb.traveled < 320; i++)
    orb = (s = await kit.frame()).techObjects.find((o) => o.kind === 'red');
  await kit.up('KeyL');
  let touch = null;
  let id = null;
  for (let f = 0; f < 150; f++) {
    s = await kit.frame();
    const stuns = s.events.slice(seen).filter((e) => e.startsWith('wallStun:'));
    if (touch === null && stuns.length > 0) {
      touch = f;
      id = Number(stuns[0].split(':')[1]);
    }
    const e = s.enemies.find((x) => x.id === id);
    if (touch !== null && e && e.state !== 'ragdollStun') {
      const view = JSON.stringify({ touch, f, state: e.state, stuns });
      ctx.assert(new Set(stuns).size === 1 && stuns.length >= 1, `VRM-16: um wallStun só: ${view}`);
      ctx.assert(Math.abs(f - touch - 36) <= 2, `VRM-16: ragdollStun por 600 ms do toque (36 quadros): ${view}`);
      return;
    }
  }
  ctx.assert(
    false,
    `VRM-16: o comum deveria bater na parede e se levantar: ${JSON.stringify({ touch, en: s.enemies })}`,
  );
}

/** Cenários dos ramos e Despertares, na ordem das tarefas (T30 em diante). */
export async function branchScenarios(ctx) {
  await ricochet(ctx);
  await ricochetBack(ctx);
  await pinball(ctx);
  await containedRelease(ctx);
  await containedTimeout(ctx);
  await containedEarly(ctx);
  await fieldChips(ctx);
  await fieldPush(ctx);
  await fieldWithBlue(ctx);
  await wallStun(ctx);
}
