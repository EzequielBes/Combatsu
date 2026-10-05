// Capturas de regressão visual: faz o build, sobe o `vite preview` numa porta livre e, com o Edge headless, grava o
// canvas do jogo em estados determinísticos. O mesmo arquivo roda no branch do Phaser 3 e no do Phaser 4; as duas
// pastas são comparadas depois por `tools/visual-diff.mjs`.
//   node tools/visual-shots.mjs <pasta-de-saída> [filtro-de-cenário] [--no-build] [--random=0.8] [--gpu]
// `--random=v` troca o gerador por um valor fixo: partículas e tremor da câmera sorteiam com `Math.random`, e as duas
// versões do Phaser consomem a sequência em ordem diferente; com valor fixo o sorteio sai igual nas duas. O valor fixo
// só vale a partir do primeiro `step` (a cena não termina de ser criada com `Math.random` constante).
// Determinismo: antes de qualquer script da página, `performance.now` e `Date.now` viram um relógio virtual que só anda
// 1000/60 ms por passo de `__game.step` (os tweens do Phaser contam `Date.now`), `Math.random` vira um gerador com
// semente fixa e o `requestAnimationFrame` nunca dispara (sem isto o Matter acumula um passo de física por quadro real
// até o primeiro `step`). Cada captura chama `__game.render()` e lê o canvas no mesmo turno, sem escala do navegador.
import { fxScenarios } from './visual-shots-fx.mjs';
import { hdScenarios, makeClose } from './visual-shots-hd.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { makeKit } from '../scripts/smoke/fight-kit.mjs';
import { DEFAULT_EDGE_PATHS, findEdge } from '../scripts/smoke/lib.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outDir = resolve(args[0] ?? join(root, '.fable-out', 'visual', 'shots'));
const filter = args[1] ?? '';
const skipBuild = process.argv.includes('--no-build');
/** `--gpu`: usa a placa de vídeo (ANGLE/D3D11) em vez do rasterizador por software do smoke (SwiftShader). */
const GL_ARGS = process.argv.includes('--gpu')
  ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
  : ['--use-angle=swiftshader'];
const flatArg = process.argv.find((a) => a.startsWith('--random='));
const FLAT_RANDOM = flatArg ? Number(flatArg.slice(9)) : null;
const BASE = 'enemyGuard=0&noshop=1&maxAlive=1&shove=0';

