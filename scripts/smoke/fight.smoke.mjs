// Golpes do jogador (MOV-02/03/05..11/13/17/18, AIR-02/05, SPC-01/02, CTL-03/06) com `?debug&seed=1&enemyGuard=0`:
// cada entrada do grafo por tecla, a sequência, o carregado, derrubar, lançar, voadora, palma e a cadeira.
// Lê `player.move`, `events`, `enemies[]`, `fx.layers` e `hud` do snapshot vivo; os valores vêm da spec.
import { makeKit } from './fight-kit.mjs';

export default async function (ctx) {
  const { assert, snap, frame, down, up, tap, count, boot, nearest, approach, settle } = makeKit(ctx);
  const moveEvents = (s) => s.events.filter((e) => e.startsWith('move:'));

  /** Aperta a combinação (teclas seguradas por um passo) e devolve o snapshot logo depois. */
  const press = async (keys, holdMs = 50) => {
    for (const k of keys) await down(k);
    const s = await snap(holdMs);
    for (const k of keys.slice().reverse()) await up(k);
    return s;
  };
  /**
   * AI-04 -> CMT-03/04: o golpe não cancela mais o ataque do inimigo comprometido, que bate de volta e deixa o jogador atordoado
   * (o aperto seguinte se perderia). Para checar só o golpe do jogador, derruba o inimigo com a tecla 2 do debug (PST-12).
   */
  const calm = async () => {
    await press(['Digit2']);
  };
  /** Começa um golpe pelas teclas e confere `player.move` e um único `move:<nome>` novo (MOV-13). */
  const expectMove = async (keys, name, req) => {
    await calm();
    await settle();
    const before = await snap(16);
    const s = await press(keys);
    assert(s.player.move === name, `${req}: esperava player.move=${name}, veio ${s.player.move}`);
    assert(
      count(s, `move:${name}`) === count(before, `move:${name}`) + 1,
      `MOV-13: esperava exatamente um move:${name}: ${JSON.stringify(moveEvents(s))}`,
    );
    assert(
      moveEvents(s).length === moveEvents(before).length + 1,
      `MOV-13: só um move:* novo esperado: ${JSON.stringify(moveEvents(s))}`,
    );
    return s;
  };

  // --- Grupo 1: painel, cadeira, jab e a sequência jab -> direto ---------------------------------------------------
  await boot('enemyGuard=0');
  let s = await snap(20);
  // MOV-18: sem golpe, `player.move` é null.
  assert(s.player.move === null, `MOV-18: sem golpe player.move deveria ser null: ${s.player.move}`);

  // CTL-06: o painel de controles lista as teclas de luta.
  assert(
    s.hud.controls.split('\n').includes('J leve · K forte · U guarda/parry · Espaço esquiva · E pegar'),
    `CTL-06: painel sem a linha de controles: ${JSON.stringify(s.hud.controls)}`,
  );

  // CTL-03: `E` com as mãos livres e a cadeira ao alcance segura o objeto.
  const chair = s.worldProps.find((p) => p.key === 'chair');
  assert(chair, `nenhuma cadeira no mapa: ${JSON.stringify(s.worldProps)}`);
  assert(s.hud.heldItem === null, `mãos deveriam estar livres: ${JSON.stringify(s.hud.heldItem)}`);
  for (let i = 0; i < 40 && Math.abs(s.player.x - chair.x) > 20; i++) {
    await down('KeyD');
    s = await snap(50);
    await up('KeyD');
  }
  s = await snap(60);
  assert(Math.abs(s.player.x - chair.x) <= 36, `CTL-03: jogador longe da cadeira (${s.player.x} vs ${chair.x})`);
  s = await tap('KeyE');
  assert(
    s.hud.heldItem !== null && s.hud.heldItem.name.length > 0,
    `CTL-03: E deveria segurar a cadeira: ${JSON.stringify(s.hud.heldItem)}`,
  );
  s = await tap('KeyE'); // CTL-07: arremessa e devolve as mãos livres
  assert(s.hud.heldItem === null, `E de novo deveria soltar o objeto: ${JSON.stringify(s.hud.heldItem)}`);

  await approach();
  // MOV-02/13/18: leve sem golpe em curso, no chão, começa o `jab`.
  await expectMove(['KeyJ'], 'jab', 'MOV-02');

  // MOV-03: um leve apertado dentro da recovery do jab vira o `direto` no fim dela, sem passar por `null`.
  await snap(70); // ~150 ms desde o aperto: dentro da recovery do jab
  const beforeDireto = await snap(16);
  s = await press(['KeyJ']);
  const seen = [s.player.move];
  for (let i = 0; i < 60 && s.player.move !== null && s.player.move !== 'direto'; i++) {
    s = await frame();
    seen.push(s.player.move);
  }
  assert(s.player.move === 'direto', `MOV-03: o follow-up deveria ser direto, sequência ${JSON.stringify(seen)}`);
  assert(!seen.includes(null), `MOV-03: não deveria haver pausa entre jab e direto: ${JSON.stringify(seen)}`);
  assert(seen[0] === 'jab', `MOV-03: o direto só entra no fim da recovery do jab: ${JSON.stringify(seen)}`);
  assert(
    count(s, 'move:direto') === count(beforeDireto, 'move:direto') + 1,
    `MOV-13: um move:direto esperado: ${JSON.stringify(moveEvents(s))}`,
  );

  // --- Grupo 2: chute frontal e soco baixo ------------------------------------------------------------------------
  await boot('enemyGuard=0');
  await approach();
  // MOV-05: forte sem golpe em curso.
  await expectMove(['KeyK'], 'chuteFrontal', 'MOV-05');
  // MOV-06: S + leve.
  await expectMove(['KeyS', 'KeyJ'], 'socoBaixo', 'MOV-06');

  // --- Grupo 3: rasteira derruba 900 ms (MOV-17, MOV-10) -----------------------------------------------------------
  await boot('enemyGuard=0');
  s = await approach();
  const victim = nearest(s);
  await settle();
  await down('KeyS');
  await snap(30);
  await down('KeyK');
  s = await frame();
  assert(s.player.move === 'rasteira', `MOV-17: S+K deveria começar rasteira: ${s.player.move}`);
  await up('KeyK');
  await up('KeyS');
  let downFrames = 0;
  let frozenFrames = 0;
  let sawDown = false;
  for (let i = 0; i < 200; i++) {
    s = await frame();
    const e = s.enemies.find((x) => x.id === victim.id);
    if (e.state === 'ragdollStun') {
      sawDown = true;
      downFrames++;
      // O hitstop do golpe pausa o relógio do inimigo: esses frames não contam como tempo de queda.
      if (s.hitstop.frozen) frozenFrames++;
    } else if (sawDown) break;
  }
  assert(sawDown, 'MOV-10: o inimigo deveria cair (ragdollStun) com a rasteira');
  assert(s.enemies.find((x) => x.id === victim.id).hp > 0, 'MOV-10: o alvo precisa sobreviver');
  const downMs = (downFrames - frozenFrames) * (1000 / 60);
  assert(Math.abs(downMs - 900) <= 40, `MOV-10: derrubado por ${downMs.toFixed(0)} ms, esperava 900`);

  // --- Grupo 4: gancho ascendente lança (MOV-07, MOV-11, AD-011) ----------------------------------------------------
  const launch = async (viaJumpCancel) => {
    await boot('enemyGuard=0');
    let st = await approach();
    const v = nearest(st);
    const baseY = v.y;
    await settle();
    const before = await snap(16);
    if (viaJumpCancel) {
      // AD-011: `W` pula e, com um leve dentro de 100 ms, o pulo vira gancho ascendente.
      await down('KeyW');
      await frame();
      await down('KeyJ');
    } else {
      // MOV-07 literal: `W` segurado e o leve apertado no mesmo frame, no chão.
      await down('KeyW');
      await down('KeyJ');
    }
    st = await frame();
    await up('KeyJ');
    await up('KeyW');
    const via = viaJumpCancel ? 'AD-011' : 'mesmo frame';
    assert(
      st.player.move === 'ganchoAscendente',
      `MOV-07: W+J deveria começar ganchoAscendente (${via}): ${st.player.move}`,
    );
    assert(
      count(st, 'move:ganchoAscendente') === count(before, 'move:ganchoAscendente') + 1,
      'MOV-13: um move:ganchoAscendente esperado',
    );
    let minY = baseY;
    for (let i = 0; i < 90; i++) {
      st = await frame();
      minY = Math.min(minY, st.enemies.find((x) => x.id === v.id).y);
    }
    assert(st.enemies.find((x) => x.id === v.id).hp > 0, 'MOV-11: o alvo precisa sobreviver');
    assert(
      baseY - minY >= 64,
      `MOV-11 (${via}): o centro do inimigo subiu só ${(baseY - minY).toFixed(1)} px (mínimo 64)`,
    );
  };
  await launch(false);
  await launch(true);

  // --- Grupo 5: chute empurrão (MOV-08) e carregado (MOV-09) ---------------------------------------------------------
  await boot('enemyGuard=0');
  s = await approach();
  assert(s.player.facing === 1, `esperava o jogador virado para a direita: ${s.player.facing}`);
  // MOV-08: forte com a direção do rosto segurada (D, o jogador olha para a direita).
  await expectMove(['KeyD', 'KeyK'], 'chuteEmpurrao', 'MOV-08');

  await boot('enemyGuard=0');
  await approach();
  await calm();
  await settle();
  // MOV-09: segurar K por 400 ms ou mais e soltar dispara o chuteCarregado assim que o golpe atual acaba.
  const beforeCharge = await snap(16);
  await down('KeyK');
  s = await snap(50);
  assert(s.player.move === 'chuteFrontal', `K já deveria ter começado o chuteFrontal: ${s.player.move}`);
  for (let i = 0; i < 9; i++) s = await snap(50); // ~500 ms desde o aperto
  await up('KeyK');
  let started = s.player.move === 'chuteCarregado';
  for (let i = 0; i < 12 && !started; i++) {
    s = await frame();
    started = s.player.move === 'chuteCarregado';
  }
  assert(started, `MOV-09: o chuteCarregado deveria sair na soltura, move=${s.player.move}`);
  assert(
    count(s, 'move:chuteCarregado') === count(beforeCharge, 'move:chuteCarregado') + 1,
    `MOV-13: um move:chuteCarregado esperado: ${JSON.stringify(moveEvents(s))}`,
  );

  // --- Grupo 6: palma explosiva (SPC-01, SPC-02) -----------------------------------------------------------------------
  await boot('enemyGuard=0');
  s = await approach();
  const tgt = nearest(s);
  const x0 = tgt.x;
  await settle();
  const beforePalm = await snap(16);
  await down('KeyS');
  await snap(50);
  await up('KeyS');
  await down('KeyD');
  await snap(50);
  await up('KeyD');
  await down('KeyJ');
  s = await frame();
  await up('KeyJ');
  assert(s.player.move === 'palmaExplosiva', `SPC-01: S, frente, J deveria começar palmaExplosiva: ${s.player.move}`);
  assert(
    count(s, 'move:palmaExplosiva') === count(beforePalm, 'move:palmaExplosiva') + 1,
    'MOV-13: um move:palmaExplosiva esperado',
  );
  s = await snap(900);
  const pushed = s.enemies.find((e) => e.id === tgt.id);
  assert(pushed.hp > 0, 'SPC-02: o alvo precisa sobreviver');
  const dx = Math.abs(pushed.x - x0);
  assert(Math.abs(dx - 200) <= 16, `SPC-02: empurrou ${dx.toFixed(1)} px, esperava 200 ±16`);

  // --- Grupo 7: voadora (AIR-02, AIR-05) --------------------------------------------------------------------------------
  await boot('enemyGuard=0');
  await settle();
  const ground = 462;
  // O pulo é só preparo da voadora, e o evento de tecla do navegador às vezes chega depois do step (intermitência do
  // harness, sem relação com o golpe): tenta de novo, com o player de volta ao chão, antes de dar o pulo por perdido.
  for (let attempt = 0; attempt < 3; attempt++) {
    await down('ArrowUp');
    await snap(50);
    await up('ArrowUp');
    await snap(100);
    s = await frame();
    if (s.player.y < ground - 5) break;
    await settle();
  }
  assert(s.player.y < ground - 5, `deveria estar no ar antes da voadora: y=${s.player.y}`);
  assert(!s.fx.layers.includes('air.kickTrail'), 'a trilha da voadora não deveria existir antes do golpe');
  const beforeKick = s;
  await down('KeyK');
  let start = null;
  let trailSeen = false;
  for (let i = 0; i < 80; i++) {
    s = await frame();
    if (s.player.move === 'voadora') {
      if (!start) start = s;
      if (s.fx.layers.includes('air.kickTrail')) trailSeen = true;
    } else if (start) break;
  }
  await up('KeyK');
  assert(start, 'AIR-02: heavy no ar deveria começar a voadora');
  assert(count(s, 'move:voadora') === count(beforeKick, 'move:voadora') + 1, 'MOV-13: um move:voadora esperado');
  assert(trailSeen, 'AIR-05: fx.layers deveria incluir air.kickTrail durante a voadora');
  const kickDx = s.player.x - start.player.x;
  assert(Math.abs(kickDx - 120) <= 8, `AIR-02: a voadora andou ${kickDx.toFixed(1)} px para a frente, esperava 120 ±8`);
  assert(s.player.y > start.player.y, `AIR-02: a voadora deveria descer (y ${start.player.y} -> ${s.player.y})`);
}
