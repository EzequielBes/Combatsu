// Parte 5 do `domain.smoke.mjs`, Jackpot (JAC-01 a JAC-05): o giro de 2000 ms sem efeito, o Riichi de +0,04 por golpe
// que acerta, a parada pelo `domainRng` (seed 4: o 1º sorteio dá jackpot; seed 1: dá falha), o efeito do jackpot
// (energia no máximo, conjuração sem custo nem recarga, cura de 5 por segundo) e o da falha (custo × 0,5 abaixo do
// piso, recarga × 0,5, cura de 2,5 por segundo), a morte no giro e o `R` com o efeito ligado. Não é um cenário (o
// runner só roda `*.smoke.mjs`). Lê `domain`, `ce`, `tech.slots`, `tech.cast`, `player.hp`, `enemies[]`, `run` e os
// eventos `domain:jackpot`, `jackpot:hit`, `jackpot:miss` e `domainEnd:jackpot`. Com `regen=0`, a vida só sobe pela
// cura do Jackpot.

const FRAME_MS = 1000 / 60;
/** Seed cujo 1º sorteio do `domainRng` (0,200) fica abaixo da chance de 0,33; a seed 1 do `fight-kit` dá 0,758. */
const HIT_SEED = 4;
/** Vermelho sem ponto de eixo: custo 30 (piso 18) e recarga 4500 ms. */
const RED = { cost: 30, cooldownMs: 4500 };

const fresh = (s, from) => s.events.slice(from.events.length);
const alive = (s) => s.enemies.filter((e) => e.hp > 0 && e.state !== 'deadRagdoll' && e.state !== 'dissolving');
const near = (a, b, tol = FRAME_MS + 1) => Math.abs(a - b) <= tol;

/**
 * Aperta `P` por um quadro, com o player livre (a tecla `4` dá o atordoamento do golpe sofrido) e fora do hitstop;
 * devolve o snapshot de antes e o do quadro da ativação.
 */
async function activate(kit) {
  let before = await kit.settle();
  for (let f = 0; f < 30 && before.hitstop.frozen; f++) before = await kit.frame();
  await kit.down('KeyP');
  const s = await kit.frame();
  await kit.up('KeyP');
  kit.assert(fresh(s, before).includes('domain:jackpot'), `a ativação do Jackpot: ${JSON.stringify(s.domain)}`);
  return { before, s };
}

/**
 * Conjura o Vermelho do slot 0 (espera a conjuração anterior e a recarga) e anda até a conjuração acabar. Devolve o
 * gasto de energia (sem regeneração durante a conjuração, CE-05), a maior recarga vista e se a energia ficou no máximo
 * em todo quadro.
 */
async function castRed(kit) {
  let s = await kit.settle();
  for (let i = 0; i < 80 && (s.tech.cast !== null || s.tech.slots[0].cooldownMs > 0); i++) s = await kit.snap(100);
  const before = s;
  await kit.down('KeyL');
  s = await kit.frame();
  await kit.up('KeyL');
  kit.assert(s.tech.cast !== null, `o Vermelho deveria começar: ${JSON.stringify(s.tech)}`);
  let minCe = Math.min(before.ce.cur, s.ce.cur);
  let cooldown = s.tech.slots[0].cooldownMs;
  let alwaysMax = s.ce.cur === s.ce.max;
  for (let f = 0; f < 150 && s.tech.cast !== null; f++) {
    s = await kit.frame();
    minCe = Math.min(minCe, s.ce.cur);
    cooldown = Math.max(cooldown, s.tech.slots[0].cooldownMs);
    alwaysMax &&= s.ce.cur === s.ce.max;
  }
  kit.assert(s.tech.cast === null, 'o Vermelho deveria acabar');
  return { spent: before.ce.cur - minCe, cooldown, alwaysMax, s };
}

/**
 * Passa quadros até a parada dos tambores; confere que o giro não cura, não trava a energia e não tem efeito. Devolve
 * o snapshot da parada, o resultado e o `remainingMs` do último quadro do giro.
 */
