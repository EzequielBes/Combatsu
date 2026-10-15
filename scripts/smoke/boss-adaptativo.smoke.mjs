// Adaptativo no jogo vivo, em `?debug&hd=1&area=modular` (ADP-01/02/04/06/07, BRD-07).
// `round=10&bossArch=oni&bossAffix=adaptativo&finger=0`. Depois da intro o player anda até o chefe e espera ele parar
// perto. Então golpes fortes de teste (tecla 2), um a cada dois quadros: o 3º zera a postura e o chefe entra em
// `stagger` (dano × 1,5); até o 4º nada adapta, o 5º adapta a fonte `heavy` (ADP-01/03, ADP-07) e a roda aparece
// sobre a cabeça com "Forte" (ADP-06); o 6º, da fonte já adaptada, tira a metade do 5º, lido da vida do chefe
// (ADP-04). Ainda no mesmo `stagger`, o finalizador (J+K) tira os 12% inteiros e não conta como fonte (ADP-02). Captura em `.fable-out/boss-adaptativo.png`.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.fable-out');
const QUERY = 'round=10&bossArch=oni&bossAffix=adaptativo&finger=0';
/** Dano do golpe forte de teste (`PLAYER_COMBO` chute) e o multiplicador do `stagger` (`BOSS.staggerDamageMult`). */
const HEAVY = 18;
const STAGGER_MULT = 1.5;
/** Escala da fonte adaptada (`BOSS_AFFIX.adapt.mult`) e o finalizador (`BOSS.finisher`). */
const ADAPT_MULT = 0.5;
const FINISHER_FRACTION = 0.12;
const FINISHER_RANGE = 48;

