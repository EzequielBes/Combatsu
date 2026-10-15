// Escalação do chefe sorteada pela seed (BLN-08, BLN-09, BLN-11), em `?debug&hd=1&area=modular&round=5`.
// 1º cenário: duas seeds na r5 dão chefes diferentes (seed 1: Oni Ígneo; seed 5: Tecelã Invocadora); o snapshot traz
// `affixes` e `finger` do chefe vivo, iguais à escalação que a área pediu, e o fundo da arena usa o mesmo arquétipo.
// `bossArch=tecela` na r5 vale e não mexe nos afixos sorteados (o stream é consumido igual).
// 2º cenário (BRD-01/02/07): a barra lê `bossBarLabel` (nome · afixos no gênero do arquétipo · Portador(a)), o
// snapshot lista um glifo por afixo ao lado dela, e os glifos somem com a barra quando o chefe cai. Captura em
// `.fable-out/boss-lineup-bar.png`.
// 3º cenário (BRD-04/05/06/08): `seed=1&round=4`, limpa a rodada e anda até a konbini: a loja mostra "Próximo: Oni ·
// Ígneo" no snapshot; fechar a loja apaga o aviso e a r5 nasce com o chefe anunciado e a barra com o mesmo arquétipo e
// afixos. A loja da r1 não tem aviso. Captura em `.fable-out/boss-lineup-shop.png`.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.fable-out');

