// HUD da run (RHUD-01..07) com `?debug&seed=1`: rodada e restantes, faixa temporária, "rodada concluída", telas
// de título e de game over, e a checagem de que o HUD está fora da câmera principal (AD-003). No fim, as marcas de
// custo e a borda do Despertar no `EnergyHud` (VRM-17, VRM-20), em HD no mundo modular.
import { makeKit } from './fight-kit.mjs';

/** As marcas da barra batem com os múltiplos de `cost` que cabem na energia atual, em largura × valor / max. */
function expectMarks(assert, s, cost, what) {
  const { width, marks } = s.hud.energy;
  const n = Math.floor(s.ce.cur / cost);
  assert(
    marks.length === n && marks.every((m, k) => Math.abs(m - (width * cost * (k + 1)) / s.ce.max) <= 1),
    `VRM-20: ${what}: ${n} marcas do custo ${cost} com ${s.ce.cur} de energia: ${JSON.stringify(marks)}`,
  );
}

/**
 * VRM-20: com o Vermelho (custo 30) e 90 de energia, 3 marcas; depois de conjurar o Azul (custo 35), as marcas seguem o
 * último slot usado. VRM-17: o ícone do Vermelho ganha a borda dourada `A` com o Despertar ligado e fica `w` sem ele.
 */
async function energyMarks(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  let s = await kit.boot('hd=1&area=modular&maxAlive=0&tech=vermelho,azul');
  ctx.assert(s.ce.cur >= 90, `a run começa com energia cheia: ${JSON.stringify(s.ce)}`);
  expectMarks(assert, s, 30, 'antes da 1ª conjuração, o 1º slot (Vermelho)');
  assert(s.hud.energy.marks.length === 3, `VRM-20: 3 marcas com 90 ou mais: ${JSON.stringify(s.hud.energy.marks)}`);
  assert(s.hud.energy.icons[0].border === 'w', `VRM-17: sem Despertar, borda w: ${JSON.stringify(s.hud.energy.icons)}`);
  const seen = s.events.length;
  await kit.down('KeyI');
  await kit.frame();
  await kit.up('KeyI');
  s = await kit.waitFor((x) => x.events.slice(seen).includes('techCast:azul'), 60, 'o Azul deveria soltar');
  s = await kit.frame();
  expectMarks(assert, s, 35, 'depois do Azul, o último slot usado');
  s = await kit.boot(
    'hd=1&area=modular&maxAlive=0&tech=vermelho&axes=vermelho.potencia:2,vermelho.conjuracao:2&ramo=vermelho:a',
  );
  assert(s.build.vermelho.awakened, `o Despertar deveria ligar: ${JSON.stringify(s.build.vermelho)}`);
  assert(
    s.hud.energy.icons[0].border === 'A',
    `VRM-17: com o Despertar, borda A: ${JSON.stringify(s.hud.energy.icons)}`,
  );
}