export default async function ({ page, baseUrl, assert }) {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.setViewport({ width: 1280, height: 720 });
  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  /** Um golpe forte de teste (tecla 2) em dois quadros; devolve o snapshot de antes e o de depois. */
  const heavy = async (before) => {
    await page.keyboard.down('Digit2');
    await step(17);
    await page.keyboard.up('Digit2');
    const s = await step(17);
    const accepted = s.events.filter((e) => e === 'bossHitAccepted').length;
    const prev = before.events.filter((e) => e === 'bossHitAccepted').length;
    assert(accepted === prev + 1, `o chefe deveria aceitar o golpe forte: ${JSON.stringify(s.boss)}`);
    return { s, loss: before.boss.hp - s.boss.hp };
  };

  await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&seed=1&${QUERY}`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      try {
        return !!window.__game.snapshot();
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
  await step(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let s = await step(50);
  for (let i = 0; i < 20 && !s.boss; i++) s = await step(50);
  assert(s.boss?.affixes.join() === 'adaptativo', `o chefe Adaptativo deveria nascer: ${JSON.stringify(s.boss)}`);
  assert(
    s.boss.adapted.length === 0 && s.boss.wheel && !s.boss.wheel.visible,
    `sem adaptação, a roda fica escondida: ${JSON.stringify(s.boss)}`,
  );

  for (let i = 0; i < 400 && s.boss.state === 'intro'; i++) s = await step(16);
  assert(s.boss.state !== 'intro', 'o chefe não saiu da intro');
  // O player anda até o chefe e espera ele parar perto (o finalizador pede no máximo 48 px entre os centros).
  s = await approach(page, step, s);
  assert(s.boss.adapted.length === 0, `nada adapta antes dos golpes: ${JSON.stringify(s.boss)}`);

  // Golpes 1 a 3 cheios; o 3º zera a postura (36 por golpe forte) e o chefe atordoa.
  const losses = [];
  const adapted = [];
  for (let i = 0; i < 6; i++) {
    const hit = await heavy(s);
    s = hit.s;
    losses.push(hit.loss);
    adapted.push(s.boss.adapted.join());
  }
  const ctx = JSON.stringify({ losses, adapted, boss: s.boss });
  assert(
    losses.slice(0, 3).every((l) => l === HEAVY),
    `os 3 primeiros golpes fortes tiram ${HEAVY}: ${ctx}`,
  );
  assert(s.boss.state === 'stagger', `o 3º golpe forte atordoa o chefe: ${ctx}`);
  const full = Math.round(HEAVY * STAGGER_MULT);
  assert(losses[3] === full && losses[4] === full, `no stagger, o golpe forte cheio tira ${full}: ${ctx}`);
  // ADP-01/03, ADP-07: 4 acertos não adaptam; o 5º adapta a fonte `heavy`.
  assert(
    adapted.slice(0, 4).every((a) => a === ''),
    `até o 4º golpe nada adapta: ${ctx}`,
  );
  assert(adapted[4] === 'heavy' && adapted[5] === 'heavy', `o 5º golpe forte adapta a fonte heavy: ${ctx}`);
  // ADP-04: o 6º, já adaptado, tira a metade do 5º (arredondada, antes do multiplicador do stagger).
  const half = Math.round(Math.max(1, Math.round(HEAVY * ADAPT_MULT)) * STAGGER_MULT);
  assert(losses[5] === half, `o 6º golpe forte, adaptado, tira ${half}: ${ctx}`);
  assert(Math.abs(losses[5] - losses[4] / 2) <= 0.5, `o 6º golpe tira a metade do 5º: ${ctx}`);
  // ADP-06, BRD-07: a roda aparece sobre a cabeça do chefe com o rótulo curto.
  const wheel = s.boss.wheel;
  assert(
    wheel?.visible && wheel.labels.join() === 'Forte',
    `a roda aparece com o rótulo "Forte": ${JSON.stringify(wheel)}`,
  );
  assert(
    Math.abs(wheel.x - s.boss.x) <= 1 && wheel.y < s.boss.y - s.boss.body.height / 2,
    `a roda fica sobre a cabeça do chefe: ${JSON.stringify({ wheel, x: s.boss.x, y: s.boss.y, body: s.boss.body })}`,
  );
  await page.evaluate(() => window.__game.render());
  await page.screenshot({ path: join(OUT_DIR, 'boss-adaptativo.png') });

  // ADP-02: no mesmo stagger, o finalizador tira os 12% inteiros e não vira fonte.
  assert(
    s.boss.state === 'stagger' && s.boss.finisherReady,
    `o finalizador deveria estar pronto: ${JSON.stringify(s.boss)}`,
  );
  assert(
    Math.abs(s.player.x - s.boss.x) <= FINISHER_RANGE,
    `o player deveria estar ao alcance do finalizador: ${s.player.x} x ${s.boss.x}`,
  );
  const hpBefore = s.boss.hp;
  await page.keyboard.down('KeyJ');
  await page.keyboard.down('KeyK');
  s = await step(16);
  await page.keyboard.up('KeyK');
  await page.keyboard.up('KeyJ');
  const finisher = Math.round(FINISHER_FRACTION * s.boss.maxHp);
  assert(s.events.includes('finisher:boss'), `o finalizador deveria acertar: ${s.events.join(',')}`);
  assert(hpBefore - s.boss.hp === finisher, `o finalizador tira ${finisher} sem redução: ${hpBefore} -> ${s.boss.hp}`);
  assert(s.boss.adapted.join() === 'heavy', `o finalizador não muda as fontes adaptadas: ${s.boss.adapted}`);
}

/** Chefe parado (descanso ou preparo) e a menos de 32 px do player, livre para apanhar. */
const ready = (s) =>
  ['rest', 'windup'].includes(s.boss.state) &&
  Math.abs(s.boss.x - s.player.x) < 32 &&
  !s.player.dead &&
  s.player.grounded;

/** Anda até o chefe, um quadro por vez, parando quando ele está perto e parado (`ready`). */
async function approach(page, step, s0) {
  let s = s0;
  let held = null;
  for (let i = 0; i < 1500 && !ready(s); i++) {
    const dx = s.boss.x - s.player.x;
    const want = Math.abs(dx) < 24 ? null : dx > 0 ? 'KeyD' : 'KeyA';
    if (want !== held) {
      if (held) await page.keyboard.up(held);
      if (want) await page.keyboard.down(want);
      held = want;
    }
    s = await step(16);
  }
  if (held) await page.keyboard.up(held);
  if (!ready(s))
    throw new Error(`o player não chegou perto do chefe parado: ${JSON.stringify({ p: s.player, b: s.boss })}`);
  return s;
}
