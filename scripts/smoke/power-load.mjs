// Cenário 7 do `power.smoke.mjs` (POW-14): 8 inimigos vivos, o Azul, o Vermelho e o soco acertando na mesma janela, e
// os tetos seguram: efeitos de técnica vivos (`fx.live`) até 40, números de dano vivos até 12 e hitstop dos micro até
// 60 ms em qualquer janela de 1000 ms de relógio real (`hitstop.microMs`). Não é um cenário (o runner só roda
// `*.smoke.mjs`); fica à parte para o `power.smoke` caber no teto de linhas.
import { makeKit } from './fight-kit.mjs';

/** Rodada 2: a onda tem 8 inimigos (6 + 2 por rodada) e o `maxAlive=8` deixa todos vivos ao mesmo tempo. */
const QUERY = 'hd=1&area=modular&enemyGuard=0&noshop=1&round=2&maxAlive=8&tech=azul,vermelho';
const FX_CAP = 40;
const NUMBERS_CAP = 12;
const MICRO_CAP_MS = 60;
/** Quadros de 16 ms numa janela de 1000 ms de relógio real (o passo do `kit.frame` anda o relógio real mesmo congelado). */
const WINDOW_FRAMES = 62;
/** Quadros lidos depois do Vermelho: a corrida até quem sobrou e os socos. */
const PUNCH_FRAMES = 120;
/**
 * Quadros de recuo entre o soco e o Vermelho: o fim do `jab` e uns passos para trás. Golpe sofrido em `sign` cancela a
 * conjuração (CAST-07), e colado no grupo os inimigos acertam o player antes de o orbe sair.
 */
const BACKOFF_FRAMES = 20;
/** Distância (px) em que o player para de correr e soca. */
const REACH_PX = 34;

const living = (s) => s.enemies.filter((e) => e.hp > 0 && e.state !== 'deadRagdoll' && e.state !== 'dissolving');
const nearestDx = (s) =>
  living(s)
    .map((e) => e.x - s.player.x)
    .sort((a, b) => Math.abs(a) - Math.abs(b))[0] ?? 0;

/** Espera os 8 inimigos vivos com o mais perto já perto do player (eles nascem à direita e perseguem). */
async function gatherEight(kit, assert) {
  let s = await kit.snap(50);
  for (let i = 0; i < 400; i++) {
    if (living(s).length >= 8 && Math.abs(nearestDx(s)) < 70) break;
    s = await kit.snap(50);
  }
  assert(living(s).length >= 8, `POW-14: esperava 8 inimigos vivos: ${living(s).length} ${JSON.stringify(s.run)}`);
  return s;
}

/**
 * Guarda o pior de cada teto em todo quadro e os quadros que mostram a carga: com tique de chip, com o Vermelho (vivo ou detonando) e com soco do player conectando (`impact:<patamar>`, IMP-06).
 */
function track(m, s, fresh) {
  m.frame++;
  m.fx = Math.max(m.fx, s.fx.live);
  m.numbers = Math.max(m.numbers, s.damageNumbers.live);
  m.micro = Math.max(m.micro, s.hitstop.microMs);
  const kinds = new Set(s.techObjects.map((o) => o.kind));
  if (fresh.some((e) => e.startsWith('chip:'))) m.chipFrames.push(m.frame);
  if (kinds.has('red') || fresh.includes('redDetonate')) m.redFrames.push(m.frame);
  if (fresh.some((e) => e.startsWith('impact:'))) m.strikeFrames.push(m.frame);
}

/** Se algum soco cai numa janela de 1000 ms (`WINDOW_FRAMES`) que também tem tique de chip e o Vermelho. */
function loadedWindow(m) {
  return m.strikeFrames.some((f) =>
    m.chipFrames.some((c) => m.redFrames.some((r) => Math.max(f, c, r) - Math.min(f, c, r) <= WINDOW_FRAMES)),
  );
}