export default async function (ctx) {
  const { page, baseUrl, assert } = ctx;
  await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=1`, { waitUntil: 'load' });
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
  const snapshot = () => page.evaluate(() => window.__game.snapshot());

  // Título (RHUD-05): o nome do jogo e a chamada para começar.
  let snap = await snapshot();
  assert(snap.hud.center?.includes('Combatsu'), `título sem o nome do jogo: ${JSON.stringify(snap.hud.center)}`);
  assert(
    snap.hud.center?.includes('J / Enter para começar'),
    `título sem a chamada para começar: ${JSON.stringify(snap.hud.center)}`,
  );

  // CEN-05: todo texto do HUD que fica sobre o mundo tem contorno #0b0d1a de 3 px, lido do texto vivo.
  for (const [name, o] of Object.entries({ ...snap.hud.outlines, ce: snap.hud.ceOutline })) {
    assert(o.stroke === '#0b0d1a' && o.thickness === 3, `CEN-05: contorno do texto ${name}: ${JSON.stringify(o)}`);
  }

  // RHUD-07: o HUD está fora da câmera principal (checagem real do bit de câmera, não uma constante).
  assert(snap.hud.ignoredByMain === true, `HUD deveria estar fora da câmera principal: ${JSON.stringify(snap.hud)}`);

  // J começa a run: banner "Rodada 1" logo em seguida (RHUD-02), e o texto de rodada/restantes (RHUD-01).
  await page.evaluate(() => window.__game.step(20));
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await page.evaluate(() => {
    window.__game.step(50);
    return window.__game.snapshot();
  });
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1,
    `run deveria estar na rodada 1: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.hud.banner === 'Rodada 1', `banner deveria mostrar a rodada 1: ${JSON.stringify(snap.hud.banner)}`);
  assert(snap.hud.round === 'Rodada 1', `hud.round errado: ${JSON.stringify(snap.hud.round)}`);
  const expectedRemaining = `Inimigos: ${snap.run.alive + snap.run.queued}`;
  assert(
    snap.hud.remaining === expectedRemaining,
    `hud.remaining errado: ${snap.hud.remaining} != ${expectedRemaining}`,
  );

  // A faixa fica centralizada em x = 480, y = 135 na tela de 960x540 (RHUD-02).
  assert(
    Math.abs(snap.hud.bannerPos.x - 480) < 1 && Math.abs(snap.hud.bannerPos.y - 135) < 1,
    `posição da faixa errada: ${JSON.stringify(snap.hud.bannerPos)}`,
  );

  // RUN.bannerMs (1500 ms): ainda visível em 1400 ms (limite inferior), sumida em mais 200 ms (RHUD-02).
  snap = await page.evaluate(() => {
    window.__game.step(1400);
    return window.__game.snapshot();
  });
  assert(snap.hud.banner === 'Rodada 1', `banner deveria continuar em 1400 ms: ${JSON.stringify(snap.hud.banner)}`);
  snap = await page.evaluate(() => {
    window.__game.step(200);
    return window.__game.snapshot();
  });
  assert(snap.hud.banner === null, `banner deveria sumir após 1600 ms: ${JSON.stringify(snap.hud.banner)}`);

  // Limpa a rodada 1 (tecla 2) até a intermission: banner "Rodada 1 concluída" (RHUD-03).
  for (let i = 0; i < 20 && snap.run.state !== 'intermission'; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await page.evaluate(() => {
      window.__game.step(300);
      return window.__game.snapshot();
    });
  }
  assert(snap.run.state === 'intermission', `rodada 1 não limpou a tempo: ${JSON.stringify(snap.run)}`);
  assert(
    snap.hud.banner === 'Rodada 1 concluída',
    `banner deveria mostrar a rodada concluída: ${JSON.stringify(snap.hud.banner)}`,
  );

  // Chega a rodada 2 e o player morre pela tecla 3: game over com o resumo (RHUD-06).
  for (let i = 0; i < 20 && !(snap.run.state === 'roundActive' && snap.run.round === 2); i++) {
    // SHOP-03: a loja segura a rodada até `Enter`.
    if (snap.run.state === 'shop') {
      // `Enter` segurado durante um passo: o input da loja lê `JustDown` no update.
      await page.keyboard.down('Enter');
      await page.evaluate(() => window.__game.step(50));
      await page.keyboard.up('Enter');
    }
    snap = await page.evaluate(() => {
      window.__game.step(200);
      return window.__game.snapshot();
    });
  }
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 2,
    `rodada 2 não começou a tempo: ${JSON.stringify(snap.run)}`,
  );
  await page.keyboard.press('Digit3', { delay: 50 });
  snap = await page.evaluate(() => {
    window.__game.step(50);
    return window.__game.snapshot();
  });
  assert(snap.run.state === 'gameOver', `run deveria estar em gameOver: ${JSON.stringify(snap.run)}`);
  // END-01/02: o painel de fim de run substitui o texto central, que fica vazio.
  assert(snap.hud.center === null, `END-02: o texto central deveria sumir: ${JSON.stringify(snap.hud.center)}`);
  const center = snap.record.panel.lines;
  assert(snap.record.panel.visible, `END-01: o painel de fim deveria aparecer: ${JSON.stringify(snap.record.panel)}`);
  assert(
    center.includes(`Rodada alcançada: ${snap.run.round}`),
    `game over sem a rodada alcançada: ${JSON.stringify(center)}`,
  );
  assert(center.includes(`Abates: ${snap.run.kills}`), `game over sem os abates: ${JSON.stringify(center)}`);
  assert(
    center.at(-1) === 'J / Enter para tentar de novo',
    `game over sem a chamada para tentar de novo: ${JSON.stringify(center)}`,
  );

  await energyMarks(ctx);
}
