// Parte 2 do `domain.smoke.mjs`, fins (DOM-10): a rodada limpa pela ativação não encerra o Domínio, que segue na
// travessia até o tempo; a konbini (também com `noshop=1`), a morte e o `R` encerram na hora, sem efeito de fim. Não é um
// cenário (o runner só roda `*.smoke.mjs`). Lê `domain.active`, `run`, `player`, `enemies[]` e os eventos
// `domain:<id>`, `domainEnd:<id>` e `worldCut` do snapshot vivo.

const FRAME_MS = 1000 / 60;
const alive = (s) => s.enemies.filter((e) => e.hp > 0 && e.state !== 'deadRagdoll' && e.state !== 'dissolving');
const fresh = (s, from) => s.events.slice(from.events.length);

/** Aperta `P` por um quadro (fora do hitstop, senão a borda se perde); devolve o snapshot de antes e o do quadro. */
async function activate(kit) {
  let before = await kit.snap(0);
  for (let f = 0; f < 30 && before.hitstop.frozen; f++) before = await kit.frame();
  await kit.down('KeyP');
  const s = await kit.frame();
  await kit.up('KeyP');
  kit.assert(fresh(s, before).includes('domain:santuario'), `a ativação deveria sair: ${JSON.stringify(s.domain)}`);
  return { before, s };
}

/** Golpe forte de teste (tecla 2) em todos até a rodada acabar; devolve o snapshot fora de `roundActive`. */
async function clearRound(kit) {
  let s = await kit.snap(0);
  for (let i = 0; i < 400 && s.run.state === 'roundActive'; i++) {
    await kit.tap('Digit2', 20);
    s = await kit.snap(60);
  }
  for (let i = 0; i < 200 && s.run.state !== 'traverse' && s.run.state !== 'intermission'; i++) s = await kit.snap(50);
  kit.assert(s.run.state === 'traverse', `a rodada deveria acabar na travessia: ${JSON.stringify(s.run)}`);
  return s;
}

/**
 * Anda para a direita até `stop(s)`; devolve o snapshot e o `x` do player no último quadro da travessia antes do fade
 * da konbini (depois dele o player já está na área nova).
 */
async function walkUntil(kit, stop, what) {
  let s = await kit.snap(0);
  let lastX = s.player.x;
  await kit.down('KeyD');
  for (let i = 0; i < 1200 && !stop(s); i++) {
    if (s.run.state === 'traverse' && !s.area.transitioning) lastX = s.player.x;
    s = await kit.frame();
  }
  await kit.up('KeyD');
  kit.assert(stop(s), `esperava ${what}: ${JSON.stringify(s.run)}`);
  return { s, lastX };
}

/**
 * A ativação mata o último comum (com 40% do HP ou menos) e limpa a rodada; o Domínio segue vivo na travessia com o
 * tempo caindo e acaba pelo tempo, sem a konbini (DOM-10).
 */
