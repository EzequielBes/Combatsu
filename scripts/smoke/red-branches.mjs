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

/** Cenários dos ramos e Despertares, na ordem das tarefas (T30 em diante). */
export async function branchScenarios(ctx) {
  await ricochet(ctx);
  await ricochetBack(ctx);
  await pinball(ctx);
}
