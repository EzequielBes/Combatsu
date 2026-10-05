import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Cenários do corpo HD (`?hd=1`) para `tools/visual-shots.mjs`: o mesmo `t` (abrir, avançar, capturar) dos outros.

/** Grava só a região em volta do player, ampliada 3x (para conferir pose, mãos e objeto na mão). */
export const makeClose =
  (page, outDir, log) =>
  async (name, half = 72) => {
    const url = await page.evaluate(async (h) => {
      window.__game.render();
      // O canvas WebGL só guarda a imagem até o fim do quadro: exporta primeiro e recorta a partir da exportação.
      const full = new Image();
      full.src = document.querySelector('canvas').toDataURL('image/png');
      await full.decode();
      const s = window.__game.snapshot();
      const z = s.camera.zoom;
      // A câmera do Phaser amplia em volta do centro da tela: mundo -> tela desconta o scroll e meia tela.
      const cx = (s.player.x - s.camera.scroll.x - full.width / 2) * z + full.width / 2;
      const cy = (s.player.y - s.camera.scroll.y - full.height / 2) * z + full.height / 2;
      const out = document.createElement('canvas');
      out.width = out.height = h * 2 * 3;
      const ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(full, cx - h, cy - h * 1.45, h * 2, h * 2, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    }, half);
    writeFileSync(join(outDir, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    log(`  ${name}`);
  };

/** Os cenários HD; `base` são os parâmetros de URL comuns a todas as capturas. */
export const hdScenarios = (BASE) => ({
  async hd(t) {
    await t.open(`hd=1&${BASE}&tech=vermelho`);
    await t.at(500, '80-hd-idle');
    await t.down('KeyD');
    await t.at(250, '81-hd-corrida-a');
    await t.at(100, '81-hd-corrida-b');
    await t.up('KeyD');
    await t.settle();
    await t.press('KeyW', 'KeyJ');
    await t.watch(80, [['82-hd-gancho', (s) => s.player.frame === 'ganchoAscendente@active-0']]);
    await t.settle();
    await t.tap('KeyL');
    await t.watch(240, [
      ['83-hd-vermelho-carga', (s) => s.fx.red.glow.active, 10],
      ['83-hd-vermelho-carga+16', (s) => s.fx.red.glow.active, 16],
      ['83-hd-vermelho-voo', t.layer('red.trail'), 3],
    ]);
  },
  // Punho Divergente com o corpo HD: a chama no punho no preparo, no soco e apagando na volta.
  async hdDivergente(t) {
    await t.open(`hd=1&${BASE}&tech=divergente`);
    await t.snap(500);
    await t.tap('KeyL');
    const frame = (name) => (s) => s.player.frame === name;
    await t.watch(120, [
      ['84-hd-divergente-charge', frame('divergente-charge'), 3],
      ['84-hd-divergente-release', frame('divergente-release'), 2],
      ['84-hd-divergente-release+4', frame('divergente-release'), 4],
      ['84-hd-divergente-recover', frame('divergente-recover'), 3],
      ['84-hd-divergente-recover+9', frame('divergente-recover'), 9],
    ]);
  },
  // Objeto na mão com o corpo HD: pega a cadeira (pesada) e depois a garrafa (leve); parado, correndo e batendo.
  async hdCarry(t) {
    let s = await t.open(`hd=1&${BASE}`);
    const grab = async (key) => {
      const prop = s.worldProps.find((p) => p.key === key);
      t.assert(prop, `sem ${key} no mapa`);
      for (let i = 0; i < 120 && Math.abs(s.player.x - prop.x) > 4; i++) {
        const dir = prop.x >= s.player.x ? 'KeyD' : 'KeyA';
        await t.down(dir);
        s = await t.snap(40);
        await t.up(dir);
      }
      await t.tap('KeyE');
      s = await t.snap(300);
    };
    const show = async (tag) => {
      await t.close(`85-hd-${tag}-parado`);
      await t.down('KeyD');
      await t.snap(220);
      await t.close(`85-hd-${tag}-correndo`);
      await t.up('KeyD');
      await t.snap(300);
      await t.tap('KeyJ');
      for (const ms of [50, 60, 60, 60, 80]) {
        await t.snap(ms);
        await t.close(`85-hd-${tag}-golpe-${ms}`);
      }
      s = await t.snap(500);
    };
    await grab('chair');
    await show('cadeira');
    await t.down('KeyS');
    await t.tap('KeyE');
    await t.up('KeyS');
    s = await t.snap(300);
    await grab('bottle');
    await show('garrafa');
  },
});
