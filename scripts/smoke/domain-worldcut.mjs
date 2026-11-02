// Parte 4 do `domain.smoke.mjs`, fim do Santuário (SAN-05, DOM-10.10): o Nv 3 que acaba pelo tempo roda o Corte do
// Mundo (comum a até 320 px com 35% do HP ou menos morre, o de cima fica intacto; o chefe perde `round(0,08 × maxHp)`);
// o Nv 2 não roda. Os outros fins (konbini, morte, `R`) estão no `domain-ends.mjs`, com o Nv 3. Não é um cenário (o
// runner só roda `*.smoke.mjs`). Lê `domain.active`, `enemies[]`, `boss`, `run` e os eventos `domainEnd:santuario`,
// `worldCut` e `bossDefeatedFx` do snapshot vivo.
import { activate, alive } from './domain-sanctuary.mjs';

const RADIUS = 320;
const THRESHOLD = 0.35;
const dist = (s, e) => Math.hypot(e.x - s.player.x, e.y - s.player.y);
const low = (e) => e.hp <= THRESHOLD * e.maxHp;

/** Passa quadros até o Domínio acabar; devolve o último quadro com ele ativo, o do fim e os eventos do fim. */
async function untilEnd(kit, maxFrames = 700, guard = false) {
  // Diante do chefe o player segura a guarda (U) até o fim, senão morre antes e o fim é pela morte.
  if (guard) await kit.down('KeyU');
  let prev = await kit.snap(0);
  let s = prev;
  for (let f = 0; f < maxFrames && s.domain.active; f++) {
    prev = s;
    s = await kit.frame();
  }
  if (guard) await kit.up('KeyU');
  kit.assert(s.domain.active === null, `o Domínio deveria acabar: ${JSON.stringify(s.domain)}`);
  const ev = s.events.slice(prev.events.length);
  kit.assert(ev.includes('domainEnd:santuario'), `fim pelo tempo: ${JSON.stringify(ev)}`);
  return { prev, s, ev };
}

/**
 * Bate com `J` até sobrar um comum vivo com 35% do HP ou menos e outro acima; para, espera os cortes pendentes e
 * devolve se a divisão se manteve.
 */
async function splitHp(kit) {
  let s = await kit.snap(0);
  for (let i = 0; i < 200 && s.domain.active; i++) {
    const live = alive(s);
    if (live.length < 2) return false;
    if (live.some(low) && live.some((e) => !low(e))) break;
    for (let f = 0; f < 20 && s.hitstop.frozen; f++) s = await kit.frame();
    await kit.approach(36);
    s = await kit.tap('KeyJ', 16);
    for (let f = 0; f < 20; f++) s = await kit.frame();
  }
  for (let f = 0; f < 30; f++) s = await kit.frame();
  const live = alive(s);
  return s.domain.active !== null && live.some(low) && live.some((e) => !low(e));
}

/** Nv 3 pelo tempo: o comum em 35% ou menos morre e o de cima não perde nada; no raio só (SAN-05). */
async function commons(kit, base) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await kit.boot(`${base}&domain=santuario:3&charge=100&maxAlive=2&enemyGuard=0&mods=vida:5`);
    for (let i = 0; i < 40 && alive(await kit.snap(0)).length < 2; i++) await kit.snap(200);
    await activate(kit);
    if (!(await splitHp(kit))) continue;
    const { prev, s, ev } = await untilEnd(kit);
    kit.assert(ev.includes('worldCut'), `o Nv 3 pelo tempo dá worldCut: ${JSON.stringify(ev)}`);
    for (const e of alive(prev)) {
      const now = s.enemies.find((x) => x.id === e.id);
      const hp = Math.max(0, now?.hp ?? 0);
      const near = dist(prev, e) <= RADIUS;
      const view = JSON.stringify({ id: e.id, hp: e.hp, maxHp: e.maxHp, now: hp, d: Math.round(dist(prev, e)) });
      if (near && low(e)) kit.assert(hp === 0, `o comum em 35% ou menos morre: ${view}`);
      else kit.assert(hp === e.hp, `o comum acima de 35% (ou longe) fica intacto: ${view}`);
    }
    kit.assert(
      alive(prev).some((e) => low(e) && dist(prev, e) <= RADIUS),
      'um comum baixo no raio no fim',
    );
    return;
  }
  kit.assert(false, 'não deu para deixar um comum em 35% e outro acima com o Santuário Nv 3 ativo');
}

