// Votos Vinculativos (VOW-*) em HD. Cada bloco abre a página com a sua query e confere o efeito lido do jogo vivo.
const SEED = 3;

export default async function ({ page, baseUrl, assert }) {
  const step = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const open = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&enemyGuard=0&seed=${SEED}&${query}`, { waitUntil: 'load' });
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
    return step(50);
  };

  // VOW-09: o voto do debug entra na run (id desconhecido é ignorado) e aparece no snapshot, sem painel aberto.
  let s = await open('vows=corpoDeVidro,naoExiste');
  assert(JSON.stringify(s.vows.taken) === '["corpoDeVidro"]', `VOW-09: votos da run: ${JSON.stringify(s.vows)}`);
  assert(s.vows.offers === null, `VOW-09: painel fechado no começo: ${JSON.stringify(s.vows.offers)}`);
  assert(s.vows.effects.maxHpMul === 0.6, `VOW-09: efeitos no snapshot: ${JSON.stringify(s.vows.effects)}`);

  // VOW-08: sem o parâmetro, a run começa sem voto.
  s = await open('maxAlive=1');
  assert(JSON.stringify(s.vows.taken) === '[]', `VOW-08: run sem voto: ${JSON.stringify(s.vows)}`);

  // VOW-11/12: o multiplicador do golpe lido da composição da cena (a mesma do player): Sem guarda só no forte,
  // Pacto do feiticeiro nos dois.
  s = await open('vows=semGuarda');
  assert(s.vows.strike.light === 1 && s.vows.strike.heavy === 1.6, `VOW-11: golpe: ${JSON.stringify(s.vows.strike)}`);
  s = await open('vows=pactoDoFeiticeiro');
  assert(
    Math.abs(s.vows.strike.light - 0.7) < 1e-9 && Math.abs(s.vows.strike.heavy - 0.7) < 1e-9,
    `VOW-12: golpe: ${JSON.stringify(s.vows.strike)}`,
  );

  // VOW-13: com Fluxo selado o Desmantelar (30) custa 18 de energia, medido na barra viva ao conjurar.
  s = await open('vows=fluxoSelado&tech=corte&maxAlive=0');
  const before = s.ce.cur;
  await page.keyboard.down('KeyL');
  s = await step(17);
  await page.keyboard.up('KeyL');
  assert(
    s.tech.cast && s.tech.cast.id === 'corte',
    `VOW-13: a técnica deveria conjurar: ${JSON.stringify(s.tech.cast)}`,
  );
  // A energia sai no meio da conjuração (e a regeneração para durante ela): o menor valor da barra dá o custo.
  let low = s.ce.cur;
  for (let i = 0; i < 30; i++) low = Math.min(low, (await step(17)).ce.cur);
  assert(Math.abs(before - low - 18) < 0.5, `VOW-13: custo ${before - low} (esperava 18)`);

  // VOW-17: com Pele de pedra os 50 de dano de teste (tecla 4) viram 35 na vida viva.
  s = await open('vows=peleDePedra&regen=0&maxAlive=0');
  const hp0 = s.player.hp;
  await page.keyboard.press('Digit4', { delay: 50 });
  s = await step(17);
  assert(hp0 - s.player.hp === 35, `VOW-17: dano sofrido ${hp0 - s.player.hp} (esperava 35)`);

  // VOW-10: Corpo de vidro baixa a vida máxima viva para 60 e o hp fica dentro do teto.
  s = await open('vows=corpoDeVidro&maxAlive=0');
  assert(s.player.maxHp === 60 && s.player.hp <= 60, `VOW-10: vida ${s.player.hp}/${s.player.maxHp}`);

  // VOW-11: com Sem guarda, segurar U não levanta a guarda.
  s = await open('vows=semGuarda&maxAlive=0');
  await page.keyboard.down('KeyU');
  for (let i = 0; i < 10; i++) s = await step(17);
  await page.keyboard.up('KeyU');
  assert(s.player.guard === 'none', `VOW-11: a guarda subiu: ${s.player.guard}`);

  // VOW-13: com Fluxo selado, canalizar a Reversa (F) por 1,5 s não cura.
  s = await open('vows=fluxoSelado&regen=0&maxAlive=0');
  const reverse = async () => {
    await page.keyboard.down('KeyF');
    for (let i = 0; i < 90; i++) s = await step(17);
    await page.keyboard.up('KeyF');
    return step(17);
  };
  await page.keyboard.press('Digit4', { delay: 50 });
  s = await step(400);
  let hurt = s.player.hp;
  s = await reverse();
  assert(s.player.hp === hurt, `VOW-13: a Reversa curou com Fluxo selado: ${hurt} -> ${s.player.hp}`);

  // VOW-14: com Cura proibida a Reversa não cura em 50% da vida, e cura abaixo de 30%.
  s = await open('vows=curaProibida&regen=0&maxAlive=0');
  await page.keyboard.press('Digit4', { delay: 50 });
  s = await step(400);
  hurt = s.player.hp;
  s = await reverse();
  assert(hurt === 50 && s.player.hp === 50, `VOW-14: curou acima de 30%: ${hurt} -> ${s.player.hp}`);
  s = await open('vows=curaProibida,corpoDeVidro&regen=0&maxAlive=0');
  await page.keyboard.press('Digit4', { delay: 50 });
  s = await step(400);
  hurt = s.player.hp;
  s = await reverse();
  assert(hurt === 10 && s.player.hp > hurt, `VOW-14: não curou abaixo de 30%: ${hurt} -> ${s.player.hp}`);

  // VOW-15: com Ganância a coleta credita o valor da gota × 1,6 (arredondado).
  s = await open('vows=ganancia&maxAlive=1&heal=0');
  for (let i = 0; i < 30 && !s.pickups.some((p) => p.kind === 'fragment'); i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    s = await step(300);
  }
  const gem = s.pickups.find((p) => p.kind === 'fragment');
  assert(gem, 'VOW-15: nenhum fragmento caiu para testar a coleta');
  const want = `collect:fragment:${Math.round(gem.value * 1.6)}`;
  let collected = false;
  for (let i = 0; i < 300 && !collected; i++) {
    const target = s.pickups.find((p) => p.id === gem.id);
    if (target) {
      const dir = target.x >= s.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      s = await step(50);
      await page.keyboard.up(dir);
    } else s = await step(17);
    collected = s.events.some((e) => e.startsWith('collect:fragment:'));
  }
  assert(s.events.includes(want), `VOW-15: esperava ${want}: ${JSON.stringify(s.events)}`);

  // VOW-16: com Fúria a regeneração passiva fica desligada (6 s parado depois do dano, que bastariam para regenerar).
  s = await open('vows=furia&maxAlive=0');
  await page.keyboard.press('Digit4', { delay: 50 });
  s = await step(400);
  hurt = s.player.hp;
  s = await step(6000);
  assert(s.player.hp === hurt, `VOW-16: regenerou com Fúria: ${hurt} -> ${s.player.hp}`);
  s = await open('maxAlive=0');
  await page.keyboard.press('Digit4', { delay: 50 });
  s = await step(400);
  hurt = s.player.hp;
  s = await step(6000);
  assert(s.player.hp > hurt, `VOW-16: sem voto deveria regenerar (controle): ${hurt} -> ${s.player.hp}`);
}