/** Roda na página antes do jogo: relógio virtual, `Math.random` com semente e `__game.step` de um quadro por vez. */
const initPage = (flatRandom) => {
  let vt = 0;
  let api;
  let stepped = false;
  performance.now = () => vt;
  Date.now = () => 1_700_000_000_000 + vt;
  window.requestAnimationFrame = () => 0;
  let seed = 0x2545f491;
  Math.random = () => {
    // O `UUID()` do Phaser (chave da textura de cada `Text`) sorteia dentro de `String.replace` e precisa variar.
    if (flatRandom !== null && stepped && !new Error().stack.includes('String.replace')) return flatRandom;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Object.defineProperty(window, '__game', {
    configurable: true,
    get: () => api,
    set: (g) => {
      const step = g.step.bind(g);
      g.step = (ms) => {
        stepped = true;
        for (let i = 0; i < Math.ceil(ms / (1000 / 60)); i++) {
          vt += 1000 / 60;
          try {
            step(1);
          } catch (err) {
            // O puppeteer só repassa a mensagem: a pilha vai junto para dizer onde o passo quebrou.
            throw new Error(err?.stack ?? String(err), { cause: err });
          }
        }
      };
      api = g;
    },
  });
};

/** O que o relatório precisa saber do estado lógico de cada captura (para separar lógica de renderizador). */
const brief = (s) => ({
  player: [s.player.x, s.player.y, s.player.frame, s.player.hp],
  view: s.player.view,
  cam: [s.camera.scroll.x, s.camera.scroll.y, s.camera.zoom],
  enemies: s.enemies.map((e) => [e.id, Math.round(e.x * 100) / 100, e.state, e.frame]),
  layers: s.fx.layers,
  run: s.run.state,
});

function makeTools(page, baseUrl, log) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const kit = makeKit({ page, baseUrl, assert });
  const shot = async (name) => {
    const { url, s } = await page.evaluate(() => {
      window.__game.render();
      return { url: document.querySelector('canvas').toDataURL('image/png'), s: window.__game.snapshot() };
    });
    writeFileSync(join(outDir, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(brief(s)));
    log(`  ${name}`);
  };
  const close = makeClose(page, outDir, log);
  /** Abre o jogo com a query; `start` aperta `J` no título e espera a rodada começar. */
  const open = async (query, start = true) => {
    await page.goto(`${baseUrl}?debug&seed=1&${query}`, { waitUntil: 'load' });
    // `polling` em ms: o padrão do puppeteer espera pelo `requestAnimationFrame`, que aqui está parado.
    const ready = () => {
      try {
        return typeof window.__game.snapshot() === 'object';
      } catch {
        return false;
      }
    };
    await page.waitForFunction(ready, { timeout: 15_000, polling: 50 });
    let s = await kit.snap(20);
    if (!start) return s;
    await kit.tap('KeyJ');
    s = await kit.snap(50);
    assert(s.run.state === 'roundActive', `a run deveria começar: ${JSON.stringify(s.run)}`);
    return s;
  };
  /** Aperta as teclas por um quadro e solta. */
  const press = async (...keys) => {
    for (const k of keys) await kit.down(k);
    const s = await kit.frame();
    for (const k of keys.toReversed()) await kit.up(k);
    return s;
  };
  /**
   * Passa até `max` quadros; cada gatilho `[nome, quando(snapshot), depois]` grava a captura `depois` quadros após a
   * primeira vez que `quando` vale. Para quando todos gravaram; falha se algum nunca valeu.
   */
  const watch = async (max, triggers) => {
    const due = triggers.map(([name, when, after = 0]) => ({ name, when, after, at: null, done: false }));
    let s = await kit.snap(0);
    for (let i = 0; i <= max && due.some((d) => !d.done); i++) {
      for (const d of due) {
        if (d.done) continue;
        if (d.at === null && d.when(s)) d.at = i + d.after;
        if (d.at === i) {
          await shot(d.name);
          d.done = true;
        }
      }
      if (due.some((d) => !d.done)) s = await kit.frame();
    }
    const missing = due.filter((d) => !d.done).map((d) => d.name);
    assert(missing.length === 0, `nunca aconteceu: ${missing.join(', ')}`);
    return s;
  };
  const layer = (name) => (s) => s.fx.layers.includes(name);
  /** Anda `ms` e grava a captura. */
  const at = async (ms, name) => {
    await kit.snap(ms);
    await shot(name);
  };
  /** Aperta a tecla de debug a cada `ms` até `done(snapshot)` valer (no máximo 80 vezes); devolve o snapshot. */
  const mash = async (code, ms, done) => {
    let s = await kit.snap(0);
    for (let i = 0; i < 80 && !done(s); i++) {
      await page.keyboard.press(code);
      s = await kit.snap(ms);
    }
    return s;
  };
  return { ...kit, page, shot, close, at, mash, open, press, watch, layer, assert };
}

const SCENARIOS = {
  async basico(t) {
    await t.open(BASE, false);
    await t.shot('01-titulo');
    await t.tap('KeyJ');
    await t.at(50, '02-inicio-rodada');
    await t.at(500, '03-idle');
    await t.down('KeyD');
    await t.at(250, '04-corrida-a');
    await t.at(100, '04-corrida-b');
    await t.up('KeyD');
    await t.snap(300);
    await t.press('Space');
    let rose = false;
    const apex = (s) => (rose ||= s.player.vy < -1) && s.player.vy >= 0;
    await t.watch(90, [['05-pulo-apice', apex]]);
  },
  async golpes(t) {
    const hit = (s) => s.fx.lastImpact !== null;
    const strike = async (...keys) => {
      await t.open(BASE);
      await t.approach(36);
      await t.press(...keys);
    };
    await strike('KeyJ');
    await t.watch(90, [
      ['10-jab-acerto', hit],
      ['10-jab-acerto+3', hit, 3],
    ]);
    await strike('KeyK');
    await t.watch(90, [
      ['11-forte-ativo', (s) => s.fx.trails.length > 0, 1],
      ['11-forte-acerto', hit],
      ['11-forte-acerto+5', hit, 5],
    ]);
    await strike('KeyS', 'KeyK');
    await t.watch(90, [['12-decisivo-quadro-1', hit]]);
    await t.shot('12-decisivo-quadro-2');
    await t.shot('12-decisivo-quadro-3-depois');
    await t.frame();
    await t.shot('12-decisivo+1');
    await t.at(80, '12-decisivo+6');
  },
  async defesa(t) {
    await t.open(BASE);
    await t.down('KeyU');
    await t.at(120, '20-guarda');
    await t.up('KeyU');
    await t.snap(100);
    await t.press('KeyQ');
    await t.watch(30, [
      ['21-esquiva-rastro', t.layer('dodge.trail'), 3],
      ['21-esquiva-rastro+8', t.layer('dodge.trail'), 8],
    ]);
    await t.snap(600);
    await t.page.keyboard.press('Digit4');
    await t.frame();
    await t.shot('22-dano-flash');
    for (const n of [2, 4, 6, 8]) await t.at(32, `22-dano-invulneravel+${n}`);
    // Parry: o golpe do inimigo conecta ~28 quadros depois de ele chegar a 40 px (`startDuel`).
    await t.open(BASE);
    await t.startDuel();
    await t.snap(24 * 16);
    const before = t.count(await t.snap(0), 'parry');
    await t.press('KeyU');
    const parried = (s) => t.count(s, 'parry') > before;
    await t.watch(40, [
      ['23-parry', parried],
      ['23-parry+3', parried, 3],
    ]);
  },
  async cura(t) {
    let s = await t.open('enemyGuard=0&heal=1&noshop=1');
    await t.page.keyboard.press('Digit4');
    s = await t.snap(50);
    s = await t.mash('Digit2', 300, (x) => x.pickups.some((p) => p.kind === 'heal'));
    const heal = s.pickups.find((p) => p.kind === 'heal');
    t.assert(heal, 'esperava uma gota de cura');
    await t.shot('30-gota-de-cura');
    for (let i = 0; i < 600 && s.player.flash !== 'G'; i++) {
      const dir = heal.x >= s.player.x ? 'KeyD' : 'KeyA';
      await t.down(dir);
      s = await t.frame();
      await t.up(dir);
    }
    t.assert(s.player.flash === 'G', 'o flash de cura não acendeu');
    await t.shot('31-cura-flash');
  },
  async inimigo(t) {
    await t.open(BASE);
    await t.startDuel();
    await t.watch(120, [
      ['40-telegrafo', (s) => t.nearest(s)?.telegraph != null, 2],
      ['41-compromisso-flash', (s) => t.nearest(s)?.commitFlash != null],
    ]);
    await t.mash('Digit2', 100, (x) => x.enemies.some((e) => e.state === 'deadRagdoll'));
    const ragdoll = (x) => x.enemies.some((e) => e.ragdollVisible === true);
    const dissolving = (x) => x.enemies.some((e) => e.state === 'dissolving');
    await t.watch(400, [
      ['42-ragdoll', ragdoll],
      ['42-ragdoll+2', ragdoll, 2],
      ['42-ragdoll+10', ragdoll, 10],
      ['42-ragdoll+40', ragdoll, 40],
      ['43-ragdoll-dissolvendo', dissolving, 8],
      ['43-ragdoll-dissolvendo+30', dissolving, 30],
    ]);
    await t.open('enemyGuard=1&noshop=1&maxAlive=1&shove=0');
    await t.approach(36);
    for (let i = 0; i < 12 && !t.nearest(await t.snap(0))?.guarding; i++) await t.tap('KeyJ');
    await t.watch(60, [['44-inimigo-guarda', (x) => t.nearest(x)?.guarding === true, 1]]);
  },
  async chefe(t) {
    await t.open('enemyGuard=0&round=5');
    const kind = (k) => (s) => s.projectiles.some((p) => p.kind === k);
    await t.watch(2500, [
      ['50-chefe-intro', (s) => s.boss?.state === 'intro', 20],
      ['51-chefe-preparo', (s) => s.boss?.state === 'windup', 6],
      ['52-chefe-investida', (s) => s.boss?.state === 'charge', 4],
      ['54-chefe-onda', kind('shockwave'), 4],
    ]);
    // A rajada só entra no ciclo da fase 2: o golpe de teste forte leva o chefe até lá.
    await t.mash('Digit2', 200, (x) => x.boss.phase >= 2);
    await t.watch(2500, [['53-chefe-projetil', kind('projectile'), 6]]);
  },
  async tecnicas(t) {
    await t.open('enemyGuard=0&noshop=1&fxlab');
    await t.snap(300);
    const cast = async (digit, max, triggers) => {
      await t.page.keyboard.press(`Digit${digit}`);
      await t.watch(max, triggers);
      let s = await t.snap(0);
      for (let i = 0; i < 60 && (s.tech.cast !== null || s.fx.live > 0); i++) s = await t.snap(100);
    };
    await cast(1, 60, [['60-aura', t.layer('cast.aura'), 8]]);
    await cast(2, 120, [
      ['61-divergente-punho', t.layer('divergente.fistAura'), 2],
      ['61-divergente-anel', t.layer('divergente.ring'), 2],
      ['61-divergente-explosao', t.layer('divergente.burst'), 2],
    ]);
    await cast(3, 200, [
      ['62-kokusen-negativo', t.layer('kokusen.invert'), 1],
      ['62-kokusen-negativo+4', t.layer('kokusen.invert'), 4],
      ['62-kokusen-duotone', t.layer('kokusen.duotone'), 1],
      ['62-kokusen-duotone+6', t.layer('kokusen.duotone'), 6],
      ['62-kokusen-depois', (s) => s.hud.kokusenCard !== null && !s.fx.layers.some((l) => /invert|duotone/.test(l)), 4],
    ]);
    await cast(4, 240, [
      ['63-vermelho-carga', (s) => s.fx.red.glow.active, 4],
      ['63-vermelho-carga+08', (s) => s.fx.red.glow.active, 8],
      ['63-vermelho-carga+14', (s) => s.fx.red.glow.active, 14],
      ['63-vermelho-carga+20', (s) => s.fx.red.glow.active, 20],
      ['63-vermelho-voo', t.layer('red.trail'), 3],
      ['63-vermelho-detonacao', t.layer('red.flashCore'), 1],
      ['63-vermelho-detonacao+8', t.layer('red.flashCore'), 8],
    ]);
    await cast(5, 200, [
      ['64-azul', t.layer('blue.core'), 10],
      ['64-azul+40', t.layer('blue.core'), 40],
    ]);
    await cast(6, 120, [
      ['65-desmantelar-linha', t.layer('cut.line'), 1],
      ['65-desmantelar-corte', t.layer('cut.split'), 2],
    ]);
  },
  async telas(t) {
    let s = await t.open('enemyGuard=0&fragments=200&tech=vermelho,divergente&maxAlive=3');
    await t.snap(2500);
    await t.page.keyboard.press('Digit1');
    await t.snap(100);
    await t.page.keyboard.press('Digit1');
    await t.at(60, '70-hud-barras');
    s = await t.mash('Digit2', 300, (x) => x.run.state === 'shop');
    t.assert(s.run.state === 'shop', `a loja deveria abrir: ${JSON.stringify(s.run)}`);
    await t.at(100, '71-loja-abrindo');
    await t.at(900, '71-loja');
    await t.tap('KeyD');
    await t.tap('KeyJ');
    await t.at(500, '71-loja-comprou');
    await t.open(BASE);
    await t.snap(400);
    await t.page.keyboard.press('Digit3');
    await t.at(100, '72-morte');
    await t.watch(300, [['73-game-over', (x) => x.run.state === 'gameOver', 70]]);
  },
  ...hdScenarios(BASE),
  ...fxScenarios(BASE),
};

const freePort = () =>
  new Promise((ok, fail) => {
    const srv = net.createServer().once('error', fail);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => ok(port));
    });
  });

