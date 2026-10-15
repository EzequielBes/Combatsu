// Tela de fim e recomeço rápido (END-*, RST-*, DMG-06) em HD no mundo modular. O jogo só anda por `step`, em passos
// fixos de 1000/60 ms: o tempo desde a morte é contado em passos a partir do update que emitiu o `gameOver`.
import { makeKit } from './fight-kit.mjs';

const STEP_MS = 1000 / 60;

export default async function (ctx) {
  const { page, baseUrl, assert } = ctx;
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  // Sem inimigos (`spawn=0`): ninguém bate no player e a run morre sem dano causado (END-09).
  const open = async (extra) => {
    const query = extra ? `&${extra}` : '';
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&nosave=1&spawn=0${query}`, { waitUntil: 'load' });
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
  };
  const stepSnap = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  const frames = (n) => stepSnap(n * STEP_MS);

  /** Começa a run (com `extra` na query) e mata o player pela tecla 3; devolve o snapshot do update da morte (tempo 0). */
  const startAndDie = async (extra) => {
    await open(extra);
    await page.keyboard.press('KeyJ', { delay: 50 });
    let snap = await stepSnap(300);
    assert(snap.run.state === 'roundActive', `a run deveria começar: ${JSON.stringify(snap.run)}`);
    await page.keyboard.press('Digit3', { delay: 50 });
    for (let i = 0; i < 120 && snap.run.state !== 'gameOver'; i++) snap = await frames(1);
    assert(snap.run.state === 'gameOver', `o player deveria morrer: ${JSON.stringify(snap.run)}`);
    return snap;
  };

  // END-01/02/03/09/12/15: o painel abre na morte com o resumo e o texto central some.
  let snap = await startAndDie();
  const panel = snap.record.panel;
  assert(panel.visible, `END-01: painel deveria abrir na morte: ${JSON.stringify(panel)}`);
  assert(snap.hud.center === null, `END-02: hud.center deveria ser null: ${JSON.stringify(snap.hud.center)}`);
  // A morte cai ~300 ms depois do J, com a faixa `Rodada 1` (1500 ms) ainda na tela: ela some com o painel.
  assert(snap.hud.banner === null, `END-02: a faixa deveria sumir com o painel: ${JSON.stringify(snap.hud.banner)}`);
  const expected = [
    `Rodada alcançada: ${snap.run.round}`,
    `Abates: ${snap.run.kills}`,
    `Fragmentos: ${snap.wallet.fragments}`,
    'Dano: nenhum',
  ];
  for (const line of expected)
    assert(panel.lines.includes(line), `END-03/09: falta "${line}": ${JSON.stringify(panel.lines)}`);
  assert(
    panel.lines.at(-1) === 'J / Enter para tentar de novo',
    `END-12: última linha: ${JSON.stringify(panel.lines)}`,
  );
  assert(panel.lines[0] === 'Fim da run', `END-16: título do painel: ${JSON.stringify(panel.lines)}`);
  const { x, y, w, h } = panel.bounds;
  assert(
    x >= 0 && y >= 0 && x + w <= 960 && y + h <= 540,
    `END-01: painel fora de 960x540: ${JSON.stringify(panel.bounds)}`,
  );
  assert(
    Math.abs(x + w / 2 - 480) <= 1 && Math.abs(y + h / 2 - 270) <= 1,
    `END-01: painel fora do centro: ${JSON.stringify(panel.bounds)}`,
  );
  assert(
    snap.record.marker.visible === false,
    `RMK-04: marcador escondido no gameOver: ${JSON.stringify(snap.record.marker)}`,
  );

  // RST-03: J apertado aos 966 ms (o último passo cujo update seguinte ainda cai antes de 1000 ms) não sai do gameOver.
  snap = await frames(58);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await frames(1);
  assert(
    snap.run.state === 'gameOver',
    `RST-03: J antes de 1000 ms deveria ficar em gameOver: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.record.panel.visible, 'RST-03: o painel deveria continuar visível');

  // RST-01/02/04: nova morte; J aos 1000 ms → `roundActive` na r1 no update seguinte e o player pronto antes de 3000 ms.
  snap = await startAndDie();
  const pageId = await page.evaluate(() => (window.__recordEndPage ??= Math.random()));
  snap = await frames(60);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let elapsed = 60;
  snap = await frames(1);
  elapsed++;
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1,
    `RST-01: J aos 1000 ms deveria abrir a r1 no update seguinte: ${JSON.stringify(snap.run)}`,
  );
  const ready = (s) => s.run.state === 'roundActive' && !s.player.dead && s.player.hp === s.player.maxHp;
  while (!ready(snap) && elapsed * STEP_MS < 3000) {
    snap = await frames(1);
    elapsed++;
  }
  assert(
    ready(snap) && elapsed * STEP_MS <= 3000,
    `RST-02: player pronto em ${Math.round(elapsed * STEP_MS)} ms: ${JSON.stringify({ run: snap.run, player: snap.player })}`,
  );
  // END-13 e DMG-06: o painel some e o registro de dano zera na run nova.
  assert(snap.record.panel.visible === false, `END-13: o painel deveria sumir: ${JSON.stringify(snap.record.panel)}`);
  const damage = Object.values(snap.record.damage);
  assert(
    damage.length > 0 && damage.every((d) => d === 0),
    `DMG-06: dano zerado: ${JSON.stringify(snap.record.damage)}`,
  );
  // RST-04: a mesma página (sem recarregar).
  assert(
    (await page.evaluate(() => window.__recordEndPage)) === pageId,
    'RST-04: o recomeço não pode recarregar a página',
  );

  await strikeAndObjectDamage(ctx);
  await techDamage(ctx);
  await kokusenDamage(ctx);
  await fullBuildPanel(ctx, startAndDie);
  assert(errors.length === 0, `erros na página: ${errors.join(' | ')}`);
}

