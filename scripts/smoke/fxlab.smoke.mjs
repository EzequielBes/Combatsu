// Laboratório de efeitos (FXL-01..09) com `?debug&seed=1&noshop=1&fxlab`: sem ondas, bonecos de treino, teclas
// 1-6 disparando cada efeito sem gastar energia nem recarga, tecla 0 alternando a câmera lenta, legenda no HUD.
// Salva uma captura de cada efeito (fora do repo) para o UAT visual.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOT_DIR = 'C:/Users/Usuario/AppData/Local/Temp/claude/C--Users-Usuario-documents-surgue/fc11ceb2-8480-4cb5-a593-ee9b3e9fd301/scratchpad/fxlab';
const LEGEND = '1 aura · 2 divergente · 3 kokusen · 4 vermelho · 5 azul · 6 corte · 0 lento';

export default async function ({ page, baseUrl, assert }) {
  mkdirSync(SHOT_DIR, { recursive: true });

  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const frame = () => stepAndSnap(16);
  const waitReady = () =>
    page.waitForFunction(
      () => {
        try {
          return typeof window.__game.snapshot === 'function';
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );

  await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=1&noshop=1&fxlab`, { waitUntil: 'load' });
  await waitReady();
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap = await stepAndSnap(300);
  assert(snap.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(snap.run)}`);

  // FXL-01: nenhuma onda nasce no fxlab.
  assert(snap.enemies.length === 0, `FXL-01: não deveria haver inimigos: ${JSON.stringify(snap.enemies)}`);
  snap = await stepAndSnap(2000);
  assert(snap.enemies.length === 0, `FXL-01: nenhuma onda deveria nascer depois de 2s: ${JSON.stringify(snap.enemies)}`);

  // FXL-05/06: 3 bonecos no chão principal, nos offsets certos, com hp cheio.
  assert(snap.fxlab, 'snapshot.fxlab deveria existir em ?fxlab');
  assert(snap.fxlab.dummies.length === 3, `FXL-05: esperava 3 bonecos: ${JSON.stringify(snap.fxlab.dummies)}`);
  const spawnX = snap.level.playerSpawn.x;
  const offsets = snap.fxlab.dummies.map((d) => Math.round(d.x - spawnX)).sort((a, b) => a - b);
  assert(JSON.stringify(offsets) === JSON.stringify([120, 200, 280]), `FXL-05: offsets errados: ${JSON.stringify(offsets)}`);
  assert(snap.fxlab.dummies.every((d) => d.hp === d.maxHp), `pré-condição: bonecos deveriam começar cheios: ${JSON.stringify(snap.fxlab.dummies)}`);

  // FXL-04/08: legenda exata e rótulo de velocidade em 1x.
  assert(snap.fxlab.legend === LEGEND, `FXL-04: legenda errada: ${snap.fxlab.legend}`);
  assert(snap.fxlab.speedLabel === 'velocidade: 1x', `FXL-08: rótulo errado: ${snap.fxlab.speedLabel}`);

  const assertEnergyAndCooldownIntact = (s) => {
    assert(s.ce.cur === s.ce.max, `FXL-07: energia deveria continuar no teto: ${JSON.stringify(s.ce)}`);
    const slot0 = s.tech.slots[0];
    assert(!slot0 || slot0.cooldownMs === 0, `FXL-09: recarga do slot 0 deveria continuar zerada: ${JSON.stringify(slot0)}`);
  };

  // `step`/`headlessStep` nunca desenham (FND-22); `render()` (T31) desenha o quadro atual sem andar o relógio.
  const renderAndShoot = async (fileName) => {
    await page.evaluate(() => window.__game.render());
    await page.screenshot({ path: join(SHOT_DIR, fileName) });
  };

  const shoot = async (n, ms) => {
    await page.keyboard.press(`Digit${n}`, { delay: 30 });
    let last = snap;
    const seenLayers = new Set();
    for (let i = 0; i < Math.ceil(ms / 16); i++) {
      last = await frame();
      for (const l of last.fx.layers) seenLayers.add(l);
      assertEnergyAndCooldownIntact(last);
    }
    snap = last;
    return seenLayers;
  };

  // Tecla 1: só a aura da conjuração (FXL-02), sem gastar nada nem tocar em nenhum boneco.
  {
    const layers = await shoot(1, 300);
    assert(layers.has('cast.aura'), `FXL-02 (tecla 1): esperava cast.aura: ${JSON.stringify([...layers])}`);
    await renderAndShoot('1-aura.png');
  }
  await stepAndSnap(300); // deixa a aura da tecla 1 sumir antes da próxima tecla.

  // Tecla 2: Punho Divergente completo (selo, 1º e 2º impacto) no boneco mais próximo.
  {
    const layers = await shoot(2, 700);
    assert(layers.has('divergente.fistAura'), `FXL-02 (tecla 2): esperava divergente.fistAura: ${JSON.stringify([...layers])}`);
    assert(layers.has('divergente.echo') && layers.has('divergente.ring'), `FXL-02 (tecla 2): esperava echo/ring: ${JSON.stringify([...layers])}`);
    assert(layers.has('divergente.burst') || snap.events.includes('divergent2'), `FXL-02 (tecla 2): o 2º impacto nunca aconteceu: ${JSON.stringify(snap.events)}`);
    await renderAndShoot('2-divergente.png');
  }
  for (let i = 0; i < 30 && snap.tech.cast !== null; i++) snap = await stepAndSnap(100);

  // Tecla 3: mesmo Punho Divergente, mas o laboratório aperta de novo sozinho na janela certa - vira Kokusen.
  {
    const kokusenBefore = snap.events.filter((e) => e === 'kokusen').length;
    const layers = await shoot(3, 900);
    assert(layers.has('kokusen.invert') || layers.has('kokusen.bolts'), `FXL-02 (tecla 3): esperava camadas do Kokusen: ${JSON.stringify([...layers])}`);
    let landed = snap.events.filter((e) => e === 'kokusen').length > kokusenBefore;
    for (let i = 0; i < 30 && !landed; i++) {
      snap = await frame();
      landed = snap.events.filter((e) => e === 'kokusen').length > kokusenBefore;
    }
    assert(landed, `FXL-02 (tecla 3): o Kokusen sem timing nunca aconteceu: ${JSON.stringify(snap.events)}`);
    await renderAndShoot('3-kokusen.png');
  }
  for (let i = 0; i < 40 && snap.tech.cast !== null; i++) snap = await stepAndSnap(100);

  // Tecla 4: Vermelho - carga, soltura e detonação no boneco mais próximo.
  {
    const layers = await shoot(4, 900);
    assert(layers.has('red.orb'), `FXL-02 (tecla 4): esperava red.orb na carga: ${JSON.stringify([...layers])}`);
    assert(layers.has('red.trail') || layers.has('red.flashCore'), `FXL-02 (tecla 4): esperava voo ou detonação do orbe: ${JSON.stringify([...layers])}`);
    await renderAndShoot('4-vermelho.png');
  }
  for (let i = 0; i < 40 && snap.tech.cast !== null; i++) snap = await stepAndSnap(100);

  // Tecla 5: Azul - esfera puxando o boneco mais próximo.
  {
    const layers = await shoot(5, 600);
    assert(layers.has('blue.core'), `FXL-02 (tecla 5): esperava blue.core: ${JSON.stringify([...layers])}`);
    await renderAndShoot('5-azul.png');
  }
  snap = await stepAndSnap(1500); // espera a esfera azul implodir (1400 ms) antes da próxima tecla.
  for (let i = 0; i < 40 && snap.tech.cast !== null; i++) snap = await stepAndSnap(100);

  // Tecla 6: Desmantelar - 3 cortes no boneco mais próximo.
  {
    const layers = await shoot(6, 400);
    assert(layers.has('cut.line'), `FXL-02 (tecla 6): esperava cut.line: ${JSON.stringify([...layers])}`);
    await renderAndShoot('6-corte.png');
  }
  for (let i = 0; i < 40 && snap.tech.cast !== null; i++) snap = await stepAndSnap(100);

  // FXL-03: a tecla 0 alterna a câmera lenta - o selo do Divergente (60 ms) não termina em 60 ms reais a 0.25x.
  await page.keyboard.press('Digit0', { delay: 30 });
  snap = await frame();
  assert(snap.fxlab.timeScale === 0.25, `FXL-03: timeScale deveria ser 0.25: ${snap.fxlab.timeScale}`);
  assert(snap.fxlab.speedLabel === 'velocidade: 0.25x', `FXL-08: rótulo deveria mudar: ${snap.fxlab.speedLabel}`);
  await page.keyboard.press('Digit2', { delay: 30 });
  snap = await stepAndSnap(60); // 60 ms reais == 15 ms de jogo a 0.25x - bem menos que os 60 ms do selo.
  assert(snap.tech.cast && snap.tech.cast.state === 'sign', `FXL-03: a 0.25x, 60 ms reais não deveriam terminar o selo (60 ms): ${JSON.stringify(snap.tech.cast)}`);
  // Volta a 1x e limpa a conjuração em curso antes de terminar (higiene, não é parte do AC).
  await page.keyboard.press('Digit0', { delay: 30 });
  snap = await frame();
  assert(snap.fxlab.timeScale === 1 && snap.fxlab.speedLabel === 'velocidade: 1x', `FXL-03: deveria voltar a 1x: ${JSON.stringify(snap.fxlab)}`);
}