async function startPreview() {
  const port = await freePort();
  const baseUrl = `http://localhost:${port}/`;
  const server = spawn(`npx vite preview --port ${port} --strictPort`, { cwd: root, stdio: 'ignore', shell: true });
  const kill = () => {
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else server.kill();
  };
  for (let i = 0; i < 120; i++) {
    const ok = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) }).then(
      (r) => r.ok,
      () => false,
    );
    if (ok) return { baseUrl, kill };
    await new Promise((r) => setTimeout(r, 250));
  }
  kill();
  throw new Error(`vite preview não respondeu em ${baseUrl}`);
}

async function runScenario(browser, baseUrl, name) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(initPage, FLAT_RANDOM);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e?.stack ?? String(e)));
  try {
    await SCENARIOS[name](makeTools(page, baseUrl, console.log));
    if (errors.length > 0) throw new Error(`erros na página: ${errors.join(' | ')}`);
    return true;
  } catch (err) {
    console.log(`FALHA ${name}: ${err instanceof Error ? err.message : err}`);
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const edge = findEdge(process.env.EDGE_PATH, DEFAULT_EDGE_PATHS, existsSync);
  if (!edge) throw new Error('Edge não encontrado (defina EDGE_PATH).');
  if (!skipBuild && spawnSync('npm run build', { cwd: root, stdio: 'inherit', shell: true }).status !== 0)
    throw new Error('Build falhou.');
  mkdirSync(outDir, { recursive: true });
  const { baseUrl, kill } = await startPreview();
  const browser = await puppeteer.launch({ executablePath: edge, headless: true, args: [...GL_ARGS, '--no-sandbox'] });
  let failed = 0;
  try {
    for (const name of Object.keys(SCENARIOS).filter((n) => n.includes(filter))) {
      console.log(`> ${name}`);
      if (!(await runScenario(browser, baseUrl, name))) failed++;
    }
  } finally {
    await browser.close().catch(() => {});
    kill();
  }
  console.log(failed === 0 ? `capturas em ${outDir}` : `${failed} cenário(s) falharam`);
  process.exit(failed === 0 ? 0 : 1);
}

await main();