async function untilStop(kit, from) {
  let s = await kit.snap(0);
  let last = s.domain.active?.remainingMs ?? 0;
  let hp = s.player.hp;
  for (let f = 0; f < 240; f++) {
    const ev = fresh(s, from);
    if (ev.includes('jackpot:hit') || ev.includes('jackpot:miss')) break;
    kit.assert(s.domain.jackpot.spinning && s.domain.jackpot.effect === null, `no giro: ${JSON.stringify(s.domain)}`);
    kit.assert(s.player.hp <= hp, `o giro não cura: ${hp} → ${s.player.hp}`);
    hp = s.player.hp;
    last = s.domain.active.remainingMs;
    s = await kit.frame();
  }
  const ev = fresh(s, from);
  const result = ev.includes('jackpot:hit') ? 'hit' : ev.includes('jackpot:miss') ? 'miss' : null;
  kit.assert(result !== null, `os tambores deveriam parar: ${JSON.stringify(ev)}`);
  return { s, result, last };
}

/**
 * JAC-01, JAC-04 (seed 4): o giro dura 2000 ms sem efeito; a parada dá `jackpot:hit` e zera a recarga que corria; a
 * energia fica no máximo em todo quadro, o Vermelho não gasta nem arma recarga e a vida sobe 5 por segundo; no fim,
 * custo, recarga e energia voltam.
 */
async function jackpotEffect(kit, base) {
  await kit.boot(`${base}&domain=jackpot&charge=100&regen=0&tech=vermelho&spawn=0&seed=${HIT_SEED}`);
  await kit.tap('Digit4');
  const pre = await castRed(kit);
  kit.assert(pre.spent === RED.cost && pre.cooldown > 0, `Vermelho antes do Domínio: ${JSON.stringify(pre)}`);
  const { before, s: on } = await activate(kit);
  kit.assert(near(on.domain.active.remainingMs, 2000), `o giro dura 2000: ${on.domain.active.remainingMs}`);
  kit.assert(on.domain.jackpot.chance === 0.33, `chance de 0,33 no Nv 1: ${JSON.stringify(on.domain.jackpot)}`);
  const stop = await untilStop(kit, before);
  kit.assert(stop.result === 'hit', `a seed ${HIT_SEED} deixou de dar jackpot no 1º sorteio do domainRng`);
  kit.assert(stop.last <= 2 * FRAME_MS, `a parada vem no fim dos 2000 ms: ${stop.last}`);
  let s = stop.s;
  const view = JSON.stringify({ d: s.domain, ce: s.ce, cd: s.tech.slots[0].cooldownMs });
  kit.assert(near(s.domain.active.remainingMs, 8000, 2 * FRAME_MS), `o efeito dura 8000: ${view}`);
  kit.assert(
    s.domain.jackpot.effect === 'jackpot' && s.tech.slots[0].cooldownMs === 0,
    `jackpot zera a recarga: ${view}`,
  );
  kit.assert(s.ce.cur === s.ce.max, `energia no máximo na parada: ${view}`);

  const red = await castRed(kit);
  kit.assert(red.alwaysMax && red.spent === 0, `no jackpot a conjuração não gasta: ${JSON.stringify(red)}`);
  kit.assert(red.cooldown === 0, `no jackpot a conjuração não arma recarga: ${red.cooldown}`);
  const hp0 = red.s.player.hp;
  s = await kit.snap(2000);
  kit.assert(Math.abs(s.player.hp - hp0 - 10) <= 1, `cura de 5 por segundo: ${hp0} → ${s.player.hp} em 2000 ms`);
  for (let f = 0; f < 600 && s.domain.active; f++) {
    kit.assert(s.ce.cur === s.ce.max, `energia no máximo em todo quadro do efeito: ${JSON.stringify(s.ce)}`);
    s = await kit.frame();
  }
  kit.assert(fresh(s, before).includes('domainEnd:jackpot'), 'o efeito acaba pelo tempo');
  kit.assert(s.player.hp < s.player.maxHp, `50 de dano e 40 tiques não chegam ao máximo: ${s.player.hp}`);
  const after = await castRed(kit);
  kit.assert(after.spent === RED.cost, `depois do efeito o custo volta a 30: ${after.spent}`);
  kit.assert(near(after.cooldown, RED.cooldownMs), `depois do efeito a recarga volta a 4500: ${after.cooldown}`);
}

/**
 * JAC-05 (seed 1): a parada dá `jackpot:miss`; por 4000 ms o Vermelho custa 15 (abaixo do piso 18) e recarrega 2250, e
 * a vida sobe 10; no fim, custo e recarga voltam.
 */
