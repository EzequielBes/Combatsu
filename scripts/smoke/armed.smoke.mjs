// Inimigos armados e a ferramenta largada (ARM-02, ARM-08, ARM-12/13/17, ARM-18) com `?debug&armed=knife&round=3`.
export default async function ({ page, baseUrl, assert }) {
  // ARM-02: sem override, a rodada 1 nunca tem inimigo armado (chance 0 antes da rodada 3).
  await page.goto(`${baseUrl}?debug&seed=1`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      try {
        return typeof window.__game.snapshot === 'function';
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);

  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap = await stepAndSnap(300);
  assert(
    snap.enemies.every((e) => e.weapon === null),
    `ARM-02: rodada 1 não deveria ter inimigo armado: ${JSON.stringify(snap.enemies)}`,
  );

  // Da rodada 3 em diante, com `?debug&armed=knife`, todo inimigo comum nasce armado com a faca.
  await page.goto(`${baseUrl}?debug&armed=knife&round=3`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      try {
        return typeof window.__game.snapshot === 'function';
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(300);
  assert(snap.run.round === 3, `deveria começar na rodada 3: ${JSON.stringify(snap.run)}`);
  assert(snap.enemies.length > 0, 'nenhum inimigo nasceu na rodada 3');
  assert(
    snap.enemies.every((e) => e.weapon === 'cursedKnife'),
    `ARM-15: todo inimigo deveria nascer com a faca: ${JSON.stringify(snap.enemies)}`,
  );

  // ARM-10: o golpe forte de teste (18) derruba sem matar (hp ≈ 74 na rodada 3): em ragdoll a faca some e volta ao
  // levantar.
  await page.keyboard.press('Digit2', { delay: 50 });
  snap = await stepAndSnap(50);
  const downed = snap.enemies.filter((e) => e.state === 'ragdollStun');
  assert(downed.length > 0, `ARM-10: esperava um armado em ragdoll depois do golpe forte: ${JSON.stringify(snap.enemies)}`);
  assert(
    downed.every((e) => e.weaponVisible === false),
    `ARM-10: em ragdoll a ferramenta deveria sumir: ${JSON.stringify(downed)}`,
  );
  snap = await stepAndSnap(2000);
  const upAgain = snap.enemies.filter((e) => downed.some((d) => d.id === e.id) && e.state === 'idle');
  assert(upAgain.length > 0, `ARM-10: esperava o armado de pé de novo: ${JSON.stringify(snap.enemies)}`);
  assert(
    upAgain.every((e) => e.weaponVisible === true),
    `ARM-10: ao levantar a ferramenta deveria voltar: ${JSON.stringify(upAgain)}`,
  );

  // ARM-08: mata um armado com golpe de teste - a faca cai em `rest` com a durabilidade cheia (6).
  for (let i = 0; i < 20 && snap.worldProps.filter((p) => p.key === 'cursedKnife').length === 0; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  const knife = snap.worldProps.find((p) => p.key === 'cursedKnife');
  assert(knife, `nenhuma faca largada: ${JSON.stringify(snap.worldProps)}`);
  assert(knife.state === 'rest' && knife.durabilityLeft === 6, `ARM-08: faca deveria nascer em rest/6: ${JSON.stringify(knife)}`);

  // ARM-13: se ninguém pegar, a ferramenta some aos 20 s.
  let far = await stepAndSnap(19500);
  assert(
    far.worldProps.some((p) => p.id === knife.id),
    `ARM-13: a faca sumiu cedo demais: ${JSON.stringify(far.worldProps)}`,
  );
  far = await stepAndSnap(700);
  assert(
    !far.worldProps.some((p) => p.id === knife.id),
    `ARM-13: a faca deveria ter sumido aos 20 s: ${JSON.stringify(far.worldProps)}`,
  );

  // ARM-12/17: mata outro armado, anda até a faca, pega (K) e acerta um inimigo vivo com ela (J).
  snap = far;
  for (let i = 0; i < 20 && snap.worldProps.filter((p) => p.key === 'cursedKnife').length === 0; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  const knife2 = snap.worldProps.find((p) => p.key === 'cursedKnife');
  assert(knife2, 'nenhuma segunda faca largada para testar o uso');
  for (let i = 0; i < 150 && Math.abs(snap.player.x - knife2.x) > 6; i++) {
    const dir = knife2.x >= snap.player.x ? 'KeyD' : 'KeyA';
    await page.keyboard.down(dir);
    snap = await stepAndSnap(50);
    await page.keyboard.up(dir);
  }
  await page.keyboard.down('KeyK');
  snap = await stepAndSnap(20);
  await page.keyboard.up('KeyK');
  snap = await stepAndSnap(50);
  const held = snap.worldProps.find((p) => p.id === knife2.id);
  assert(held && held.state === 'held', `ARM-12: deveria estar segurando a faca: ${JSON.stringify(held)}`);

  // Só considera um inimigo "alcançável" perto o bastante em x *e* y (plataformas diferentes nunca se tocam).
  const aliveEnemy = () =>
    snap.enemies.find((e) => e.hp > 0 && e.state !== 'deadRagdoll' && Math.abs(e.y - snap.player.y) < 24);
  let enemy = aliveEnemy();
  let landedHit = false;
  for (let i = 0; i < 80 && !landedHit; i++) {
    if (!enemy) {
      // Nenhum inimigo vivo agora: espera a onda repor ou a próxima rodada começar.
      snap = await stepAndSnap(300);
      enemy = aliveEnemy();
      continue;
    }
    if (Math.abs(snap.player.x - enemy.x) > 18) {
      const dir = enemy.x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    } else {
      const hpBefore = enemy.hp;
      const enemyId = enemy.id;
      await page.keyboard.down('KeyJ');
      snap = await stepAndSnap(20);
      await page.keyboard.up('KeyJ');
      snap = await stepAndSnap(300);
      const enemyAfter = snap.enemies.find((e) => e.id === enemyId);
      const died = snap.events.includes(`enemyDied:${enemyId}`);
      if (died || (enemyAfter && enemyAfter.hp < hpBefore)) {
        landedHit = true;
        const afterKnife = snap.worldProps.find((p) => p.id === knife2.id);
        if (afterKnife) {
          assert(afterKnife.durabilityLeft === 5, `ARM-17/27: a faca deveria ter desgastado 1: ${JSON.stringify(afterKnife)}`);
        }
      }
    }
    enemy = aliveEnemy();
  }
  assert(landedHit, 'ARM-17: nenhum golpe com a faca acertou um inimigo vivo');

  // RAR-03/05: com `?debug&armed=knife&rare=1`, toda ferramenta nasce rara e o nome no HUD termina em " Rara".
  await page.goto(`${baseUrl}?debug&armed=knife&rare=1`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      try {
        return typeof window.__game.snapshot === 'function';
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(300);
  for (let i = 0; i < 20 && snap.worldProps.filter((p) => p.key.startsWith('cursedKnife')).length === 0; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  const rareKnife = snap.worldProps.find((p) => p.key.startsWith('cursedKnife'));
  assert(rareKnife && rareKnife.rare === true, `RAR-05: com rare=1 a ferramenta deveria nascer rara: ${JSON.stringify(rareKnife)}`);
  assert(rareKnife.durabilityLeft === 8, `RAR-06: durabilidade da faca rara deveria ser 8: ${JSON.stringify(rareKnife)}`);
  // Outros objetos do mapa podem estar bem perto (a zona de coleta pega o mais próximo em `rest`): se a faca
  // rara não for a mais próxima ainda, larga o que pegou e chega mais perto até acertar ela.
  let rareHeld = false;
  for (let attempt = 0; attempt < 6 && !rareHeld; attempt++) {
    for (let i = 0; i < 60 && Math.abs(snap.player.x - rareKnife.x) > 3; i++) {
      const dir = rareKnife.x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
    await page.keyboard.down('KeyK');
    snap = await stepAndSnap(20);
    await page.keyboard.up('KeyK');
    snap = await stepAndSnap(50);
    const heldProp = snap.worldProps.find((p) => p.id === rareKnife.id);
    if (heldProp && heldProp.state === 'held') {
      rareHeld = true;
    } else if (snap.hud.heldItem) {
      // Pegou outro objeto do mapa por engano: larga (K de novo, sem segurar down) e tenta de novo.
      await page.keyboard.down('KeyK');
      snap = await stepAndSnap(20);
      await page.keyboard.up('KeyK');
      snap = await stepAndSnap(50);
    }
  }
  assert(rareHeld, `ARM-12: nunca consegui segurar a faca rara especificamente: ${JSON.stringify(snap.hud.heldItem)}`);
  assert(
    snap.hud.heldItem && snap.hud.heldItem.name.endsWith(' Rara'),
    `RAR-07: nome no HUD deveria terminar em " Rara": ${JSON.stringify(snap.hud.heldItem)}`,
  );

  // ARM-26: K segurando a ferramenta a arremessa em `thrown` a 820 px/s (throwSpeed da faca) para o lado do facing.
  // Um frame depois o atrito do ar do Matter já tirou um pouco: tolerância de 10% para baixo.
  const facing = snap.player.facing;
  await page.keyboard.down('KeyK');
  snap = await stepAndSnap(16);
  await page.keyboard.up('KeyK');
  const thrown = snap.worldProps.find((p) => p.id === rareKnife.id);
  assert(thrown && thrown.state === 'thrown', `ARM-26: a faca deveria estar em thrown: ${JSON.stringify(thrown)}`);
  assert(
    Math.sign(thrown.vx) === facing && Math.abs(thrown.vx) >= 0.9 * 820 && Math.abs(thrown.vx) <= 821,
    `ARM-26: vx deveria ser ~820 px/s para o facing ${facing}: ${thrown.vx}`,
  );

  // ARM-18: nova run remove qualquer ferramenta largada.
  await page.keyboard.press('Digit3', { delay: 50 });
  let over = await stepAndSnap(100);
  for (let i = 0; i < 20 && over.run.state !== 'gameOver'; i++) over = await stepAndSnap(100);
  assert(over.run.state === 'gameOver', `esperava game over: ${JSON.stringify(over.run)}`);
  await stepAndSnap(1100);
  await page.keyboard.press('KeyJ', { delay: 50 });
  const fresh = await stepAndSnap(50);
  const tools = fresh.worldProps.filter((p) => p.key.startsWith('cursed'));
  assert(tools.length === 0, `ARM-18: nova run deveria remover toda ferramenta largada: ${JSON.stringify(tools)}`);
}
