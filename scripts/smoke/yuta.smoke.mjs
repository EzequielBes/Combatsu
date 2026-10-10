// Protagonista novo (`?debug&hd=1`, folha `player-yuta`): a guarda parada e a corrida saem da folha de quadros
// desenhados, a 2 texels por px de mundo, assim como os golpes que ela já tem; o resto continua na folha `player-hd`.
// Com `yuta=0` tudo volta à folha HD.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeKit } from './fight-kit.mjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.fable-out');

export default async function (ctx) {
  const { page } = ctx;
  const { assert, frame, down, up, boot, settle } = makeKit(ctx);
  mkdirSync(OUT_DIR, { recursive: true });
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

  // Parado: a guarda da folha nova.
  for (let i = 0; i < 30; i++) s = await frame();
  assert(
    s.player.sheet === 'player-yuta' && s.player.frame.startsWith('idle-'),
    `a guarda deveria usar player-yuta/idle-*: ${s.player.sheet}/${s.player.frame}`,
  );
  await shoot('yuta-idle.png');

  // Corrida: a arrancada e depois os 4 quadros `run-*` da folha nova, em menos de 1 s.
  await down('KeyD');
  const seen = [];
  for (let i = 0; i < 60; i++) {
    s = await frame();
    assert(s.player.sheet === 'player-yuta', `correndo deveria usar player-yuta: ${s.player.sheet}/${s.player.frame}`);
    if (!seen.includes(s.player.frame)) seen.push(s.player.frame);
    if (i === 20) await shoot('yuta-corrida.png');
  }
  await up('KeyD');
  // Ao soltar, a freada (`run-stop-*`) toca antes de voltar à guarda.
  const stop = [];
  for (let i = 0; i < 30; i++) {
    s = await frame();
    if (s.player.frame.startsWith('run-stop-') && !stop.includes(s.player.frame)) stop.push(s.player.frame);
    if (stop.length === 2 && i < 29) await shoot('yuta-freada.png');
  }
  assert(
    seen.some((f) => f.startsWith('run-start-')),
    `a corrida deveria começar pela arrancada: ${seen.join(',')}`,
  );
  assert(stop.length >= 2, `ao parar deveria tocar a freada: ${stop.join(',')} (${s.player.frame})`);
  assert(
    seen.length >= 6 && seen.every((f) => f.startsWith('run-')),
    `a corrida deveria passar pela arrancada e pelos 4 quadros run-*: ${seen.join(',')}`,
  );
  s = await settle();

  // O jab sai da folha nova (antecipação e impacto) e depois volta à guarda nova.
  await down('KeyJ');
  const jab = [];
  for (let i = 0; i < 8; i++) {
    s = await frame();
    if (s.player.sheet === 'player-yuta' && s.player.frame.startsWith('jab-') && !jab.includes(s.player.frame))
      jab.push(s.player.frame);
    if (s.player.frame === 'jab-hit') await shoot('yuta-jab.png');
  }
  await up('KeyJ');
  assert(jab.includes('jab-hit'), `o jab deveria mostrar player-yuta/jab-hit: ${jab.join(',')} (${s.player.frame})`);
  s = await settle();

  // Chute (K) e pulo também saem da folha nova. A espera deixa a janela do combo do jab fechar: dentro dela o K
  // seria a joelhada.
  for (let i = 0; i < 60; i++) s = await frame();
  await down('KeyK');
  let kick = false;
  for (let i = 0; i < 20; i++) {
    s = await frame();
    if (s.player.sheet === 'player-yuta' && s.player.frame === 'chuteFrontal-hit') {
      if (!kick) await shoot('yuta-chute.png');
      kick = true;
    }
  }
  await up('KeyK');
  assert(kick, `o chute deveria mostrar player-yuta/chuteFrontal-hit: ${s.player.sheet}/${s.player.frame}`);
  s = await settle();
  await down('ArrowUp');
  let air = false;
  for (let i = 0; i < 12; i++) {
    s = await frame();
    if (s.player.sheet === 'player-yuta' && /^(jump|apex|fall)-/.test(s.player.frame)) {
      if (!air) await shoot('yuta-pulo.png');
      air = true;
    }
  }
  await up('ArrowUp');
  assert(air, `o pulo deveria usar player-yuta/jump-*: ${s.player.sheet}/${s.player.frame}`);
  // Gancho ascendente (W + J): antecipação, pico e a volta própria, todos na folha nova.
  s = await settle();
  for (let i = 0; i < 60; i++) s = await frame();
  await down('KeyW');
  await down('KeyJ');
  s = await frame();
  await up('KeyJ');
  await up('KeyW');
  const upper = [];
  for (let i = 0; i < 60; i++) {
    if (s.player.move === 'ganchoAscendente') {
      assert(
        s.player.sheet === 'player-yuta',
        `o gancho deveria usar player-yuta: ${s.player.sheet}/${s.player.frame}`,
      );
      if (!upper.includes(s.player.frame)) upper.push(s.player.frame);
      if (s.player.frame === 'ganchoAscendente-hit' && upper.length === 2) await shoot('yuta-gancho.png');
    }
    s = await frame();
  }
  assert(
    ['ganchoAscendente-wind', 'ganchoAscendente-hit', 'ganchoAscendente-recover'].every((f) => upper.includes(f)),
    `o gancho deveria passar por wind, hit e recover: ${upper.join(',')}`,
  );
  s = await settle();

  // Guarda (U) parado: o quadro `guard` ou `parry` da folha nova.
  await down('KeyU');
  let guard = false;
  for (let i = 0; i < 20; i++) {
    s = await frame();
    if (s.player.sheet === 'player-yuta' && (s.player.frame === 'guard' || s.player.frame === 'parry')) guard = true;
    if (i === 15) await shoot('yuta-guarda.png');
  }
  await up('KeyU');
  assert(guard, `a guarda deveria usar player-yuta/guard: ${s.player.sheet}/${s.player.frame}`);

  // Chute correndo (direção + K = chute de empurrão): sai da folha nova, como um chute voador.
  s = await settle();
  for (let i = 0; i < 60; i++) s = await frame();
  await down('KeyD');
  for (let i = 0; i < 20; i++) s = await frame();
  await down('KeyK');
  const runKick = [];
  for (let i = 0; i < 30; i++) {
    s = await frame();
    if (s.player.move === 'chuteEmpurrao') {
      assert(
        s.player.sheet === 'player-yuta',
        `o chute correndo deveria usar player-yuta: ${s.player.sheet}/${s.player.frame}`,
      );
      if (!runKick.includes(s.player.frame)) runKick.push(s.player.frame);
      if (s.player.frame === 'chuteEmpurrao-hit' && runKick.length === 2) await shoot('yuta-chute-correndo.png');
    }
    if (i === 2) await up('KeyK');
  }
  await up('KeyD');
  assert(
    runKick.includes('chuteEmpurrao-hit'),
    `correr e chutar deveria mostrar chuteEmpurrao-hit: ${runKick.join(',')} (${s.player.move}/${s.player.frame})`,
  );

  // Objeto leve na mão (a garrafa do mapa): parado segura na folha nova, e o golpe (J) sai dela também.
  await boot('hd=1&enemyGuard=0&noshop=1');
  s = await settle();
  const bottle = s.worldProps.find((p) => p.key === 'bottle');
  assert(bottle, `esperava a garrafa do mapa em worldProps: ${JSON.stringify(s.worldProps)}`);
  for (let i = 0; i < 400 && Math.abs(s.player.x - bottle.x) > 6; i++) {
    const dir = bottle.x >= s.player.x ? 'KeyD' : 'KeyA';
    await down(dir);
    s = await frame();
    await up(dir);
  }
  await down('KeyE');
  for (let i = 0; i < 4; i++) s = await frame();
  await up('KeyE');
  for (let i = 0; i < 50; i++) s = await frame();
  assert(s.hud.heldItem, `deveria ter pegado a garrafa: ${JSON.stringify(s.hud.heldItem)} em x=${s.player.x}`);
  assert(
    s.player.sheet === 'player-yuta' && s.player.frame.startsWith('carry-idle-'),
    `parado com a garrafa deveria usar player-yuta/carry-idle-*: ${s.player.sheet}/${s.player.frame}`,
  );
  await shoot('yuta-objeto.png');
  await down('KeyJ');
  const swing = [];
  for (let i = 0; i < 30; i++) {
    s = await frame();
    if (s.player.sheet === 'player-yuta' && s.player.frame.startsWith('swing-') && !swing.includes(s.player.frame)) {
      swing.push(s.player.frame);
      if (s.player.frame === 'swing-hit') await shoot('yuta-objeto-golpe.png');
    }
    if (i === 2) await up('KeyJ');
  }
  assert(
    swing.includes('swing-hit'),
    `o golpe com a garrafa deveria mostrar player-yuta/swing-hit: ${swing.join(',')}`,
  );

  // Correndo com a garrafa: a corrida com objeto da folha nova; lançar em corrida (E) toca a sequência própria.
  s = await settle();
  for (let i = 0; i < 40; i++) s = await frame();
  await down('KeyA');
  const carry = [];
  for (let i = 0; i < 40; i++) {
    s = await frame();
    if (s.player.sheet === 'player-yuta' && s.player.frame.startsWith('carry-run-') && !carry.includes(s.player.frame))
      carry.push(s.player.frame);
    if (i === 25) await shoot('yuta-objeto-corrida.png');
  }
  assert(carry.length >= 4, `correndo com a garrafa deveria passar pelos quadros carry-run-*: ${carry.join(',')}`);
  await down('KeyE');
  s = await frame();
  await up('KeyE');
  const thrown = [];
  for (let i = 0; i < 14; i++) {
    s = await frame();
    if (s.player.frame.startsWith('throw-run-') && !thrown.includes(s.player.frame)) thrown.push(s.player.frame);
  }
  await up('KeyA');
  assert(thrown.length >= 2, `lançar correndo deveria tocar throw-run-*: ${thrown.join(',')} (${s.player.frame})`);

  // Objeto pesado (a cadeira do mapa): a pegada de duas mãos e o golpe (J) também saem da folha nova.
  await boot('hd=1&enemyGuard=0&noshop=1');
  s = await settle();
  const chair = s.worldProps.find((p) => p.key === 'chair');
  assert(chair, `esperava a cadeira do mapa em worldProps: ${JSON.stringify(s.worldProps)}`);
  for (let i = 0; i < 400 && Math.abs(s.player.x - chair.x) > 6; i++) {
    const dir = chair.x >= s.player.x ? 'KeyD' : 'KeyA';
    await down(dir);
    s = await frame();
    await up(dir);
  }
  await down('KeyE');
  for (let i = 0; i < 4; i++) s = await frame();
  await up('KeyE');
  for (let i = 0; i < 50; i++) s = await frame();
  assert(
    s.player.sheet === 'player-yuta' && s.player.frame.startsWith('heavy-carry-idle-'),
    `parado com a cadeira deveria usar player-yuta/heavy-carry-idle-*: ${s.player.sheet}/${s.player.frame}`,
  );
  await shoot('yuta-pesado.png');
  await down('KeyJ');
  const heavy = [];
  for (let i = 0; i < 40; i++) {
    s = await frame();
    if (
      s.player.sheet === 'player-yuta' &&
      s.player.frame.startsWith('heavy-swing-') &&
      !heavy.includes(s.player.frame)
    ) {
      heavy.push(s.player.frame);
      if (s.player.frame === 'heavy-swing-wind') await shoot('yuta-pesado-wind.png');
      if (s.player.frame === 'heavy-swing-hit') await shoot('yuta-pesado-golpe.png');
    }
    if (i === 2) await up('KeyJ');
  }
  assert(
    heavy.includes('heavy-swing-hit'),
    `o golpe com a cadeira deveria mostrar player-yuta/heavy-swing-hit: ${heavy.join(',')} (${s.player.frame})`,
  );

  // Técnica (L, com `tech=vermelho`): o selo, a carga e o disparo saem da folha nova; a captura do disparo mostra o efeito na mão.
  await boot('hd=1&tech=vermelho&enemyGuard=0&noshop=1');
  s = await settle();
  for (let i = 0; i < 10; i++) s = await frame();
  await down('KeyL');
  s = await frame();
  await up('KeyL');
  const cast = [];
  let castShot = false;
  for (let i = 0; i < 120; i++) {
    if (/-(sign|charge|release|recover)$/.test(s.player.frame)) {
      assert(
        s.player.sheet === 'player-yuta',
        `a conjuração deveria usar player-yuta: ${s.player.sheet}/${s.player.frame}`,
      );
      if (!cast.includes(s.player.frame)) cast.push(s.player.frame);
      if (!castShot && /-(charge|release)$/.test(s.player.frame) && cast.length >= 2) {
        castShot = true;
        await shoot('yuta-tecnica.png');
      }
    }
    s = await frame();
  }
  assert(cast.length >= 2, `a técnica deveria passar por pelo menos dois quadros de conjuração: ${cast.join(',')}`);

  // `yuta=0` desliga a folha nova.
  await boot('hd=1&yuta=0&enemyGuard=0&noshop=1');
  s = await settle();
  for (let i = 0; i < 10; i++) s = await frame();
  assert(s.player.sheet === 'player-hd', `com yuta=0 a guarda deveria usar player-hd: ${s.player.sheet}`);

  assert(errors.length === 0, `erros na página: ${errors.join(' | ')}`);
}