/** Nv 2 pelo tempo: sem Corte do Mundo. */
async function levelTwo(kit, base) {
  await kit.boot(`${base}&domain=santuario:2&charge=100&maxAlive=2&enemyGuard=0&mods=vida:5`);
  await activate(kit);
  const { ev } = await untilEnd(kit);
  kit.assert(!ev.includes('worldCut'), `o Nv 2 não dá worldCut: ${JSON.stringify(ev)}`);
}

/** Chega a até `gap` px do chefe, andando na direção dele. */
async function nearBoss(kit, gap) {
  let s = await kit.snap(0);
  for (let i = 0; i < 300 && Math.abs(s.boss.x - s.player.x) > gap; i++) {
    const key = s.boss.x > s.player.x ? 'KeyD' : 'KeyA';
    await kit.down(key);
    s = await kit.snap(50);
    await kit.up(key);
  }
  return kit.snap(0);
}

/** Chefe da r5 pronto (fora da intro e do rugido), a até 150 px. */
async function bossReady(kit, base) {
  const q = `${base}&round=5&bossArch=oni&bossAffix=none&finger=0&domain=santuario:3&charge=100&mods=vida:5`;
  let s = await kit.boot(`${q}&enemyGuard=0`);
  for (let i = 0; i < 120 && (!s.boss || s.boss.state === 'intro' || s.boss.state === 'roar'); i++)
    s = await kit.snap(50);
  kit.assert(s.boss && s.boss.state !== 'intro', `chefe pronto na r5: ${JSON.stringify(s.boss)}`);
  return nearBoss(kit, 150);
}

/** Ativa o Santuário perto do chefe (o `approach` do kit só olha os comuns). */
async function activateNearBoss(kit) {
  let before = await kit.snap(0);
  for (let f = 0; f < 30 && before.hitstop.frozen; f++) before = await kit.frame();
  await kit.down('KeyP');
  const s = await kit.frame();
  await kit.up('KeyP');
  kit.assert(
    s.events.slice(before.events.length).includes('domain:santuario'),
    `ativação: ${JSON.stringify(s.domain)}`,
  );
  return s;
}

/**
 * r5: o chefe a até 320 px no fim perde `round(0,08 × maxHp)` (×1,5 se estiver em `stagger`, BFX-05); com 8% ou menos,
 * morre e a vitória segue (`bossDefeatedFx`, a rodada sai de `roundActive`).
 */
async function boss(kit, base) {
  await bossReady(kit, base);
  await activateNearBoss(kit);
  const { prev, s, ev } = await untilEnd(kit, 700, true);
  const want = Math.round(0.08 * prev.boss.maxHp);
  const lost = prev.boss.hp - s.boss.hp;
  const view = JSON.stringify({ want, lost, d: Math.round(dist(prev, prev.boss)), state: prev.boss.state, ev });
  kit.assert(ev.includes('worldCut') && dist(prev, prev.boss) <= RADIUS, `o chefe no raio no fim: ${view}`);
  const staggered = prev.boss.state === 'stagger' && lost === Math.round(want * 1.5);
  kit.assert(lost === want || staggered, `o chefe perde round(0,08 × maxHp): ${view}`);

  // Com 8% ou menos depois da ativação (6%), o Corte do Mundo mata o chefe.
  let t = await bossReady(kit, base);
  const act = Math.round(0.06 * t.boss.maxHp);
  await kit.down('KeyU');
  for (let i = 0; i < 300 && t.boss.hp > act + want; i++) t = await kit.tap('Digit2', 20);
  await kit.up('KeyU');
  kit.assert(t.boss.hp > act && t.boss.hp <= act + want, `chefe entre 6% e 14%: ${JSON.stringify(t.boss)}`);
  t = await nearBoss(kit, 150);
  await activateNearBoss(kit);
  const end = await untilEnd(kit, 700, true);
  kit.assert(
    end.prev.boss.hp > 0 && end.ev.includes('worldCut'),
    `o chefe vivo até o fim: ${JSON.stringify({ ev: end.ev, p: end.s.player, b: end.prev.boss.hp, r: end.prev.domain.active })}`,
  );
  let v = end.s;
  for (let i = 0; i < 200 && v.run.state === 'roundActive'; i++) v = await kit.snap(50);
  const events = v.events.slice(end.prev.events.length);
  kit.assert(events.includes('bossDefeatedFx'), `o Corte do Mundo mata o chefe: ${JSON.stringify(events)}`);
  kit.assert(v.run.state !== 'roundActive', `a vitória segue o fluxo: ${JSON.stringify(v.run)}`);
}

export async function worldCut(kit, base) {
  await commons(kit, base);
  await levelTwo(kit, base);
  await boss(kit, base);
}
