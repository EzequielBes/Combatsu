// Invocador no jogo vivo, em `?debug&hd=1&area=modular` (INV-01..05).
// `round=5&bossArch=oni&bossAffix=invocador&finger=0`: golpes de teste (tecla 2) até o rugido da fase 2 trazem 2
// comuns (r5) desarmados, com a aparência por índice; matar um não conta abate na `Run` nem deixa drop; a fase 3
// traz mais, sem passar de 4 vivos; na morte do chefe, cada invocado vivo some com a fumaça amaldiçoada.

const QUERY = 'round=5&bossArch=oni&bossAffix=invocador&finger=0';
/** Teto de invocados vivos (`BOSS_AFFIX.summon.maxAlive`) e quantos nascem na r5 (`firstBossCount`). */
const MAX_ALIVE = 4;
const FIRST_BOSS_COUNT = 2;

export default async function ({ page, baseUrl, assert }) {
  await page.setViewport({ width: 1280, height: 720 });
  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  const pressTwo = async () => {
    await page.keyboard.down('Digit2');
    await step(17);
    await page.keyboard.up('Digit2');
    return step(17);
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
  assert(s.boss?.affixes.includes('invocador'), `o chefe Invocador deveria nascer: ${JSON.stringify(s.boss)}`);
  for (let i = 0; i < 60 && s.boss.state === 'intro'; i++) s = await step(50);
  assert(s.bossSummoned.length === 0, `nenhum invocado antes da fase 2: ${s.bossSummoned}`);

  // INV-01, INV-05: tecla 2 até o rugido da fase 2; no mesmo quadro nascem 2 comuns desarmados.
  for (let i = 0; i < 200 && s.boss && s.bossSummoned.length === 0 && !s.player.dead; i++) s = await pressTwo();
  assert(s.boss?.phase === 2, `o chefe deveria estar na fase 2: ${JSON.stringify(s.boss)}`);
  const first = [...s.bossSummoned];
  assert(first.length === FIRST_BOSS_COUNT, `na r5 nascem ${FIRST_BOSS_COUNT} invocados: ${first}`);
  const summonedNow = () => s.enemies.filter((e) => s.bossSummoned.includes(e.id));
  assert(
    summonedNow().length === first.length && summonedNow().every((e) => e.weapon === null),
    `invocados desarmados na lista da cena: ${JSON.stringify(summonedNow())}`,
  );
  assert(
    first.every((id) => s.events.includes(`spawnFx:${id}`)),
    `cada invocado nasce com a fumaça: ${s.events.join(',')}`,
  );

  // INV-03: matar um invocado não conta abate nem cria pickup (o stream de loot fica intocado).
  const kills = s.run.kills;
  const pickups = s.pickups.length;
  for (let i = 0; i < 60 && first.every((id) => s.bossSummoned.includes(id)) && s.boss && !s.player.dead; i++)
    s = await pressTwo();
  const killed = first.filter((id) => !s.bossSummoned.includes(id));
  assert(killed.length > 0, `um invocado deveria morrer: ${JSON.stringify(summonedNow())}`);
  s = await step(500);
  assert(
    killed.every((id) => s.events.includes(`summonDied:${id}`) && !s.events.includes(`enemyDied:${id}`)),
    `a morte do invocado não chega à Run: ${s.events.join(',')}`,
  );
  assert(s.run.kills === kills, `run.kills não muda com o invocado: ${kills} -> ${s.run.kills}`);
  assert(s.pickups.length === pickups, `o invocado não deixa drop: ${pickups} -> ${s.pickups.length}`);

  // INV-02: a fase 3 invoca de novo sem passar de 4 vivos.
  for (let i = 0; i < 300 && s.boss && s.boss.phase < 3 && !s.player.dead; i++) s = await pressTwo();
  assert(s.boss?.phase === 3, `o chefe deveria chegar à fase 3: ${JSON.stringify(s.boss)}`);
  assert(s.bossSummoned.length > 0 && s.bossSummoned.length <= MAX_ALIVE, `invocados da fase 3: ${s.bossSummoned}`);

  // INV-04: o chefe morre com invocados vivos e cada um some na hora, com a fumaça.
  let before = s;
  for (let i = 0; i < 200 && s.boss && s.boss.hp > 0 && !s.player.dead; i++) {
    before = s;
    s = await pressTwo();
  }
  assert(!s.boss || s.boss.hp <= 0, `o chefe deveria morrer: ${JSON.stringify(s.boss)}`);
  assert(s.bossSummoned.length === 0, `nenhum invocado depois da morte do chefe: ${s.bossSummoned}`);
  // O golpe forte derruba os invocados e o chão segura o resto do dano: chegam vivos à morte do chefe.
  const left = before.bossSummoned;
  assert(left.length > 0, `o cenário precisa de invocados vivos na morte do chefe: ${left}`);
  assert(
    left.every((id) => s.events.includes(`summonDismissed:${id}`) && !s.enemies.some((e) => e.id === id)),
    `cada invocado vivo sai com a fumaça na morte do chefe: ${left} ${s.events.join(',')}`,
  );
}