const total = (damage) => Object.values(damage).reduce((sum, d) => sum + d, 0);

/**
 * DMG-01/03/04/05: soco num inimigo soma em `golpe` o que ele perdeu; golpe no ar (sem alvo) não soma; golpe com o
 * bastão vinculado na mão soma em `objeto`; no laboratório de efeitos o golpe no boneco não soma.
 */
async function strikeAndObjectDamage(ctx) {
  const { assert, snap, frame, down, up, count, tap, boot, nearest, approach } = makeKit(ctx);
  const base = 'hd=1&area=modular&nosave=1&noshop=1&enemyGuard=0';

  // DMG-04: golpe no ar, com o inimigo longe, não conecta e não soma nada.
  let s = await boot(base);
  const far = nearest(s);
  assert(far && Math.abs(far.x - s.player.x) > 80, `pré-condição: inimigo longe: ${JSON.stringify(s.enemies)}`);
  s = await tap('KeyJ');
  s = await snap(400);
  assert(total(s.record.damage) === 0, `DMG-04: golpe no ar não soma: ${JSON.stringify(s.record.damage)}`);

  // DMG-01: um soco no inimigo soma em `golpe` o mesmo dano que ele perdeu.
  s = await approach();
  const target = nearest(s);
  s = await tap('KeyJ');
  s = await snap(300);
  const after = s.enemies.find((e) => e.id === target.id);
  const lost = target.hp - (after?.hp ?? 0);
  assert(lost > 0, `pré-condição: o soco deveria acertar: ${JSON.stringify({ target, after })}`);
  assert(
    s.record.damage.golpe === lost && total(s.record.damage) === lost,
    `DMG-01: golpe deveria somar ${lost}: ${JSON.stringify(s.record.damage)}`,
  );

  // DMG-04: com `enemyGuard=1` o inimigo de frente levanta a guarda contra o jab (molde do smoke `enemy-guard`); o
  // golpe bloqueado não tira vida e não soma nada.
  s = await boot('hd=1&area=modular&nosave=1&noshop=1&enemyGuard=1');
  s = await approach();
  const guard = nearest(s);
  const blocks = count(s, `enemyBlock:${guard.id}`);
  await down('KeyJ');
  s = await frame();
  await up('KeyJ');
  for (let i = 0; i < 30 && count(s, `enemyBlock:${guard.id}`) === blocks; i++) s = await frame();
  assert(count(s, `enemyBlock:${guard.id}`) === blocks + 1, `pré-condição: o jab deveria ser bloqueado: ${s.events}`);
  assert(
    s.enemies.find((e) => e.id === guard.id)?.hp === guard.hp && total(s.record.damage) === 0,
    `DMG-04: golpe bloqueado não soma: ${JSON.stringify(s.record.damage)}`,
  );

  // DMG-03: com o bastão vinculado na mão o golpe é de objeto.
  s = await boot(`${base}&arsenal=bastao`);
  const held = s.worldProps.find((p) => p.state === 'held' || p.state === 'swing');
  assert(held?.key === 'boundClub', `pré-condição: bastão na mão: ${JSON.stringify(s.worldProps)}`);
  s = await approach();
  const struck = nearest(s);
  s = await tap('KeyJ');
  s = await snap(400);
  const hit = s.enemies.find((e) => e.id === struck.id);
  assert(struck.hp > (hit?.hp ?? 0), `pré-condição: o bastão deveria acertar: ${JSON.stringify({ struck, hit })}`);
  assert(
    s.record.damage.objeto > 0 && s.record.damage.golpe === 0,
    `DMG-03: bastão soma em objeto: ${JSON.stringify(s.record.damage)}`,
  );

  // DMG-05: no fxlab o soco tira vida do boneco, mas o registro não soma.
  s = await boot('hd=1&nosave=1&noshop=1&fxlab');
  for (let i = 0; i < 80; i++) {
    const dummy = [...s.fxlab.dummies].sort((a, b) => a.x - b.x)[0];
    if (dummy.x - s.player.x < 30) break;
    await ctx.page.keyboard.down('KeyD');
    s = await snap(16);
    await ctx.page.keyboard.up('KeyD');
  }
  s = await tap('KeyJ');
  s = await snap(300);
  assert(
    s.fxlab.dummies.some((d) => d.hp < d.maxHp),
    `pré-condição: o soco deveria acertar o boneco: ${JSON.stringify(s.fxlab.dummies)}`,
  );
  assert(total(s.record.damage) === 0, `DMG-05: boneco não soma: ${JSON.stringify(s.record.damage)}`);
}