export default async function ({ page, baseUrl, assert }) {
  mkdirSync(OUT_DIR, { recursive: true });
  // Viewport do tamanho do canvas HD: a captura sai 1:1.
  await page.setViewport({ width: 1280, height: 720 });
  /** Abre a URL, começa a run (J) e devolve o snapshot com o chefe da r5 já em cena. */
  const bossAt = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&round=5&${query}`, { waitUntil: 'load' });
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
    const step = (ms) =>
      page.evaluate((m) => {
        window.__game.step(m);
        return window.__game.snapshot();
      }, ms);
    await step(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    let s = await step(50);
    for (let i = 0; i < 20 && !s.boss; i++) s = await step(50);
    assert(s.boss, `[${query}] o chefe deveria nascer na r5: ${JSON.stringify(s.run)}`);
    return s;
  };

  /** O chefe vivo, a escalação do diretor e o fundo da arena contam a mesma história (BLN-08, BLN-11). */
  const checkCoherent = (s, label) => {
    const lineup = s.bossLineup;
    assert(lineup && lineup.round === 5, `[${label}] escalação da r5 no snapshot: ${JSON.stringify(lineup)}`);
    assert(
      Array.isArray(s.boss.affixes) && typeof s.boss.finger === 'boolean',
      `[${label}] BLN-11: affixes e finger no snapshot do chefe: ${JSON.stringify(s.boss)}`,
    );
    assert(
      s.boss.archetype === lineup.archetype &&
        JSON.stringify(s.boss.affixes) === JSON.stringify(lineup.affixes) &&
        s.boss.finger === lineup.finger,
      `[${label}] o chefe vivo difere da escalação: ${JSON.stringify(s.boss)} x ${JSON.stringify(lineup)}`,
    );
    assert(
      s.area.arenaVariant === s.boss.archetype && s.area.background.variant === s.boss.archetype,
      `[${label}] BLN-08: fundo da arena (${s.area.arenaVariant}/${s.area.background.variant}) x chefe ${s.boss.archetype}`,
    );
    // BLN-05/PDD-01: a r5 leva um afixo leve e nunca o Portador.
    assert(
      s.boss.affixes.length === 1 && ['igneo', 'invocador'].includes(s.boss.affixes[0]) && s.boss.finger === false,
      `[${label}] r5 com 1 afixo leve e sem Portador: ${JSON.stringify(s.boss)}`,
    );
  };

  const a = await bossAt('seed=1');
  checkCoherent(a, 'seed=1');
  const b = await bossAt('seed=5');
  checkCoherent(b, 'seed=5');
  assert(
    a.boss.archetype !== b.boss.archetype || JSON.stringify(a.boss.affixes) !== JSON.stringify(b.boss.affixes),
    `goal 1: seeds 1 e 5 deveriam dar chefes diferentes: ${JSON.stringify(a.bossLineup)} x ${JSON.stringify(b.bossLineup)}`,
  );
  const names = { oni: 'Oni do Portão', tecela: 'Tecelã de Maldições' };
  assert(a.boss.name === names[a.boss.archetype], `nome do arquétipo: ${a.boss.name}`);
  assert(b.boss.name === names[b.boss.archetype], `nome do arquétipo: ${b.boss.name}`);

  // BLN-09: `bossArch` vale na r5 e os afixos seguem os do sorteio da mesma seed (o override não move o stream).
  // A seed 1 sorteia o Oni na r5, então `bossArch=tecela` troca de fato o arquétipo.
  assert(a.boss.archetype === 'oni', `a seed 1 deveria sortear o Oni na r5: ${JSON.stringify(a.bossLineup)}`);
  const tecela = await bossAt('seed=1&bossArch=tecela');
  checkCoherent(tecela, 'bossArch=tecela');
  assert(tecela.boss.archetype === 'tecela', `BLN-09: bossArch=tecela na r5: ${tecela.boss.archetype}`);
  assert(
    JSON.stringify(tecela.boss.affixes) === JSON.stringify(a.boss.affixes),
    `BLN-09: afixos com bossArch deveriam ser os do sorteio: ${JSON.stringify(tecela.boss.affixes)} x ${JSON.stringify(a.boss.affixes)}`,
  );

  // BLN-09/10: `bossAffix=none` tira os afixos e `finger=1` liga o Portador mesmo na r5 (é debug).
  const bare = (await bossAt('seed=1&bossAffix=none&finger=1')).boss;
  assert(
    JSON.stringify(bare.affixes) === '[]' && bare.finger === true && bare.archetype === a.boss.archetype,
    `BLN-09: bossAffix=none&finger=1: ${JSON.stringify(bare)}`,
  );

  // 2º cenário (BRD-01/02): rótulo da barra e glifos visíveis. A seed 1 sorteia o Oni Ígneo na r5.
  const barOf = (snap) => ({ name: snap.hud.bossBar.name, visible: snap.hud.bossBar.visible, glyphs: snap.bossGlyphs });
  const expectBar = (snap, name, glyphs, label) => {
    const bar = barOf(snap);
    assert(bar.visible && bar.name === name, `[${label}] BRD-01: rótulo da barra: ${JSON.stringify(bar)}`);
    assert(JSON.stringify(bar.glyphs) === JSON.stringify(glyphs), `[${label}] BRD-02: glifos: ${JSON.stringify(bar)}`);
  };
  expectBar(a, 'Oni do Portão · Ígneo', ['a'], 'seed=1');
  expectBar(tecela, 'Tecelã de Maldições · Ígnea', ['a'], 'bossArch=tecela');
  const full = await bossAt('seed=1&bossArch=tecela&bossAffix=sangue,adaptativo&finger=1');
  expectBar(
    full,
    'Tecelã de Maldições · Sangue Convergente · Adaptativa · Portadora de Dedo',
    ['r', 'A', 'R'],
    'tecela completa',
  );
  await page.evaluate(() => window.__game.render());
  await page.screenshot({ path: join(OUT_DIR, 'boss-lineup-bar.png') });

  // Os glifos somem com a barra quando o chefe cai (golpes de teste, tecla 2, como no `boss-victory`).
  let s = await bossAt('seed=1');
  expectBar(s, 'Oni do Portão · Ígneo', ['a'], 'antes da vitória');
  for (let i = 0; i < 300 && s.boss && s.boss.state !== 'dead' && s.run.state === 'roundActive'; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    s = await page.evaluate(() => {
      window.__game.step(17);
      return window.__game.snapshot();
    });
    if (s.events.includes('bossDefeatedFx')) break;
    s = await page.evaluate(() => {
      window.__game.step(80);
      return window.__game.snapshot();
    });
  }
  assert(s.events.includes('bossDefeatedFx'), `o chefe deveria cair: ${JSON.stringify(s.boss)} player ${s.player.hp}`);
  const after = barOf(s);
  assert(!after.visible && after.glyphs.length === 0, `BRD-02: glifos somem com a barra: ${JSON.stringify(after)}`);

  // 3º cenário (BRD-04/05/06/08): aviso na loja antes da rodada de chefe.
  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  /** Abre a run na rodada pedida, derruba a onda (tecla 2) e anda até a konbini; devolve o snapshot com a loja aberta. */
  const reachShop = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&maxAlive=8&regen=0&${query}`, {
      waitUntil: 'load',
    });
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
    let snap = await step(50);
    for (let i = 0; i < 400 && snap.run.state === 'roundActive'; i++) {
      await page.keyboard.press('Digit2', { delay: 20 });
      snap = await step(80);
      assert(!snap.player.dead, `[${query}] o player morreu antes de vencer a rodada`);
      // BRD-05: nenhum aviso durante a rodada.
      assert(snap.bossAnnounce === null, `[${query}] aviso fora da loja: ${snap.bossAnnounce}`);
    }
    for (let i = 0; i < 200 && snap.run.state !== 'traverse'; i++) snap = await step(50);
    await page.keyboard.down('KeyD');
    for (let i = 0; i < 600 && snap.run.state !== 'shop'; i++) {
      snap = await step(50);
      if (snap.run.state !== 'shop')
        assert(snap.bossAnnounce === null, `[${query}] aviso antes da loja: ${snap.bossAnnounce}`);
    }
    await page.keyboard.up('KeyD');
    assert(snap.run.state === 'shop', `[${query}] deveria chegar à loja: ${JSON.stringify(snap.run)}`);
    return snap;
  };

  // BRD-05: a loja da r1 (a r2 é comum) não avisa nada.
  s = await reachShop('seed=1');
  assert(s.run.round === 1 && s.bossAnnounce === null, `BRD-05: aviso na loja da r1: ${s.bossAnnounce}`);

  // BRD-04/08: a loja da r4 anuncia o chefe da r5. A seed 1 sorteia o Oni Ígneo na r5 (1º cenário).
  s = await reachShop('seed=1&round=4');
  assert(
    s.run.round === 4 && s.bossAnnounce === 'Próximo: Oni · Ígneo',
    `BRD-04/08: aviso na loja da r4: ${JSON.stringify(s.bossAnnounce)}`,
  );
  // O aviso fica na tela enquanto a loja está aberta. A descida do painel (200 ms) anda no relógio de parede dos
  // tweens: passos curtos com pausa real, para a captura mostrar as cartas no lugar.
  for (let i = 0; i < 12; i++) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    s = await step(17);
  }
  assert(s.bossAnnounce === 'Próximo: Oni · Ígneo', `BRD-04: o aviso sumiu com a loja aberta: ${s.bossAnnounce}`);
  await page.evaluate(() => window.__game.render());
  await page.screenshot({ path: join(OUT_DIR, 'boss-lineup-shop.png') });

  // Enter fecha a loja (fade de saída e de entrada no relógio do jogo); a r5 começa sem aviso.
  await page.keyboard.down('Enter');
  s = await step(16);
  await page.keyboard.up('Enter');
  for (let i = 0; i < 200 && !(s.run.round === 5 && s.boss); i++) s = await step(16);
  assert(s.run.round === 5 && s.boss, `a r5 deveria nascer com o chefe: ${JSON.stringify(s.run)}`);
  assert(s.bossAnnounce === null, `BRD-04: o aviso deveria sumir ao fechar a loja: ${s.bossAnnounce}`);
  // BRD-06: o chefe que nasce é o anunciado, e a barra conta o mesmo arquétipo e afixos.
  assert(
    s.boss.archetype === 'oni' && JSON.stringify(s.boss.affixes) === '["igneo"]' && s.boss.finger === false,
    `BRD-06: chefe da r5 difere do anunciado: ${JSON.stringify(s.boss)}`,
  );
  expectBar(s, 'Oni do Portão · Ígneo', ['a'], 'r5 depois do aviso');
}