async function missEffect(kit, base) {
  await kit.boot(`${base}&domain=jackpot&charge=100&regen=0&tech=vermelho&spawn=0`);
  await kit.tap('Digit4');
  const { before } = await activate(kit);
  const stop = await untilStop(kit, before);
  kit.assert(stop.result === 'miss', 'a seed 1 deixou de dar falha no 1º sorteio do domainRng');
  let s = stop.s;
  kit.assert(near(s.domain.active.remainingMs, 4000, 2 * FRAME_MS), `a falha dura 4000: ${JSON.stringify(s.domain)}`);
  kit.assert(s.domain.jackpot.effect === 'miss' && s.domain.jackpot.misses === 1, `falha: ${JSON.stringify(s.domain)}`);
  const hp0 = s.player.hp;
  const red = await castRed(kit);
  kit.assert(red.spent === 15, `na falha o custo é round(30 × 0,5) = 15, abaixo do piso: ${red.spent}`);
  kit.assert(red.cooldown <= 2250 && red.cooldown > 2250 - 2 * FRAME_MS, `recarga × 0,5: ${red.cooldown}`);
  s = red.s;
  for (let f = 0; f < 400 && s.domain.active; f++) s = await kit.frame();
  kit.assert(fresh(s, before).includes('domainEnd:jackpot'), 'a falha acaba pelo tempo');
  kit.assert(s.player.hp - hp0 === 10, `cura de 2,5 por segundo em 4000 ms: ${hp0} → ${s.player.hp}`);
  const after = await castRed(kit);
  kit.assert(after.spent === RED.cost, `depois da falha o custo volta a 30: ${after.spent}`);
  kit.assert(near(after.cooldown, RED.cooldownMs), `depois da falha a recarga volta a 4500: ${after.cooldown}`);
}

/**
 * JAC-01, JAC-02: o comum atordoado pela ativação fica no lugar (empurrão 0); cada golpe que acerta no giro soma 0,04 à
 * chance, a começar pelo `jab` seguinte.
 */
async function riichi(kit, base) {
  await kit.boot(`${base}&domain=jackpot&charge=100&regen=0&enemyGuard=0`);
  let s = await kit.snap(0);
  for (let i = 0; i < 100 && alive(s).length === 0; i++) s = await kit.snap(200);
  await kit.approach(36);
  const { before, s: on } = await activate(kit);
  const target = kit.nearest(on);
  const x0 = kit.nearest(before).x;
  s = on;
  for (let f = 0; f < 30 && s.hitstop.frozen; f++) s = await kit.frame();
  const moved = s.enemies.find((e) => e.id === target.id);
  kit.assert(moved && Math.abs(moved.x - x0) <= 2, `o comum fica no lugar: ${x0} → ${moved?.x}`);
  const chances = [s.domain.jackpot.chance];
  for (let f = 0; f < 150 && s.domain.jackpot.spinning; f++) {
    if (f % 8 === 0) await kit.down('KeyJ');
    if (f % 8 === 2) await kit.up('KeyJ');
    s = await kit.frame();
    const c = s.domain.jackpot.chance;
    if (s.domain.jackpot.spinning && c !== chances[chances.length - 1]) chances.push(c);
  }
  await kit.up('KeyJ');
  const steps = chances.slice(1).map((c, i) => Math.round((c - chances[i]) * 100) / 100);
  kit.assert(chances[0] === 0.33 && chances[1] === 0.37, `o jab seguinte acerta no giro: ${JSON.stringify(chances)}`);
  kit.assert(
    steps.every((d) => d === 0.04),
    `cada golpe que acerta soma 0,04: ${JSON.stringify(chances)}`,
  );
  kit.assert(fresh(s, before).includes('jackpot:miss'), `seed 1: falha mesmo com Riichi: ${JSON.stringify(chances)}`);
}