async function clearedByActivation(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&enemyGuard=0`);
  let s = await kit.snap(0);
  // Só o último comum da rodada sobra, com 40% do HP ou menos.
  for (let i = 0; i < 600; i++) {
    const live = alive(s);
    const last = s.run.alive + s.run.queued === 1 && live.length === 1;
    if (last && live[0].hp <= Math.round(0.4 * live[0].maxHp)) break;
    if (live.length > 0) await kit.tap('Digit2', 20);
    s = await kit.snap(60);
  }
  kit.assert(s.run.alive + s.run.queued === 1, `deveria sobrar um comum: ${JSON.stringify(s.run)}`);
  await kit.approach(120);
  const { before, s: hit } = await activate(kit);
  let t = hit;
  for (let f = 0; f < 120 && t.run.state === 'roundActive'; f++) t = await kit.frame();
  kit.assert(t.run.state === 'traverse', `a ativação deveria limpar a rodada: ${JSON.stringify(t.run)}`);
  kit.assert(t.domain.active?.id === 'santuario', `o Domínio segue na travessia: ${JSON.stringify(t.domain)}`);
  const a = t.domain.active.remainingMs;
  t = await kit.snap(500);
  kit.assert(t.domain.active && t.domain.active.remainingMs < a, `o tempo cai na travessia: ${a} → ${t.domain.active}`);
  let last = t.domain.active.remainingMs;
  for (let f = 0; f < 600 && t.domain.active; f++) {
    last = t.domain.active.remainingMs;
    t = await kit.frame();
  }
  const ev = fresh(t, before);
  kit.assert(ev.includes('domainEnd:santuario'), `o Domínio acaba pelo tempo: ${JSON.stringify(ev)}`);
  kit.assert(
    last <= 2 * FRAME_MS && t.run.state === 'traverse',
    `fim pelo tempo, na travessia: ${last}, ${t.run.state}`,
  );
}

/**
 * A konbini encerra o Domínio na hora, com ou sem `noshop=1` (DOM-10): ativado na travessia perto da entrada, ele acaba
 * no quadro em que a konbini abre, com tempo de sobra, e sem efeito de fim.
 */
async function endsAtKonbini(kit, base, noshop) {
  const q = `${base}&domain=santuario&charge=100&maxAlive=3${noshop ? '&noshop=1' : ''}`;
  await kit.boot(q);
  const start = await clearRound(kit);
  const { lastX: doorX } = await walkUntil(
    kit,
    (s) => s.run.round !== start.run.round || s.run.state === 'shop',
    'a konbini',
  );

  await kit.boot(q);
  await clearRound(kit);
  await walkUntil(kit, (s) => s.player.x >= doorX - 160, 'a porta da konbini');
  const { before } = await activate(kit);
  let prev = await kit.snap(0);
  let s = prev;
  await kit.down('KeyD');
  for (let i = 0; i < 1200 && s.domain.active; i++) {
    prev = s;
    s = await kit.frame();
  }
  await kit.up('KeyD');
  const ev = fresh(s, before);
  const opened = noshop ? s.run.round === start.run.round + 1 : s.run.state === 'shop';
  kit.assert(ev.includes('domainEnd:santuario') && opened, `a konbini encerra: ${JSON.stringify({ ev, run: s.run })}`);
  kit.assert(prev.domain.active.remainingMs > 1000, `acaba antes do tempo: ${prev.domain.active.remainingMs}`);
  kit.assert(!ev.includes('worldCut'), `fim pela konbini sem efeito de fim: ${JSON.stringify(ev)}`);
}

/** Morrer (tecla 4 até 0 HP) com o Domínio ativo dá `domainEnd` na hora (DOM-10). */
async function endsOnDeath(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  const { before } = await activate(kit);
  let s = await kit.snap(0);
  for (let i = 0; i < 40 && s.player.hp > 0; i++) s = await kit.tap('Digit4', 20);
  kit.assert(s.player.hp <= 0, `o player deveria morrer: ${s.player.hp}`);
  for (let f = 0; f < 3; f++) s = await kit.frame();
  const ev = fresh(s, before);
  kit.assert(ev.includes('domainEnd:santuario') && s.domain.active === null, `a morte encerra: ${JSON.stringify(ev)}`);
  kit.assert(!ev.includes('worldCut'), `fim pela morte sem efeito de fim: ${JSON.stringify(ev)}`);
}

/** `R` com o Domínio ativo: a cena nova começa sem `domain.active`, já no título (DOM-10). */
async function endsOnRestart(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  await activate(kit);
  let s = await kit.snap(300);
  kit.assert(s.domain.active !== null, `ativo antes do R: ${JSON.stringify(s.domain)}`);
  await kit.tap('KeyR');
  s = await kit.snap(100);
  kit.assert(s.run.state === 'title' && s.domain.active === null, `R sem Domínio ativo: ${JSON.stringify(s.domain)}`);
  kit.assert(!s.events.includes('worldCut'), `fim pelo R sem efeito de fim: ${JSON.stringify(s.events)}`);
  await kit.tap('KeyJ');
  s = await kit.snap(100);
  kit.assert(
    s.run.state === 'roundActive' && s.domain.active === null,
    `run nova sem ativo: ${JSON.stringify(s.domain)}`,
  );
}

export async function domainEnds(kit, base) {
  await clearedByActivation(kit, base);
  await endsAtKonbini(kit, base, false);
  await endsAtKonbini(kit, base, true);
  await endsOnDeath(kit, base);
  await endsOnRestart(kit, base);
}