const TECH_BASE = 'hd=1&area=modular&nosave=1&noshop=1&enemyGuard=0';

/** Espera o slot 1 ficar livre (sem conjuração e sem recarga); devolve o snapshot. */
async function waitSlotReady({ snap }) {
  let s = await snap(20);
  for (let i = 0; i < 60 && (s.tech.cast !== null || s.tech.slots[0].cooldownMs > 0); i++) s = await snap(100);
  return s;
}

/** Espera um inimigo vivo nascer (intervalo de spawn) e devolve o snapshot. */
async function waitEnemy({ snap, nearest, assert }) {
  let s = await snap(20);
  for (let i = 0; i < 20 && !nearest(s); i++) s = await snap(300);
  assert(nearest(s), `nenhum inimigo nasceu: ${JSON.stringify(s.enemies)}`);
  return s;
}

/**
 * Conjura o Azul (slot 1, tecla L) a ~100 px do inimigo: a esfera nasce 110 px à frente (BLU-02) com o alvo dentro do
 * raio de puxão, e os tiques e a implosão somam em `azul`. O golpe do inimigo pode cancelar a conjuração (CAST-07):
 * até 3 tentativas. Devolve o snapshot depois da esfera sumir.
 */
async function castBlue(kit) {
  const { snap, tap, approach, assert } = kit;
  for (let attempt = 0; attempt < 3; attempt++) {
    await waitSlotReady(kit);
    await waitEnemy(kit);
    await approach(100);
    let s = await tap('KeyL');
    if (s.tech.cast?.id !== 'azul') continue;
    for (let i = 0; i < 60 && (s.tech.cast !== null || s.techObjects.some((o) => o.kind === 'blue')); i++)
      s = await snap(50);
    if (s.record.damage.azul > 0) return s;
  }
  assert(false, 'pré-condição: o Azul deveria acertar o inimigo em 3 tentativas');
  return null;
}

/** Mata o player pela tecla 3 e devolve o snapshot do `gameOver`. */
async function die({ page, snap, frame, assert }) {
  await page.keyboard.press('Digit3', { delay: 50 });
  let s = await snap(20);
  for (let i = 0; i < 120 && s.run.state !== 'gameOver'; i++) s = await frame();
  assert(s.run.state === 'gameOver', `o player deveria morrer: ${JSON.stringify(s.run)}`);
  return s;
}

/**
 * DMG-02, END-08, END-15: um Azul e um soco num inimigo somam em `azul` e `golpe`; na morte o painel lista `Golpe` e
 * `Azul` com os valores de `record.damage`, e as porcentagens somam 100 ± 1.
 */
async function techDamage(ctx) {
  const kit = { ...makeKit(ctx), page: ctx.page };
  const { assert, snap, tap, boot, nearest, approach } = kit;
  await boot(`${TECH_BASE}&tech=azul`);
  let s = await castBlue(kit);
  const blue = s.record.damage.azul;
  await approach();
  const target = nearest(await snap(0));
  await tap('KeyJ');
  s = await snap(300);
  const after = s.enemies.find((e) => e.id === target.id);
  assert(target.hp > (after?.hp ?? 0), `pré-condição: o soco deveria acertar: ${JSON.stringify({ target, after })}`);
  const dead = await die(kit);
  const { damage } = dead.record;
  assert(
    damage.azul === blue && damage.golpe > 0 && total(damage) === damage.azul + damage.golpe,
    `DMG-02: Azul e golpe no registro: ${JSON.stringify(damage)}`,
  );
  const { lines } = dead.record.panel;
  assert(lines.includes('Dano'), `END-08: cabeçalho Dano antes das fontes: ${JSON.stringify(lines)}`);
  const rows = lines.map((l) => /^(.+): (\d+) \((\d+)%\)$/.exec(l)).filter(Boolean);
  for (const [label, value] of [
    ['Golpe', damage.golpe],
    ['Azul', damage.azul],
  ])
    assert(
      rows.some((r) => r[1] === label && Number(r[2]) === Math.round(value)),
      `END-08: falta "${label}: ${Math.round(value)}": ${JSON.stringify(lines)}`,
    );
  const pct = rows.reduce((sum, r) => sum + Number(r[3]), 0);
  assert(rows.length === 2 && Math.abs(pct - 100) <= 1, `END-08: % somam ${pct}: ${JSON.stringify(lines)}`);
}