/** Edge case: morrer no giro para os tambores sem `jackpot:` e sem mudar `misses`. */
async function deathInSpin(kit, base) {
  await kit.boot(`${base}&domain=jackpot&charge=100&regen=0&spawn=0`);
  const { before } = await activate(kit);
  let s = await kit.snap(500);
  kit.assert(s.domain.jackpot.spinning, `no giro: ${JSON.stringify(s.domain)}`);
  await kit.tap('Digit3');
  for (let i = 0; i < 40 && s.run.state !== 'gameOver'; i++) s = await kit.snap(100);
  s = await kit.snap(2500);
  const ev = fresh(s, before);
  kit.assert(!ev.some((e) => e.startsWith('jackpot:')), `a morte para sem resultado: ${JSON.stringify(ev)}`);
  kit.assert(ev.includes('domainEnd:jackpot'), `a morte encerra o Domínio: ${JSON.stringify(ev)}`);
  kit.assert(
    s.domain.jackpot.misses === 0 && !s.domain.jackpot.spinning && s.domain.jackpot.effect === null,
    `misses igual e sem efeito: ${JSON.stringify(s.domain.jackpot)}`,
  );
}

/**
 * Edge cases (seed 4): a cura no HP cheio deixa a vida no máximo; o `R` com o efeito ligado começa a run nova com
 * energia, custo e recarga de hoje.
 */
async function restartInEffect(kit, base) {
  const q = `${base}&domain=jackpot&charge=100&regen=0&tech=vermelho&spawn=0&seed=${HIT_SEED}`;
  await kit.boot(q);
  const { before } = await activate(kit);
  let s = (await untilStop(kit, before)).s;
  kit.assert(s.domain.jackpot.effect === 'jackpot', `seed ${HIT_SEED}: jackpot: ${JSON.stringify(s.domain)}`);
  s = await kit.snap(1000);
  kit.assert(s.player.hp === s.player.maxHp, `a cura no HP cheio fica no máximo: ${s.player.hp}/${s.player.maxHp}`);
  await kit.tap('KeyR');
  await kit.snap(100);
  await kit.tap('KeyJ');
  s = await kit.snap(100);
  kit.assert(s.run.state === 'roundActive' && !s.domain.active, `R: run nova sem Domínio: ${JSON.stringify(s.run)}`);
  kit.assert(s.domain.jackpot.effect === null && s.domain.jackpot.misses === 0, `R: ${JSON.stringify(s.domain)}`);
  const red = await castRed(kit);
  kit.assert(
    red.spent === RED.cost && near(red.cooldown, RED.cooldownMs),
    `R: custo e recarga: ${JSON.stringify(red)}`,
  );
}

/**
 * DOM-10.10: com `maxAlive=1`, a ativação que mata o último comum limpa a rodada; os tambores ainda param na travessia
 * (seed 1: `jackpot:miss`) e a cura da falha segue até o tempo acabar.
 */
async function clearedInSpin(kit, base) {
  await kit.boot(`${base}&domain=jackpot&charge=100&regen=0&enemyGuard=0`);
  let s = await kit.snap(0);
  for (let i = 0; i < 600; i++) {
    const live = alive(s);
    const last = s.run.alive + s.run.queued === 1 && live.length === 1;
    if (last && live[0].hp <= Math.round(0.4 * live[0].maxHp)) break;
    if (live.length > 0) await kit.tap('Digit2', 20);
    s = await kit.snap(60);
  }
  kit.assert(s.run.alive + s.run.queued === 1, `deveria sobrar um comum: ${JSON.stringify(s.run)}`);
  await kit.tap('Digit4');
  await kit.settle();
  await kit.approach(36);
  const { before } = await activate(kit);
  s = await kit.snap(0);
  for (let f = 0; f < 120 && s.run.state === 'roundActive'; f++) s = await kit.frame();
  kit.assert(s.run.state === 'traverse', `a ativação deveria limpar a rodada: ${JSON.stringify(s.run)}`);
  const stop = await untilStop(kit, before);
  kit.assert(stop.result === 'miss' && stop.s.run.state === 'traverse', `a parada na travessia: ${stop.result}`);
  const hp0 = stop.s.player.hp;
  s = stop.s;
  for (let f = 0; f < 400 && s.domain.active; f++) s = await kit.frame();
  kit.assert(fresh(s, before).includes('domainEnd:jackpot'), 'a falha acaba pelo tempo na travessia');
  kit.assert(s.player.hp - hp0 === 10, `a cura segue na travessia: ${hp0} → ${s.player.hp}`);
}

export async function jackpotSpin(kit, base) {
  await jackpotEffect(kit, base);
  await missEffect(kit, base);
  await riichi(kit, base);
  await deathInSpin(kit, base);
  await restartInEffect(kit, base);
  await clearedInSpin(kit, base);
}
