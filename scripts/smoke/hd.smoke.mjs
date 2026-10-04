// Spike de sprites em alta densidade (`?debug&hd=1`): canvas 1280x720, zoom do mundo 2 (vista de 640x360 px de mundo),
// idle e gancho ascendente na folha `player-hd`. Sem a chave nada disso muda (os outros smokes cobrem o caso normal).
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeKit } from './fight-kit.mjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.fable-out');

export default async function (ctx) {
  const { page } = ctx;
  const { assert, snap, frame, down, up, boot, settle } = makeKit(ctx);
  mkdirSync(OUT_DIR, { recursive: true });
  // Viewport do tamanho do canvas: o screenshot sai 1:1, sem o FIT do Phaser encolher a imagem.
  await page.setViewport({ width: 1280, height: 720 });
  /** `step` nunca desenha; `render()` pinta o quadro atual antes da captura. */
  const shoot = async (file) => {
    await page.evaluate(() => window.__game.render());
    await page.screenshot({ path: join(OUT_DIR, file) });
  };
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
  });

  await boot('hd=1&enemyGuard=0&noshop=1');
  let s = await settle();

  // Tela: canvas 1280x720, zoom 2, vista de mundo 640x360.
  const size = await page.evaluate(() => ({
    w: document.querySelector('canvas').width,
    h: document.querySelector('canvas').height,
  }));
  assert(size.w === 1280 && size.h === 720, `canvas deveria ser 1280x720: ${JSON.stringify(size)}`);
  assert(Math.abs(s.camera.zoom - 2) < 1e-9, `zoom do mundo deveria ser 2: ${s.camera.zoom}`);
  const viewW = s.camera.worldView.right - s.camera.worldView.left;
  assert(Math.abs(viewW - 640) < 1, `vista de mundo deveria ter ~640 px de largura: ${viewW}`);

  // Idle parado: textura player-hd e quadro idle-*.
  for (let i = 0; i < 30; i++) s = await frame();
  assert(
    s.player.sheet === 'player-hd' && s.player.frame.startsWith('idle-'),
    `idle deveria usar player-hd/idle-*: ${s.player.sheet}/${s.player.frame}`,
  );
  await shoot('hd-idle.png');

  // Gancho: W + J no mesmo frame, no chão. Passa pela sequência ganchoAscendente@* na folha HD e volta ao idle HD.
  await down('KeyW');
  await down('KeyJ');
  s = await frame();
  await up('KeyJ');
  await up('KeyW');
  const seen = [];
  let shot = false;
  for (let i = 0; i < 80; i++) {
    if (s.player.move === 'ganchoAscendente') {
      assert(
        s.player.sheet === 'player-hd' && s.player.frame.startsWith('ganchoAscendente@'),
        `gancho deveria usar player-hd/ganchoAscendente@*: ${s.player.sheet}/${s.player.frame}`,
      );
      if (!seen.includes(s.player.frame)) seen.push(s.player.frame);
      if (!shot && s.player.frame === 'ganchoAscendente@active-0') {
        shot = true;
        await shoot('hd-jogo.png');
      }
    }
    s = await frame();
  }
  assert(seen.length >= 4, `o gancho deveria passar por vários quadros HD: ${seen.join(',')}`);
  assert(shot, `o pico do gancho (ganchoAscendente@active-0) não apareceu: ${seen.join(',')}`);
  s = await settle();
  for (let i = 0; i < 10; i++) s = await frame();
  assert(
    s.player.sheet === 'player-hd' && s.player.frame.startsWith('idle-'),
    `depois do gancho deveria voltar ao idle HD: ${s.player.sheet}/${s.player.frame}`,
  );

  assert(errors.length === 0, `erros na página: ${errors.join(' | ')}`);
  void snap;
}