/**
 * Espera o 1º impacto do Divergente em `targetId` (hp cai) ou o fim da conjuração; devolve o snapshot do impacto ou
 * `null` se a conjuração acabou sem acertar.
 */
async function firstImpact({ frame }, targetId, hp) {
  for (let i = 0; i < 40; i++) {
    const s = await frame();
    const t = s.enemies.find((e) => e.id === targetId);
    if (t && t.hp < hp) return s;
    if (s.tech.cast === null) return null;
  }
  return null;
}

/**
 * DMG-07: Kokusen forçado (molde do smoke `kokusen`): Divergente a ~40 px, tecla do slot de novo quando a janela abre;
 * o 1º impacto e o Kokusen somam em `divergente` o que o inimigo perdeu, e nada mais soma.
 */
async function kokusenDamage(ctx) {
  const kit = makeKit(ctx);
  const { assert, frame, down, up, boot, nearest, approach, count } = kit;
  await boot(`${TECH_BASE}&tech=divergente`);
  for (let attempt = 0; attempt < 3; attempt++) {
    await waitSlotReady(kit);
    await waitEnemy(kit);
    const target = nearest(await approach(40));
    await down('KeyL');
    let s = await frame();
    await up('KeyL');
    const hit = s.tech.cast?.state === 'sign' ? await firstImpact(kit, target.id, target.hp) : null;
    if (!hit) continue;
    s = hit;
    for (let i = 0; i < 20 && !s.kokusen.windowOpen; i++) s = await frame();
    if (!s.kokusen.windowOpen) continue;
    const before = count(s, 'kokusen');
    await down('KeyL');
    s = await frame();
    await up('KeyL');
    for (let i = 0; i < 20 && count(s, 'kokusen') === before; i++) s = await frame();
    if (count(s, 'kokusen') === before) continue;
    const after = s.enemies.find((e) => e.id === target.id);
    const lost = target.hp - (after?.hp ?? 0);
    const { damage } = s.record;
    assert(
      after && damage.divergente === lost && total(damage) === lost,
      `DMG-07: Kokusen soma em divergente ${lost}: ${JSON.stringify({ damage, after })}`,
    );
    return;
  }
  assert(false, 'pré-condição: o Kokusen forçado deveria acertar em 3 tentativas');
}

/** END-04..07: com a build cheia o painel lista técnicas, passivas, arsenal e votos e cabe em 960x540. */
async function fullBuildPanel(ctx, startAndDie) {
  const { assert } = ctx;
  const perks = 'punhoPesado,executor,refluxo,condutor,passoSombrio,contraAfiado';
  const vows = 'semGuarda,pactoDoFeiticeiro,fluxoSelado,curaProibida,ganancia';
  const query = `tech=azul:3,vermelho&axes=vermelho.potencia:2&perks=${perks}&vows=${vows}&arsenal=manoplas,bastao`;
  const snap = await startAndDie(query);
  const { lines, bounds } = snap.record.panel;
  for (const prefix of ['Técnicas: ', 'Passivas: ', 'Arsenal: ', 'Votos: '])
    assert(
      lines.some((l) => l.startsWith(prefix) && !/: nenhum/.test(l)),
      `END-04..07: falta "${prefix}" com itens: ${JSON.stringify(lines)}`,
    );
  for (const name of ['Azul Nv 3', 'Vermelho Nv 3', 'Manoplas de ferro Nv 1', 'Bastão selado Nv 1', 'Ganância'])
    assert(lines.join(' ').includes(name), `END-04..07: falta "${name}": ${JSON.stringify(lines)}`);
  const { x, y, w, h } = bounds;
  assert(
    x >= 0 && y >= 0 && x + w <= 960 && y + h <= 540,
    `END-01: painel cheio fora de 960x540: ${JSON.stringify(bounds)}`,
  );
}