/**
 * Corre até o inimigo vivo mais perto e soca (J) colado nele por até `frames` quadros; para no primeiro soco que
 * conecta quando `untilHit` (a tecla de andar e o J soltos ao sair).
 */
async function chaseAndPunch(kit, m, step, getS, frames, untilHit) {
  const hits = m.strikeFrames.length;
  let held = null;
  for (let f = 0; f < frames && !(untilHit && m.strikeFrames.length > hits); f++) {
    const dx = nearestDx(getS());
    const want = Math.abs(dx) > REACH_PX ? (dx > 0 ? 'KeyD' : 'KeyA') : null;
    if (held !== want) {
      if (held) await kit.up(held);
      if (want) await kit.down(want);
      held = want;
    }
    if (!want && f % 6 === 0) await kit.down('KeyJ');
    if (f % 6 === 3) await kit.up('KeyJ');
    await step();
  }
  if (held) await kit.up(held);
  await kit.up('KeyJ');
}

/** Lança a técnica da tecla `code` (insiste até a conjuração começar) e passa os quadros até ela soltar o player. */
async function castTech(kit, step, getS, code) {
  for (let f = 0; f < 30 && getS().tech.cast === null; f++) {
    if (f % 4 === 0) await kit.down(code);
    if (f % 4 === 2) await kit.up(code);
    await step();
  }
  await kit.up(code);
  for (let f = 0; f < 120 && getS().tech.cast !== null; f++) await step();
}

/**
 * POW-14: com 8 inimigos vivos o player lança o Azul, corre até o grupo preso nele e soca; no primeiro soco que conecta
 * recua uns passos, vira e lança o Vermelho contra o grupo, e depois volta a socar quem sobrou. Em todo quadro os três
 * tetos valem. A conjuração trava o player, então o Azul, o soco e o Vermelho não começam no mesmo quadro: o cenário só
 * vale se um soco, um tique de chip e o Vermelho no ar cabem numa mesma janela de 1000 ms.
 */
export async function fullLoadCaps(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  await kit.boot(QUERY);
  let s = await gatherEight(kit, assert);
  const m = { frame: 0, fx: 0, numbers: 0, micro: 0, chipFrames: [], redFrames: [], strikeFrames: [] };
  let seen = s.events.length;
  const step = async () => {
    s = await kit.frame();
    track(m, s, s.events.slice(seen));
    seen = s.events.length;
  };
  const getS = () => s;
  await castTech(kit, step, getS, 'KeyL');
  await chaseAndPunch(kit, m, step, getS, 60, true);
  const away = nearestDx(s) > 0 ? 'KeyA' : 'KeyD';
  const toward = away === 'KeyA' ? 'KeyD' : 'KeyA';
  await kit.down(away);
  for (let f = 0; f < BACKOFF_FRAMES; f++) await step();
  await kit.up(away);
  await kit.down(toward);
  await step();
  await kit.up(toward);
  await castTech(kit, step, getS, 'KeyI');
  await chaseAndPunch(kit, m, step, getS, PUNCH_FRAMES, false);
  const view = JSON.stringify({
    ...m,
    chipFrames: m.chipFrames.join(),
    redFrames: `${m.redFrames[0]}-${m.redFrames.at(-1)}`,
  });
  assert(m.redFrames.length > 0, `POW-14: o Vermelho deveria ter saído: ${view}`);
  assert(
    loadedWindow(m),
    `POW-14: esperava um soco, um tique do Azul e o Vermelho na mesma janela de 1000 ms: ${view}`,
  );
  assert(m.fx <= FX_CAP, `POW-14: fx.live passou de ${FX_CAP}: ${view}`);
  assert(m.numbers <= NUMBERS_CAP, `POW-14: damageNumbers.live passou de ${NUMBERS_CAP}: ${view}`);
  assert(m.micro <= MICRO_CAP_MS, `POW-14: o hitstop dos micro passou de ${MICRO_CAP_MS} ms em 1000 ms: ${view}`);
  console.log(`      POW-14 sob a carga: ${view}`);
}
